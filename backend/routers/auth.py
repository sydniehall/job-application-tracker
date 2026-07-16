from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from dependencies import (
    ALLOWED_PASSWORD_PATTERN,
    REFRESH_COOKIE_NAME,
    clear_refresh_cookie,
    consume_refresh_token,
    create_access_token,
    get_current_user,
    hash_password,
    issue_refresh_token,
    set_refresh_cookie,
    verify_password,
)
from database import get_db
from models import DeleteAccount, Token, User, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if not ALLOWED_PASSWORD_PATTERN.match(user_in.password):
        raise HTTPException(
            status_code=400,
            detail="Password can only contain standard letters, numbers, and symbols"
        )
    if len(user_in.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(user_in.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")

    email = user_in.email.strip().lower()
    existing = db.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=email, hashed_password=hash_password(user_in.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token", response_model=Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    _DUMMY_HASH = "$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    user = db.exec(select(User).where(User.email == form_data.username.strip().lower())).first()
    hashed = user.hashed_password if user else _DUMMY_HASH
    if not user or not verify_password(form_data.password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    set_refresh_cookie(response, issue_refresh_token(user, db))
    token = create_access_token({"sub": user.email})
    return Token(access_token=token)


@router.post("/refresh", response_model=Token)
def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    user = consume_refresh_token(refresh_token, db) if refresh_token else None
    if user is None:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    # Rotation: the used token was revoked; hand out a fresh one.
    set_refresh_cookie(response, issue_refresh_token(user, db))
    return Token(access_token=create_access_token({"sub": user.email}))


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if refresh_token:
        consume_refresh_token(refresh_token, db)  # revoke server-side
    clear_refresh_cookie(response)


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=204)
def delete_account(
    body: DeleteAccount,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    db.delete(current_user)
    db.commit()
    clear_refresh_cookie(response)
