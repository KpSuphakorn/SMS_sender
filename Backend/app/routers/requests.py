import datetime
import re
import unicodedata
import pandas as pd
from io import BytesIO
from fastapi import APIRouter, HTTPException, Query, Depends, Response, UploadFile, File
from typing import Optional, List
from app.schemas.request import SenderRequest
from app.utils.pdf import generate_custom_pdf_and_store, generate_suspension_pdf
from app.dependencies import get_current_user
from app.utils.helpers import add_status, check_admin, clean_excel_data, convert_objectid_to_str, format_sender_doc, generate_request_id, has_received_status, is_status_object, clean_nan_values
from app.models.database import grid_fs
from app.models.sender_names import sender_names_collection
from app.models.response_from_telco import response_from_telco_collection
from app.models.pending_requests import pending_requests_collection
from bson.objectid import ObjectId
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/store-sender-collection")
async def store_sender_collection(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    pending_requests = pending_requests_collection()
    request_id = generate_request_id()
    now = datetime.datetime.now()
    sender_entries = []

    valid_providers = {"true", "dtac", "ais", "nt", "telco"}

    provider_mapping = {
        "dtac": "dtac",
        "ais": "ais",
        "true": "true",
        "tot": "nt",
        "cat": "nt",
        "1-to-all": "telco",
        "unknown": "nt"
    }

    # Validation
    for row in data.rows:
        if not row.get("sender_name") or not row.get("phone_number"):
            raise HTTPException(status_code=400, detail="ต้องมี sender_name และ phone_number")
        mobile_provider = clean_excel_data(str(row.get("mobile_provider", "unknown"))).lower().strip()
        mobile_provider = provider_mapping.get(mobile_provider, 'telco')

        if mobile_provider not in valid_providers:
            raise HTTPException(status_code=400, detail=f"mobile_provider ต้องเป็นหนึ่งใน {', '.join(valid_providers)}")

    # Process each row
    for row in data.rows:
        sender_name = clean_excel_data(str(row["sender_name"])).strip()
        phone_number = clean_excel_data(str(row["phone_number"])).strip()
        mobile_provider = provider_mapping.get(clean_excel_data(str(row.get("mobile_provider", "unknown"))).lower().strip(), "nt")

        # ค้นหา sender_name ที่มีอยู่แล้ว (เอาตัวล่าสุด)
        existing_sender = sender_names.find_one(
            {"sender_name": sender_name}, 
            sort=[("created_at", -1)]  # เอาตัวล่าสุด
        )
        
        if existing_sender:
            # ใช้ข้อมูลที่มีอยู่แล้ว โดยเพิ่ม request_id ใหม่เข้าไป
            updated_request_ids = existing_sender.get("request_ids", [])
            
            # ตรวจสอบว่า request_id นี้มีอยู่แล้วหรือไม่
            request_exists = any(req["id"] == request_id for req in updated_request_ids)
            if not request_exists:
                updated_request_ids.append({"id": request_id, "status": "pending"})
            
            # อัปเดต status ถ้าจำเป็น
            current_status = existing_sender.get("status", [])
            updated_status = current_status
            
            # เพิ่ม pending status ถ้ายังไม่มี
            if is_status_object(current_status):
                has_pending = any(s.get("name") == "pending" for s in current_status)
                if not has_pending:
                    updated_status = add_status(current_status, "pending", now)
            else:
                if "pending" not in current_status:
                    updated_status = add_status(current_status, "pending", now)

            # อัปเดต existing document
            sender_names.update_one(
                {"_id": existing_sender["_id"]},
                {"$set": {
                    "request_ids": updated_request_ids,
                    "fields": data.fields,
                    "status": updated_status,
                    "updated_at": now
                }}
            )
            
            sender_object_id = existing_sender["_id"]
            
        else:
            # สร้างใหม่เฉพาะเมื่อไม่เคยมี sender_name นี้มาก่อน
            new_doc = {
                "sender_name": sender_name,
                "phone_number": phone_number,
                "mobile_provider": mobile_provider,
                "full_name": row.get("full_name"),
                "date": row.get("date"),
                "request_ids": [{"id": request_id, "status": "pending"}],
                "fields": data.fields,
                "status": [{"name": "pending", "updated_at": now}],
                "created_by": current_user["id"],
                "created_at": now,
                "updated_at": now
            }
            result = sender_names.insert_one(new_doc)
            sender_object_id = result.inserted_id

        # เพิ่มลงใน sender_entries สำหรับ pending_requests
        sender_entries.append({
            "sender_name": sender_name,
            "phone_number": phone_number,
            "sender_object_id": sender_object_id
        })

    # สร้าง pending request
    if sender_entries:
        pending_requests.insert_one({
            "request_id": request_id,
            "senders": sender_entries,
            "is_approved": False,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user["id"]
        })

    return {
        "message": "บันทึกสำเร็จ",
        "request_id": request_id,
        "new_requests_count": len(sender_entries),
    }

@router.post("/approve-request/{request_id}")
async def approve_request(request_id: str, current_user: dict = Depends(get_current_user)):
    check_admin(current_user)
    
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    
    pending_doc = pending_requests.find_one({"request_id": request_id})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="ไม่พบ request")
    
    if pending_doc.get("is_approved"):
        return {"message": "อนุมัติแล้ว"}

    now = datetime.datetime.now()
    pending_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "is_approved": True,
            "updated_at": now,
            "approved_by": current_user["id"]
        }}
    )

    senders_by_provider = {}
    for sender in pending_doc.get("senders", []):
        sender_doc = sender_names.find_one({"_id": sender["sender_object_id"]})
        if sender_doc:
            # ตรวจสอบว่า sender นี้ยังไม่ได้รับการตอบกลับสำหรับ request_id นี้
            current_requests = sender_doc.get("request_ids", [])
            request_status = None
            for req in current_requests:
                if req["id"] == request_id:
                    request_status = req.get("status")
                    break
            
            # ถ้า request นี้ยังเป็น pending ให้ส่งไป PDF
            if request_status == "pending":
                provider = sender_doc.get("mobile_provider", "unknown").lower()
                if provider not in senders_by_provider:
                    senders_by_provider[provider] = []
                senders_by_provider[provider].append({
                    "sender_name": sender["sender_name"],
                    "phone_number": sender["phone_number"],
                    "mobile_provider": provider,
                    "full_name": sender_doc.get("full_name"),
                    "date": sender_doc.get("date")
                })

    data_pdf_ids = {}
    date_str = now.strftime("%d %B %Y")
    for provider, senders in senders_by_provider.items():
        if senders:
            data_pdf_id = generate_custom_pdf_and_store(
                senders,
                ["sender_name", "phone_number", "mobile_provider", "full_name", "date"],
                request_id,
                date_str,
                provider
            )
            data_pdf_ids[provider] = str(data_pdf_id)

    suspension_pdf_id = generate_suspension_pdf(request_id, date_str) if senders_by_provider else None

    # อัปเดต status ของ sender เฉพาะที่ส่งไป PDF
    for sender in pending_doc.get("senders", []):
        sender_doc = sender_names.find_one({"_id": sender["sender_object_id"]})
        if sender_doc:
            current_requests = sender_doc.get("request_ids", [])
            request_status = None
            for req in current_requests:
                if req["id"] == request_id:
                    request_status = req.get("status")
                    break
            
            if request_status == "pending":
                provider = sender_doc.get("mobile_provider", "unknown").lower()
                sender_names.update_one(
                    {"_id": sender["sender_object_id"]},
                    {"$set": {
                        "data_pdf_id": data_pdf_ids.get(provider, None),
                        "pdf_sent_suspension_id": str(suspension_pdf_id) if suspension_pdf_id else None,
                        "updated_at": now,
                        "status": add_status(
                            sender_doc.get("status", []),
                            "suspension_requested",
                            now
                        )
                    }}
                )

    return {
        "message": f"อนุมัติ request {request_id} สำเร็จ",
        "data_pdf_ids": data_pdf_ids,
        "suspension_pdf_id": str(suspension_pdf_id) if suspension_pdf_id else None,
        "senders": [
            sender for senders in senders_by_provider.values() for sender in senders
        ]
    }

@router.post("/isp-response/{request_id}")
async def isp_response(request_id: str, files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_user)):
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    pending_doc = pending_requests.find_one({"request_id": request_id, "is_approved": True})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="ไม่พบ request ที่อนุมัติแล้ว")

    file_ids = []
    excel_content = None
    
    for file in files:
        content = await file.read()
        now = datetime.datetime.now()
        file_id = grid_fs.put(content, filename=file.filename, metadata={
            "request_id": request_id,
            "uploaded_by": current_user["id"],
            "uploaded_at": now
        })
        file_ids.append(str(file_id))
        
        if file.filename.endswith(('.xlsx', '.xls')):
            excel_content = content

    if not excel_content:
        return {
            "message": "อัปโหลดไฟล์สำเร็จ แต่ไม่พบไฟล์ Excel",
            "file_ids": file_ids
        }

    try:
        df = pd.read_excel(BytesIO(excel_content), engine='openpyxl')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"อ่านไฟล์ Excel ไม่ได้: {str(e)}")

    required_col = "หมายเลขที่แสดง/Sender Name"
    if required_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"ไม่พบ column: {required_col}")

    successful = []
    failed = []

    user_role = current_user.get("role", "").lower()
    valid_providers = {"true", "dtac", "ais", "nt", "telco"}
    if user_role not in valid_providers:
        raise HTTPException(status_code=403, detail="ต้องมี role เป็น true, dtac, ais, nt, หรือ telco")

    for _, row in df.iterrows():
        try:
            sender_name = clean_excel_data(str(row[required_col]))
            if not sender_name or sender_name == 'nan':
                continue

            # Try to find sender by exact name first
            sender_entry = next((s for s in pending_doc["senders"] 
                               if s["sender_name"] == sender_name), None)
            
            # If not found and sender_name is numeric, try with leading zero
            if not sender_entry and sender_name.isdigit():
                sender_name_with_zero = "0" + sender_name
                sender_entry = next((s for s in pending_doc["senders"] 
                                   if s["sender_name"] == sender_name_with_zero), None)
                if sender_entry:
                    sender_name = sender_name_with_zero  # Use the corrected name
            
            # If still not found, try removing leading zero
            if not sender_entry and sender_name.startswith("0") and sender_name[1:].isdigit():
                sender_name_without_zero = sender_name[1:]
                sender_entry = next((s for s in pending_doc["senders"] 
                                   if s["sender_name"] == sender_name_without_zero), None)
                if sender_entry:
                    sender_name = sender_name_without_zero  # Use the corrected name
            
            if not sender_entry:
                failed.append(sender_name)
                print(f"Sender {sender_name} not found in pending request {request_id}")
                continue

            sender_doc = sender_names.find_one({"_id": sender_entry["sender_object_id"]})
            if not sender_doc:
                failed.append(sender_name)
                print(f"Sender document for {sender_name} not found")
                continue

            excel_provider = clean_excel_data(str(row.get("โครงข่ายที่ใช้งาน(โครงข่ายต้นทาง)", "unknown"))).lower()
            sender_provider = sender_doc.get("mobile_provider", "unknown").lower()
            
            # Debug logging
            print(f"DEBUG - Processing sender: {sender_name}")
            print(f"DEBUG - Excel provider: '{excel_provider}'")
            print(f"DEBUG - Sender provider: '{sender_provider}'")
            print(f"DEBUG - User role: '{user_role}'")
            print(f"DEBUG - Excel == User: {excel_provider == user_role}")
            print(f"DEBUG - Sender == User: {sender_provider == user_role}")
            
            if excel_provider != user_role or sender_provider != user_role:
                failed.append(f"{sender_name}: mobile_provider mismatch (Excel: {excel_provider}, Sender: {sender_provider}, Role: {user_role})")
                continue

            now = datetime.datetime.now()
            new_status = add_status(sender_doc.get("status", []), "received", now)
            
            updated_request_ids = []
            for req in sender_doc.get("request_ids", []):
                if req["id"] == request_id:
                    updated_request_ids.append({"id": req["id"], "status": "received"})
                else:
                    updated_request_ids.append(req)

            sender_names.update_one(
                {"_id": sender_doc["_id"]},
                {"$set": {
                    "status": new_status,
                    "request_ids": updated_request_ids,
                    "all_reply_file_ids": file_ids,  # เปลี่ยนจาก reply_file_id เป็น all_reply_file_ids
                    "updated_at": now
                }}
            )

            telco_data = {
                "request_id": request_id,
                "sender_name": sender_name,
                "phone_number": sender_doc.get("phone_number", ""),
                "sender_object_id": sender_entry["sender_object_id"],
                "mobile_provider": excel_provider,
                "full_name": row.get("ชื่อสกุลผู้จดทะเบียน", sender_doc.get("full_name")),
                "date": row.get("วันที่จดทะเบียนเบอร์", sender_doc.get("date")),
                "sim_type": row.get("ประเภทซิม"),
                "registration_type": row.get("ประเภทการลงทะเบียนซิม"),
                "imei": row.get("IMEI"),
                "call_site": row.get("Call Site"),
                "incident_count": row.get("จำนวนครั้งการก่อเหตุ"),
                "log_found": row.get("พบ log การรับไหม"),
                "cib_ccib_result": row.get("ผลการตรวจสอบCIB/CCIB"),
                "case_id": row.get("case ID NO"),
                "contact_info": row.get("ข้อมูลการติดต่อ"),
                "note": row.get("Note"),
                "all_reply_file_ids": file_ids,  # เปลี่ยนจาก reply_file_id เป็น all_reply_file_ids
                "created_at": now,
                "updated_at": now,
                "created_by": current_user["id"]
            }

            response_from_telco.update_one(
                {"request_id": request_id, "sender_name": sender_name},
                {"$set": telco_data},
                upsert=True
            )
            
            successful.append(sender_name)
            
        except Exception as e:
            failed.append(f"{sender_name}: {str(e)}")
            print(f"Error processing sender {sender_name}: {str(e)}")

    return {
        "message": f"ประมวลผล ISP response สำเร็จ",
        "file_ids": file_ids,
        "successful_count": len(successful),
        "failed_count": len(failed),
        "details": {"successful": successful, "failed": failed}
    }

@router.get("/pending-senders")
async def get_pending_senders(current_user: dict = Depends(get_current_user)):
    check_admin(current_user)
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    pending_docs = pending_requests.find({})
    results = []
    
    for pending_doc in pending_docs:
        for sender in pending_doc.get("senders", []):
            sender_doc = sender_names.find_one({"_id": sender["sender_object_id"]})
            if sender_doc:
                formatted_doc = format_sender_doc(
                    sender_doc,
                    include_telco_data=True,
                    response_from_telco=response_from_telco,
                    include_pdf_ids=True
                )
                formatted_doc["request_id"] = pending_doc["request_id"]
                formatted_doc["is_approved"] = pending_doc.get("is_approved", False)
                formatted_doc["is_response_submitted"] = bool(sender_doc.get("reply_file_id"))
                results.append(formatted_doc)

    return clean_nan_values(results)

@router.get("/isp-pending-senders")
async def get_isp_pending_senders(current_user: dict = Depends(get_current_user)):
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    valid_roles = {"true", "dtac", "ais", "nt", "telco"}
    user_role = current_user.get("role", "").lower()
    if user_role not in valid_roles:
        raise HTTPException(status_code=403, detail="ต้องมี role เป็น true, dtac, ais, nt, หรือ telco")

    pending_docs = pending_requests.find({"is_approved": True})
    results_by_request_id = {}
    
    for pending_doc in pending_docs:
        request_id = pending_doc["request_id"]
        results_by_request_id[request_id] = []
        
        for sender in pending_doc.get("senders", []):
            sender_doc = sender_names.find_one({"_id": sender["sender_object_id"]})
            if sender_doc and sender_doc.get("mobile_provider", "unknown").lower() == user_role:
                formatted_doc = format_sender_doc(
                    sender_doc,
                    include_telco_data=True,
                    response_from_telco=response_from_telco,
                    include_pdf_ids=True
                )
                formatted_doc["request_id"] = request_id
                formatted_doc["data_pdf_id"] = sender_doc.get("data_pdf_id", None)
                formatted_doc["is_response_submitted"] = bool(sender_doc.get("reply_file_id"))
                results_by_request_id[request_id].append(formatted_doc)
    
    results_by_request_id = {k: v for k, v in results_by_request_id.items() if v}
    
    return clean_nan_values(results_by_request_id)

@router.post("/complete-suspension/{request_id}/{sender_name}")
def complete_suspension(request_id: str, sender_name: str, current_user: dict = Depends(get_current_user)):
    # check_admin(current_user)

    valid_roles = {"true", "dtac", "ais", "nt", "telco"}
    user_role = current_user.get("role", "").lower()
    if user_role not in valid_roles:
        raise HTTPException(status_code=403, detail="ต้องมี role เป็น true, dtac, ais, nt, หรือ telco")
    
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    pending_requests = pending_requests_collection()
    
    # ตรวจสอบว่า request_id มีอยู่และอนุมัติแล้ว
    pending_doc = pending_requests.find_one({"request_id": request_id, "is_approved": True})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="ไม่พบ request หรือ request ยังไม่ได้รับการอนุมัติ")
    
    # ตรวจสอบว่า sender_name มีอยู่ใน pending_doc
    sender_entry = next((s for s in pending_doc["senders"] if s["sender_name"] == sender_name), None)
    if not sender_entry:
        raise HTTPException(status_code=404, detail=f"ไม่พบ sender {sender_name} ใน request {request_id}")
    
    # ค้นหา sender document
    doc = sender_names.find_one({"_id": sender_entry["sender_object_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบ sender")
    
    # ตรวจสอบสถานะ suspended
    current_status = doc.get("status", [])
    if is_status_object(current_status):
        status_names = [s["name"] for s in current_status]
    else:
        status_names = current_status
    
    if "suspended" in status_names:
        return {"message": f"sender {sender_name} ระงับแล้วสำหรับ request {request_id}"}
    
    now = datetime.datetime.now()
    new_status = add_status(current_status, "suspended", now)
    
    # อัปเดตเฉพาะ request_id ที่ระบุ
    updated_request_ids = [
        {**req, "status": "suspended"} if req["id"] == request_id else req
        for req in doc.get("request_ids", [])
    ]
    
    # อัปเดต sender document
    sender_names.update_one(
        {"_id": sender_entry["sender_object_id"]},
        {"$set": {
            "status": new_status,
            "request_ids": updated_request_ids,
            "suspended_at": now,
            "updated_at": now
        }}
    )
    
    response_from_telco.update_one(
        {"sender_name": sender_name, "request_id": request_id},
        {
            "$set": {
                "updated_at": now,
                "phone_number": doc.get("phone_number"),
                "mobile_provider": doc.get("mobile_provider"),
                "full_name": doc.get("full_name"),
                "date": doc.get("date")
            },
            "$push": {"status": {"name": "suspended", "updated_at": now}}
        },
        upsert=True
    )
    
    return {"message": f"ระงับ sender {sender_name} สำหรับ request {request_id} สำเร็จ"}

@router.get("/available-senders")
def get_available_senders(start: Optional[str] = Query(None), end: Optional[str] = Query(None)):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    query = {}
    
    if start:
        try:
            start_date = datetime.datetime.strptime(start, "%Y-%m-%d")
            query["updated_at"] = {"$gte": start_date}
        except ValueError:
            raise HTTPException(status_code=400, detail="รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD")
    
    if end:
        try:
            end_date = datetime.datetime.strptime(end, "%Y-%m-%d")
            if "updated_at" in query:
                query["updated_at"]["$lte"] = end_date
            else:
                query["updated_at"] = {"$lte": end_date}
        except ValueError:
            raise HTTPException(status_code=400, detail="รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD")
    
    results = [
        format_sender_doc(doc, include_telco_data=True, response_from_telco=response_from_telco, include_pdf_ids=True)
        for doc in sender_names.find(query, {"_id": 0})
    ]
    
    return clean_nan_values(results)

@router.get("/my-requests")
def get_my_requests(current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    requests = sender_names.find({"created_by": current_user["id"]}).sort("created_at", -1)
    
    return convert_objectid_to_str([
        format_sender_doc(doc, include_telco_data=True, response_from_telco=response_from_telco, include_pdf_ids=True)
        for doc in requests
    ])

@router.get("/check-suspension/{sender_name}")
def check_sender_suspension(sender_name: str, current_user: dict = Depends(get_current_user)):
    """
    Check if a sender is suspended by searching for 'suspended' status in the status array
    Returns: {"is_suspended": true/false, "sender_name": "sender_name"}
    """
    sender_names = sender_names_collection()
    
    # Find the most recent document for this sender_name
    sender_doc = sender_names.find_one(
        {"sender_name": sender_name}, 
        sort=[("created_at", -1)]
    )
    
    if not sender_doc:
        raise HTTPException(status_code=404, detail=f"ไม่พบ sender {sender_name}")
    
    status_list = sender_doc.get("status", [])
    is_suspended = False
    
    # Check if status is an array of objects or simple strings
    if status_list and isinstance(status_list, list):
        if len(status_list) > 0 and isinstance(status_list[0], dict):
            # Status is array of objects with "name" field
            is_suspended = any(status.get("name") == "suspended" for status in status_list)
        else:
            # Status is array of strings
            is_suspended = "suspended" in status_list
    
    return {
        "is_suspended": is_suspended,
        "sender_name": sender_name
    }

@router.get("/file/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        if not ObjectId.is_valid(file_id):
            raise HTTPException(status_code=400, detail="รูปแบบ file_id ไม่ถูกต้อง")
        
        object_id = ObjectId(file_id)
        
        if not grid_fs.exists(object_id):
            raise HTTPException(status_code=404, detail="ไม่พบไฟล์ในระบบ")
        
        file_obj = grid_fs.get(object_id)
        filename = file_obj.filename or f"file_{file_id}"
        
        file_content = file_obj.read()
        
        file_obj.close()
        
        if not file_content:
            raise HTTPException(status_code=404, detail="ไฟล์ว่าง")
        
        content_type_map = {
            '.pdf': 'application/pdf',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.csv': 'text/csv',
            '.txt': 'text/plain',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml'
        }
        
        file_ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
        media_type = content_type_map.get(file_ext, 'application/octet-stream')
        
        inline_types = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'}
        disposition = "inline" if file_ext in inline_types else "attachment"
        
        def make_safe_filename(name):
            name = unicodedata.normalize('NFKD', name)
            name = ''.join(c for c in name if ord(c) < 128)
            name = re.sub(r'[^\w\s\-_\.]', '', name)
            name = re.sub(r'\s+', '_', name)
            return name.strip('_.')
        
        safe_filename = make_safe_filename(filename)
        
        if not safe_filename:
            file_ext_safe = ''
            if '.' in filename:
                original_ext = filename.split('.')[-1]
                if all(ord(c) < 128 for c in original_ext):
                    file_ext_safe = f".{original_ext}"
            safe_filename = f"download_{file_id}{file_ext_safe}"
        
        content_disposition = f"{disposition}; filename=\"{safe_filename}\""
        
        return Response(
            content=file_content,
            media_type=media_type,
            headers={
                "Content-Disposition": content_disposition,
                "Cache-Control": "no-cache"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading file {file_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์: {str(e)}")