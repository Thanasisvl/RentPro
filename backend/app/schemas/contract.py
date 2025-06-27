from pydantic import BaseModel, ConfigDict, field_validator, Field, model_validator
from datetime import date, datetime

class ContractBase(BaseModel):
    property_id: int
    tenant_id: int
    start_date: date
    end_date: date
    rent_amount: float = Field(..., gt=0, description="Rent amount must be greater than zero")
    pdf_file: str | None = None

class ContractCreate(ContractBase):
    property_id: int
    tenant_id: int
    start_date: date
    end_date: date
    rent_amount: float = Field(..., gt=0)
    pdf_file: str

    @model_validator(mode="after")
    def check_dates(cls, values):
        if values.end_date <= values.start_date:
            raise ValueError('end_date must be after start_date')
        return values

class ContractUpdate(ContractBase):
    start_date: date | None = None
    end_date: date | None = None
    rent_amount: float | None = None
    pdf_file: str | None = None

class ContractOut(ContractBase):
    id: int
    created_at: date
    updated_at: date | None = None

    @field_validator("created_at", mode="before")
    def parse_created_at(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v
    
    @field_validator("updated_at", mode="before")
    def parse_updated_at(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v

    model_config = ConfigDict(from_attributes=True)