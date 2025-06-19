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
sender_names = sender_names_collection()

today_str = datetime.date.today().strftime("%Y-%m-%d")
updated_at = datetime.datetime.now()

data = [
    {
        "sender_name": f"Sender {i+1}",
        "mobile_provider": "AIS" if i % 2 == 0 else "TRUE",
        "phone_number": f"08{i+1}1234567",
        "full_name": f"นายทดสอบ {i+1}",
        "date": today_str,
        "status": [],
        "created_at": updated_at,
        "updated_at": updated_at
    } for i in range(9)
]

if data:
    sender_names.insert_many(data)
    print(f"Inserted {len(data)} mock senders in MongoDB")

print("✅ เพิ่ม mock sender เข้า MongoDB แล้ว")