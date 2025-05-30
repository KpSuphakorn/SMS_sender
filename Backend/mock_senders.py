from pymongo import MongoClient
import datetime
import config as cfg

client = MongoClient(cfg.MONGO_CONNECTION_STRING)
db = client[cfg.MONGO_DATABASE_NAME]
collection = db[cfg.MONGO_MOCK_COLLECTION]

today_str = datetime.date.today().strftime("%Y-%m-%d")

data = [
    {
        "sender_name": f"Sender {i+1}",
        "mobile_provider": "AIS" if i % 2 == 0 else "TRUE",
        "phone_number": f"08{i}1234567",
        "full_name": f"นายทดสอบ {i+1}",
        "date": today_str
    } for i in range(8)
]

collection.insert_many(data)
print("✅ เพิ่ม mock sender เข้า MongoDB แล้ว")
