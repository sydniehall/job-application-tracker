from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import create_db_and_tables
from routers.auth import router as auth_router
from routers.applications import router as applications_router
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(auth_router)
app.include_router(applications_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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