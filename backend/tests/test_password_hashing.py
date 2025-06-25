from app.crud.user import get_password_hash
from app.core.security import verify_password

def test_password_hashing_and_verification():
    password = "supersecret"
    hashed = get_password_hash(password)
    assert hashed != password  # Hash should not be the same as the password
    assert verify_password(password, hashed)  # Should verify correctly
    assert not verify_password("wrongpassword", hashed)  # Wrong password should fail

def test_hash_is_different_each_time():
    password = "anothersecret"
    hash1 = get_password_hash(password)
    hash2 = get_password_hash(password)
    assert hash1 != hash2  # Hashes should be different due to salt