from __future__ import annotations

import unicodedata

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.property import Property, PropertyStatus
from app.schemas.property import PropertyCreate, PropertySearchFilters, PropertyUpdate


def _strip_accents(s: str) -> str:
    # Normalize Greek/Latin accents so "Βορεια" matches "Βόρεια"
    return "".join(
        ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn"
    )


def _norm_area_key(s: str) -> str:
    return " ".join(_strip_accents(str(s or "")).lower().strip().split())


# Macro areas (Greater Athens) → tokens to match against Property.address
_AREA_GROUPS: dict[str, dict[str, object]] = {
    "north_suburbs": {
        "aliases": {
            "north_suburbs",
            "north suburbs",
            "βορεια προαστεια",
            "βορεια",
            "βορεια προαστεια αθηνας",
        },
        "tokens": [
            # Δήμοι Βορείων Προαστείων (με πρακτικές παραλλαγές για addresses)
            "Αγία Παρασκευή",
            "Αμαρούσιο",
            "Μαρούσι",
            "Βριλήσσια",
            "Ηράκλειο",
            "Νέο Ηράκλειο",
            "Κηφισιά",
            "Λυκόβρυση",
            "Πεύκη",
            "Λυκόβρυσης-Πεύκης",
            "Λυκόβρυση-Πεύκη",
            "Μεταμόρφωση",
            "Νέα Ιωνία",
            "Παπάγου",
            "Χολαργός",
            "Παπάγου-Χολαργού",
            "Παπάγου-Χολαργός",
            "Πεντέλη",
            "Φιλοθέη",
            "Ψυχικό",
            "Φιλοθέης-Ψυχικού",
            "Φιλοθέη-Ψυχικό",
            "Χαλάνδρι",
            # Συχνή αναφορά περιοχής εντός Δήμου Πεντέλης
            "Μελίσσια",
        ],
    },
    "center": {
        "aliases": {
            "κεντρο",
            "κεντρο αθηνας",
            "αθηνα κεντρο",
            "κεντρικος τομεας",
            "κεντρικος τομεας αθηνας",
        },
        "tokens": [
            # Κεντρικός Τομέας Αθηνών (δήμοι)
            "Αθήνα",
            "Δήμος Αθηναίων",
            "Βύρωνας",
            "Γαλάτσι",
            "Δάφνη",
            "Υμηττός",
            "Δάφνης-Υμηττού",
            "Ζωγράφου",
            "Ηλιούπολη",
            "Καισαριανή",
            "Φιλαδέλφεια",
            "Χαλκηδόνα",
            "Φιλαδελφείας-Χαλκηδόνας",
            # Πρακτικά keywords που εμφανίζονται συχνά σε διευθύνσεις στο κέντρο
            "Κολωνάκι",
            "Εξάρχεια",
            "Σύνταγμα",
            "Ομόνοια",
            "Παγκράτι",
        ],
    },
    "south_suburbs": {
        "aliases": {
            "south_suburbs",
            "south suburbs",
            "νοτια προαστεια",
            "νοτια",
            "νοτιος τομεας",
            "νοτιος τομεας αθηνας",
        },
        "tokens": [
            # Νότιος Τομέας Αθηνών (δήμοι)
            "Άγιος Δημήτριος",
            "Αγίου Δημητρίου",
            "Άλιμος",
            "Γλυφάδα",
            "Ελληνικό",
            "Αργυρούπολη",
            "Ελληνικού-Αργυρούπολης",
            "Καλλιθέα",
            "Μοσχάτο",
            "Ταύρος",
            "Μοσχάτου-Ταύρου",
            "Νέα Σμύρνη",
            "Παλαιό Φάληρο",
            "Παλαιό Φάληρο",
            "Παλαιου Φαληρου",
            "Παλαιό",
            "Φάληρο",
        ],
    },
    "piraeus": {
        "aliases": {"piraeus", "πειραιας"},
        "tokens": [
            # Π.Ε. Πειραιά / Δήμοι
            "Πειραιάς",
            "Δήμος Πειραιώς",
            "Νίκαια",
            "Άγιος Ιωάννης Ρέντης",
            "Αγίου Ιωάννη Ρέντη",
            "Νίκαιας-Αγίου Ιωάννη Ρέντη",
            "Νίκαιας-Αγίου Ιωάννη Ρέντη",
            "Κορυδαλλός",
            "Κερατσίνι",
            "Δραπετσώνα",
            "Κερατσινίου-Δραπετσώνας",
            "Πέραμα",
        ],
    },
    "west_attica": {
        "aliases": {
            "west_attica",
            "west attica",
            "δυτικη αττικη",
            "δυτικη",
            "δυτικη αττικη περιφερεια",
        },
        "tokens": [
            # Δυτική Αττική (δήμοι)
            "Ασπρόπυργος",
            "Ελευσίνα",
            "Μάνδρα",
            "Ειδυλλία",
            "Μάνδρας-Ειδυλλίας",
            "Μέγαρα",
            "Μεγαρέων",
            "Φυλή",
            # πρακτικές παραλλαγές
            "Μανδρα",
            "Ελευσινα",
            "Ασπροπυργος",
            "Μεγαρα",
        ],
    },
    "east_attica": {
        "aliases": {
            "east_attica",
            "east attica",
            "ανατολικη αττικη",
            "ανατολικη",
            "ανατολικη αττικη περιφερεια",
        },
        "tokens": [
            # Ανατολική Αττική (δήμοι / συχνές αναφορές)
            "Αχαρνές",
            "Αχαρνών",
            "Μενίδι",
            "Βάρη",
            "Βούλα",
            "Βουλιαγμένη",
            "Βάρης-Βούλας-Βουλιαγμένης",
            "Διόνυσος",
            "Διονύσου",
            "Κορωπί",
            "Κρωπίας",
            "Λαύριο",
            "Λαυρεωτικής",
            "Κερατέα",
            "Μαραθώνας",
            "Μαραθώνος",
            "Νέα Μάκρη",
            "Μαρκόπουλο",
            "Μαρκοπούλου Μεσογαίας",
            "Παιανία",
            "Παιανίας",
            "Παλλήνη",
            "Παλλήνης",
            "Γέρακας",
            "Ραφήνα",
            "Πικέρμι",
            "Ραφήνας-Πικερμίου",
            "Σαρωνικός",
            "Σαρωνικού",
            "Καλύβια",
            "Σπάτα",
            "Αρτέμιδα",
            "Σπάτων-Αρτέμιδος",
            "Λούτσα",
            "Ωρωπός",
            "Ωρωπού",
        ],
    },
    "west": {
        "aliases": {"west", "δυτικα", "δυτικα προαστεια"},
        "tokens": [
            # Δήμοι Δυτικών Προαστείων (με πρακτικές παραλλαγές για addresses)
            "Αγία Βαρβάρα",
            "Άγιοι Ανάργυροι",
            "Καματερό",
            "Άγιοι Ανάργυροι-Καματερού",
            "Άγιοι Ανάργυροι-Καματερό",
            "Αιγάλεω",
            "Ίλιον",
            "Περιστέρι",
            "Πετρούπολη",
            "Χαϊδάρι",
        ],
    },
}


def _area_tokens_for_query(area: str) -> list[str] | None:
    """
    If the user entered a known macro-area (e.g. \"Βόρεια Προάστεια\"),
    return a list of tokens to OR-match in the address.
    """
    key = _norm_area_key(area)
    if not key:
        return None
    for group in _AREA_GROUPS.values():
        aliases = {_norm_area_key(a) for a in (group.get("aliases") or set())}
        if any(a and a in key for a in aliases):
            base = [str(t) for t in (group.get("tokens") or []) if str(t).strip()]
            # Expand to support both accented and non-accented address data.
            expanded: list[str] = []
            seen: set[str] = set()
            for t in base:
                for cand in (t, _strip_accents(t)):
                    if not cand:
                        continue
                    if cand in seen:
                        continue
                    seen.add(cand)
                    expanded.append(cand)
            return expanded
    return None


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
        tokens = _area_tokens_for_query(filters.area)
        if tokens:
            q = q.filter(or_(*[Property.address.ilike(f"%{t}%") for t in tokens]))
        else:
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
