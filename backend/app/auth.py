import os
import bcrypt as _bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db

SECRET_KEY = os.getenv("JWT_SECRET", "workordr-dev-secret-change-in-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    try:
        return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
    except Exception:
        import hashlib, secrets, base64
        salt = secrets.token_bytes(16)
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 260000)
        return f"pbkdf2${base64.b64encode(salt).decode()}${base64.b64encode(key).decode()}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if hashed.startswith("pbkdf2$"):
            import hashlib, base64
            _, salt_b64, key_b64 = hashed.split("$")
            salt = base64.b64decode(salt_b64)
            expected = base64.b64decode(key_b64)
            actual = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, 260000)
            return actual == expected
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, company_id: str | None, role: str, technician_id: str | None = None) -> str:
    payload = {
        "sub": user_id,
        "company_id": company_id,
        "role": role,
        "technician_id": technician_id,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    from app.models import User
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
