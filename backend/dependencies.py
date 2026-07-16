import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlmodel import Session, select

from database import get_db
from models import RefreshToken, TokenData, User

# Read backend/.env regardless of the directory uvicorn was launched from.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-before-deploying")
ALGORITHM = "HS256"
# Access tokens are short-lived; the refresh cookie keeps the session alive.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
# Set COOKIE_SECURE=true in production (HTTPS) so the cookie is never sent
# over plain HTTP. Must stay false for local http://localhost development.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
REFRESH_COOKIE_NAME = "refresh_token"
# The cookie is only ever needed by /auth/refresh and /auth/logout, so scope
# it to /auth instead of sending it with every request.
REFRESH_COOKIE_PATH = "/auth"
ALLOWED_PASSWORD_PATTERN = re.compile(r'^[\x20-\x7E]+$')

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _as_utc(dt: datetime) -> datetime:
    # SQLite returns naive datetimes; they were stored as UTC.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def issue_refresh_token(user: User, db: Session) -> str:
    """Create a refresh token row and return the raw token for the cookie."""
    raw = secrets.token_urlsafe(48)
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=_hash_refresh_token(raw),
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    # Opportunistic cleanup of this user's expired tokens.
    now = datetime.now(timezone.utc)
    for stale in db.exec(select(RefreshToken).where(RefreshToken.user_id == user.id)):
        if _as_utc(stale.expires_at) < now:
            db.delete(stale)
    db.commit()
    return raw


def consume_refresh_token(raw: str, db: Session) -> Optional[User]:
    """Validate and revoke a refresh token (rotation). Returns its user, or None."""
    row = db.exec(select(RefreshToken).where(
        RefreshToken.token_hash == _hash_refresh_token(raw)
    )).first()
    if row is None:
        return None
    user = row.user
    db.delete(row)  # single-use: a new token is issued on success
    db.commit()
    if _as_utc(row.expires_at) < datetime.now(timezone.utc):
        return None
    return user


def set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        raw,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exc
        token_data = TokenData(email=email.strip().lower())
    except JWTError:
        raise credentials_exc

    user = db.exec(select(User).where(User.email == token_data.email)).first()
    if user is None:
        raise credentials_exc
    return user
