from pymongo import MongoClient
import datetime
from app.models.sender_names import sender_names_collection
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_CONNECTION_STRING = os.getenv("MONGO_CONNECTION_STRING")
MONGO_DATABASE_NAME = os.getenv("MONGO_DATABASE_NAME")

client = MongoClient(MONGO_CONNECTION_STRING)
db = client[MONGO_DATABASE_NAME]
collection = sender_names_collection()

today_str = datetime.date.today().strftime("%Y-%m-%d")

data = [
    {
        "sender_name": f"Sender {i+1}",
        "mobile_provider": "AIS" if i % 2 == 0 else "TRUE",
        "phone_number": f"08{i+1}1234567",
        "full_name": f"นายทดสอบ {i+1}",
        "date": today_str,
        "status": ["available"],
        "created_at": datetime.datetime.now(),
        "updated_at": datetime.datetime.now()
    } for i in range(8)
]

collection.insert_many(data)
print("✅ เพิ่ม mock sender เข้า MongoDB แล้ว")