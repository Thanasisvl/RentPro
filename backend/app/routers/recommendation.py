from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from app.core.recommendation_config import (
    CRITERIA_ORDER,
    PROPERTY_TYPE_MAPPING,
    STRICT_PROPERTY_TYPE_MAPPING,
)
from app.core.utils import get_current_user
from app.db.session import get_db
from app.models.criterion import Criterion
from app.models.area import Area
from app.models.preference_profile import PreferenceProfile
from app.models.property import Property, PropertyStatus
from app.schemas.property import PropertyOut
from app.schemas.recommendation import RecommendationItem, RecommendationsResponse
from app.services.ahp import CR_THRESHOLD, compute_ahp
from app.services.topsis import topsis_rank

router = APIRouter()


# Accept both /recommendations and /recommendations/ without redirect
@router.get("", response_model=RecommendationsResponse)
@router.get("/", response_model=RecommendationsResponse, include_in_schema=False)
def get_recommendations(
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    profile = (
        db.query(PreferenceProfile).filter(PreferenceProfile.user_id == user.id).first()
    )
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Preference profile not found. Create it via PUT /preference-profiles/me",
        )

    from app.models.pairwise_comparison import PairwiseComparison

    pcs = (
        db.query(PairwiseComparison)
        .options(
            joinedload(PairwiseComparison.criterion_a),
            joinedload(PairwiseComparison.criterion_b),
        )
        .filter(PairwiseComparison.profile_id == profile.id)
        .all()
    )
    if not pcs:
        raise HTTPException(
            status_code=409,
            detail="Pairwise comparisons not set. Submit them via POST /preference-profiles/me/pairwise-comparisons",
        )

    criteria = db.query(Criterion).filter(Criterion.is_active).all()  # noqa: E712
    key_to_criterion = {c.key: c for c in criteria}

    missing_required = [k for k in CRITERIA_ORDER if k not in key_to_criterion]
    if missing_required:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Missing required criteria in DB",
                "missing": missing_required,
            },
        )

    criteria_keys = list(CRITERIA_ORDER)
    is_benefit = [bool(key_to_criterion[k].is_benefit) for k in criteria_keys]
    pairwise_tuples = [
        (pc.criterion_a.key, pc.criterion_b.key, float(pc.value)) for pc in pcs
    ]

    ahp = compute_ahp(
        criteria_keys=criteria_keys, pairwise=pairwise_tuples, cr_threshold=CR_THRESHOLD
    )
    if not ahp.accepted:
        return JSONResponse(
            status_code=422,
            content={
                "error": "AHP_INCONSISTENT",
                "cr": round(float(ahp.cr), 6),
                "threshold": CR_THRESHOLD,
                "message": "Οι συγκρίσεις δεν είναι συνεπείς. Παρακαλώ αναθεωρήστε.",
            },
        )

    weights = [ahp.weights[k] for k in criteria_keys]

    rows = (
        db.query(Property, Area)
        .options(joinedload(Property.area))
        .outerjoin(Area, Area.id == Property.area_id)
        .filter(Property.status == PropertyStatus.AVAILABLE)
        .all()
    )

    if not rows:
        return RecommendationsResponse(
            items=[], meta={"message": "No available properties to recommend"}
        )

    unknown_types: set[str] = set()
    missing_area_score = 0
    decision_matrix = []
    properties = []
    explain_values = []  # aligned with decision_matrix/properties (post-filter)

    for prop, area in rows:
        ptype = (prop.type or "").strip().upper()
        if ptype not in PROPERTY_TYPE_MAPPING:
            unknown_types.add(ptype or "<empty>")
            ptype_value = None
        else:
            ptype_value = float(PROPERTY_TYPE_MAPPING[ptype])

        # Dictionary-based area score (Area.area_score).
        area_score = area.area_score if area is not None else None
        if area_score is None:
            missing_area_score += 1
            area_score = 0.0

        if ptype_value is None:
            continue

        price = float(prop.price)
        size = float(prop.size)
        area_score = float(area_score)

        decision_matrix.append([price, size, float(ptype_value), area_score])
        properties.append(prop)
        explain_values.append(
            {
                "price": price,
                "size": size,
                # value used in TOPSIS for categorical criterion
                "property_type": float(ptype_value),
                # raw string still present on PropertyOut.type; include numeric for transparency
                "area_score": area_score,
            }
        )

    if STRICT_PROPERTY_TYPE_MAPPING and unknown_types:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Missing PROPERTY_TYPE_MAPPING for one or more Property.type values",
                "unknown_types": sorted(list(unknown_types)),
            },
        )

    ranked = topsis_rank(
        decision_matrix=decision_matrix, weights=weights, is_benefit=is_benefit
    )

    items = [
        RecommendationItem(
            property=PropertyOut.model_validate(properties[r.index]),
            score=r.score,
            explain={
                "ahp": {"weights": ahp.weights, "cr": ahp.cr},
                "topsis": {
                    "d_best": r.d_best,
                    "d_worst": r.d_worst,
                    # for UI explainability + client-side what-if rerank
                    "criteria_values": explain_values[r.index],
                },
            },
        )
        for r in ranked
    ]

    return RecommendationsResponse(
        items=items,
        meta={
            "criteria_order": criteria_keys,
            "is_benefit": is_benefit,
            "cr_threshold": CR_THRESHOLD,
            "available_properties_total": len(rows),
            "ranked_properties_count": len(items),
            "missing_area_score_count": missing_area_score,
        },
    )
