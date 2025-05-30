import os
import smtplib
import imaplib
import email
import uuid
import datetime
import jwt
from bson.objectid import ObjectId
from pymongo import MongoClient
import gridfs
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fpdf import FPDF
from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from io import BytesIO
from werkzeug.security import generate_password_hash, check_password_hash
import config as cfg

# === Init ===
app = FastAPI()

origins = [
    "http://localhost:3000",       # dev
    "https://yourdomain.com",      # prod
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # ✅ กำหนด origin ที่ไว้ใจได้
    allow_credentials=True,
    allow_methods=["*"],               # ✅ หรือระบุแค่ "GET", "POST"
    allow_headers=["*"],               # ✅ หรือ ["Authorization", "Content-Type"]
)

# === MongoDB ===
mongo_client = MongoClient(cfg.MONGO_CONNECTION_STRING)
mongo_db = mongo_client[cfg.MONGO_DATABASE_NAME]
users_col = mongo_db["users"]
request_logs_col = mongo_db[cfg.MONGO_REQUESTS_COLLECTION]
mock_data_col = mongo_db[cfg.MONGO_MOCK_COLLECTION]
grid_fs = gridfs.GridFS(mongo_db)

# === JWT Settings ===
JWT_SECRET = os.getenv("JWT_SECRET", "devsecret")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 60 * 24))  # default 1 day

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

# === JWT Utilities ===
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

# === Auth Endpoints ===
@app.post("/api/user/register")
def register_user(data: UserCreate):
    existing_user = users_col.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="อีเมลนี้มีผู้ใช้งานแล้ว")

    hashed_password = generate_password_hash(data.password)
    new_user_data = {
        "name": data.name,
        "email": data.email,
        "password": hashed_password,
        "role": data.role if data.role else "user",
        "created_at": datetime.datetime.utcnow()
    }
    result = users_col.insert_one(new_user_data)
    created_user = users_col.find_one({"_id": result.inserted_id})

    token = create_access_token(created_user)

    return {
        "id": str(created_user["_id"]),
        "name": created_user["name"],
        "email": created_user["email"],
        "role": created_user.get("role"),
        "token": token
    }

@app.post("/api/user/login")
def login_user(data: UserLogin):
    user = users_col.find_one({"email": data.email})
    if not user or not check_password_hash(user["password"], data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user)

    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role"),
        "token": token
    }

@app.get("/api/user/logout")
def logout():
    return {"message": "Logged out (frontend should clear token)"}

@app.get("/api/user/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user.get("role")
    }

# === Request + Email/PDF ===
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
        pdf.cell(col_width, 10, field, 1)
    pdf.ln()

    for row in rows:
        for field in fields:
            value = str(row.get(field, "-"))
            pdf.cell(col_width, 10, value, 1)
        pdf.ln()

    pdf_bytes = pdf.output(dest='S').encode('latin1')
    file_id = grid_fs.put(pdf_bytes, filename=f"{request_id}.pdf", request_id=request_id, file_type="sent")
    return file_id

def send_email(subject, body, file_id):
    file_data = grid_fs.get(file_id).read()
    filename = grid_fs.get(file_id).filename
    msg = MIMEMultipart()
    msg['From'] = cfg.SENDER_EMAIL
    msg['To'] = cfg.RECIPIENT_EMAIL_FOR_TESTING
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    part = MIMEBase('application', 'octet-stream')
    part.set_payload(file_data)
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
    msg.attach(part)

    with smtplib.SMTP(cfg.SMTP_SERVER, cfg.SMTP_PORT) as server:
        server.starttls()
        server.login(cfg.SENDER_EMAIL, cfg.SENDER_PASSWORD)
        server.send_message(msg)

@app.post("/request")
def create_request(data: SenderRequest, current_user: dict = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    thai_date = datetime.datetime.now().strftime("%d %B %Y")
    pdf_file_id = generate_custom_pdf_and_store(data.rows, data.fields, request_id, thai_date)

    subject = f"ขอข้อมูล (Request ID: {request_id})"
    body = f"เรียนเจ้าหน้าที่\n\nRequest ID: {request_id}\nวันที่: {thai_date}\n(กรุณาตอบกลับพร้อมแนบไฟล์ข้อมูล)"
    send_email(subject, body, pdf_file_id)

    request_logs_col.insert_one({
        "request_id": request_id,
        "thai_date": thai_date,
        "fields": data.fields,
        "data": data.rows,
        "status": "รอข้อมูลตอบกลับ",
        "pdf_sent_file_id": pdf_file_id,
        "created_by": current_user["id"],
        "created_at": datetime.datetime.now()
    })

    return {"message": "ส่งคำขอเรียบร้อย", "request_id": request_id}

@app.get("/requests")
def get_requests(current_user: dict = Depends(get_current_user)):
    results = []
    for doc in request_logs_col.find({"created_by": current_user["id"]}).sort("created_at", -1):
        results.append({
            "request_id": doc["request_id"],
            "thai_date": doc["thai_date"],
            "status": doc["status"],
            "pdf_reply_file_id": str(doc.get("pdf_reply_file_id", "")),
            "pdf_sent_file_id": str(doc.get("pdf_sent_file_id", ""))
        })
    return results

@app.get("/pdf/{file_id}")
def download_pdf(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        file_obj = grid_fs.get(ObjectId(file_id))
        filename = file_obj.filename
        temp_path = f"/tmp/{filename}"
        with open(temp_path, 'wb') as f:
            f.write(file_obj.read())
        return FileResponse(temp_path, media_type='application/pdf', filename=filename)
    except:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")

@app.get("/check-replies")
def check_inbox_and_save_reply():
    mail = imaplib.IMAP4_SSL(cfg.IMAP_SERVER)
    mail.login(cfg.SENDER_EMAIL, cfg.SENDER_PASSWORD)
    mail.select("inbox")

    for request_doc in request_logs_col.find({"status": "รอข้อมูลตอบกลับ"}):
        request_id = request_doc["request_id"]
        search_criteria = f'(SUBJECT "{request_id}")'
        result, data = mail.search(None, search_criteria)
        if result != 'OK':
            continue
        for num in data[0].split():
            result, msg_data = mail.fetch(num, "(RFC822)")
            if result != 'OK':
                continue
            msg = email.message_from_bytes(msg_data[0][1])
            if msg["From"] and cfg.SENDER_EMAIL.lower() not in msg["From"].lower():
                for part in msg.walk():
                    if part.get_content_maintype() == 'multipart':
                        continue
                    if part.get('Content-Disposition') is None:
                        continue
                    filename = part.get_filename()
                    if filename and filename.lower().endswith(".pdf"):
                        file_data = part.get_payload(decode=True)
                        reply_file_id = grid_fs.put(file_data, filename=filename, request_id=request_id, file_type="reply")
                        request_logs_col.update_one(
                            {"request_id": request_id},
                            {"$set": {"status": "ได้รับข้อมูลตอบกลับแล้ว", "pdf_reply_file_id": reply_file_id}}
                        )
                        print(f"📥 บันทึกไฟล์ตอบกลับ: {filename}")
                        break

    mail.logout()
    return {"message": "ตรวจสอบอีเมลเรียบร้อย"}

@app.get("/mock-data")
def get_mock_data(date: str = Query(...)):
    return list(mock_data_col.find({"date": date}, {"_id": 0}))
