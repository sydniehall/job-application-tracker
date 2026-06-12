# Architecture Decision Records

## Backend Framework: FastAPI
Chose FastAPI because it's built specifically for REST APIs,
has automatic Swagger docs, and native support for
Python type hints.

## ORM: SQLModel
SQLModel combines SQLAlchemy and Pydantic into a single model definition,
eliminating the need to maintain separate ORM and schema classes.
Further, SQLModel is built by the same author as FastAPI and integrates
naturally with it.

## Database: SQLite (development)
Using SQLite with a local `tracker.db` file for development.
`check_same_thread=False` is set because FastAPI uses multiple threads.
Plan to migrate to PostgreSQL for production.

## Database Model: Two tables (User and Application)
Users own applications in a one-to-many relationship. Applications are scoped
to a user via a `user_id` foreign key. Deleting a user cascades and deletes
all their applications (`cascade="all, delete-orphan"`).

### User Model
Fields: `id`, `email` (unique, indexed), `hashed_password`, `created_at`.
Email is the login identifier. Password is never stored in plain text — only
the hashed version is persisted. No username field; email alone is sufficient.

### Application Model
Fields: `id`, `user_id`, `company`, `role`, `status`, `date_applied`,
`deadline`, `job_url`, `notes`, `resume_version`, `created_at`, `updated_at`.
- `status` defaults to `"Applied"` at the SQLModel level
- `notes` uses SQL `TEXT` type (via `sa_column`) to allow long free-form text
- `date_applied` is a full `datetime` to capture when the application was submitted
- `deadline` is a `date` only: time-of-day precision is not needed for deadlines
- `created_at` and `updated_at`: uses `server_default=func.now()` and `onupdate=func.now()` 
- `job_url`, `notes`, `resume_version` are all optional

## Timestamps: SQLAlchemy server_default via sa_column
Using `server_default=func.now()` and `onupdate=func.now()` via SQLAlchemy's
`sa_column` for `created_at` and `updated_at` fields. This means the database
sets the timestamp rather than Python, which is more reliable under concurrent
writes. Requires keeping SQLAlchemy as a direct dependency alongside SQLModel.

## Schema Design: Separate Create and Read classes per model
Each model has schema variations:
- Create: fields required to make a new record (no id or timestamps)
- Read: what the API returns, explicitly excludes sensitive fields like `hashed_password`

## Session Management: SQLModel Session with context manager
Using `with Session(engine) as session: yield session` in `get_db()` instead of
the older `sessionmaker` + manual `try/finally` pattern. The context manager
handles cleanup automatically.
