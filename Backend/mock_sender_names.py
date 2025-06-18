from pymongo import MongoClient, UpdateOne
import datetime
from app.models.sender_names import sender_names_collection
from app.models.response_from_telco import response_from_telco_collection
from app.utils.helpers import is_status_object
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

MONGO_CONNECTION_STRING = os.getenv("MONGO_CONNECTION_STRING")
MONGO_DATABASE_NAME = os.getenv("MONGO_DATABASE_NAME")

client = MongoClient(MONGO_CONNECTION_STRING)
db = client[MONGO_DATABASE_NAME]
sender_names = sender_names_collection()
response_from_telco = response_from_telco_collection()

today_str = datetime.date.today().strftime("%Y-%m-%d")
updated_at = datetime.datetime.now()

# Mock sender data
data = [
    {
        "sender_name": f"Sender {i+1}",
        "mobile_provider": "AIS" if i % 2 == 0 else "TRUE",
        "phone_number": f"08{i+1}1234567",
        "full_name": f"นายทดสอบ {i+1}",
        "date": today_str,
        "created_at": updated_at,
        "updated_at": updated_at
    } for i in range(5)  # Adjusted to 5 senders as per flow
]

bulk_updates = []

# Check existing records in sender_names and response_from_telco
for sender in data:
    sender_name = sender["sender_name"]
    phone_number = sender["phone_number"]
    
    # Check existing sender in sender_names
    existing_doc = sender_names.find_one({"sender_name": sender_name, "phone_number": phone_number})
    
    # Check response_from_telco for previous statuses
    telco_doc = response_from_telco.find_one({"sender_name": sender_name, "phone_number": phone_number})
    
    status_list = existing_doc.get("status", []) if existing_doc else []
    
    if telco_doc:
        telco_status = telco_doc.get("status", [])
        if is_status_object(telco_status):
            status_names = [s["name"] for s in telco_status]
            if "received" in status_names and not any(s["name"] == "received" for s in status_list):
                status_list.append({"name": "received", "updated_at": updated_at})
            if "suspended" in status_names and not any(s["name"] == "suspended" for s in status_list):
                status_list.append({"name": "suspended", "updated_at": updated_at})
    
    update_data = {
        "sender_name": sender_name,
        "phone_number": phone_number,
        "mobile_provider": sender["mobile_provider"],
        "full_name": sender["full_name"],
        "date": sender["date"],
        "status": status_list,
        "created_at": existing_doc.get("created_at", updated_at) if existing_doc else updated_at,
        "updated_at": updated_at
    }
    
    bulk_updates.append(
        UpdateOne(
            {"sender_name": sender_name, "phone_number": phone_number},
            {"$set": update_data},
            upsert=True
        )
    )

if bulk_updates:
    sender_names.bulk_write(bulk_updates)
    logger.info(f"Inserted/Updated {len(bulk_updates)} mock senders in MongoDB")

print("✅ เพิ่ม/อัปเดต mock sender เข้า MongoDB แล้ว")