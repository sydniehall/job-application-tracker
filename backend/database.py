import os

from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

# Read backend/.env regardless of the directory uvicorn was launched from.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tracker.db")
# Some hosts (Railway, Heroku) still hand out the legacy `postgres://`
# scheme, which SQLAlchemy 1.4+ no longer accepts.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Only SQLite's driver needs (or accepts) this connect arg.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_db():
    with Session(engine) as session:
        yield session
