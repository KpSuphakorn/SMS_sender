from app.models.notification import notifications_collection
import datetime

def create_notification(request_id: str, sender_name: str, status: str, user_id: str, thai_date: str):
    notifications = notifications_collection()
    return notifications.insert_one({
        "request_id": request_id,
        "sender_name": sender_name,
        "status": status,
        "user_id": user_id,
        "is_read": False,
        "thai_date": thai_date,
        "created_at": datetime.datetime.now()
    })