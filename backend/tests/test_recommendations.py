import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"

from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import Base, engine
from tests.utils import (
    register_and_login,
    create_property,
    set_property_status,
    seed_locked_criteria_for_tests,
    set_area_score,
    create_preference_profile,
    set_pairwise_all_equal,
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_locked_criteria_for_tests()

@pytest.fixture
def user_headers():
    _, headers = register_and_login(client, "rec_user", "testpassword", "rec_user@example.com", is_owner=False)
    return headers

@pytest.fixture
def owner_headers():
    _, headers = register_and_login(client, "rec_owner", "testpassword", "rec_owner@example.com", is_owner=True)
    return headers

def test_recommendations_404_if_no_profile(user_headers):
    r = client.get("/recommendations", headers=user_headers)
    assert r.status_code == 404

def test_recommendations_409_if_no_pairwise(user_headers):
    create_preference_profile(client, user_headers, name="Prefs")
    r = client.get("/recommendations", headers=user_headers)
    assert r.status_code == 409

def test_recommendations_a2_no_available_returns_empty(user_headers, owner_headers):
    # Create profile + pairwise (consistent)
    create_preference_profile(client, user_headers)
    set_pairwise_all_equal(client, user_headers)

    # Create a property then make it non-available
    p = create_property(client, owner_headers, type="APARTMENT", price=1000.0, size=60.0)
    set_area_score(p["id"], 7.0)
    set_property_status(p["id"], "RENTED")

    r = client.get("/recommendations", headers=user_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["items"] == []

def test_recommendations_success_ranked_items(user_headers, owner_headers):
    create_preference_profile(client, user_headers)
    set_pairwise_all_equal(client, user_headers)  # equal weights, CR should be ~0

    p1 = create_property(client, owner_headers, type="APARTMENT", price=900.0, size=80.0)
    set_area_score(p1["id"], 8.0)

    p2 = create_property(client, owner_headers, type="STUDIO", price=1100.0, size=45.0)
    set_area_score(p2["id"], 5.0)

    r = client.get("/recommendations", headers=user_headers)
    assert r.status_code == 200
    body = r.json()

    assert "items" in body and isinstance(body["items"], list)
    assert len(body["items"]) == 2

    # sorted by score desc
    scores = [it["score"] for it in body["items"]]
    assert scores == sorted(scores, reverse=True)

    # explainability present
    first = body["items"][0]
    assert "explain" in first
    assert "ahp" in first["explain"]
    assert "topsis" in first["explain"]
    assert first["explain"]["ahp"]["cr"] <= body["meta"]["cr_threshold"]

def test_recommendations_a1_high_cr_returns_422(user_headers, owner_headers):
    create_preference_profile(client, user_headers)

    # Full set but intentionally inconsistent to trigger CR > 0.10 + 1e-9
    bad = {
        "comparisons": [
            {"criterion_a_key": "price", "criterion_b_key": "size", "value": 9},
            {"criterion_a_key": "price", "criterion_b_key": "property_type", "value": 1/9},
            {"criterion_a_key": "price", "criterion_b_key": "area_score", "value": 9},
            {"criterion_a_key": "size", "criterion_b_key": "property_type", "value": 9},
            {"criterion_a_key": "size", "criterion_b_key": "area_score", "value": 1/9},
            {"criterion_a_key": "property_type", "criterion_b_key": "area_score", "value": 9},
        ]
    }
    resp = client.post("/preference-profiles/me/pairwise-comparisons", json=bad, headers=user_headers)
    assert resp.status_code == 200

    # Need at least one available property to force AHP evaluation path to continue to A1 check (it happens before TOPSIS)
    p = create_property(client, owner_headers, type="APARTMENT", price=1000.0, size=60.0)
    set_area_score(p["id"], 6.0)

    r = client.get("/recommendations", headers=user_headers)
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert "cr" in detail