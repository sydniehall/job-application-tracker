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

## Authentication: JWT with python-jose
Using `python-jose` to issue HS256-signed JWTs. Tokens expire after 30 minutes.
The user's email is stored as the `sub` claim. `SECRET_KEY` is read from an
environment variable with a dev fallback (`"change-me-before-deploying"`).
The `oauth2_scheme` (`OAuth2PasswordBearer`) points to `/auth/token`, which
accepts `OAuth2PasswordRequestForm` so Swagger's "Authorize" button works out of
the box.

## Password Hashing: bcrypt directly (not passlib)
Using the `bcrypt` package directly (`bcrypt.hashpw` / `bcrypt.checkpw`) instead
of `passlib`. `passlib` was removed after finding it unnecessary. Bcrypt is
called with `gensalt()` defaults (cost factor 12).

## Password Validation: Length + charset enforced at registration
Three rules enforced in the `/auth/register` route before hashing:
- At least 8 characters
- At most 72 bytes (bcrypt silently truncates beyond this)
- Only printable ASCII (`\x20–\x7E`), blocking multi-byte characters that could
  cause bcrypt byte-count surprises

## Email Normalization: strip + lowercase at boundaries
Emails are normalized with `.strip().lower()` at registration, login, and token
validation. `EmailStr` (from `pydantic[email]` / `email-validator`) validates
format at the schema level before normalization is applied.

## Timing-Safe Login: dummy hash when user not found
The login route always calls `verify_password`, even when no user is found, by
falling back to `_DUMMY_HASH`. This prevents user-enumeration via response-time
differences.

## Code Structure: Routers folder + dependencies module
Routes are split into `routers/auth.py` and `routers/applications.py`, each
registered with an `APIRouter`. The original `auth.py` was renamed to
`dependencies.py` and now holds only shared helper functions: `hash_password`,
`verify_password`, `create_access_token`, and `get_current_user`.

## Authorization: All application routes require authentication
Every endpoint under `/applications` declares `current_user: User = Depends(get_current_user)`.
Queries always filter by `current_user.id`, so users can only see and modify
their own records.

## Partial Updates: model_dump(exclude_unset=True)
`PUT /applications/{id}` calls `application.model_dump(exclude_unset=True)` so
only fields explicitly included in the request body are written. Fields omitted
by the client are left unchanged.

## model_validate with update= to inject user_id
`Application.model_validate(application, update={"user_id": current_user.id})`
is used when creating an application. This keeps `user_id` out of the request
body entirely — the server always sets it from the auth token.

## Delete Account: password confirmation required
`DELETE /auth/me` requires the user's current password in the request body
(`DeleteAccount` schema). The password is verified before the user record is
deleted. Cascade on the `User` model handles deleting all associated applications.

## CORS: Vite dev origin allowed
`CORSMiddleware` allows `http://localhost:5173` (Vite's default dev server port)
with credentials and all methods/headers. Origins will need updating for
production.

## Frontend: React + Vite + TypeScript
The frontend is a React + Vite app written in TypeScript, scaffolded in the
`frontend/` directory. It is tracked on the `frontend` branch and developed
separately from the backend.

## Application Status: Fixed enum, not free-form string
`ApplicationStatus` is a `str, Enum` in `models.py` (Applied, Screening,
Interview, Offer, Rejected, Withdrawn) instead of an unconstrained `str`. FastAPI
serializes it as a plain string and Swagger renders it as a dropdown. The
frontend mirrors it in `src/index.ts` as a `const` object + derived type
(rather than a TS `enum`), so it's usable both as a type and at runtime (e.g.
`Object.values(ApplicationStatus)` for building a `<select>`).

## GET /auth/me: read current user endpoint
Added `GET /auth/me`, returning `UserRead` for the authenticated user. Reuses
`get_current_user` for token validation and lookup — the route handler itself
just returns the dependency's result. Used by the frontend to restore a session
on page load.

## Frontend HTTP Client: axios with request/response interceptors
`src/api/client.ts` wraps axios (chosen over raw `fetch` for first-class
interceptor support) in a single configured instance:
- **Request interceptor** attaches `Authorization: Bearer <token>` to every
  outgoing request.
- **Response interceptor** clears the token and redirects to `/login` on a
  `401`, guarded by a pathname check (`!== "/login"`) to prevent a redirect
  loop when the 401 comes from a failed login attempt itself.

## Token Storage: wrapper module, no direct localStorage access
`src/api/token.ts` exposes `token.get()/set()/clear()` and is the only file
that touches `localStorage`. The storage key is private to that module.
Swapping the backing store later (`sessionStorage`, cookies) is a one-file
change.

## API Base URL: environment variable, not hardcoded
`client.ts` reads `baseURL` from `import.meta.env.VITE_API_URL`, set in
`frontend/.env` to `http://localhost:8000` for local development against
uvicorn. Vite inlines this at build time. A committed `.env.example` documents
the variable; `.env.local` (gitignored) overrides it for other environments
without touching the committed default.

## Gitignore: security-first, no cross-directory interference
Each part of the repo owns its own security-sensitive ignore rules rather than
centralizing them at the root:
- Root `.gitignore` only holds IDE/OS noise (`.vscode`, `.idea`, `.DS_Store`)
  shared by both halves of the repo.
- `backend/.gitignore` and `frontend/.gitignore` each block `.env` / `.env.*`
  and explicitly re-allow `!.env.example` so the template stays committable
  regardless of staging order.
- A root-level `.env` rule was removed after it was found to silently block
  `frontend/.env` (which is intentionally committed) — nested `.gitignore`
  rules should not shadow files owned by a subdirectory.

## Auth API Functions: /auth/token requires form-encoded body
`src/api/auth.ts` calls `POST /auth/token` with `URLSearchParams({ username:
email, password })` and an explicit `application/x-www-form-urlencoded`
Content-Type, because the backend route uses FastAPI's
`OAuth2PasswordRequestForm`, which parses form data and expects the field name
`username` (not `email`, not JSON). All other auth endpoints use plain JSON.

## AuthContext: session restore on mount, auto-login on register
`src/context/AuthContext.tsx` provides `user`, `isLoading`, `login`,
`register`, `logout`, `deleteAccount` via React context.
- On mount, if a token exists, `getMe()` is called to restore the session;
  `isLoading` gates rendering until this resolves.
- `register` calls the register endpoint and then immediately calls `login`
  with the same credentials, so a new user is authenticated without a separate
  login step.
- `deleteAccount` and `logout` both clear the token and reset state.

## Provider Order: BrowserRouter > AuthProvider > App
`main.tsx` wraps `App` in `BrowserRouter` (outermost), then `AuthProvider`,
inside `StrictMode`. Router is outermost so any component — including auth
flows — can use `<Link>`/`useNavigate` without a separate check; `AuthProvider`
sits inside it since auth state doesn't need to exist before routing does.
Uses `react-router-dom`, already a dependency.

## Frontend Styling: Chakra UI v3, used idiomatically
The frontend uses Chakra UI v3 (`@chakra-ui/react` + `@emotion/react`) instead
of Tailwind CSS, which was removed along with `index.css` and the Vite plugin.
Components lean on Chakra's own recipes rather than per-element style
overrides:
- Default component sizes/variants (`Button`, `Input`, `Card`, `Field`,
  `Badge`, `Alert`, `Spinner`, `EmptyState`) with `colorPalette` props for
  color, instead of hand-picked bg/color pairs.
- Semantic tokens (`bg.subtle`, `fg.muted`, `fg.subtle`, `blue.fg`) instead of
  hard-coded gray/white values, so dark mode works automatically via the
  `ColorModeProvider` (next-themes) in `components/ui/`.
- `theme.ts` is just `createSystem(defaultConfig)` — no custom palette.
- Status colors map to Chakra palettes (Interview → orange since Chakra has no
  amber; "To Apply" uses an outline gray badge to stay distinct from
  Withdrawn's subtle gray, since Chakra has no slate).

## Auth Sessions: Short access token + rotating refresh token
Access tokens are back to 30 minutes; long-lived sessions come from a refresh
token instead:
- `refresh_tokens` table stores a SHA-256 hash (never the raw token), expiry,
  and user FK with cascade delete. Rows are single-use: `/auth/refresh`
  revokes the presented token and issues a new one (rotation), so a stolen
  cookie stops working the next time the real client refreshes.
- The raw refresh token lives only in an httpOnly `refresh_token` cookie
  (SameSite=Lax, `path=/auth`, `Secure` via `COOKIE_SECURE` env), so frontend
  JS — and any XSS payload — can never read it.
- `/auth/logout` revokes server-side and clears the cookie; deleting the
  account cascades away all refresh tokens.
- Frontend axios client sets `withCredentials` and, on any 401 outside the
  auth endpoints, performs a single-flight `POST /auth/refresh`, stores the
  new access token, and replays the failed request once before falling back
  to the login redirect. Session restore on page load just calls `/auth/me`
  and lets that machinery run.

## Backend Config: .env loaded with python-dotenv
`dependencies.py` calls `load_dotenv()` on `backend/.env` (path anchored to
the file, so it works regardless of uvicorn's cwd). `SECRET_KEY`,
`ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, and
`COOKIE_SECURE` come from there; `backend/.env` is gitignored and
`backend/.env.example` documents the variables.
