from datetime import date, datetime
from enum import Enum
from typing import Optional, List
from pydantic import EmailStr
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, Text
from sqlalchemy.sql import func


class ApplicationStatus(str, Enum):
    to_apply = "To Apply"
    applied = "Applied"
    screening = "Screening"
    interview = "Interview"
    offer = "Offer"
    rejected = "Rejected"
    withdrawn = "Withdrawn"


class ApplicationType(str, Enum):
    full_time = "Full Time"
    part_time = "Part Time"
    internship = "Internship"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )

    applications: List["Application"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    refresh_tokens: List["RefreshToken"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    # Only a SHA-256 hash is stored; the raw token lives in the client cookie.
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )

    user: Optional["User"] = Relationship(back_populates="refresh_tokens")


class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    company: str
    role: str
    status: ApplicationStatus = Field(default=ApplicationStatus.applied)
    type: Optional[ApplicationType] = None
    date_applied: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    deadline: Optional[date] = None
    url: Optional[str] = None
    location: Optional[str] = None
    # Free-form so it can hold ranges and units ("$25/hr", "$110k–$130k").
    pay: Optional[str] = None
    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True)
    )
    resume_version: Optional[str] = None
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )

    owner: Optional["User"] = Relationship(back_populates="applications")


class UserCreate(SQLModel):
    email: EmailStr
    password: str


class UserRead(SQLModel):
    id: int
    email: str
    created_at: Optional[datetime]


class ApplicationCreate(SQLModel):
    company: str
    role: str
    status: ApplicationStatus = ApplicationStatus.applied
    type: Optional[ApplicationType] = None
    date_applied: Optional[datetime] = None
    deadline: Optional[date] = None
    url: Optional[str] = None
    location: Optional[str] = None
    pay: Optional[str] = None
    notes: Optional[str] = None
    resume_version: Optional[str] = None


class ApplicationRead(SQLModel):
    id: int
    user_id: int
    company: str
    role: str
    status: ApplicationStatus
    type: Optional[ApplicationType]
    date_applied: Optional[datetime]
    deadline: Optional[date]
    url: Optional[str]
    location: Optional[str]
    pay: Optional[str]
    notes: Optional[str]
    resume_version: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class ApplicationUpdate(SQLModel):
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    type: Optional[ApplicationType] = None
    date_applied: Optional[datetime] = None
    deadline: Optional[date] = None
    url: Optional[str] = None
    location: Optional[str] = None
    pay: Optional[str] = None
    notes: Optional[str] = None
    resume_version: Optional[str] = None


class DeleteAccount(SQLModel):
    password: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(SQLModel):
    email: Optional[str] = None