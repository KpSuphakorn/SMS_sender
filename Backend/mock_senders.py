from pymongo import MongoClient
import datetime
import config as cfg

# === config จากไฟล์ config.py ของคุณ ===
# MONGO_CONNECTION_STRING = "mongodb+srv://police:TdfMR9Y2dsv7OhYr@policesystem.ja6b66c.mongodb.net/ccib_data_storage?retryWrites=true&w=majority"
# DB_NAME = "ccib_data_storage"
# COLLECTION_NAME = "mock_senders"

client = MongoClient(cfg.MONGO_CONNECTION_STRING)
db = client[cfg.MONGO_DATABASE_NAME]
collection = db[cfg.MONGO_MOCK_COLLECTION]

today_str = datetime.date.today().strftime("%Y-%m-%d")

data = [
    {
        "sender_name": f"Sender {i+1}",
        "ค่ายมือถือ": "AIS" if i % 2 == 0 else "TRUE",
        "เบอร์มือถือ": f"08{i}1234567",
        "ชื่อ-สกุล": f"นายทดสอบ {i+1}",
        "date": today_str
    } for i in range(8)
]

collection.insert_many(data)
print("✅ เพิ่ม mock sender เข้า MongoDB แล้ว")
