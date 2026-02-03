from sqlalchemy.orm import Session

from app.models.property import Property, PropertyStatus
from app.schemas.property import PropertyCreate, PropertySearchFilters, PropertyUpdate


def create_property(db: Session, property: PropertyCreate, owner_id: int):
    data = property.model_dump()
    data.pop("owner_id", None)

    db_property = Property(**data, owner_id=owner_id)
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    return db_property


def get_properties(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Property).offset(skip).limit(limit).all()


def get_property(db: Session, property_id: int):
    return db.query(Property).filter(Property.id == property_id).first()


def update_property(db: Session, property_id: int, property: PropertyUpdate):
    db_property = db.query(Property).filter(Property.id == property_id).first()
    if not db_property:
        return None

    property_data = property.model_dump(exclude_unset=True)
    for key, value in property_data.items():
        setattr(db_property, key, value)

    db.commit()
    db.refresh(db_property)
    return db_property


def delete_property(db: Session, property_id: int):
    db_property = db.query(Property).filter(Property.id == property_id).first()
    if not db_property:
        return None

    db.delete(db_property)
    db.commit()
    return db_property


def search_properties(db: Session, filters: PropertySearchFilters):
    """
    UC-03 search:
    - Only AVAILABLE properties are visible in the public marketplace search.
    - Returns (items, total) so API can provide FR-11 meta.
    """
    q = db.query(Property).filter(Property.status == PropertyStatus.AVAILABLE)

    if filters.area:
        q = q.filter(Property.address.ilike(f"%{filters.area}%"))

    if filters.type:
        q = q.filter(Property.type.ilike(f"%{filters.type}%"))

    if filters.min_price is not None:
        q = q.filter(Property.price >= filters.min_price)
    if filters.max_price is not None:
        q = q.filter(Property.price <= filters.max_price)

    if filters.min_size is not None:
        q = q.filter(Property.size >= filters.min_size)
    if filters.max_size is not None:
        q = q.filter(Property.size <= filters.max_size)

    total = q.count()
    items = (
        q.order_by(Property.id.desc()).offset(filters.offset).limit(filters.limit).all()
    )
    return items, total
