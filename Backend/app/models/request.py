import os
from app.models.database import mongo_db
from dotenv import load_dotenv

load_dotenv()

MONGO_REQUESTS_COLLECTION = os.getenv("MONGO_REQUESTS_COLLECTION")

def request_logs_collection():
    return mongo_db[MONGO_REQUESTS_COLLECTION]