from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.utils import require_admin
from app.db.session import get_db
from app.models.property import Property
from app.schemas.property import PropertyOut

router = APIRouter()

@router.get("/properties", response_model=List[PropertyOut], dependencies=[Depends(require_admin)])
def admin_list_properties(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    ):
    return db.query(Property).offset(skip).limit(limit).all()