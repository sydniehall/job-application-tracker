import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import create_db_and_tables
from routers.auth import router as auth_router
from routers.applications import router as applications_router
from routers.job_searches import router as job_searches_router
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(job_searches_router)

# Comma-separated list, e.g. "https://my-app.vercel.app,https://my-app-git-main.vercel.app"
DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173,"
    "https://job-application-tracker-git-main-syds-projects1.vercel.app"
)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Job Application Tracker API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}