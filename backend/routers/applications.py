from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from dependencies import get_current_user
from database import get_db
from models import Application, ApplicationCreate, ApplicationRead, ApplicationUpdate, User

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=ApplicationRead, status_code=201)
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


@router.get("", response_model=list[ApplicationRead])
def get_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.exec(select(Application).where(Application.user_id == current_user.id)).all()


@router.put("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int,
    application: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_application = db.exec(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    ).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")
    update_data = application.model_dump(exclude_unset=True)
    db_application.sqlmodel_update(update_data)
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.delete("/{application_id}", status_code=204)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_application = db.exec(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    ).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(db_application)
    db.commit()
