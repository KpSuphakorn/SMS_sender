import datetime
import pandas as pd
from io import BytesIO
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File
from typing import Optional, List
from app.schemas.request import SenderRequest
from app.utils.pdf import generate_custom_pdf_and_store, generate_suspension_pdf
from app.dependencies import get_current_user
from app.utils.helpers import add_status, check_admin, convert_objectid_to_str, format_sender_doc, generate_request_id, has_received_status, is_status_object, clean_nan_values
from app.models.database import grid_fs
from app.models.sender_names import sender_names_collection
from app.models.response_from_telco import response_from_telco_collection
from app.models.pending_requests import pending_requests_collection
from bson.objectid import ObjectId
import random
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/store-sender-collection")
async def store_sender_collection(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    pending_requests = pending_requests_collection()
    response_from_telco = response_from_telco_collection()
    request_id = generate_request_id()
    now = datetime.datetime.now()
    sender_entries = []
    existing_data = []

    for row in data.rows:
        if not row.get("sender_name") or not row.get("phone_number"):
            raise HTTPException(status_code=400, detail="ต้องมี sender_name และ phone_number")

    for row in data.rows:
        sender_name = row["sender_name"]
        phone_number = row["phone_number"]
        
        existing_sender = sender_names.find_one(
            {"sender_name": sender_name, "phone_number": phone_number},
            sort=[("created_at", -1)]
        )
        
        existing_telco = response_from_telco.find_one({
            "sender_name": sender_name,
            "phone_number": phone_number
        })

        if existing_telco:
            if existing_sender:
                current_status = add_status(existing_sender.get("status", []), "received", now)
                sender_names.update_one(
                    {"_id": existing_sender["_id"]},
                    {"$set": {
                        "request_ids": existing_sender.get("request_ids", []) + [{"id": request_id, "status": "completed_from_existing"}],
                        "status": current_status,
                        "reply_file_id": existing_telco.get("reply_file_id"),
                        "updated_at": now
                    }}
                )
            else:
                sender_names.insert_one({
                    "sender_name": sender_name,
                    "phone_number": phone_number,
                    "mobile_provider": existing_telco.get("mobile_provider", "unknown"),
                    "full_name": existing_telco.get("full_name"),
                    "date": existing_telco.get("date"),
                    "request_ids": [{"id": request_id, "status": "completed_from_existing"}],
                    "fields": data.fields,
                    "status": [{"name": "received", "updated_at": now}],
                    "reply_file_id": existing_telco.get("reply_file_id"),
                    "created_by": current_user["id"],
                    "created_at": now,
                    "updated_at": now
                })
            
            existing_data.append({
                "sender_name": sender_name,
                "phone_number": phone_number,
                "reused_request_id": existing_telco.get("request_id"),
                "status": "ใช้ข้อมูลที่มีอยู่แล้ว"
            })
            continue

        if existing_sender and (has_received_status(existing_sender) or existing_sender.get("reply_file_id")):
            sender_names.update_one(
                {"_id": existing_sender["_id"]},
                {"$set": {
                    "request_ids": existing_sender.get("request_ids", []) + [{"id": request_id, "status": "skipped"}],
                    "updated_at": now
                }}
            )
            
            existing_data.append({
                "sender_name": sender_name,
                "phone_number": phone_number,
                "status": "ข้ามเนื่องจากมีข้อมูลแล้ว"
            })
            continue

        if existing_sender:
            sender_names.update_one(
                {"_id": existing_sender["_id"]},
                {"$set": {
                    "request_ids": existing_sender.get("request_ids", []) + [{"id": request_id, "status": "pending"}],
                    "updated_at": now,
                    "status": add_status(existing_sender.get("status", []), "pending", now)
                }}
            )
            sender_object_id = existing_sender["_id"]
        else:
            new_doc = {
                "sender_name": sender_name,
                "phone_number": phone_number,
                "mobile_provider": row.get("mobile_provider", "unknown"),
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

        sender_entries.append({
            "sender_name": sender_name,
            "phone_number": phone_number,
            "sender_object_id": sender_object_id
        })

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
        "existing_data_count": len(existing_data),
        "existing_data": existing_data
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

    senders_data = []
    for sender in pending_doc.get("senders", []):
        sender_doc = sender_names.find_one({"_id": sender["sender_object_id"]})
        if sender_doc and not (has_received_status(sender_doc) or sender_doc.get("reply_file_id")):
            senders_data.append({
                "sender_name": sender["sender_name"],
                "phone_number": sender["phone_number"],
                "mobile_provider": sender_doc.get("mobile_provider", "unknown"),
                "full_name": sender_doc.get("full_name"),
                "date": sender_doc.get("date")
            })
    
    if senders_data:
        date_str = now.strftime("%d %B %Y")
        data_pdf_id = generate_custom_pdf_and_store(senders_data, ["sender_name", "phone_number", "mobile_provider", "full_name", "date"], request_id, date_str)
        suspension_pdf_id = generate_suspension_pdf(request_id, date_str)

        for sender in pending_doc.get("senders", []):
            sender_names.update_one(
                {"_id": sender["sender_object_id"]},
                {"$set": {
                    "pdf_sent_data_id": data_pdf_id,
                    "pdf_sent_suspension_id": suspension_pdf_id,
                    "updated_at": now,
                    "status": add_status(
                        sender_names.find_one({"_id": sender["sender_object_id"]}).get("status", []),
                        "suspension_requested",
                        now
                    )
                }}
            )

    return {
        "message": f"อนุมัติ request {request_id} สำเร็จ",
        "data_pdf_id": str(data_pdf_id) if senders_data else None,
        "suspension_pdf_id": str(suspension_pdf_id) if senders_data else None
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
    main_file_id = None
    
    for file in files:
        content = await file.read()
        now = datetime.datetime.now()
        file_id = grid_fs.put(content, filename=file.filename, metadata={
            "request_id": request_id,
            "uploaded_by": current_user["id"],
            "uploaded_at": now
        })
        file_ids.append(str(file_id))
        
        if main_file_id is None:
            main_file_id = str(file_id)
            
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

    for _, row in df.iterrows():
        try:
            sender_name = str(row[required_col]).strip()
            if not sender_name or sender_name == 'nan':
                continue

            sender_entry = next((s for s in pending_doc["senders"] 
                               if s["sender_name"] == sender_name), None)
            
            if not sender_entry:
                failed.append(sender_name)
                continue

            sender_doc = sender_names.find_one({"_id": sender_entry["sender_object_id"]})
            if sender_doc:
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
                        "reply_file_id": main_file_id,
                        "updated_at": now
                    }}
                )

            telco_data = {
                "request_id": request_id,
                "sender_name": sender_name,
                "phone_number": sender_doc.get("phone_number", ""),
                "sender_object_id": sender_entry["sender_object_id"],
                "mobile_provider": row.get("โครงข่ายที่ใช้งาน(โครงข่ายต้นทาง)", "unknown"),
                "full_name": row.get("ชื่อสกุลผู้จดทะเบียน"),
                "date": row.get("วันที่จดทะเบียนเบอร์"),
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
                "reply_file_id": main_file_id,
                "all_reply_file_ids": file_ids,
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

    return {
        "message": f"ประมวลผล ISP response สำเร็จ",
        "file_ids": file_ids,
        "successful_count": len(successful),
        "failed_count": len(failed),
        "details": {"successful": successful, "failed": failed}
    }

@router.get("/pending-sender/{request_id}")
async def get_pending_sender(request_id: str, current_user: dict = Depends(get_current_user)):
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    pending_doc = pending_requests.find_one({"request_id": request_id, "is_approved": True})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="ไม่พบ request ที่อนุมัติแล้ว")

    results = []
    for sender_entry in pending_doc.get("senders", []):
        sender_doc = sender_names.find_one({"_id": sender_entry["sender_object_id"]})
        if sender_doc:
            formatted_doc = format_sender_doc(
                sender_doc,
                include_telco_data=True,
                response_from_telco=response_from_telco,
                include_pdf_ids=True
            )
            results.append(formatted_doc)

    return clean_nan_values(results)

@router.post("/complete-suspension/{sender_name}")
def complete_suspension(sender_name: str, current_user: dict = Depends(get_current_user)):
    check_admin(current_user)
    
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    doc = sender_names.find_one({"sender_name": sender_name})
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบ sender")
    
    current_status = doc.get("status", [])
    if is_status_object(current_status):
        status_names = [s["name"] for s in current_status]
    else:
        status_names = current_status
    
    if "suspended" in status_names:
        return {"message": "ระงับแล้ว"}
    
    now = datetime.datetime.now()
    new_status = add_status(current_status, "suspended", now)
    
    updated_request_ids = [
        {**req, "status": "suspended"} if req["status"] != "suspended" else req
        for req in doc.get("request_ids", [])
    ]
    
    sender_names.update_one(
        {"sender_name": sender_name},
        {"$set": {
            "status": new_status,
            "request_ids": updated_request_ids,
            "suspended_at": now,
            "updated_at": now
        }}
    )
    
    for req in doc.get("request_ids", []):
        response_from_telco.update_one(
            {"sender_name": sender_name, "request_id": req["id"]},
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
    
    return {"message": "ระงับ sender สำเร็จ"}

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

@router.get("/file/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        file_obj = grid_fs.get(ObjectId(file_id))
        temp_path = f"/tmp/{file_obj.filename}"
        
        with open(temp_path, 'wb') as f:
            f.write(file_obj.read())
        
        if file_obj.filename.endswith('.pdf'):
            media_type = 'application/pdf'
        elif file_obj.filename.endswith('.xlsx'):
            media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            media_type = 'text/csv'
        
        return FileResponse(temp_path, media_type=media_type, filename=file_obj.filename)
    except:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")