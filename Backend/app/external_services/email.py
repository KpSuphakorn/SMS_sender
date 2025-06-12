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
from app.models.sender_names import sender_names_collection
from app.models.notification import notifications_collection
import datetime
import pandas as pd
from io import BytesIO

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

    sender_names = sender_names_collection()
    notifications = notifications_collection()

    for doc in sender_names.find({"status": {"$in": ["pending", "suspension_requested"]}}):
        request_id = doc.get("request_id")
        if not request_id:
            continue
        sender_name = doc["sender_name"]
        phone_number = doc["phone_number"]
        user_id = doc["created_by"]
        thai_date = doc["thai_date"]

        if notifications.find_one({"request_id": request_id, "sender_name": sender_name, "status": "received"}):
            continue

        result, data = mail.search(None, f'(SUBJECT "{request_id}")')
        if result != 'OK':
            continue

        for num in data[0].split():
            _, msg_data = mail.fetch(num, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            if msg["From"] and SENDER_EMAIL.lower() not in msg["From"].lower():
                for part in msg.walk():
                    if part.get_content_maintype() == 'multipart' or part.get('Content-Disposition') is None:
                        continue
                    filename = part.get_filename()
                    if filename and filename.lower().endswith((".csv", ".xlsx")):
                        file_data = part.get_payload(decode=True)
                        reply_id = grid_fs.put(file_data, filename=filename, request_id=request_id, file_type="reply")
                        is_valid_response = check_response_contains_sender(file_data, sender_name, phone_number, filename)
                        new_status = "received" if is_valid_response else "error"
                        sender_names.update_one(
                            {"sender_name": sender_name, "request_id": request_id},
                            {
                                "$addToSet": {"status": new_status},
                                "$set": {
                                    "reply_file_id": reply_id if is_valid_response else None,
                                    "updated_at": datetime.datetime.now()
                                }
                            }
                        )
                        notifications.insert_one({
                            "request_id": request_id,
                            "sender_name": sender_name,
                            "status": new_status,
                            "user_id": user_id,
                            "is_read": False,
                            "thai_date": thai_date,
                            "created_at": datetime.datetime.now()
                        })
                        mail.store(num, '+FLAGS', '\\Seen')
                        break
    mail.logout()

def check_response_contains_sender(file_data, sender_name, phone_number, filename):
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(BytesIO(file_data))
        else:
            df = pd.read_excel(BytesIO(file_data))
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        sender_name_clean = sender_name.strip().lower()
        phone_number_clean = ''.join(filter(str.isdigit, str(phone_number))).lstrip('0')

        sender_col = next((col for col in df.columns if "sender" in col and "name" in col), None)
        phone_col = next((col for col in df.columns if "phone" in col or "number" in col), None)

        if not sender_col or not phone_col:
            return False

        df[sender_col] = df[sender_col].astype(str).str.strip().str.lower()
        df[phone_col] = df[phone_col].astype(str).str.replace(r'\D', '', regex=True).str.lstrip('0')

        match = df[(df[sender_col] == sender_name_clean) & (df[phone_col] == phone_number_clean)]
        return not match.empty
    except:
        return False