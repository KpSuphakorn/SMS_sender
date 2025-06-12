import os
from dotenv import load_dotenv
from app.models.database import mongo_db

load_dotenv()

MONGO_MOCK_COLLECTION = os.getenv("MONGO_MOCK_COLLECTION")

def mock_data_collection():
    return mongo_db[MONGO_MOCK_COLLECTION]