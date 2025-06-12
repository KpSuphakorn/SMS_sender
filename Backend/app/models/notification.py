from app.models.database import mongo_db

def notifications_collection():
    return mongo_db["notifications"]