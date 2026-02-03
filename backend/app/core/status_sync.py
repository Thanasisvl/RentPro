from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models.contract import Contract, ContractStatus
from app.models.property import Property, PropertyStatus


def sync_property_status(
    db: Session, property_id: int, *, today: date | None = None
) -> PropertyStatus | None:
    """
    A3 policy:
      - RENTED  <=> exists ACTIVE contract with start_date <= today <= end_date
      - AVAILABLE <=> otherwise

    Also auto-expires overdue ACTIVE contracts (end_date < today).
    Returns the computed PropertyStatus, or None if property not found.
    """
    today = today or date.today()
    changed = False

    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        return None

    # 1) Expire overdue ACTIVE contracts
    overdue = (
        db.query(Contract)
        .filter(
            Contract.property_id == property_id,
            Contract.status == ContractStatus.ACTIVE,
            Contract.end_date < today,
        )
        .all()
    )
    for c in overdue:
        c.status = ContractStatus.EXPIRED
        changed = True

    # 2) Is there a "running" ACTIVE contract today?
    running_exists = (
        db.query(Contract.id)
        .filter(
            Contract.property_id == property_id,
            Contract.status == ContractStatus.ACTIVE,
            Contract.start_date <= today,
            Contract.end_date >= today,
        )
        .first()
        is not None
    )

    new_status = PropertyStatus.RENTED if running_exists else PropertyStatus.AVAILABLE

    if property_obj.status != new_status:
        property_obj.status = new_status
        changed = True

    if changed:
        db.commit()
        db.refresh(property_obj)

    return new_status


def sync_overdue_contracts_global(db: Session, *, today: date | None = None) -> int:
    """
    Expire all overdue ACTIVE contracts globally and recompute affected properties.
    Returns number of affected properties.
    """
    today = today or date.today()

    overdue_contracts = (
        db.query(Contract)
        .filter(Contract.status == ContractStatus.ACTIVE, Contract.end_date < today)
        .all()
    )
    if not overdue_contracts:
        return 0

    affected_property_ids: set[int] = set()
    for c in overdue_contracts:
        c.status = ContractStatus.EXPIRED
        affected_property_ids.add(c.property_id)

    db.commit()

    for pid in affected_property_ids:
        sync_property_status(db, pid, today=today)

    return len(affected_property_ids)
