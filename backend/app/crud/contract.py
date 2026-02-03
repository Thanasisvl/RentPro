from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models.contract import Contract, ContractStatus
from app.models.property import Property
from app.schemas.contract import ContractCreate, ContractUpdate


def create_contract(
    db: Session, contract: ContractCreate, *, created_by_id: int | None = None
):
    db_contract = Contract(**contract.model_dump(exclude_none=True))

    db_contract.created_by_id = created_by_id
    db_contract.updated_by_id = created_by_id

    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract


def get_contract(db: Session, contract_id: int):
    return db.query(Contract).filter(Contract.id == contract_id).first()


def get_contracts(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    owner_id: int | None = None,
    property_id: int | None = None,
    tenant_id: int | None = None,
    status: ContractStatus | None = None,
    running_today: bool | None = None,
):
    q = db.query(Contract)

    if owner_id is not None:
        q = q.join(Property).filter(Property.owner_id == owner_id)

    if property_id is not None:
        q = q.filter(Contract.property_id == property_id)

    if tenant_id is not None:
        q = q.filter(Contract.tenant_id == tenant_id)

    if status is not None:
        q = q.filter(Contract.status == status)

    if running_today is True:
        today = date.today()
        q = q.filter(
            Contract.status == ContractStatus.ACTIVE,
            Contract.start_date <= today,
            Contract.end_date >= today,
        )

    return q.order_by(Contract.id.desc()).offset(skip).limit(limit).all()


def update_contract(
    db: Session,
    contract_id: int,
    contract: ContractUpdate,
    *,
    updated_by_id: int | None = None,
):
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not db_contract:
        return None

    data = contract.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(db_contract, k, v)

    db_contract.updated_by_id = updated_by_id

    db.commit()
    db.refresh(db_contract)
    return db_contract


def delete_contract(db: Session, contract_id: int):
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if db_contract:
        db.delete(db_contract)
        db.commit()
    return db_contract
