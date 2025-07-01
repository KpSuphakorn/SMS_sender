import os
import smtplib
import imaplib
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv
from app.models.database import grid_fs
from app.models.sender_names import sender_names_collection
from app.models.notification import notifications_collection
from app.models.response_from_telco import response_from_telco_collection
import datetime
import pandas as pd
from io import BytesIO
from pymongo import UpdateOne
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from app.schemas.request import SenderRequest
from app.utils.pdf import generate_custom_pdf_and_store, generate_suspension_pdf
from app.external_services.email import check_inbox_and_save_reply, send_email
from app.external_services.notification import create_notification
from app.dependencies import get_current_user
from app.utils.helpers import convert_objectid_to_str, format_sender_doc, is_status_object
from bson.objectid import ObjectId
import uuid
import asyncio
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/request")
def create_request_endpoint(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    request_id = str(uuid.uuid4())
    updated_at = datetime.datetime.now()
    rows_to_request = []
    existing_data = []
    bulk_updates = []

    # Validate required fields
    for row in data.rows:
        if not row.get("sender_name") or not row.get("phone_number"):
            raise HTTPException(status_code=400, detail=f"Missing sender_name or phone_number in row: {row}")

    # Build sender map
    sender_map = {}
    for row in data.rows:
        doc = sender_names.find_one(
            {"sender_name": row["sender_name"], "phone_number": row["phone_number"]},
            sort=[("created_at", -1)]
        )
        if doc:
            sender_map[(row["sender_name"], row["phone_number"])] = doc
    
    # Build telco map
    telco_map = {
        (doc["sender_name"], doc["phone_number"]): doc
        for doc in response_from_telco.find({
            "sender_name": {"$in": [row["sender_name"] for row in data.rows]},
            "phone_number": {"$in": [row["phone_number"] for row in data.rows]}
        })
    }

    # Helper function to update sender data
    def update_sender_data(row, existing_doc, request_id, current_user, fields, status="pending", reply_file_id=None):
        updated_at = datetime.datetime.now()
        current_request_ids = existing_doc.get("request_ids", []) if existing_doc else []
        if len(current_request_ids) >= 5:
            current_request_ids = current_request_ids[-4:]
        
        new_request_ids = current_request_ids + [{"id": request_id, "status": status}]
        
        update_data = {
            "request_ids": new_request_ids,
            "mobile_provider": row.get("mobile_provider", existing_doc.get("mobile_provider") if existing_doc else None),
            "full_name": row.get("full_name", existing_doc.get("full_name") if existing_doc else None),
            "date": row.get("date", existing_doc.get("date") if existing_doc else None),
            "fields": fields,
            "created_by": current_user["id"],
            "updated_at": updated_at
        }
        
        if existing_doc:
            current_status = existing_doc.get("status", [])
            if is_status_object(current_status):
                status_names = [s["name"] for s in current_status]
                new_status_list = current_status
            else:
                status_names = current_status
                new_status_list = [{"name": s, "updated_at": existing_doc.get("updated_at", updated_at)} for s in current_status]
            
            if status == "received" and "received" not in status_names:
                new_status_list.append({"name": "received", "updated_at": updated_at})
                update_data["status"] = new_status_list
                if reply_file_id:
                    update_data["reply_file_id"] = reply_file_id
            elif status == "skipped":
                update_data["status"] = new_status_list
            else:
                if "pending" not in status_names:
                    new_status_list.extend([
                        {"name": "pending", "updated_at": updated_at},
                        {"name": "suspension_requested", "updated_at": updated_at}
                    ])
                update_data["status"] = new_status_list
        else:
            if status == "received":
                update_data["status"] = [{"name": "received", "updated_at": updated_at}]
                if reply_file_id:
                    update_data["reply_file_id"] = reply_file_id
            else:
                update_data["status"] = [
                    {"name": "pending", "updated_at": updated_at},
                    {"name": "suspension_requested", "updated_at": updated_at}
                ]
        
        return update_data

    # Process each row
    for row in data.rows:
        sender_name = row["sender_name"]
        phone_number = row["phone_number"]
        existing_doc = sender_map.get((sender_name, phone_number))
        telco_doc = telco_map.get((sender_name, phone_number))

        has_received = False
        if existing_doc:
            current_status = existing_doc.get("status", [])
            if is_status_object(current_status):
                has_received = any(s["name"] == "received" for s in current_status)
            else:
                has_received = "received" in current_status

        # Skip if already received
        if existing_doc and (has_received or existing_doc.get("reply_file_id")):
            print(f"Existing sender with received data: {sender_name}, {phone_number}")
            update_data = update_sender_data(row, existing_doc, request_id, current_user, data.fields, status="skipped")
            bulk_updates.append(
                UpdateOne(
                    {"_id": existing_doc["_id"]},
                    {"$set": update_data}
                )
            )
            existing_data.append({
                "sender_name": sender_name,
                "phone_number": phone_number,
                "reused_request_id": next((req["id"] for req in existing_doc.get("request_ids", []) if req["status"] == "received"), None)
            })
            create_notification(
                request_id, sender_name, "skipped", current_user["id"], 
                updated_at.strftime("%d %B %Y")
            )
            continue

        # Handle existing telco data
        if telco_doc:
            print(f"Found existing telco data for: {sender_name}, {phone_number}")
            current_status = existing_doc.get("status", []) if existing_doc else []
            if is_status_object(current_status):
                status_names = [s["name"] for s in current_status]
                new_status_list = current_status
            else:
                status_names = current_status
                new_status_list = [{"name": s, "updated_at": existing_doc.get("updated_at", updated_at) if existing_doc else updated_at} for s in current_status]
            
            if "pending" not in status_names:
                new_status_list.extend([
                    {"name": "pending", "updated_at": updated_at},
                    {"name": "suspension_requested", "updated_at": updated_at}
                ])
            if "received" not in status_names:
                new_status_list.append({"name": "received", "updated_at": updated_at})
            
            update_data = {
                "request_ids": existing_doc.get("request_ids", []) + [{"id": request_id, "status": "skipped"}] if existing_doc else [{"id": request_id, "status": "skipped"}],
                "mobile_provider": row.get("mobile_provider", existing_doc.get("mobile_provider") if existing_doc else None),
                "full_name": row.get("full_name", existing_doc.get("full_name") if existing_doc else None),
                "date": row.get("date", existing_doc.get("date") if existing_doc else None),
            }
            if data.fields:
                update_data["fields"] = data.fields
            update_data.update({
                "created_by": current_user["id"],
                "updated_at": updated_at,
                "status": new_status_list,
                "reply_file_id": telco_doc.get("reply_file_id")
            })
            
            bulk_updates.append(
                UpdateOne(
                    {"_id": existing_doc["_id"]} if existing_doc else {"sender_name": sender_name, "phone_number": phone_number},
                    {"$set": update_data},
                    upsert=not existing_doc
                )
            )
            existing_data.append({
                "sender_name": sender_name,
                "phone_number": phone_number,
                "reused_request_id": telco_doc.get("request_id")
            })
            create_notification(
                request_id, sender_name, "pending", current_user["id"], 
                updated_at.strftime("%d %B %Y")
            )
            create_notification(
                request_id, sender_name, "suspension_requested", current_user["id"], 
                updated_at.strftime("%d %B %Y")
            )
            create_notification(
                request_id, sender_name, "received", current_user["id"], 
                updated_at.strftime("%d %B %Y")
            )
            continue

        # Add to request list
        print(f"Adding to rows_to_request: {sender_name}, {phone_number}")
        rows_to_request.append(row)
        if existing_doc:
            update_data = update_sender_data(row, existing_doc, request_id, current_user, data.fields)
            bulk_updates.append(
                UpdateOne(
                    {"_id": existing_doc["_id"]},
                    {"$set": update_data}
                )
            )

    # Send emails and create PDFs for new requests
    if rows_to_request:
        updated_at_str = updated_at.strftime("%d %B %Y")
        data_pdf_id = generate_custom_pdf_and_store([r for r in rows_to_request], data.fields, request_id, updated_at_str)
        suspension_pdf_id = generate_suspension_pdf(request_id, updated_at_str)
        subject = f"ขอข้อมูลและระงับสัญญาณ (Request ID: {request_id})"
        body = f"เรียนเจ้าหน้าที่\n\nRequest ID: {request_id}\nวันที่: {updated_at_str}\nกรุณาดำเนินการระงับสัญญาณและส่งข้อมูลกลับในรูปแบบ Excel/CSV"
        send_email(subject, body, [data_pdf_id, suspension_pdf_id])

        # Insert new senders
        for row in rows_to_request:
            if not sender_map.get((row["sender_name"], row["phone_number"])):
                print(f"Inserting new sender: {row['sender_name']}")
                sender_names.insert_one({
                    "sender_name": row["sender_name"],
                    "phone_number": row["phone_number"],
                    "mobile_provider": row.get("mobile_provider"),
                    "full_name": row.get("full_name"),
                    "date": row.get("date"),
                    "request_ids": [{"id": request_id, "status": "pending"}],
                    "fields": data.fields,
                    "status": [
                        {"name": "pending", "updated_at": updated_at},
                        {"name": "suspension_requested", "updated_at": updated_at}
                    ],
                    "pdf_sent_data_id": data_pdf_id,
                    "pdf_sent_suspension_id": suspension_pdf_id,
                    "created_by": current_user["id"],
                    "created_at": datetime.datetime.now(),
                    "updated_at": updated_at
                })

        # Create notifications
        for row in rows_to_request:
            create_notification(request_id, row["sender_name"], "pending", current_user["id"], updated_at_str)
            create_notification(request_id, row["sender_name"], "suspension_requested", current_user["id"], updated_at_str)

    # Execute bulk updates
    if bulk_updates:
        sender_names.bulk_write(bulk_updates)
        print(f"Performed bulk update for {len(bulk_updates)} senders")

    return {
        "message": "สร้างคำร้องเรียนใหม่เรียบร้อย",
        "request_id": request_id,
        "existing_data": existing_data,
        "requested_senders": [r["sender_name"] for r in rows_to_request]
    }

@router.post("/notification/mark-read/{notification_id}")
def mark_notification_read_endpoint(notification_id: str, current_user: dict = Depends(get_current_user)):
    notifications = notifications_collection()
    result = notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["id"]},
        {"$set": {"is_read": True, "updated_at": datetime.datetime.now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read" if result.modified_count else "Notification already marked as read"}

@router.post("/request/complete-suspension/{request_id}/{sender_name}")
def complete_suspension_endpoint(request_id: str, sender_name: str):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    doc = sender_names.find_one({"request_ids.id": request_id, "sender_name": sender_name})
    if not doc:
        raise HTTPException(status_code=404, detail="Sender not found for this request")
    
    updated_at = datetime.datetime.now()
    current_status = doc.get("status", [])
    if is_status_object(current_status):
        status_names = [s["name"] for s in current_status]
    else:
        status_names = current_status
    
    update_data = {
        "request_ids.$[elem].status": "suspended",
        "updated_at": updated_at,
        "suspended_at": updated_at
    }
    
    if "suspended" not in status_names:
        if is_status_object(current_status):
            update_data["status"] = current_status + [{"name": "suspended", "updated_at": updated_at}]
        else:
            update_data["status"] = [{"name": s, "updated_at": doc.get("updated_at", updated_at)} for s in current_status] + [{"name": "suspended", "updated_at": updated_at}]
    
    result = sender_names.update_one(
        {"request_ids.id": request_id, "sender_name": sender_name},
        {"$set": update_data},
        array_filters=[{"elem.id": request_id}]
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sender not found")
    if result.modified_count:
        response_from_telco.update_one(
            {"sender_name": sender_name, "request_id": request_id},
            {
                "$set": {"updated_at": updated_at},
                "$push": {"status": {"name": "suspended", "updated_at": updated_at}}
            },
            upsert=True
        )
        create_notification(request_id, sender_name, "suspended", doc["created_by"], updated_at.strftime("%d %B %Y"))
    return {"message": "Suspension completed for sender" if result.modified_count else "Sender already marked as suspended"}

@router.get("/notifications")
def get_notifications_endpoint(current_user: dict = Depends(get_current_user)):
    notifications = notifications_collection()
    return [
        {
            "notification_id": str(doc["_id"]),
            "request_id": doc["request_id"],
            "sender_name": doc.get("sender_name", ""),
            "status": doc["status"],
            "date": doc["thai_date"],
            "is_read": doc["is_read"],
            "created_at": doc["created_at"]
        }
        for doc in notifications.find({"user_id": current_user["id"]}).sort("created_at", -1)
    ]

@router.get("/available-senders")
def get_available_senders_endpoint(start: Optional[str] = Query(None), end: Optional[str] = Query(None)):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    today = datetime.date.today()
    query = {}
    
    if start:
        try:
            start_date = datetime.datetime.strptime(start, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="รูปแบบวันที่ไม่ถูกต้อง ควรใช้ YYYY-MM-DD")
    if end:
        try:
            end_date = datetime.datetime.strptime(end, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="รูปแบบวันที่ไม่ถูกต้อง ควรใช้ YYYY-MM-DD")
    if start and end:
        if start_date.date() > end_date.date():
            raise HTTPException(status_code=400, detail="วันที่เริ่มต้นต้องน้อยกว่าหรือเท่ากับวันที่สิ้นสุด")
        if end_date.date() > today:
            raise HTTPException(status_code=400, detail="วันที่สิ้นสุดต้องไม่มากกว่าวันปัจจุบัน")
        query["updated_at"] = {"$gte": start_date, "$lte": end_date}
    elif start:
        query["updated_at"] = {"$gte": start_date}
    elif end:
        if end_date.date() > today:
            raise HTTPException(status_code=400, detail="วันที่สิ้นสุดต้องไม่มากกว่าวันปัจจุบัน")
        query["updated_at"] = {"$lte": end_date}
    
    return [
        format_sender_doc(doc, include_telco_data=True, response_from_telco=response_from_telco)
        for doc in sender_names.find(query, {"_id": 0})
    ]

@router.get("/my-requests")
def get_my_requests_endpoint(current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    requests = sender_names.find({"created_by": current_user["id"]}).sort("created_at", -1)
    return convert_objectid_to_str([
        format_sender_doc(doc, include_telco_data=True, response_from_telco=response_from_telco, include_pdf_ids=True)
        for doc in requests
    ])

@router.get("/file/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        file_obj = grid_fs.get(ObjectId(file_id))
        temp_path = f"/tmp/{file_obj.filename}"
        with open(temp_path, 'wb') as f:
            f.write(file_obj.read())
        media_type = (
            'application/pdf' if file_obj.filename.endswith('.pdf') else
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if file_obj.filename.endswith('.xlsx') else
            'text/csv'
        )
        return FileResponse(temp_path, media_type=media_type, filename=file_obj.filename)
    except:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")

@router.on_event("startup")
async def start_check_replies_loop():
    async def loop_check():
        while True:
            try:
                check_inbox_and_save_reply()
                print("Checked inbox for replies")
            except Exception as e:
                print(f"Error in check-inbox loop: {str(e)}")
            await asyncio.sleep(10)
    asyncio.create_task(loop_check())