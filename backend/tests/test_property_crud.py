import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./backend/test_test.db"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def register_and_login(username="owner1", password="testpassword", email="owner1@example.com"):
    # Register user
    resp = client.post(
        "/users/register",
        json={
            "username": username,
            "email": email,
            "full_name": "Owner One",
            "password": password,
            "role": "OWNER"
        }
    )
    assert resp.status_code == 200
    # Login user
    login_resp = client.post(
        "/login",
        json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return resp.json(), headers

@pytest.fixture
def owner_headers():
    _, headers = register_and_login()
    return headers

def test_create_property(owner_headers):
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    assert resp.status_code == 200
    prop = resp.json()
    assert prop["title"] == "Test Property"
    assert prop["address"] == "123 Main St"
    assert prop["type"] == "Apartment"
    assert prop["size"] == 100.0
    assert prop["price"] == 1200.0

def test_get_property(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    prop = resp.json()
    prop_id = prop["id"]
    response = client.get(f"/properties/{prop_id}", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Property"
    assert data["id"] == prop_id

def test_get_properties(owner_headers):
    # Create two properties
    client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    client.post(
        "/properties/",
        json={
            "title": "Second Property",
            "description": "Another place",
            "address": "456 Side St",
            "type": "House",
            "size": 150.0,
            "price": 2000.0
        },
        headers=owner_headers
    )
    response = client.get("/properties/", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    titles = [p["title"] for p in data]
    assert "Test Property" in titles
    assert "Second Property" in titles

def test_update_property(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    prop = resp.json()
    prop_id = prop["id"]
    response = client.put(
        f"/properties/{prop_id}",
        json={
            "title": "Updated Property",
            "description": "Updated description",
            "address": "789 New St",
            "type": "Studio",
            "size": 80.0,
            "price": 900.0
        },
        headers=owner_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Property"
    assert data["address"] == "789 New St"
    assert data["type"] == "Studio"
    assert data["size"] == 80.0
    assert data["price"] == 900.0

def test_delete_property(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    prop = resp.json()
    prop_id = prop["id"]
    response = client.delete(f"/properties/{prop_id}", headers=owner_headers)
    assert response.status_code == 200
    # Confirm property is deleted
    response = client.get(f"/properties/{prop_id}", headers=owner_headers)
    assert response.status_code == 404

def test_create_property_missing_fields(owner_headers):
    resp = client.post(
        "/properties/",
        json={
            "title": "Incomplete Property"
            # Missing description, address, type, size, price
        },
        headers=owner_headers
    )
    assert resp.status_code == 422

def test_create_property_invalid_data(owner_headers):
    resp = client.post(
        "/properties/",
        json={
            "title": "Invalid Property",
            "description": "Negative size",
            "address": "123 Main St",
            "type": "Apartment",
            "size": -50.0,
            "price": -100.0
        },
        headers=owner_headers
    )
    assert resp.status_code == 422

def test_get_properties_unauthenticated():
    resp = client.get("/properties/")
    assert resp.status_code == 401

def test_create_property_unauthenticated():
    resp = client.post(
        "/properties/",
        json={
            "title": "No Auth",
            "description": "No Auth",
            "address": "No Auth",
            "type": "Apartment",
            "size": 50.0,
            "price": 1000.0
        }
    )
    assert resp.status_code == 401

def test_update_nonexistent_property(owner_headers):
    resp = client.put(
        "/properties/99999",
        json={
            "title": "Does Not Exist",
            "description": "Nope",
            "address": "Nowhere",
            "type": "House",
            "size": 100.0,
            "price": 1000.0
        },
        headers=owner_headers
    )
    assert resp.status_code == 404

def test_delete_nonexistent_property(owner_headers):
    resp = client.delete("/properties/99999", headers=owner_headers)
    assert resp.status_code == 404

def test_update_property_invalid_data(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "To Update",
            "description": "desc",
            "address": "addr",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    prop_id = resp.json()["id"]
    # Try to update with invalid data
    resp = client.put(
        f"/properties/{prop_id}",
        json={
            "title": "Invalid Update",
            "description": "desc",
            "address": "addr",
            "type": "Apartment",
            "size": -10.0,
            "price": -500.0
        },
        headers=owner_headers
    )
    assert resp.status_code == 422

def test_update_property_not_owner(owner_headers):
    # Create property as owner1
    resp = client.post(
        "/properties/",
        json={
            "title": "Owner1 Property",
            "description": "desc",
            "address": "addr",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    prop_id = resp.json()["id"]
    # Register and login as another user
    _, other_headers = register_and_login(username="owner2", email="owner2@example.com")
    # Try to update property as owner2
    resp = client.put(
        f"/properties/{prop_id}",
        json={
            "title": "Hacked",
            "description": "desc",
            "address": "addr",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=other_headers
    )
    assert resp.status_code in (403, 404)