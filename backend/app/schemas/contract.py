from pydantic import BaseModel, ConfigDict, field_validator, Field, model_validator
from datetime import date, datetime
from app.models.contract import ContractStatus

class ContractBase(BaseModel):
    property_id: int
    tenant_id: int
    start_date: date
    end_date: date
    rent_amount: float = Field(..., gt=0)
    pdf_file: str | None = None  # optional

class ContractCreate(ContractBase):
    @model_validator(mode="after")
    def check_dates(self) -> "ContractCreate":
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self

class ContractUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    rent_amount: float | None = Field(default=None, gt=0)
    pdf_file: str | None = None

class ContractOut(ContractBase):
    id: int
    status: ContractStatus
    terminated_at: date | None = None

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

    @field_validator("terminated_at", mode="before")
    def parse_terminated_at(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v

    model_config = ConfigDict(from_attributes=True)