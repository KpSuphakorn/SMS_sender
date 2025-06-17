from app.models.database import mongo_db

def response_from_telco_collection():
    return mongo_db["response_from_telco"]