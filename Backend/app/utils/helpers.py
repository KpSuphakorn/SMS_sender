from bson import ObjectId
from datetime import datetime
import math
import json
from app.models.sender_names import sender_names_collection
from app.models.response_from_telco import response_from_telco_collection

def clean_nan_values(data):
    """Clean NaN values from data structure to make it JSON compliant."""
    if isinstance(data, list):
        return [clean_nan_values(item) for item in data]
    elif isinstance(data, dict):
        return {key: clean_nan_values(value) for key, value in data.items()}
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return None  # Replace NaN and Inf with None
    else:
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
    """Format a sender_names document into API response structure."""
    status = doc.get("status", [])
    if not is_status_object(status):
        status = [{"name": s, "updated_at": doc.get("updated_at", datetime.now())} for s in status]
    
    latest_request_id = [req["id"] for req in doc.get("request_ids", [])][-1] if doc.get("request_ids") else None
    
    # Describe latest status
    latest_status_name = next((s["name"] for s in status[-1:]), None)
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
        "latest_request_status": next((req["status"] for req in doc.get("request_ids", []) if req["id"] == latest_request_id), None),
        "status_description": status_descriptions.get(latest_status_name, "ไม่ทราบสถานะ"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"]
    }
    
    if include_telco_data:
        response = response_from_telco.find_one({
            "sender_name": doc["sender_name"],
            "phone_number": doc["phone_number"],
            "request_id": {"$in": [req["id"] for req in doc.get("request_ids", [])]}
        })
        base_data.update({
            "data": response.get("data", {}) if response else {},
            "reply_file_id": str(response.get("reply_file_id", "")) if response else ""
        })
        if include_pdf_ids:
            base_data.update({
                "pdf_sent_data_id": str(doc.get("pdf_sent_data_id", "")),
                "pdf_sent_suspension_id": str(doc.get("pdf_sent_suspension_id", ""))
            })
    
    return clean_nan_values(base_data)