from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.utils import get_current_user
from app.db.session import get_db
from app.schemas.preference_profile import (
    PairwiseComparisonBatchIn,
    PairwiseComparisonOut,
    PreferenceProfileOut,
    PreferenceProfileUpsert,
)
from app.crud import preference_profile as crud_pref
from app.models.criterion import Criterion

router = APIRouter()


@router.put("/me", response_model=PreferenceProfileOut)
def upsert_my_preference_profile(
    request: Request,
    payload: PreferenceProfileUpsert,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    profile = crud_pref.upsert_profile_for_user(db, user_id=user.id, name=payload.name)
    return profile


@router.post("/me/pairwise-comparisons", response_model=list[PairwiseComparisonOut])
def set_my_pairwise_comparisons(
    request: Request,
    body: PairwiseComparisonBatchIn,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    profile = crud_pref.get_profile_by_user_id(db, user_id=user.id)
    if profile is None:
        # explicit stage separation as you requested
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Preference profile not found. Create it via PUT /preference-profiles/me")

    rows = crud_pref.replace_pairwise_comparisons_for_profile(
        db,
        profile_id=profile.id,
        comparisons=[(c.criterion_a_key, c.criterion_b_key, c.value) for c in body.comparisons],
    )

    # Map ids -> keys for response
    criteria = db.query(Criterion).all()
    id_to_key = {c.id: c.key for c in criteria}

    return [
        PairwiseComparisonOut(
            id=r.id,
            profile_id=r.profile_id,
            criterion_a_key=id_to_key.get(r.criterion_a_id, str(r.criterion_a_id)),
            criterion_b_key=id_to_key.get(r.criterion_b_id, str(r.criterion_b_id)),
            value=r.value,
            created_at=r.created_at,
        )
        for r in rows
    ]