from fastapi import APIRouter, HTTPException, Depends
from app.schemas.user import UserCreate, UserLogin
from app.utils.authentication import create_access_token
from app.dependencies import get_current_user
from app.models.user import users_collection
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

router = APIRouter()

def create_user(data: UserCreate):
    users = users_collection()
    if users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="อีเมลนี้มีผู้ใช้งานแล้ว")
    hashed_password = generate_password_hash(data.password)
    user_data = {
        "name": data.name,
        "email": data.email,
        "password": hashed_password,
        "role": data.role,
        "created_at": datetime.datetime.utcnow()
    }
    result = users.insert_one(user_data)
    user = users.find_one({"_id": result.inserted_id})
    return user

def authenticate_user(data: UserLogin):
    users = users_collection()
    user = users.find_one({"email": data.email})
    if not user or not check_password_hash(user["password"], data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

@router.post("/user/register")
def register_user(data: UserCreate):
    user = create_user(data)
    token = create_access_token(user)
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user["role"], "token": token}

@router.post("/user/login")
def login_user(data: UserLogin):
    user = authenticate_user(data)
    token = create_access_token(user)
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user["role"], "token": token}

@router.get("/user/logout")
def logout():
    return {"message": "Logged out (frontend should clear token)"}

@router.get("/user/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"], "role": current_user.get("role")}