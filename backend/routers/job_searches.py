from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from dependencies import get_current_user
from database import get_db
from models import Application, JobSearch, JobSearchCreate, JobSearchRead, JobSearchUpdate, User

router = APIRouter(prefix="/job-searches", tags=["job-searches"])


def _to_read(db: Session, job_search: JobSearch) -> JobSearchRead:
    count = db.exec(
        select(func.count()).select_from(Application).where(
            Application.job_search_id == job_search.id
        )
    ).one()
    return JobSearchRead(
        id=job_search.id,
        name=job_search.name,
        archived=job_search.archived,
        default_application_type=job_search.default_application_type,
        created_at=job_search.created_at,
        application_count=count,
    )


@router.post("", response_model=JobSearchRead, status_code=201)
def create_job_search(
    body: JobSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    job_search = JobSearch(
        user_id=current_user.id,
        name=name,
        default_application_type=body.default_application_type,
    )
    db.add(job_search)
    db.commit()
    db.refresh(job_search)
    return _to_read(db, job_search)


@router.get("", response_model=List[JobSearchRead])
def list_job_searches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job_searches = db.exec(
        select(JobSearch)
        .where(JobSearch.user_id == current_user.id)
        .order_by(JobSearch.created_at.desc())
    ).all()
    return [_to_read(db, js) for js in job_searches]


@router.put("/{job_search_id}", response_model=JobSearchRead)
def update_job_search(
    job_search_id: int,
    body: JobSearchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job_search = db.exec(
        select(JobSearch).where(
            JobSearch.id == job_search_id,
            JobSearch.user_id == current_user.id,
        )
    ).first()
    if not job_search:
        raise HTTPException(status_code=404, detail="Job search not found")

    update_data = body.model_dump(exclude_unset=True)
    if "name" in update_data:
        name = (update_data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        update_data["name"] = name

    job_search.sqlmodel_update(update_data)
    db.add(job_search)
    db.commit()
    db.refresh(job_search)
    return _to_read(db, job_search)


@router.delete("/{job_search_id}", status_code=204)
def delete_job_search(
    job_search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job_search = db.exec(
        select(JobSearch).where(
            JobSearch.id == job_search_id,
            JobSearch.user_id == current_user.id,
        )
    ).first()
    if not job_search:
        raise HTTPException(status_code=404, detail="Job search not found")
    db.delete(job_search)  # cascades to its applications
    db.commit()
