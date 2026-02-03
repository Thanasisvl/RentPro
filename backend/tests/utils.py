def make_admin(username):
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole

    db = SessionLocal()
    db_user = db.query(User).filter_by(username=username).first()
    db_user.role = UserRole.ADMIN
    db.commit()
    db.close()


def login_headers(client, username: str, password: str):
    """
    Login existing user and return Authorization headers.
    Useful when you changed role in DB (e.g. make_admin) and need a fresh token.
    """
    login_resp = client.post(
        "/login", json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def register_and_login(client, username, password, email, is_owner=False):
    from app.models.user import UserRole

    role = UserRole.OWNER if is_owner else UserRole.USER

    resp = client.post(
        "/users/register",
        json={
            "username": username,
            "email": email,
            "full_name": username.title(),
            "password": password,
            "role": role.value,
        },
    )
    assert resp.status_code == 200
    user = resp.json()

    # Login user
    login_resp = client.post(
        "/login",
        json={"username": username, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return user, headers


def set_property_status(property_id: int, status_value: str):
    """
    Update property.status directly in DB for test setup.
    status_value: "AVAILABLE" | "RENTED" | "INACTIVE"
    """
    from app.db.session import SessionLocal
    from app.models.property import Property, PropertyStatus

    db = SessionLocal()
    try:
        p = db.query(Property).filter(Property.id == property_id).first()
        assert p is not None
        p.status = PropertyStatus(status_value)
        db.commit()
    finally:
        db.close()


def seed_locked_criteria_for_tests():
    from app.db.session import SessionLocal
    from app.core.seed import seed_locked_criteria

    db = SessionLocal()
    try:
        seed_locked_criteria(db)
    finally:
        db.close()


def set_area_score(property_id: int, area_score: float | None):
    """
    Upsert PropertyLocationFeatures for a property (used by UC-04 TOPSIS).
    """
    from app.db.session import SessionLocal
    from app.models.property_location_features import PropertyLocationFeatures

    db = SessionLocal()
    try:
        row = (
            db.query(PropertyLocationFeatures)
            .filter(PropertyLocationFeatures.property_id == property_id)
            .first()
        )
        if row is None:
            row = PropertyLocationFeatures(
                property_id=property_id, area_score=area_score
            )
            db.add(row)
        else:
            row.area_score = area_score
        db.commit()
    finally:
        db.close()


def create_preference_profile(client, headers, name: str = "UC-04 Profile"):
    resp = client.put("/preference-profiles/me", json={"name": name}, headers=headers)
    assert resp.status_code == 200
    return resp.json()


def set_pairwise_all_equal(client, headers):
    """
    Sends a fully-complete set of pairwise comparisons for the 4 locked criteria
    with value=1 (perfectly consistent).
    """
    body = {
        "comparisons": [
            {"criterion_a_key": "price", "criterion_b_key": "size", "value": 1},
            {
                "criterion_a_key": "price",
                "criterion_b_key": "property_type",
                "value": 1,
            },
            {"criterion_a_key": "price", "criterion_b_key": "area_score", "value": 1},
            {"criterion_a_key": "size", "criterion_b_key": "property_type", "value": 1},
            {"criterion_a_key": "size", "criterion_b_key": "area_score", "value": 1},
            {
                "criterion_a_key": "property_type",
                "criterion_b_key": "area_score",
                "value": 1,
            },
        ]
    }
    resp = client.post(
        "/preference-profiles/me/pairwise-comparisons", json=body, headers=headers
    )
    assert resp.status_code == 200
    return resp.json()


def create_property(client, headers, **overrides):
    from app.core.recommendation_config import PROPERTY_TYPE_ALLOWED

    payload = {
        "title": "Test Property",
        "description": "A nice place",
        "address": "123 Main St",
        "type": "APARTMENT",  # locked & normalized
        "size": 100.0,
        "price": 1200.0,
    }
    payload.update(overrides)

    if "type" in payload and payload["type"] is not None:
        payload["type"] = str(payload["type"]).strip().upper()
        assert (
            payload["type"] in PROPERTY_TYPE_ALLOWED
        ), f"Invalid test Property.type: {payload['type']}"

    resp = client.post("/properties/", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()
