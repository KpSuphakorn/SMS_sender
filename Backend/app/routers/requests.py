import datetime
import pandas as pd
from io import BytesIO
from pymongo import UpdateOne
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File
from typing import Optional, List
from app.schemas.request import SenderRequest
from app.utils.pdf import generate_custom_pdf_and_store, generate_suspension_pdf
from app.dependencies import get_current_user
from app.utils.helpers import convert_objectid_to_str, format_sender_doc, is_status_object, clean_nan_values
from app.models.database import grid_fs
from app.models.sender_names import sender_names_collection
from app.models.response_from_telco import response_from_telco_collection
from app.models.pending_requests import pending_requests_collection
from bson.objectid import ObjectId
import random
from fastapi.responses import FileResponse
from collections import defaultdict

router = APIRouter()

def generate_request_id():
    """Generate a random 8-digit numeric request_id and ensure uniqueness"""
    sender_names = sender_names_collection()
    while True:
        request_id = str(random.randint(10000000, 99999999))  # 8-digit random number
        if not sender_names.find_one({"request_ids.id": request_id}):
            return request_id

@router.post("/store-sender-collection")
async def store_sender_collection_endpoint(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    pending_requests = pending_requests_collection()
    request_id = generate_request_id()
    updated_at = datetime.datetime.now()
    sender_entries = []

    # Validate required fields
    for row in data.rows:
        if not row.get("sender_name") or not row.get("phone_number"):
            raise HTTPException(status_code=400, detail=f"Missing sender_name or phone_number in row: {row}")

    # Process each row and prepare sender entries
    for row in data.rows:
        sender_name = row["sender_name"]
        phone_number = row["phone_number"]
        
        # Find existing sender document
        existing_doc = sender_names.find_one(
            {"sender_name": sender_name, "phone_number": phone_number},
            sort=[("created_at", -1)]
        )
        
        if existing_doc:
            # Check if sender has received status
            current_status = existing_doc.get("status", [])
            has_received = False
            if is_status_object(current_status):
                has_received = any(s["name"] == "received" for s in current_status)
            else:
                has_received = "received" in current_status

            if has_received or existing_doc.get("reply_file_id"):
                continue  # Skip if already received

            # Update existing sender document
            update_data = {
                "request_ids": existing_doc.get("request_ids", []) + [{"id": request_id, "status": "pending"}],
                "updated_at": updated_at,
                "status": existing_doc.get("status", []) + [
                    {"name": "pending", "updated_at": updated_at},
                    {"name": "suspension_requested", "updated_at": updated_at}
                ]
            }
            sender_names.update_one(
                {"_id": existing_doc["_id"]},
                {"$set": update_data}
            )
            sender_object_id = existing_doc["_id"]
        else:
            # Insert new sender document
            new_doc = {
                "sender_name": sender_name,
                "phone_number": phone_number,
                "mobile_provider": row.get("mobile_provider", "unknown"),
                "full_name": row.get("full_name"),
                "date": row.get("date"),
                "request_ids": [{"id": request_id, "status": "pending"}],
                "fields": data.fields,
                "status": [
                    {"name": "pending", "updated_at": updated_at},
                    {"name": "suspension_requested", "updated_at": updated_at}
                ],
                "created_by": current_user["id"],
                "created_at": updated_at,
                "updated_at": updated_at
            }
            result = sender_names.insert_one(new_doc)
            sender_object_id = result.inserted_id

        # Add to sender_entries for pending_requests
        sender_entries.append({
            "sender_name": sender_name,
            "phone_number": phone_number,
            "sender_object_id": sender_object_id
        })

    # Store single document in pending_requests with all sender entries
    if sender_entries:
        pending_requests.insert_one({
            "request_id": request_id,
            "senders": sender_entries,
            "is_approved": False,
            "created_at": updated_at,
            "updated_at": updated_at,
            "created_by": current_user["id"]
        })

    return {
        "message": "Stored sender names in collection successfully",
        "request_id": request_id,
        "sender_object_ids": [str(entry["sender_object_id"]) for entry in sender_entries]
    }

@router.post("/approve-request/{request_id}")
async def approve_request_endpoint(request_id: str, current_user: dict = Depends(get_current_user)):
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    
    # Find the pending request
    pending_doc = pending_requests.find_one({"request_id": request_id})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check if already approved
    if pending_doc.get("is_approved", False):
        return {"message": "Request already approved"}

    # Update the request to approved
    updated_at = datetime.datetime.now()
    result = pending_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "is_approved": True,
            "updated_at": updated_at,
            "approved_by": current_user["id"]
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")

    # Generate and store PDFs
    rows_to_request = [
        {
            "sender_name": sender["sender_name"],
            "phone_number": sender["phone_number"],
            "mobile_provider": sender_names.find_one({"_id": sender["sender_object_id"]}).get("mobile_provider", "unknown"),
            "full_name": sender_names.find_one({"_id": sender["sender_object_id"]}).get("full_name"),
            "date": sender_names.find_one({"_id": sender["sender_object_id"]}).get("date")
        } for sender in pending_doc.get("senders", [])
    ]
    if rows_to_request:
        updated_at_str = updated_at.strftime("%d %B %Y")
        data_pdf_id = generate_custom_pdf_and_store(rows_to_request, [], request_id, updated_at_str)
        suspension_pdf_id = generate_suspension_pdf(request_id, updated_at_str)

        # Update sender_names with PDF IDs
        for sender in pending_doc.get("senders", []):
            sender_names.update_one(
                {"_id": sender["sender_object_id"]},
                {"$set": {
                    "pdf_sent_data_id": data_pdf_id,
                    "pdf_sent_suspension_id": suspension_pdf_id,
                    "updated_at": updated_at
                }}
            )

    return {"message": f"Request {request_id} approved successfully"}

@router.post("/isp-response/{request_id}")
async def isp_response_endpoint(request_id: str, files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_user)):
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    # Verify request exists and is approved
    pending_doc = pending_requests.find_one({"request_id": request_id, "is_approved": True})
    if not pending_doc:
        raise HTTPException(status_code=404, detail="No approved pending requests found for this request_id")

    file_ids = []
    excel_content = None
    for file in files:
        content = await file.read()
        updated_at = datetime.datetime.now()
        file_id = grid_fs.put(content, filename=file.filename, metadata={"request_id": request_id, "uploaded_by": current_user["id"], "uploaded_at": updated_at})
        file_ids.append(str(file_id))
        print(f"Uploaded file: {file.filename}, file_id: {file_id}, size: {len(content)} bytes")
        if file.filename.endswith(('.xlsx', '.xls')):
            excel_content = content  # เก็บ content ของไฟล์ Excel

    # Process Excel file if present
    if excel_content is not None:
        print(f"Excel content length: {len(excel_content)}")  # Debug
        try:
            df = pd.read_excel(BytesIO(excel_content), engine='openpyxl')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")

        # Validate required columns
        required_columns = ["หมายเลขที่แสดง/Sender Name", "หมายเลขปลายทาง"]
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail="Excel file missing required columns: 'หมายเลขที่แสดง/Sender Name', 'หมายเลขปลายทาง'")

        # Process Excel data and update collections
        for _, row in df.iterrows():
            sender_name = str(row["หมายเลขที่แสดง/Sender Name"]).strip()
            phone_number = str(row["หมายเลขปลายทาง"]).strip()

            # Find sender in pending_requests
            sender_entry = next((s for s in pending_doc["senders"] if s["sender_name"] == sender_name and s["phone_number"] == phone_number), None)
            if not sender_entry:
                print(f"No matching sender found for: {sender_name}, {phone_number}")  # Debug
                continue

            # Update sender_names
            sender_doc = sender_names.find_one({"_id": sender_entry["sender_object_id"]})
            if sender_doc:
                current_status = sender_doc.get("status", [])
                if is_status_object(current_status):
                    status_names = [s["name"] for s in current_status]
                    new_status_list = current_status
                else:
                    status_names = current_status
                    new_status_list = [{"name": s, "updated_at": sender_doc.get("updated_at", updated_at)} for s in current_status]

                if "received" not in status_names:
                    new_status_list.append({"name": "received", "updated_at": updated_at})

                sender_names.update_one(
                    {"_id": sender_doc["_id"]},
                    {"$set": {
                        "status": new_status_list,
                        "reply_file_id": str(file_ids[0]),
                        "updated_at": updated_at
                    }}
                )

            # Update response_from_telco
            response_from_telco.update_one(
                {"request_id": request_id, "sender_name": sender_name, "phone_number": phone_number},
                {
                    "$set": {
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
                        "reply_file_id": str(file_ids[0]),
                        "updated_at": updated_at
                    },
                    "$push": {"status": {"name": "received", "updated_at": updated_at}}
                },
                upsert=True
            )

    return {
        "message": f"ISP response for request {request_id} stored successfully",
        "file_ids": file_ids
    }

@router.get("/pending-sender/{request_id}")
async def get_pending_sender_endpoint(request_id: str, current_user: dict = Depends(get_current_user)):
    pending_requests = pending_requests_collection()
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    # Find pending request by request_id and ensure it's approved
    pending_doc = pending_requests.find_one({"request_id": request_id, "is_approved": True})
    
    if not pending_doc:
        raise HTTPException(status_code=404, detail="No approved pending requests found for this request_id")

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
def create_request_endpoint(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    request_id = generate_request_id()
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

    # Generate and store PDFs
    if rows_to_request:
        updated_at_str = updated_at.strftime("%d %B %Y")
        data_pdf_id = generate_custom_pdf_and_store(rows_to_request, data.fields, request_id, updated_at_str)
        suspension_pdf_id = generate_suspension_pdf(request_id, updated_at_str)

        # Update sender documents with PDF IDs
        for row in rows_to_request:
            sender_name = row["sender_name"]
            phone_number = row["phone_number"]
            if not sender_map.get((sender_name, phone_number)):
                print(f"Inserting new sender: {sender_name}")
                sender_names.insert_one({
                    "sender_name": sender_name,
                    "phone_number": phone_number,
                    "mobile_provider": row.get("mobile_provider", "unknown"),
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

@router.post("/complete-suspension/{sender_name}")
def complete_suspension_endpoint(sender_name: str):
    sender_names = sender_names_collection()
    response_from_telco = response_from_telco_collection()
    
    # Find document by sender_name
    doc = sender_names.find_one({"sender_name": sender_name})
    if not doc:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    updated_at = datetime.datetime.now()
    current_status = doc.get("status", [])
    
    # Check current status
    if is_status_object(current_status):
        status_names = [s["name"] for s in current_status]
    else:
        status_names = current_status
    
    # If already suspended, do nothing
    if "suspended" in status_names:
        return {"message": "Sender already marked as suspended"}
    
    # Prepare update data
    update_data = {
        "updated_at": updated_at,
        "suspended_at": updated_at
    }
    
    # Update status
    if is_status_object(current_status):
        update_data["status"] = current_status + [{"name": "suspended", "updated_at": updated_at}]
    else:
        update_data["status"] = [{"name": s, "updated_at": doc.get("updated_at", updated_at)} for s in current_status] + [{"name": "suspended", "updated_at": updated_at}]
    
    # Update request_ids that are not "suspended"
    if doc.get("request_ids"):
        update_data["request_ids"] = [
            {**req, "status": "suspended"} if req["status"] != "suspended" else req
            for req in doc.get("request_ids", [])
        ]
    
    # Update sender_names document
    result = sender_names.update_one(
        {"sender_name": sender_name},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    if result.modified_count:
        # Update or insert response_from_telco for all request_ids
        for req in doc.get("request_ids", []):
            response_from_telco.update_one(
                {"sender_name": sender_name, "request_id": req["id"]},
                {
                    "$set": {
                        "updated_at": updated_at,
                        "phone_number": doc.get("phone_number"),
                        "mobile_provider": doc.get("mobile_provider"),
                        "full_name": doc.get("full_name"),
                        "date": doc.get("date")
                    },
                    "$push": {"status": {"name": "suspended", "updated_at": updated_at}}
                },
                upsert=True
            )
    
    return {"message": "Suspension completed for sender"}

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
            raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    if end:
        try:
            end_date = datetime.datetime.strptime(end, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
    if start and end:
        if start_date.date() > end_date.date():
            raise HTTPException(status_code=400, detail="Start date must be less than or equal to end date")
        if end_date.date() > today:
            raise HTTPException(status_code=400, detail="End date must not be greater than current date")
        query["updated_at"] = {"$gte": start_date, "$lte": end_date}
    elif start:
        query["updated_at"] = {"$gte": start_date}
    elif end:
        if end_date.date() > today:
            raise HTTPException(status_code=400, detail="End date must not be greater than current date")
        query["updated_at"] = {"$lte": end_date}
    
    results = [
        format_sender_doc(doc, include_telco_data=True, response_from_telco=response_from_telco)
        for doc in sender_names.find(query, {"_id": 0})
    ]
    
    return clean_nan_values(results)

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
        raise HTTPException(status_code=404, detail="File not found")