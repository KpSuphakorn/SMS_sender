import os
from dotenv import load_dotenv
from app.models.database import mongo_db

load_dotenv()

MONGO_SENDER_NAMES_COLLECTION = os.getenv("MONGO_SENDER_NAMES_COLLECTION")

def sender_names_collection():
    return mongo_db[MONGO_SENDER_NAMES_COLLECTION]