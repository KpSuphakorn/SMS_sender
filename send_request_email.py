# ===============================
# 📁 main.py (เวอร์ชันรีโค้ด: ชื่ออ่านง่าย + MongoDB)
# ===============================

import os
import smtplib
import imaplib
import email
import uuid
import time
import datetime
from bson.objectid import ObjectId
from pymongo import MongoClient
import gridfs
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fpdf import FPDF
from email.header import decode_header
import config as cfg

# === เชื่อมต่อ MongoDB ===
mongo_client = MongoClient(cfg.MONGO_CONNECTION_STRING)
mongo_db = mongo_client[cfg.MONGO_DATABASE_NAME]
request_logs_col = mongo_db["request_logs"]
grid_fs = gridfs.GridFS(mongo_db)

# === ฟังก์ชันสร้าง sender mock ===
def get_mock_sender_names():
    timestamp = datetime.datetime.now().strftime("%H%M%S")
    return [f"MOCK_{timestamp}_{i+1:03d}" for i in range(cfg.NUMBER_OF_MOCK_SENDERS)]

# === PDF Generator ===
class PDFReport(FPDF):
    def __init__(self, font_config):
        super().__init__()
        self.font_config = font_config
        self.add_font('THSarabunNew', '', font_config['normal'])
        self.add_font('THSarabunNew', 'B', font_config['bold'])
        self.add_font('THSarabunNew', 'I', font_config['italic'])

    def header(self):
        self.set_font('THSarabunNew', 'B', 16)
        self.cell(0, 10, 'รายชื่อ Sender Name', 0, 1, 'C')
        self.ln(5)

    def create_table(self, sender_names, request_id, date_display):
        self.add_page()
        self.set_font('THSarabunNew', '', 14)
        self.cell(0, 10, f'Request ID: {request_id}', 0, 1)
        self.cell(0, 10, f'ประจำวันที่: {date_display}', 0, 1)
        self.ln(5)
        self.set_font('THSarabunNew', 'B', 12)
        self.cell(20, 10, 'ลำดับ', 1)
        self.cell(160, 10, 'Sender Name', 1)
        self.ln()
        self.set_font('THSarabunNew', '', 12)
        for idx, name in enumerate(sender_names):
            self.cell(20, 10, str(idx+1), 1)
            self.cell(160, 10, name, 1)
            self.ln()

# === สร้าง PDF แล้วอัปโหลดขึ้น Mongo GridFS ===
def generate_pdf_and_store(sender_names, request_id, date_display):
    pdf = PDFReport({
        'normal': cfg.THAI_FONT_PATH_NORMAL,
        'bold': cfg.THAI_FONT_PATH_BOLD,
        'italic': cfg.THAI_FONT_PATH_ITALIC
    })
    pdf.create_table(sender_names, request_id, date_display)
    os.makedirs(cfg.PDF_OUTPUT_DIR, exist_ok=True)
    temp_path = f"{cfg.PDF_OUTPUT_DIR}/{request_id}.pdf"
    pdf.output(temp_path)
    with open(temp_path, 'rb') as f:
        file_id = grid_fs.put(f.read(), filename=f"sent_{request_id}.pdf", request_id=request_id, file_type="sent")
    os.remove(temp_path)
    return file_id

# === ส่งอีเมล ===
def send_email_with_attachment(to_email, subject, body, file_id):
    file_data = grid_fs.get(file_id).read()
    filename = grid_fs.get(file_id).filename
    msg = MIMEMultipart()
    msg['From'] = cfg.SENDER_EMAIL
    msg['To'] = to_email
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
    print(f"✅ ส่งอีเมลเรียบร้อย: {subject}")

# === สร้างคำขอใหม่และส่งอีเมล ===
def create_new_request_and_email():
    request_id = str(uuid.uuid4())
    sender_names = get_mock_sender_names()
    thai_date = datetime.datetime.now().strftime("%d %B %Y")
    pdf_file_id = generate_pdf_and_store(sender_names, request_id, thai_date)

    subject = f"ขอข้อมูล (Request ID: {request_id})"
    body = f"เรียนเจ้าหน้าที่\n\nRequest ID: {request_id}\nวันที่: {thai_date}\n(กรุณาตอบกลับพร้อมแนบไฟล์ข้อมูล)"
    send_email_with_attachment(cfg.RECIPIENT_EMAIL_FOR_TESTING, subject, body, pdf_file_id)

    request_logs_col.insert_one({
        "request_id": request_id,
        "thai_date": thai_date,
        "sender_names": sender_names,
        "status": "รอข้อมูลตอบกลับ",
        "pdf_sent_file_id": pdf_file_id,
        "created_at": datetime.datetime.now()
    })

# === ตรวจอีเมลตอบกลับและเก็บไฟล์แนบ ===
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
                        print(f"📥 พบและบันทึกไฟล์ตอบกลับ: {filename}")
                        break

    mail.logout()

# === MAIN LOOP ===
if __name__ == '__main__':
    print("\n📡 เริ่มระบบติดตาม SMS Request (MongoDB Edition)")
    create_new_request_and_email()
    try:
        while True:
            print("\n🔄 กำลังตรวจสอบอีเมลตอบกลับใหม่...")
            check_inbox_and_save_reply()
            print(f"⏳ รอ {cfg.MONITORING_INTERVAL_SECONDS} วินาทีสำหรับรอบถัดไป...")
            time.sleep(cfg.MONITORING_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("🛑 หยุดการทำงานด้วย Ctrl+C")