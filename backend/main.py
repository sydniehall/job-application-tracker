from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Session, select
from database import create_db_and_tables, get_db
from models import (
    Application, ApplicationCreate, ApplicationRead,
    User, UserCreate, UserRead
) 

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/applications", response_model=ApplicationRead)
def create_application(application: ApplicationCreate, db: Session = Depends(get_db)):
    db_application = Application.model_validate(application, update={"user_id": 1})
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application

@app.get("/applications", response_model=list[ApplicationRead])
def get_applications(db: Session = Depends(get_db)):
    applications = db.exec(select(Application)).all()
    return applications