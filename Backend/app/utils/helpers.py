import random
from bson import ObjectId
from datetime import datetime
import math
from fastapi import HTTPException
import pandas as pd
from app.models.sender_names import sender_names_collection
from app.models.response_from_telco import response_from_telco_collection

def clean_nan_values(data):
    """Recursively clean NaN values from data structures."""
    if isinstance(data, dict):
        return {key: clean_nan_values(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [clean_nan_values(item) for item in data]
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return None
    elif pd.isna(data):
        return None
    return data

def convert_objectid_to_str(data):
    """Convert ObjectId to string in a data structure."""
    if isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    if isinstance(data, dict):
        return {key: convert_objectid_to_str(value) for key, value in data.items()}
    if isinstance(data, ObjectId):
        return str(data)
    return data

def is_status_object(status):
    """Check if status is a list of objects or strings."""
    return all(isinstance(s, dict) and "name" in s for s in status) if status else False

def format_sender_doc(doc, include_telco_data=False, response_from_telco=None, include_pdf_ids=False):
    status = doc.get("status", [])
    if not is_status_object(status):
        status = [{"name": s, "updated_at": doc.get("updated_at", datetime.now())} for s in status]
    
    latest_request_id = [req["id"] for req in doc.get("request_ids", [])][-1] if doc.get("request_ids") else None
    
    status_descriptions = {
        "pending": "รอข้อมูลจาก กสทช",
        "suspension_requested": "รอการระงับสัญญาณ",
        "received": "ได้รับข้อมูลจาก กสทช",
        "suspended": "ระงับสัญญาณสำเร็จ",
        "skipped": "ข้ามคำขอ (มีข้อมูลอยู่แล้ว)",
        "error": "เกิดข้อผิดพลาด"
    }
    
    base_data = {
        "sender_name": doc["sender_name"],
        "phone_number": doc["phone_number"],
        "mobile_provider": doc.get("mobile_provider"),
        "full_name": doc.get("full_name"),
        "date": doc["updated_at"].strftime("%d %B %Y") if doc.get("updated_at") else None,
        "sender_created_date": doc.get("date"),
        "status": [
            {"name": s["name"], "updated_at": s["updated_at"].strftime("%d %B %Y %H:%M")} 
            for s in status
        ],
        "latest_request_id": latest_request_id,
        "request_ids": [
            {"id": req["id"], "status": req.get("status", "unknown")}
            for req in doc.get("request_ids", [])
        ],
        "latest_request_status": next((req["status"] for req in doc.get("request_ids", []) if req["id"] == latest_request_id), None),
        "status_description": status_descriptions.get(next((s["name"] for s in status[-1:]), None), "ไม่ทราบสถานะ"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"]
    }
    
    if include_telco_data:
        response = response_from_telco.find_one({
            "sender_name": doc["sender_name"],
            "phone_number": doc["phone_number"],
            "request_id": {"$in": [req["id"] for req in doc.get("request_ids", [])]}
        })
        telco_data = clean_nan_values(response.get("data", {})) if response else {}
        all_reply_file_ids = [str(file_id) for file_id in response.get("all_reply_file_ids", [])] if response else []
        
        base_data.update({
            "data": telco_data,
            "all_reply_file_ids": all_reply_file_ids
        })
        if include_pdf_ids:
            base_data.update({
                "pdf_sent_data_id": str(doc.get("pdf_sent_data_id", "")),
                "pdf_sent_suspension_id": str(doc.get("pdf_sent_suspension_id", ""))
            })
    
    return clean_nan_values(base_data)

def generate_request_id():
    """สร้าง request_id แบบสุ่ม 8 หลัก"""
    while True:
        request_id = str(random.randint(10000000, 99999999))
        if not sender_names_collection().find_one({"request_ids.id": request_id}):
            return request_id

def check_admin(current_user):
    """เช็คว่าเป็น admin หรือไม่"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ต้องเป็น admin เท่านั้น")

def has_received_status(doc):
    """เช็คว่ามี received status หรือไม่"""
    if not doc:
        return False
    
    status = doc.get("status", [])
    if is_status_object(status):
        return any(s["name"] == "received" for s in status)
    return "received" in status

def add_status(current_status, new_status, updated_at):
    """เพิ่ม status ใหม่"""
    if is_status_object(current_status):
        status_names = [s["name"] for s in current_status]
        status_list = current_status.copy()
    else:
        status_names = current_status
        status_list = [{"name": s, "updated_at": updated_at} for s in current_status]
    
    if new_status not in status_names:
        status_list.append({"name": new_status, "updated_at": updated_at})
    
    return status_list