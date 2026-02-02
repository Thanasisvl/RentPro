from sqlalchemy.orm import Session
from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractUpdate

def create_contract(db: Session, contract: ContractCreate):
    db_contract = Contract(**contract.model_dump(exclude_none=True))
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

def get_contract(db: Session, contract_id: int):
    return db.query(Contract).filter(Contract.id == contract_id).first()

def get_contracts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Contract).offset(skip).limit(limit).all()

def update_contract(db: Session, contract_id: int, contract: ContractUpdate):
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not db_contract:
        return None
    contract_data = contract.model_dump(exclude_unset=True)
    for key, value in contract_data.items():
        setattr(db_contract, key, value)
    db.commit()
    db.refresh(db_contract)
    return db_contract

def delete_contract(db: Session, contract_id: int):
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if db_contract:
        db.delete(db_contract)
        db.commit()
    return db_contract