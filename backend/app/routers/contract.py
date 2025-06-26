from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
import os
from uuid import uuid4
from sqlalchemy.orm import Session
from app.schemas.contract import ContractCreate, ContractUpdate, ContractOut
from app.models.user import User
from app.models.property import Property
from app.crud import contract as crud_contract
from app.core.utils import is_admin, get_current_user_payload
from app.db.session import get_db
from typing import List

router = APIRouter()

UPLOAD_DIR = "./uploads/contracts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=ContractOut)
def create_contract(
    request: Request,
    contract: ContractCreate,
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    property_obj = db.query(Property).filter(Property.id == contract.property_id).first()
    if not property_obj or property_obj.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to create contract for this property")
    return crud_contract.create_contract(db=db, contract=contract)

@router.get("/", response_model=List[ContractOut])
def get_contracts(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    # Only return contracts for properties owned by the current user
    return db.query(crud_contract.Contract).join(Property).filter(Property.owner_id == user.id).offset(skip).limit(limit).all()

@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db)
    ):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if db_contract.property.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to view this contract")
    return db_contract

@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(
    request: Request,
    contract_id: int,
    contract: ContractUpdate,
    db: Session = Depends(get_db)
    ):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if db_contract.property.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to update this contract")
    db_contract = crud_contract.update_contract(db, contract_id, contract)
    return db_contract

@router.delete("/{contract_id}", response_model=ContractOut)
def delete_contract(
    request: Request,
    contract_id: int,
    db: Session = Depends(get_db)
    ):
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    if db_contract.property.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to delete this contract")
    db_contract = crud_contract.delete_contract(db, contract_id)
    return db_contract

@router.post("/{contract_id}/upload")
async def upload_contract_pdf(
    request: Request,
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
    ):
    user_payload = get_current_user_payload(request)
    user = db.query(User).filter(User.username == user_payload["sub"]).first()
    db_contract = crud_contract.get_contract(db, contract_id)
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if db_contract.property.owner_id != user.id and not is_admin(request):
        raise HTTPException(status_code=403, detail="Not authorized to upload for this contract")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    filename = f"{contract_id}_{uuid4().hex}.pdf"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    # Update the contract's pdf_file field
    db_contract.pdf_file = f"/uploads/contracts/{filename}"
    db.commit()
    db.refresh(db_contract)
    return {"filename": filename, "url": db_contract.pdf_file}