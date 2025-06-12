import os
import smtplib
import imaplib
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv
from app.models.database import grid_fs
from app.models.request import request_logs_collection
from app.models.notification import notifications_collection
import datetime

load_dotenv()

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
RECIPIENT_EMAIL = os.getenv("RECIPIENT_EMAIL")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
IMAP_SERVER = os.getenv("IMAP_SERVER")

def send_email(subject, body, file_ids):
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = RECIPIENT_EMAIL
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

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)

def check_inbox_and_save_reply():
    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(SENDER_EMAIL, SENDER_PASSWORD)
    mail.select("inbox")

    request_logs = request_logs_collection()
    notifications = notifications_collection()

    for doc in request_logs.find({"status": {"$in": ["pending", "suspension_requested"]}}):
        request_id = doc["request_id"]
        thai_date = doc["thai_date"]
        user_id = doc["created_by"]
        
        existing_notification = notifications.find_one({
            "request_id": request_id,
            "status": "received"
        })
        if existing_notification:
            continue

        result, data = mail.search(None, f'(SUBJECT "{request_id}")')
        if result != 'OK':
            continue
        for num in data[0].split():
            _, msg_data = mail.fetch(num, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            if msg["From"] and SENDER_EMAIL.lower() not in msg["From"].lower():
                for part in msg.walk():
                    if part.get_content_maintype() == 'multipart': continue
                    if part.get('Content-Disposition') is None: continue
                    filename = part.get_filename()
                    if filename and filename.lower().endswith((".csv", ".xlsx")):
                        file_data = part.get_payload(decode=True)
                        reply_id = grid_fs.put(file_data, filename=filename, request_id=request_id, file_type="reply")
                        request_logs.update_one(
                            {"request_id": request_id},
                            {
                                "$addToSet": {"status": "received"},
                                "$set": {
                                    "reply_file_id": reply_id,
                                    "updated_at": datetime.datetime.now()
                                }
                            }
                        )
                        notifications.insert_one({
                            "request_id": request_id,
                            "status": "received",
                            "user_id": user_id,
                            "is_read": False,
                            "thai_date": thai_date,
                            "created_at": datetime.datetime.now()
                        })
                        mail.store(num, '+FLAGS', '\\Seen')
                        break
    mail.logout()