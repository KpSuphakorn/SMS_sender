from app.models.database import mongo_db

def users_collection():
    return mongo_db["users"]