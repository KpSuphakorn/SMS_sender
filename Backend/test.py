from app.models.sender_names import sender_names_collection
for doc in sender_names_collection().find({"request_id": "f20ecead-d074-44c7-92cd-b7573ffb5903"}):
    print(doc["sender_name"], doc["phone_number"], doc["status"])