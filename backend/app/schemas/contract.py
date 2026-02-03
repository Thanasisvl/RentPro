from pydantic import BaseModel, ConfigDict, Field, model_validator
from datetime import date, datetime
from app.models.contract import ContractStatus

class ContractBase(BaseModel):
    property_id: int
    tenant_id: int
    start_date: date
    end_date: date
    rent_amount: float = Field(..., gt=0)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    # κρίσιμο: να μη γίνονται σιωπηλά ignore άγνωστα keys (π.χ. tenant_id όταν λείπει)
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    tenant_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    rent_amount: float | None = Field(default=None, gt=0)

    # θα το κόβεις στο router για PUT (upload endpoint only)
    pdf_file: str | None = None

    @model_validator(mode="after")
    def validate_dates_if_both_given(self):
        if self.start_date is not None and self.end_date is not None:
            if self.end_date <= self.start_date:
                raise ValueError("end_date must be after start_date")
        return self


class ContractOut(ContractBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ContractStatus
    pdf_file: str | None = None
    terminated_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by_id: int | None = None
    updated_by_id: int | None = None