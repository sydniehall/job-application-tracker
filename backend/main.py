from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Session, select
from database import create_db_and_tables, get_db
from models import Application, ApplicationCreate, ApplicationRead, User
from auth import get_current_user, router as auth_router
from fastapi.middleware.cors import CORSMiddleware



@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(auth_router)

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

@app.post("/applications", response_model=ApplicationRead)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_application = Application.model_validate(application, update={"user_id": current_user.id})
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application

@app.get("/applications", response_model=list[ApplicationRead])
def get_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applications = db.exec(select(Application).where(Application.user_id == current_user.id)).all()
    return applications