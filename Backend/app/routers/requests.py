from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from app.schemas.request import SenderRequest
from app.models.sender_names import sender_names_collection
from app.models.notification import notifications_collection
from app.models.response_from_telco import response_from_telco_collection
from app.utils.pdf import generate_custom_pdf_and_store, generate_suspension_pdf
from app.external_services.email import send_email
from app.external_services.notification import create_notification
from app.dependencies import get_current_user
from app.models.database import grid_fs
from bson.objectid import ObjectId
import datetime
import uuid
import asyncio
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

def create_request(data: SenderRequest, current_user: dict):
    sender_names = sender_names_collection()
    request_id = str(uuid.uuid4())
    thai_date = datetime.datetime.now().strftime("%d %B %Y")
    rows_to_request = []
    existing_data = []

    for row in data.rows:
        sender_name = row["sender_name"]
        phone_number = row["phone_number"]
        existing_doc = sender_names.find_one({
            "sender_name": sender_name,
            "phone_number": phone_number
        })
        if existing_doc and ("received" in existing_doc.get("status", []) or existing_doc.get("reply_file_id")):
            logger.debug(f"Existing sender with received data: {sender_name}, {phone_number}")
            sender_names.update_one(
                {"sender_name": sender_name, "phone_number": phone_number},
                {
                    "$addToSet": {
                        "status": {"$each": ["pending", "suspension_requested"]},
                        "request_ids": request_id
                    },
                    "$set": {
                        "mobile_provider": row.get("mobile_provider", existing_doc.get("mobile_provider")),
                        "full_name": row.get("full_name", existing_doc.get("full_name")),
                        "date": row.get("date", existing_doc.get("date")),
                        "request_id": request_id,
                        "thai_date": thai_date,
                        "fields": data.fields,
                        "created_by": current_user["id"],
                        "updated_at": datetime.datetime.now()
                    }
                }
            )
            existing_data.append({
                "sender_name": sender_name,
                "phone_number": phone_number,
                "reused_request_id": existing_doc.get("request_id")
            })
        else:
            logger.debug(f"Adding to rows_to_request: {sender_name}, {phone_number}")
            rows_to_request.append(row)
            if existing_doc:
                sender_names.update_one(
                    {"sender_name": sender_name, "phone_number": phone_number},
                    {
                        "$addToSet": {
                            "status": {"$each": ["pending", "suspension_requested"]},
                            "request_ids": request_id
                        },
                        "$set": {
                            "mobile_provider": row.get("mobile_provider", existing_doc.get("mobile_provider")),
                            "full_name": row.get("full_name", existing_doc.get("full_name")),
                            "date": row.get("date", existing_doc.get("date")),
                            "request_id": request_id,
                            "thai_date": thai_date,
                            "fields": data.fields,
                            "created_by": current_user["id"],
                            "updated_at": datetime.datetime.now()
                        }
                    }
                )

    logger.debug(f"rows_to_request: {[r['sender_name'] for r in rows_to_request]}")
    logger.debug(f"existing_data: {[r['sender_name'] for r in existing_data]}")

    if rows_to_request:
        data_pdf_id = generate_custom_pdf_and_store([r for r in rows_to_request], data.fields, request_id, thai_date)
        suspension_pdf_id = generate_suspension_pdf(request_id, thai_date)
        subject = f"ขอข้อมูลและระงับสัญญาณ (Request ID: {request_id})"
        body = f"เรียนเจ้าหน้าที่\n\nRequest ID: {request_id}\nวันที่: {thai_date}\nกรุณาดำเนินการระงับสัญญาณและส่งข้อมูลกลับในรูปแบบ Excel/CSV"
        logger.debug(f"Sending email with subject: {subject}")
        send_email(subject, body, [data_pdf_id, suspension_pdf_id])

        for row in rows_to_request:
            if not sender_names.find_one({"sender_name": row["sender_name"], "phone_number": row["phone_number"]}):
                logger.debug(f"Inserting new sender: {row['sender_name']}")
                sender_names.insert_one({
                    "sender_name": row["sender_name"],
                    "phone_number": row["phone_number"],
                    "mobile_provider": row.get("mobile_provider"),
                    "full_name": row.get("full_name"),
                    "date": row.get("date"),
                    "request_id": request_id,
                    "request_ids": [request_id],
                    "thai_date": thai_date,
                    "fields": data.fields,
                    "status": ["pending", "suspension_requested"],
                    "pdf_sent_data_id": data_pdf_id,
                    "pdf_sent_suspension_id": suspension_pdf_id,
                    "created_by": current_user["id"],
                    "created_at": datetime.datetime.now(),
                    "updated_at": datetime.datetime.now()
                })

        for row in rows_to_request:
            create_notification(request_id, row["sender_name"], "pending", current_user["id"], thai_date)
            create_notification(request_id, row["sender_name"], "suspension_requested", current_user["id"], thai_date)

    for row in existing_data:
        create_notification(request_id, row["sender_name"], "pending", current_user["id"], thai_date)
        create_notification(request_id, row["sender_name"], "suspension_requested", current_user["id"], thai_date)

    return {
        "message": "สร้างคำร้องเรียนใหม่เรียบร้อย",
        "request_id": request_id,
        "existing_data": existing_data,
        "requested_senders": [r["sender_name"] for r in rows_to_request]
    }

def mark_notification_read(notification_id: str, current_user: dict):
    notifications = notifications_collection()
    result = notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["id"]},
        {"$set": {"is_read": True, "updated_at": datetime.datetime.now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    if result.modified_count == 0:
        return {"message": "Notification already marked as read"}
    return {"message": "Marked as read"}

def complete_suspension(request_id: str, sender_name: str):
    sender_names = sender_names_collection()
    doc = sender_names.find_one({"request_ids": request_id, "sender_name": sender_name})
    if not doc:
        raise HTTPException(status_code=404, detail="Sender not found for this request")
    result = sender_names.update_one(
        {"request_ids": request_id, "sender_name": sender_name},
        {
            "$addToSet": {"status": "suspended"},
            "$set": {
                "updated_at": datetime.datetime.now(),
                "suspended_at": datetime.datetime.now()
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sender not found")
    if result.modified_count == 0:
        return {"message": "Sender already marked as suspended"}
    create_notification(request_id, sender_name, "suspended", doc["created_by"], doc["thai_date"])
    return {"message": "Suspension completed for sender"}

def get_notifications(current_user: dict):
    notifications = notifications_collection()
    notifications_data = notifications.find({"user_id": current_user["id"]}).sort("created_at", -1)
    return [{
        "notification_id": str(doc["_id"]),
        "request_id": doc["request_id"],
        "sender_name": doc.get("sender_name", ""),
        "status": doc["status"],
        "thai_date": doc["thai_date"],
        "is_read": doc["is_read"],
        "created_at": doc["created_at"]
    } for doc in notifications_data]

def get_requests(current_user: dict):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    requests = sender_names.find({"created_by": current_user["id"]}).sort("created_at", -1)
    result = []
    for doc in requests:
        response = response_from_telco.find_one({
            "sender_name": doc["sender_name"],
            "phone_number": doc["phone_number"],
            "request_id": {"$in": doc.get("request_ids", [])}
        })
        result.append({
            "request_id": doc.get("request_id"),
            "sender_name": doc["sender_name"],
            "thai_date": doc["thai_date"],
            "status": doc.get("status", []),
            "data": response.get("data", {}) if response else {},
            "reply_file_id": str(response.get("reply_file_id", "")) if response else "",
            "pdf_sent_data_id": str(doc.get("pdf_sent_data_id", "")),
            "pdf_sent_suspension_id": str(doc.get("pdf_sent_suspension_id", "")),
            "created_at": doc["created_at"]
        })
    return convert_objectid_to_str(result)

from app.utils.helpers import convert_objectid_to_str

def get_available_senders(start: str = None, end: str = None):
    sender_names = sender_names_collection()
    today = datetime.date.today()
    query = {}
    if start:
        try:
            start_date = datetime.datetime.strptime(start, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="รูปแบบวันที่ไม่ถูกต้อง ควรใช้ YYYY-MM-DD")
    if end:
        try:
            end_date = datetime.datetime.strptime(end, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="รูปแบบวันที่ไม่ถูกต้อง ควรใช้ YYYY-MM-DD")
    if start and end:
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="วันที่เริ่มต้นต้องน้อยกว่าหรือเท่ากับวันที่สิ้นสุด")
        if end_date > today:
            raise HTTPException(status_code=400, detail="วันที่สิ้นสุดต้องไม่มากกว่าวันปัจจุบัน")
        query["date"] = {"$gte": start, "$lte": end}
    elif start:
        query["date"] = {"$gte": start}
    elif end:
        if end_date > today:
            raise HTTPException(status_code=400, detail="วันที่สิ้นสุดต้องไม่มากกว่าวันปัจจุบัน")
        query["date"] = {"$lte": end}
    
    results = []
    for doc in sender_names.find(query, {"_id": 0}):
        request_ids = doc.get("request_ids", [doc.get("request_id")]) if doc.get("request_id") else [None]
        for _ in request_ids:
            results.append({
                "sender_name": doc["sender_name"],
                "phone_number": doc["phone_number"],
                "mobile_provider": doc.get("mobile_provider"),
                "full_name": doc.get("full_name"),
                "date": doc.get("date"),
                "thai_date": doc.get("thai_date"),
                "status": doc.get("status", []),
                "request_ids": doc.get("request_ids", []),
                "created_at": doc["created_at"],
                "updated_at": doc["updated_at"]
            })
    return convert_objectid_to_str(results)

@router.post("/request")
def create_request_endpoint(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    return create_request(data, current_user)

@router.post("/notification/mark-read/{notification_id}")
def mark_notification_read_endpoint(notification_id: str, current_user: dict = Depends(get_current_user)):
    return mark_notification_read(notification_id, current_user)

@router.post("/request/complete-suspension/{request_id}/{sender_name}")
def complete_suspension_endpoint(request_id: str, sender_name: str):
    return complete_suspension(request_id, sender_name)

@router.get("/notifications")
def get_notifications_endpoint(current_user: dict = Depends(get_current_user)):
    return get_notifications(current_user)

@router.get("/requests")
def get_requests_endpoint(current_user: dict = Depends(get_current_user)):
    return get_requests(current_user)

@router.get("/file/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    from bson.objectid import ObjectId
    from fastapi.responses import FileResponse
    try:
        file_obj = grid_fs.get(ObjectId(file_id))
        temp_path = f"/tmp/{file_obj.filename}"
        with open(temp_path, 'wb') as f:
            f.write(file_obj.read())
        media_type = 'application/pdf' if file_obj.filename.endswith('.pdf') else \
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if file_obj.filename.endswith('.xlsx') else 'text/csv'
        return FileResponse(temp_path, media_type=media_type, filename=file_obj.filename)
    except:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")

@router.get("/available-senders")
def get_available_senders_endpoint(start: Optional[str] = Query(None), end: Optional[str] = Query(None)):
    return get_available_senders(start, end)

@router.on_event("startup")
async def start_check_replies_loop():
    from app.external_services.email import check_inbox_and_save_reply
    async def loop_check():
        while True:
            try:
                check_inbox_and_save_reply()
                print("✅ Checked inbox for replies")
            except Exception as e:
                print(f"❌ Error in check-inbox loop: {str(e)}")
            await asyncio.sleep(10)
    asyncio.create_task(loop_check())