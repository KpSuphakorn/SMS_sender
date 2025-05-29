import os
import smtplib
import imaplib
import email
import uuid
import datetime
from bson.objectid import ObjectId
from pymongo import MongoClient
import gridfs
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fpdf import FPDF
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
import config as cfg

app = FastAPI()

# === MongoDB Connection ===
mongo_client = MongoClient(cfg.MONGO_CONNECTION_STRING)
mongo_db = mongo_client[cfg.MONGO_DATABASE_NAME]
request_logs_col = mongo_db[cfg.MONGO_REQUESTS_COLLECTION]
mock_data_col = mongo_db["mock_senders"]
grid_fs = gridfs.GridFS(mongo_db)

# === Pydantic Models ===
class SenderRequest(BaseModel):
    fields: List[str]
    rows: List[Dict]

# === Custom PDF Generator ===
def generate_custom_pdf_and_store(rows, fields, request_id, date_display):
    pdf = FPDF()
    pdf.add_font('THSarabunNew', '', cfg.THAI_FONT_PATH_NORMAL, uni=True)
    pdf.set_font('THSarabunNew', '', 14)
    pdf.add_page()
    pdf.cell(0, 10, f"Request ID: {request_id}", 0, 1)
    pdf.cell(0, 10, f"วันที่: {date_display}", 0, 1)
    pdf.ln(5)

    for field in fields:
        pdf.cell(45, 10, field, 1)
    pdf.ln()

    for row in rows:
        for field in fields:
            value = str(row.get(field, "-"))
            pdf.cell(45, 10, value, 1)
        pdf.ln()

    os.makedirs(cfg.PDF_OUTPUT_DIR, exist_ok=True)
    pdf_path = f"{cfg.PDF_OUTPUT_DIR}/{request_id}.pdf"
    pdf.output(pdf_path)

    with open(pdf_path, 'rb') as f:
        file_id = grid_fs.put(f.read(), filename=f"{request_id}.pdf", request_id=request_id, file_type="sent")
    os.remove(pdf_path)
    return file_id


# === Email Sender ===
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
    part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
    msg.attach(part)

    with smtplib.SMTP(cfg.SMTP_SERVER, cfg.SMTP_PORT) as server:
        server.starttls()
        server.login(cfg.SENDER_EMAIL, cfg.SENDER_PASSWORD)
        server.send_message(msg)

# === POST /request ===
@app.post("/request")
def create_request(data: SenderRequest):
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
        "created_at": datetime.datetime.now()
    })

    return {"message": "ส่งคำขอเรียบร้อย", "request_id": request_id}

# === GET /mock-data ===
@app.get("/mock-data")
def get_mock_data(date: str = Query(..., description="Format: YYYY-MM-DD")):
    results = list(mock_data_col.find({"date": date}, {"_id": 0}))
    return results

# === GET /requests ===
@app.get("/requests")
def get_requests():
    results = []
    for doc in request_logs_col.find().sort("created_at", -1):
        results.append({
            "request_id": doc["request_id"],
            "thai_date": doc["thai_date"],
            "status": doc["status"],
            "pdf_reply_file_id": str(doc.get("pdf_reply_file_id", "")),
            "pdf_sent_file_id": str(doc.get("pdf_sent_file_id", ""))
        })
    return results

# === GET /pdf/{file_id} ===
@app.get("/pdf/{file_id}")
def download_pdf(file_id: str):
    try:
        file_obj = grid_fs.get(ObjectId(file_id))
        filename = file_obj.filename
        temp_path = f"/tmp/{filename}"
        with open(temp_path, 'wb') as f:
            f.write(file_obj.read())
        return FileResponse(temp_path, media_type='application/pdf', filename=filename)
    except:
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")

# === GET /check-replies ===
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
