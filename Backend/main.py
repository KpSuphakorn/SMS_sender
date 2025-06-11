import os
import smtplib
import imaplib
import email
import uuid
import datetime
import jwt
import asyncio
from bson.objectid import ObjectId
from pymongo import MongoClient
import gridfs
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fpdf import FPDF
from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from werkzeug.security import generate_password_hash, check_password_hash
from io import BytesIO
import config as cfg

# === App Initialization ===
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === MongoDB Initialization ===
mongo_client = MongoClient(cfg.MONGO_CONNECTION_STRING)
mongo_db = mongo_client[cfg.MONGO_DATABASE_NAME]
users_col = mongo_db["users"]
request_logs_col = mongo_db[cfg.MONGO_REQUESTS_COLLECTION]
mock_data_col = mongo_db[cfg.MONGO_MOCK_COLLECTION]
notifications_col = mongo_db["notifications"]
grid_fs = gridfs.GridFS(mongo_db)

# === Settings ===
JWT_SECRET = os.getenv("JWT_SECRET", "devsecret")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 1440))

# === Field Labels ===
FIELD_LABELS = {
    "sender_name": "ชื่อผู้ส่ง",
    "mobile_provider": "ค่ายมือถือ",
    "phone_number": "เบอร์มือถือ",
    "full_name": "ชื่อ-สกุล",
    "date": "วันที่"
}

# === Status Enum ===
ALLOWED_STATUSES = ["pending", "received", "suspension_requested", "suspended"]

# === Pydantic Models ===
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class SenderRequest(BaseModel):
    fields: List[str]
    rows: List[Dict]

# === Auth Utilities ===
def create_access_token(user: dict):
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name"),
        "role": user.get("role"),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=JWT_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    user = users_col.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = str(user["_id"])
    return user

# === Utility Functions ===
def generate_custom_pdf_and_store(rows, fields, request_id, date_display):
    pdf = FPDF(orientation='L')
    pdf.add_font('THSarabunNew', '', cfg.THAI_FONT_PATH_NORMAL, uni=True)
    pdf.set_font('THSarabunNew', '', 14)
    pdf.add_page()

    page_width = pdf.w - 2 * pdf.l_margin
    col_width = page_width / len(fields) if fields else 40

    pdf.cell(0, 10, f"Request ID: {request_id}", 0, 1)
    pdf.cell(0, 10, f"วันที่: {date_display}", 0, 1)
    pdf.ln(5)

    for field in fields:
        label = FIELD_LABELS.get(field, field)
        pdf.cell(col_width, 10, label, 1)
    pdf.ln()

    for row in rows:
        for field in fields:
            value = str(row.get(field, "-"))
            pdf.cell(col_width, 10, value, 1)
        pdf.ln()

    pdf_stream = BytesIO(pdf.output(dest='S'))
    return grid_fs.put(
        pdf_stream,
        filename=f"{request_id}_data.pdf",
        request_id=request_id,
        file_type="sent_data"
    )

def generate_suspension_pdf(request_id: str, date_display, recipient="เจ้าหน้าที่ผู้เกี่ยวข้อง"):
    pdf = FPDF()
    pdf.add_font('THSarabunNew', '', cfg.THAI_FONT_PATH_NORMAL, uni=True)
    pdf.set_font('THSarabunNew', '', 16)
    pdf.add_page()

    pdf.cell(0, 10, f"เรียน {recipient}", 0, 1)
    pdf.ln(10)
    pdf.multi_cell(0, 10, f"ขอให้ดำเนินการระงับสัญญาณตามข้อมูลในเอกสารแนบ (Request ID: {request_id})")
    pdf.ln(10)
    pdf.cell(0, 10, "ด้วยความเคารพ", 0, 1)
    pdf.cell(0, 10, "ผู้ยื่นคำขอ", 0, 1)
    pdf.ln(10)
    pdf.set_text_color(255, 0, 0)  # Red color for date
    pdf.cell(0, 10, f"วันที่: {date_display}", 0, 1)

    pdf_stream = BytesIO(pdf.output(dest='S'))
    return grid_fs.put(
        pdf_stream,
        filename=f"{request_id}_suspension.pdf",
        request_id=request_id,
        file_type="sent_suspension"
    )

def send_email(subject, body, file_ids):
    msg = MIMEMultipart()
    msg['From'] = cfg.SENDER_EMAIL
    msg['To'] = cfg.RECIPIENT_EMAIL_FOR_TESTING
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    for file_id in file_ids:
        file_data = grid_fs.get(file_id).read()
        filename = grid_fs.get(file_id).filename
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(file_data)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part)

    with smtplib.SMTP(cfg.SMTP_SERVER, cfg.SMTP_PORT) as server:
        server.starttls()
        server.login(cfg.SENDER_EMAIL, cfg.SENDER_PASSWORD)
        server.send_message(msg)

def create_notification(request_id: str, status: str, user_id: str, thai_date: str):
    return notifications_col.insert_one({
        "request_id": request_id,
        "status": status,
        "user_id": user_id,
        "is_read": False,
        "thai_date": thai_date,
        "created_at": datetime.datetime.now()
    })

def check_inbox_and_save_reply():
    mail = imaplib.IMAP4_SSL(cfg.IMAP_SERVER)
    mail.login(cfg.SENDER_EMAIL, cfg.SENDER_PASSWORD)
    mail.select("inbox")

    for doc in request_logs_col.find({"status": {"$in": ["pending", "suspension_requested"]}}):
        request_id = doc["request_id"]
        thai_date = doc["thai_date"]
        user_id = doc["created_by"]
        
        # ตรวจสอบว่า notification สำหรับ "received" มีอยู่แล้วหรือไม่
        existing_notification = notifications_col.find_one({
            "request_id": request_id,
            "status": "received"
        })
        if existing_notification:
            continue  # ข้ามหาก notification สำหรับ "received" มีอยู่แล้ว

        result, data = mail.search(None, f'(SUBJECT "{request_id}")')
        if result != 'OK':
            continue
        for num in data[0].split():
            _, msg_data = mail.fetch(num, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            if msg["From"] and cfg.SENDER_EMAIL.lower() not in msg["From"].lower():
                for part in msg.walk():
                    if part.get_content_maintype() == 'multipart': continue
                    if part.get('Content-Disposition') is None: continue
                    filename = part.get_filename()
                    if filename and filename.lower().endswith((".csv", ".xlsx")):
                        file_data = part.get_payload(decode=True)
                        reply_id = grid_fs.put(file_data, filename=filename, request_id=request_id, file_type="reply")
                        request_logs_col.update_one(
                            {"request_id": request_id},
                            {
                                "$addToSet": {"status": "received"},
                                "$set": {
                                    "reply_file_id": reply_id,
                                    "updated_at": datetime.datetime.now()
                                }
                            }
                        )
                        create_notification(request_id, "received", user_id, thai_date)
                        # ทำเครื่องหมายอีเมลว่า "อ่านแล้ว"
                        mail.store(num, '+FLAGS', '\\Seen')
                        break
    mail.logout()

# === API Endpoints ===
@app.post("/api/user/register")
def register_user(data: UserCreate):
    if users_col.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="อีเมลนี้มีผู้ใช้งานแล้ว")

    hashed_password = generate_password_hash(data.password)
    user_data = {
        "name": data.name,
        "email": data.email,
        "password": hashed_password,
        "role": data.role,
        "created_at": datetime.datetime.utcnow()
    }
    result = users_col.insert_one(user_data)
    user = users_col.find_one({"_id": result.inserted_id})
    token = create_access_token(user)
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user["role"], "token": token}

@app.post("/api/user/login")
def login_user(data: UserLogin):
    user = users_col.find_one({"email": data.email})
    if not user or not check_password_hash(user["password"], data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user)
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user["role"], "token": token}

@app.get("/api/user/logout")
def logout():
    return {"message": "Logged out (frontend should clear token)"}

@app.get("/api/user/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"], "role": current_user.get("role")}

@app.post("/api/request")
def create_request(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    thai_date = datetime.datetime.now().strftime("%d %B %Y")
    data_pdf_id = generate_custom_pdf_and_store(data.rows, data.fields, request_id, thai_date)
    suspension_pdf_id = generate_suspension_pdf(request_id, thai_date)

    subject = f"ขอข้อมูลและระงับสัญญาณ (Request ID: {request_id})"
    body = f"เรียนเจ้าหน้าที่\n\nRequest ID: {request_id}\nวันที่: {thai_date}\nกรุณาดำเนินการระงับสัญญาณตามเอกสารแนบและส่งข้อมูลกลับในรูปแบบ Excel/CSV"
    send_email(subject, body, [data_pdf_id, suspension_pdf_id])

    request_logs_col.insert_one({
        "request_id": request_id,
        "thai_date": thai_date,
        "fields": data.fields,
        "data": data.rows,
        "status": ["pending", "suspension_requested"],
        "pdf_sent_data_id": data_pdf_id,
        "pdf_sent_suspension_id": suspension_pdf_id,
        "created_by": current_user["id"],
        "created_at": datetime.datetime.now(),
        "read_by": []
    })

    return {"message": "ส่งคำขอเรียบร้อย", "request_id": request_id}

@app.post("/api/notification/mark-read/{notification_id}")
def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = notifications_col.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["id"]},
        {"$set": {"is_read": True, "updated_at": datetime.datetime.now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    if result.modified_count == 0:
        return {"message": "Notification already marked as read"}
    return {"message": "Marked as read"}

@app.post("/api/request/complete-suspension/{request_id}")
def complete_suspension(request_id: str):
    doc = request_logs_col.find_one({"request_id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    result = request_logs_col.update_one(
        {"request_id": request_id},
        {
            "$addToSet": {"status": "suspended"},
            "$set": {
                "updated_at": datetime.datetime.now(),
                "suspended_at": datetime.datetime.now()
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    if result.modified_count == 0:
        return {"message": "Request already marked as suspended"}
    create_notification(request_id, "suspended", doc["created_by"], doc["thai_date"])
    return {"message": "Suspension completed"}

@app.get("/api/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = notifications_col.find({"user_id": current_user["id"]}).sort("created_at", -1)
    return [{
        "notification_id": str(doc["_id"]),
        "request_id": doc["request_id"],
        "status": doc["status"],
        "thai_date": doc["thai_date"],
        "is_read": doc["is_read"],
        "created_at": doc["created_at"]
    } for doc in notifications]

@app.get("/api/requests")
def get_requests(current_user: dict = Depends(get_current_user)):
    requests = request_logs_col.find({"created_by": current_user["id"]}).sort("created_at", -1)
    return [{
        "request_id": doc["request_id"],
        "thai_date": doc["thai_date"],
        "status": doc["status"],
        "reply_file_id": str(doc.get("reply_file_id", "")),
        "pdf_sent_data_id": str(doc.get("pdf_sent_data_id", "")),
        "pdf_sent_suspension_id": str(doc.get("pdf_sent_suspension_id", "")),
        "is_read": current_user["id"] in doc.get("read_by", []),
        "read_by": doc.get("read_by", [])
    } for doc in requests]

@app.get("/api/file/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
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

@app.get("/api/available-senders")
def get_available_senders(start: Optional[str] = Query(None), end: Optional[str] = Query(None)):
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

    return list(mock_data_col.find(query, {"_id": 0}))

# === Background Task on Startup ===
@app.on_event("startup")
async def start_check_replies_loop():
    async def loop_check():
        while True:
            try:
                check_inbox_and_save_reply()
                print("✅ Checked inbox for replies")
            except Exception as e:
                print("❌ Error in check-inbox loop:", e)
            await asyncio.sleep(10)

    asyncio.create_task(loop_check())