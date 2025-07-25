from app.models.database import mongo_db

def pending_requests_collection():
    return mongo_db["pending_requests"]