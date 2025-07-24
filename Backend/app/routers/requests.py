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
from collections import defaultdict
import pytz

router = APIRouter()

THAILAND_TZ = pytz.timezone('Asia/Bangkok')

@router.post("/store-sender-collection")
async def store_sender_collection(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    pending_requests = pending_requests_collection()
    request_id = generate_request_id()
    now = datetime.datetime.now()
    sender_entries = []

    # ตรวจสอบข้อมูลที่จำเป็น
    for row in data.rows:
        if not row.get("sender_name") or not row.get("phone_number"):
            raise HTTPException(status_code=400, detail="ต้องมี sender_name และ phone_number")

    # ประมวลผลแต่ละ row
    for row in data.rows:
        sender_name = row["sender_name"]
        phone_number = row["phone_number"]
        
        # หา sender ที่มีอยู่แล้ว
        existing = sender_names.find_one(
            {"sender_name": sender_name, "phone_number": phone_number},
            sort=[("created_at", -1)]
        )
        
        # ข้าม sender ที่ได้รับ response แล้ว
        if existing and (has_received_status(existing) or existing.get("reply_file_id")):
            continue

        if existing:
            # อัปเดต sender ที่มีอยู่
            sender_names.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "request_ids": existing.get("request_ids", []) + [{"id": request_id, "status": "pending"}],
                    "updated_at": now,
                    "status": add_status(existing.get("status", []), "pending", now) + [{"name": "suspension_requested", "updated_at": now}]
                }}
            )
            sender_object_id = existing["_id"]
        else:
            # สร้าง sender ใหม่
            new_doc = {
                "sender_name": sender_name,
                "phone_number": phone_number,
                "mobile_provider": row.get("mobile_provider", "unknown"),
                "full_name": row.get("full_name"),
                "date": row.get("date"),
                "request_ids": [{"id": request_id, "status": "pending"}],
                "fields": data.fields,
                "status": [
                    {"name": "pending", "updated_at": now},
                    {"name": "suspension_requested", "updated_at": now}
                ],
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

    # บันทึกใน pending_requests
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
        "sender_count": len(sender_entries)
    }

@router.post("/approve-request/{request_id}")
async def approve_request(request_id: str, current_user: dict = Depends(get_current_user)):
    check_admin(current_user)
    
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    
    # หา pending request
    pending_doc = pending_requests.find_one({"request_id": request_id})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="ไม่พบ request")
    
    if pending_doc.get("is_approved"):
        return {"message": "อนุมัติแล้ว"}

    # อนุมัติ request
    now = datetime.datetime.now()
    pending_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "is_approved": True,
            "updated_at": now,
            "approved_by": current_user["id"]
        }}
    )

    # สร้าง PDF
    senders_data = []
    for sender in pending_doc.get("senders", []):
        sender_doc = sender_names.find_one({"_id": sender["sender_object_id"]})
        if sender_doc:
            senders_data.append({
                "sender_name": sender["sender_name"],
                "phone_number": sender["phone_number"],
                "mobile_provider": sender_doc.get("mobile_provider", "unknown"),
                "full_name": sender_doc.get("full_name"),
                "date": sender_doc.get("date")
            })
    
    if senders_data:
        date_str = now.strftime("%d %B %Y")
        data_pdf_id = generate_custom_pdf_and_store(senders_data, [], request_id, date_str)
        suspension_pdf_id = generate_suspension_pdf(request_id, date_str)

        # อัปเดต sender_names ด้วย PDF IDs
        for sender in pending_doc.get("senders", []):
            sender_names.update_one(
                {"_id": sender["sender_object_id"]},
                {"$set": {
                    "pdf_sent_data_id": data_pdf_id,
                    "pdf_sent_suspension_id": suspension_pdf_id,
                    "updated_at": now
                }}
            )

    return {"message": f"อนุมัติ request {request_id} สำเร็จ"}

@router.post("/isp-response/{request_id}")
async def isp_response(request_id: str, files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_user)):
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    # ตรวจสอบ request ที่อนุมัติแล้ว
    pending_doc = pending_requests.find_one({"request_id": request_id, "is_approved": True})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="ไม่พบ request ที่อนุมัติแล้ว")

    # อัปโหลดไฟล์
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

    # ประมวลผลไฟล์ Excel
    try:
        df = pd.read_excel(BytesIO(excel_content), engine='openpyxl')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"อ่านไฟล์ Excel ไม่ได้: {str(e)}")

    # ตรวจสอบ column ที่จำเป็น
    required_col = "หมายเลขที่แสดง/Sender Name"
    if required_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"ไม่พบ column: {required_col}")

    successful = []
    failed = []

    # ประมวลผลแต่ละแถว
    for _, row in df.iterrows():
        try:
            sender_name = str(row[required_col]).strip()
            if not sender_name or sender_name == 'nan':
                continue

            # หา sender ใน pending_requests
            sender_entry = next((s for s in pending_doc["senders"] 
                               if s["sender_name"] == sender_name), None)
            
            if not sender_entry:
                failed.append(sender_name)
                continue

            # อัปเดต sender_names
            sender_doc = sender_names.find_one({"_id": sender_entry["sender_object_id"]})
            if sender_doc:
                now = datetime.datetime.now()
                new_status = add_status(sender_doc.get("status", []), "received", now)
                
                # อัปเดต request_ids status
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

            # บันทึกลง response_from_telco
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
                "reply_file_id": main_file_id,  # ไฟล์หลัก (Excel)
                "all_reply_file_ids": file_ids,  # ทุกไฟล์ที่อัปโหลด
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
                include_pdf_ids=False
            )
            results.append(formatted_doc)

    return clean_nan_values(results)

@router.post("/request")
def create_request(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    request_id = generate_request_id()
    now = datetime.datetime.now()
    
    rows_to_request = []
    existing_data = []

    # ตรวจสอบข้อมูลที่จำเป็น
    for row in data.rows:
        if not row.get("sender_name") or not row.get("phone_number"):
            raise HTTPException(status_code=400, detail="ต้องมี sender_name และ phone_number")

    # ประมวลผลแต่ละ row
    for row in data.rows:
        sender_name = row["sender_name"]
        phone_number = row["phone_number"]
        
        # หา sender ที่มีอยู่
        existing_sender = sender_names.find_one(
            {"sender_name": sender_name, "phone_number": phone_number},
            sort=[("created_at", -1)]
        )
        
        # หา telco data ที่มีอยู่
        existing_telco = response_from_telco.find_one({
            "sender_name": sender_name,
            "phone_number": phone_number
        })

        # ถ้ามี received status หรือ reply_file_id แล้ว ให้ข้าม
        if existing_sender and (has_received_status(existing_sender) or existing_sender.get("reply_file_id")):
            # อัปเดต request_ids ด้วย status "skipped"
            current_request_ids = existing_sender.get("request_ids", [])
            if len(current_request_ids) >= 5:
                current_request_ids = current_request_ids[-4:]
            
            sender_names.update_one(
                {"_id": existing_sender["_id"]},
                {"$set": {
                    "request_ids": current_request_ids + [{"id": request_id, "status": "skipped"}],
                    "updated_at": now
                }}
            )
            
            reused_id = next((req["id"] for req in existing_sender.get("request_ids", []) 
                            if req["status"] == "received"), None)
            existing_data.append({
                "sender_name": sender_name,
                "phone_number": phone_number,
                "reused_request_id": reused_id
            })
            continue

        # ถ้ามี telco data แล้ว
        if existing_telco:
            if existing_sender:
                current_status = add_status(existing_sender.get("status", []), "received", now)
                sender_names.update_one(
                    {"_id": existing_sender["_id"]},
                    {"$set": {
                        "request_ids": existing_sender.get("request_ids", []) + [{"id": request_id, "status": "skipped"}],
                        "status": current_status,
                        "reply_file_id": existing_telco.get("reply_file_id"),
                        "updated_at": now
                    }}
                )
            
            existing_data.append({
                "sender_name": sender_name,
                "phone_number": phone_number,
                "reused_request_id": existing_telco.get("request_id")
            })
            continue

        # เพิ่มเข้า request list
        rows_to_request.append(row)
        
        if existing_sender:
            # อัปเดต sender ที่มีอยู่
            current_request_ids = existing_sender.get("request_ids", [])
            if len(current_request_ids) >= 5:
                current_request_ids = current_request_ids[-4:]
            
            current_status = add_status(existing_sender.get("status", []), "pending", now)
            current_status = add_status(current_status, "suspension_requested", now)
            
            sender_names.update_one(
                {"_id": existing_sender["_id"]},
                {"$set": {
                    "request_ids": current_request_ids + [{"id": request_id, "status": "pending"}],
                    "status": current_status,
                    "fields": data.fields,
                    "updated_at": now
                }}
            )

    # สร้าง PDF และ insert sender ใหม่
    if rows_to_request:
        date_str = now.strftime("%d %B %Y")
        data_pdf_id = generate_custom_pdf_and_store(rows_to_request, data.fields, request_id, date_str)
        suspension_pdf_id = generate_suspension_pdf(request_id, date_str)

        for row in rows_to_request:
            sender_name = row["sender_name"]
            phone_number = row["phone_number"]
            
            # ถ้าไม่มี sender ให้สร้างใหม่
            existing = sender_names.find_one({"sender_name": sender_name, "phone_number": phone_number})
            if not existing:
                sender_names.insert_one({
                    "sender_name": sender_name,
                    "phone_number": phone_number,
                    "mobile_provider": row.get("mobile_provider", "unknown"),
                    "full_name": row.get("full_name"),
                    "date": row.get("date"),
                    "request_ids": [{"id": request_id, "status": "pending"}],
                    "fields": data.fields,
                    "status": [
                        {"name": "pending", "updated_at": now},
                        {"name": "suspension_requested", "updated_at": now}
                    ],
                    "pdf_sent_data_id": data_pdf_id,
                    "pdf_sent_suspension_id": suspension_pdf_id,
                    "created_by": current_user["id"],
                    "created_at": now,
                    "updated_at": now
                })

    return {
        "message": "สร้างคำร้องสำเร็จ",
        "request_id": request_id,
        "existing_data": existing_data,
        "requested_senders": [r["sender_name"] for r in rows_to_request]
    }

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
    
    # อัปเดต request_ids เป็น suspended
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
    
    # อัปเดต response_from_telco
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
    
    # ตรวจสอบวันที่
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
        format_sender_doc(doc, include_telco_data=True, response_from_telco=response_from_telco)
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
        
        # กำหนด media type
        if file_obj.filename.endswith('.pdf'):
            media_type = 'application/pdf'
        elif file_obj.filename.endswith('.xlsx'):
            media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            media_type = 'text/csv'
        
        return FileResponse(temp_path, media_type=media_type, filename=file_obj.filename)
    except:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")
    
@router.get("/dashboard/summary")
async def get_dashboard_summary(): # <<< ไม่มี Dependency current_user
    sender_names = sender_names_collection()
    
    total_cases = sender_names.count_documents({})
    
    # นับเคสที่รออนุมัติ (waiting_approval)
    waiting_approval_count = sender_names.count_documents({
        "status.name": "pending" # ใช้ "pending" ตามสถานะใน format_sender_doc
    })
    
    # นับเคสที่ได้รับข้อมูลแล้ว (data_received)
    data_received_count = sender_names.count_documents({
        "status.name": "received"
    })

    # นับเคสที่ระงับแล้ว (suspended)
    suspended_count = sender_names.count_documents({
        "status.name": "suspended"
    })

    return {
        "totalCases": total_cases,
        "totalWaitingApproval": waiting_approval_count,
        "totalDataReceived": data_received_count,
        "totalSuspended": suspended_count or 0
    }

@router.get("/dashboard/network-distribution")
async def get_network_distribution(): # <<< ไม่มี Dependency current_user
    sender_names = sender_names_collection()
    
    # Aggregate เพื่อดึงจำนวนเคสตาม mobile_provider
    pipeline = [
        {"$group": {"_id": "$mobile_provider", "totalCases": {"$sum": 1}}},
        {"$project": {"name": "$_id", "totalCases": 1, "_id": 0}}
    ]
    
    network_data = list(sender_names.aggregate(pipeline))
    
    final_network_data = []
    # known_networks = ["AIS", "DTAC", "TRUE"] # <<< ลบออก

    for net in network_data:
        # name = net["name"] if net["name"] in known_networks else "Other" # <<< ลบออก
        name = net["name"] # <<< ใช้ชื่อ Telco จริงๆ จากฐานข้อมูล

        # ค้นหาข้อมูลเดิมจาก networks array ใน Frontend เพื่อให้ค่าอื่นๆ ตรงกัน
        # ถ้าไม่มีข้อมูลเดิม, ให้ค่าเริ่มต้นไปก่อน
        # ส่วนนี้ยังคงใช้ mock data สำหรับ waitingApproval, sentToNbtc, dataReceived, avgResponseTime
        # เนื่องจากคำขอระบุแค่ "Actual Telco" สำหรับชื่อ
        mock_entry = next((n for n in [
            {"name": "AIS", "totalCases": 150, "waitingApproval": 45, "sentToNbtc": 23, "dataReceived": 70, "avgResponseTime": 3.2},
            {"name": "DTAC", "totalCases": 120, "waitingApproval": 35, "sentToNbtc": 18, "dataReceived": 59, "avgResponseTime": 4.1},
            {"name": "TRUE", "totalCases": 130, "waitingApproval": 40, "sentToNbtc": 20, "dataReceived": 60, "avgResponseTime": 2.8},
        ] if n["name"] == name), None) # ใช้ 'name' ที่เป็น Actual Telco ในการหา mock_entry

        final_network_data.append({
            "name": name,
            "totalCases": net["totalCases"],
            "waitingApproval": mock_entry.get("waitingApproval", random.randint(10, 50)) if mock_entry else random.randint(10, 50),
            "sentToNbtc": mock_entry.get("sentToNbtc", random.randint(5, 30)) if mock_entry else random.randint(5, 30),
            "dataReceived": mock_entry.get("dataReceived", random.randint(20, 80)) if mock_entry else random.randint(20, 80),
            "avgResponseTime": mock_entry.get("avgResponseTime", round(random.uniform(2.0, 5.0), 1)) if mock_entry else round(random.uniform(2.0, 5.0), 1),
        })
    
    return final_network_data

@router.get("/dashboard/daily-new-cases")
async def get_daily_new_cases():
    """
    คืนข้อมูลจำนวนเคสใหม่ที่ถูกสร้างในแต่ละวันย้อนหลัง 6 วัน และรวมวันนี้ (รวม 7 วัน)
    ใช้ field 'date' (string, รูปแบบ YYYY-MM-DD) ในการนับจำนวนเคสใหม่แต่ละวัน
    """
    sender_names = sender_names_collection()

    # กำหนดวันปัจจุบัน (เวลา 00:00:00)
    today = datetime.datetime.now(THAILAND_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    daily_counts = {}
    labels = []
    data_counts = []

    # วนลูปย้อนหลัง 6 วัน + วันนี้ (รวม 7 วัน)
    for i in range(6, -1, -1):  # 6,5,4,3,2,1,0
        date = today - datetime.timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        # Query ด้วย field 'date' (string)
        count = sender_names.count_documents({"date": date_str})
        daily_counts[date_str] = count

    # เตรียมข้อมูลสำหรับกราฟ (เรียงจากวันเก่าสุดไปวันใหม่สุด)
    sorted_dates = sorted(daily_counts.keys())
    for date_str in sorted_dates:
        labels.append(date_str)
        data_counts.append(daily_counts[date_str])

    return {
        "labels": labels,
        "data": data_counts
    }

@router.get("/dashboard/cases")
async def get_filtered_cases( # <<< ไม่มี Dependency current_user
    selected_network: Optional[str] = Query(None),
    status_filter: str = Query("all"),
    high_value_filter: bool = Query(False),
    overdue_filter: Optional[str] = Query(None),
):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    query = {}
    
    if selected_network:
        query["mobile_provider"] = selected_network

    if status_filter != "all":
        query["status.name"] = status_filter
        
    if high_value_filter:
        query["amount"] = {"$gte": 10000} # ต้องมี field 'amount' ใน collection ของคุณ

    raw_cases = sender_names.find(query).sort("created_at", -1)
    
    filtered_results = []
    today_for_overdue = datetime.datetime.now(THAILAND_TZ).replace(hour=0, minute=0, second=0, microsecond=0)

    for doc in raw_cases:
        formatted_doc = format_sender_doc(
            doc,
            include_telco_data=True,
            response_from_telco=response_from_telco,
            include_pdf_ids=False
        )
        
        # Apply overdue filter in Python
        if overdue_filter:
            case_date_str = doc.get("reportDate") # assuming reportDate exists and is in YYYY-MM-DD
            if not case_date_str:
                continue
            
            try:
                # แปลง reportDate เป็น datetime object
                case_date = datetime.datetime.strptime(case_date_str, "%Y-%m-%d").replace(tzinfo=THAILAND_TZ)
                
                # คำนวณความต่างของวัน
                days_diff = (today_for_overdue - case_date).days
                
                is_overdue = False
                if overdue_filter == "waiting_3days" and formatted_doc.get("latest_request_status") == "pending" and days_diff > 3:
                    is_overdue = True
                elif overdue_filter == "sent_7days" and formatted_doc.get("latest_request_status") == "sent_to_nbtc" and days_diff > 7:
                    # สมมติว่ามี status "sent_to_nbtc" ใน request_ids
                    is_overdue = True
                
                if not is_overdue:
                    continue # Skip if not overdue
            except ValueError:
                # Handle cases where reportDate format is incorrect
                continue

        # Convert ObjectId back to string for consistency if not already done by format_sender_doc
        filtered_results.append(convert_objectid_to_str(formatted_doc))
        
    return clean_nan_values(filtered_results)