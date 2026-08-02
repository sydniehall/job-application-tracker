from datetime import date, datetime
from enum import Enum
from typing import Optional, List
from pydantic import EmailStr
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, Text
from sqlalchemy import Enum as SAEnum
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
    default_currency: str = Field(default="$")
    default_sort_field: str = Field(default="created_at")
    default_sort_dir: str = Field(default="desc")

    applications: List["Application"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    refresh_tokens: List["RefreshToken"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    job_searches: List["JobSearch"] = Relationship(
        back_populates="owner",
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


class JobSearch(SQLModel, table=True):
    __tablename__ = "job_searches"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    # Archived searches are hidden from the active switcher but their
    # applications aren't touched — distinct from delete, which cascades.
    archived: bool = Field(default=False)
    # Prefills new applications' Type field within this search — different
    # searches (e.g. an internship hunt vs. a full-time hunt) reasonably
    # want different defaults, so this lives per-search, not per-user.
    default_application_type: Optional[ApplicationType] = Field(
        default=None,
        sa_column=Column(
            SAEnum(ApplicationType, values_callable=lambda enum: [e.value for e in enum]),
            nullable=True,
        ),
    )
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )

    owner: Optional["User"] = Relationship(back_populates="job_searches")
    applications: List["Application"] = Relationship(
        back_populates="job_search",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    job_search_id: Optional[int] = Field(default=None, foreign_key="job_searches.id", index=True)
    company: str
    title: str
    status: ApplicationStatus = Field(
        default=ApplicationStatus.applied,
        sa_column=Column(
            SAEnum(ApplicationStatus, values_callable=lambda enum: [e.value for e in enum]),
            nullable=False,
        ),
    )
    type: Optional[ApplicationType] = Field(
        default=None,
        sa_column=Column(
            SAEnum(ApplicationType, values_callable=lambda enum: [e.value for e in enum]),
            nullable=True,
        ),
    )
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
    job_search: Optional["JobSearch"] = Relationship(back_populates="applications")


class UserCreate(SQLModel):
    email: EmailStr
    password: str


class UserRead(SQLModel):
    id: int
    email: str
    created_at: Optional[datetime]
    default_currency: str
    default_sort_field: str
    default_sort_dir: str


class UserSettingsUpdate(SQLModel):
    default_currency: Optional[str] = None
    default_sort_field: Optional[str] = None
    default_sort_dir: Optional[str] = None


class ChangePassword(SQLModel):
    current_password: str
    new_password: str


class ApplicationCreate(SQLModel):
    # Every application belongs to exactly one job search — required so the
    # tracker stays isolated per search rather than defaulting somewhere.
    job_search_id: int
    company: str
    title: str
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
    job_search_id: Optional[int]
    company: str
    title: str
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


class JobSearchCreate(SQLModel):
    name: str
    default_application_type: Optional[ApplicationType] = None


class JobSearchRead(SQLModel):
    id: int
    name: str
    archived: bool
    default_application_type: Optional[ApplicationType]
    created_at: Optional[datetime]
    # Computed per-request (count of applications in the search), not a
    # stored column — populated manually in the router, not via model_validate.
    application_count: int


class JobSearchUpdate(SQLModel):
    name: Optional[str] = None
    archived: Optional[bool] = None
    default_application_type: Optional[ApplicationType] = None


class ApplicationPage(SQLModel):
    items: List[ApplicationRead]
    total: int
    has_more: bool


class ApplicationSuggestions(SQLModel):
    companies: List[str]
    titles: List[str]
    locations: List[str]


class ApplicationUpdate(SQLModel):
    job_search_id: Optional[int] = None
    company: Optional[str] = None
    title: Optional[str] = None
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