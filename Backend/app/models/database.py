import os
from dotenv import load_dotenv
from pymongo import MongoClient
import gridfs

load_dotenv()

MONGO_CONNECTION_STRING = os.getenv("MONGO_CONNECTION_STRING")
MONGO_DATABASE_NAME = os.getenv("MONGO_DATABASE_NAME")

mongo_client = MongoClient(MONGO_CONNECTION_STRING)
mongo_db = mongo_client[MONGO_DATABASE_NAME]
grid_fs = gridfs.GridFS(mongo_db)