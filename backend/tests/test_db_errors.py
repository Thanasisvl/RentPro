from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_duplicate_user_registration():
    user_data = {
        "username": "duplicateuser",
        "password": "testpassword",
        "email": "dup@example.com",
        "full_name": "Dup User"
    }
    resp1 = client.post("/users/register", json=user_data)
    assert resp1.status_code == 200

    resp2 = client.post("/users/register", json=user_data)
    assert resp2.status_code in (400, 409, 422)

def test_missing_required_field_user_registration():
    user_data = {
        "username": "missingemail",
        "password": "testpassword"
        # Missing "email" and "full_name"
    }
    resp = client.post("/users/register", json=user_data)
    assert resp.status_code == 422