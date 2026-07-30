from datetime import date, datetime, time
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_
from sqlmodel import Session, select

from dependencies import get_current_user
from database import get_db
from models import (
    Application,
    ApplicationCreate,
    ApplicationPage,
    ApplicationRead,
    ApplicationStatus,
    ApplicationSuggestions,
    ApplicationType,
    ApplicationUpdate,
    User,
)

router = APIRouter(prefix="/applications", tags=["applications"])

SortField = Literal[
    "created_at", "title", "company", "status", "location", "type", "date_applied", "deadline"
]
CustomFilterField = Literal["title", "company", "location"]

# Funnel order rather than alphabetical, matching how the status badge cycles.
STATUS_SORT_ORDER = {
    ApplicationStatus.to_apply: 0,
    ApplicationStatus.applied: 1,
    ApplicationStatus.screening: 2,
    ApplicationStatus.interview: 3,
    ApplicationStatus.offer: 4,
    ApplicationStatus.rejected: 5,
    ApplicationStatus.withdrawn: 6,
}
STATUS_SORT_COLUMN = case(
    *[(Application.status == status, order) for status, order in STATUS_SORT_ORDER.items()],
    else_=len(STATUS_SORT_ORDER),
)

SORT_COLUMNS = {
    "created_at": Application.created_at,
    "title": Application.title,
    "company": Application.company,
    "location": Application.location,
    "type": Application.type,
    "date_applied": Application.date_applied,
    "deadline": Application.deadline,
}

CUSTOM_FILTER_COLUMNS = {
    "title": Application.title,
    "company": Application.company,
    "location": Application.location,
}


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


@router.get("/suggestions", response_model=ApplicationSuggestions)
def get_application_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Distinct existing values, offered as autocomplete suggestions in the
    # add/edit form. Independent of the paginated list below so suggestions
    # stay complete regardless of what page/filter is currently loaded.
    companies = db.exec(
        select(Application.company)
        .where(Application.user_id == current_user.id)
        .distinct()
    ).all()
    titles = db.exec(
        select(Application.title)
        .where(Application.user_id == current_user.id)
        .distinct()
    ).all()
    locations = db.exec(
        select(Application.location)
        .where(Application.user_id == current_user.id, Application.location.is_not(None))
        .distinct()
    ).all()
    return ApplicationSuggestions(
        companies=sorted(companies),
        titles=sorted(titles),
        locations=sorted(locations),
    )


@router.get("", response_model=ApplicationPage)
def get_applications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    q: Optional[str] = None,
    status: Optional[ApplicationStatus] = None,
    type: Optional[ApplicationType] = None,
    date_applied_from: Optional[date] = None,
    date_applied_to: Optional[date] = None,
    custom_field: Optional[CustomFilterField] = None,
    custom_value: Optional[str] = None,
    sort_field: SortField = "created_at",
    sort_dir: Literal["asc", "desc"] = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Application).where(Application.user_id == current_user.id)

    if q:
        pattern = f"%{q}%"
        query = query.where(
            or_(
                Application.title.ilike(pattern),
                Application.company.ilike(pattern),
                Application.location.ilike(pattern),
                Application.notes.ilike(pattern),
            )
        )

    if status:
        query = query.where(Application.status == status)

    if type:
        query = query.where(Application.type == type)

    if date_applied_from:
        query = query.where(
            Application.date_applied >= datetime.combine(date_applied_from, time.min)
        )

    if date_applied_to:
        query = query.where(
            Application.date_applied <= datetime.combine(date_applied_to, time.max)
        )

    if custom_field and custom_value:
        column = CUSTOM_FILTER_COLUMNS[custom_field]
        query = query.where(column.ilike(f"%{custom_value}%"))

    total = db.exec(select(func.count()).select_from(query.subquery())).one()

    sort_column = STATUS_SORT_COLUMN if sort_field == "status" else SORT_COLUMNS[sort_field]
    order_expr = sort_column.asc().nulls_last() if sort_dir == "asc" else sort_column.desc().nulls_last()
    # id as a tie-breaker keeps pagination stable across pages when many
    # rows share the same sort value (e.g. same status or blank location).
    tie_breaker = Application.id.asc() if sort_dir == "asc" else Application.id.desc()
    query = query.order_by(order_expr, tie_breaker).offset(offset).limit(limit)

    items = db.exec(query).all()
    return ApplicationPage(items=items, total=total, has_more=offset + len(items) < total)


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
