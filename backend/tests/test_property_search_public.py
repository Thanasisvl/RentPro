import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.utils import (
    create_property,
    register_and_login,
    set_property_status,
)

client = TestClient(app)


@pytest.fixture
def owner_headers():
    _, headers = register_and_login(
        client,
        "owner_search",
        "testpassword",
        "owner_search@example.com",
        is_owner=True,
    )
    return headers


def test_public_search_structured_response_and_zero_results():
    resp = client.get("/properties/search?min_price=999999")
    assert resp.status_code == 200
    data = resp.json()
    assert "meta" in data and "items" in data
    assert data["meta"]["total"] == 0
    assert data["meta"]["count"] == 0
    assert data["items"] == []


def test_public_search_invalid_ranges_returns_422():
    resp = client.get("/properties/search?min_price=2000&max_price=1000")
    assert resp.status_code == 422


def test_public_search_filters_by_area_and_excludes_non_available(owner_headers):
    p1 = create_property(
        client,
        owner_headers,
        title="Athens Center Apartment",
        address="Athens Center, Main St 1",
        price=900.0,
        size=80.0,
        type="APARTMENT",
    )
    p2 = create_property(
        client,
        owner_headers,
        title="Piraeus House",
        address="Piraeus Port, Side St 2",
        price=1500.0,
        size=120.0,
        type="DETACHED_HOUSE",
    )

    set_property_status(p2["id"], "RENTED")

    resp = client.get("/properties/search?area=Center")
    assert resp.status_code == 200
    data = resp.json()
    ids = [x["id"] for x in data["items"]]

    assert p1["id"] in ids
    assert p2["id"] not in ids  # RENTED must not appear


def test_public_search_combined_filters(owner_headers):
    create_property(
        client,
        owner_headers,
        title="Small cheap",
        address="Athens Center",
        price=700.0,
        size=45.0,
        type="STUDIO",
    )
    create_property(
        client,
        owner_headers,
        title="Large expensive",
        address="Athens Center",
        price=2500.0,
        size=140.0,
        type="DETACHED_HOUSE",
    )

    resp = client.get(
        "/properties/search?area=Center&min_price=600&max_price=1000&min_size=40&max_size=60"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["meta"]["total"] >= 1
    assert all(600 <= p["price"] <= 1000 for p in data["items"])
    assert all(40 <= p["size"] <= 60 for p in data["items"])


def test_public_search_macro_area_group_north_suburbs(owner_headers):
    # Addresses in northern suburbs should match macro area query like "Βόρεια Προάστεια".
    p1 = create_property(
        client,
        owner_headers,
        title="Marousi Apt",
        address="Λ. Κηφισίας 10, Μαρούσι",
        price=900.0,
        size=70.0,
        type="APARTMENT",
    )
    p2 = create_property(
        client,
        owner_headers,
        title="Cholargos Apt",
        address="Λ. Μεσογείων 305, Χολαργός",
        price=1100.0,
        size=80.0,
        type="APARTMENT",
    )
    p3 = create_property(
        client,
        owner_headers,
        title="Piraeus Apt",
        address="Κολοκοτρώνη 8, Πειραιάς",
        price=750.0,
        size=60.0,
        type="APARTMENT",
    )

    resp = client.get(
        "/properties/search?area=%CE%92%CF%8C%CF%81%CE%B5%CE%B9%CE%B1%20%CE%A0%CF%81%CE%BF%CE%AC%CF%83%CF%84%CE%B5%CE%B9%CE%B1"
    )
    assert resp.status_code == 200
    data = resp.json()
    ids = [x["id"] for x in data["items"]]

    assert p1["id"] in ids
    assert p2["id"] in ids
    assert p3["id"] not in ids
