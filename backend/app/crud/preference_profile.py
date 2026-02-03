from __future__ import annotations

from typing import Dict, List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.criterion import Criterion
from app.models.pairwise_comparison import PairwiseComparison
from app.models.preference_profile import PreferenceProfile


def get_profile_by_user_id(db: Session, user_id: int) -> PreferenceProfile | None:
    return (
        db.query(PreferenceProfile).filter(PreferenceProfile.user_id == user_id).first()
    )


def upsert_profile_for_user(
    db: Session, user_id: int, name: str | None
) -> PreferenceProfile:
    profile = get_profile_by_user_id(db, user_id=user_id)
    if profile is None:
        profile = PreferenceProfile(user_id=user_id, name=name or "My preferences")
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    if name is not None:
        profile.name = name
        db.commit()
        db.refresh(profile)
    return profile


def _load_active_criteria_map(db: Session) -> Dict[str, Criterion]:
    rows = db.query(Criterion).filter(Criterion.is_active == True).all()  # noqa: E712
    return {c.key: c for c in rows}


def _expected_pairs(keys: List[str]) -> set[frozenset[str]]:
    s: set[frozenset[str]] = set()
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            s.add(frozenset([keys[i], keys[j]]))
    return s


def replace_pairwise_comparisons_for_profile(
    db: Session,
    profile_id: int,
    comparisons: List[Tuple[str, str, float]],  # (a_key, b_key, value)
) -> List[PairwiseComparison]:
    criteria_map = _load_active_criteria_map(db)
    active_keys = sorted(criteria_map.keys())

    if len(active_keys) < 2:
        raise HTTPException(
            status_code=409, detail="Not enough active criteria to compare"
        )

    # Validate completeness (locked criteria => tight consistency)
    expected = _expected_pairs(active_keys)
    provided_pairs: set[frozenset[str]] = set()

    for a_key, b_key, _ in comparisons:
        if a_key not in criteria_map or b_key not in criteria_map:
            raise HTTPException(
                status_code=422, detail=f"Unknown criterion key(s): {a_key}, {b_key}"
            )
        provided_pairs.add(frozenset([a_key, b_key]))

    if provided_pairs != expected:
        missing = sorted([sorted(list(x)) for x in (expected - provided_pairs)])
        extra = sorted([sorted(list(x)) for x in (provided_pairs - expected)])
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Pairwise comparisons must cover all criterion pairs exactly once",
                "expected_pair_count": len(expected),
                "provided_pair_count": len(provided_pairs),
                "missing_pairs": missing,
                "extra_pairs": extra,
            },
        )

    # Canonicalize & detect duplicates after canonicalization
    canonical: Dict[Tuple[int, int], float] = {}
    for a_key, b_key, value in comparisons:
        a = criteria_map[a_key]
        b = criteria_map[b_key]
        a_id, b_id = a.id, b.id

        if a_id == b_id:
            raise HTTPException(
                status_code=422, detail="Self-comparisons are not allowed"
            )

        if a_id > b_id:
            a_id, b_id = b_id, a_id
            value = 1.0 / value

        key = (a_id, b_id)
        if key in canonical:
            raise HTTPException(
                status_code=422, detail="Duplicate pairwise comparison in payload"
            )
        canonical[key] = value

    # Replace all existing comparisons (simple, consistent)
    db.query(PairwiseComparison).filter(
        PairwiseComparison.profile_id == profile_id
    ).delete()
    db.commit()

    rows: List[PairwiseComparison] = []
    for (a_id, b_id), value in canonical.items():
        rows.append(
            PairwiseComparison(
                profile_id=profile_id,
                criterion_a_id=a_id,
                criterion_b_id=b_id,
                value=value,
            )
        )

    db.add_all(rows)
    db.commit()

    # Return fresh rows
    return (
        db.query(PairwiseComparison)
        .filter(PairwiseComparison.profile_id == profile_id)
        .all()
    )
