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
from app.models.response_from_telco import response_from_telco_collection
import datetime
import pandas as pd
from io import BytesIO
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger("pymongo").setLevel(logging.WARNING)

load_dotenv()

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
IMAP_SERVER = os.getenv("IMAP_SERVER")

def send_email(subject, body, file_ids):
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = os.getenv("RECIPIENT_EMAIL")
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
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(SENDER_EMAIL, SENDER_PASSWORD)
        mail.select("inbox")

        sender_names = sender_names_collection()
        notifications = notifications_collection()
        response_from_telco = response_from_telco_collection()

        request_ids = set()
        for doc in sender_names.find({"status": {"$in": ["pending", "suspension_requested"]}}, {"request_ids": 1}):
            if doc.get("request_ids"):
                request_ids.update(doc["request_ids"])

        logger.debug(f"Checking inbox for request_ids: {request_ids}")

        for request_id in request_ids:
            if not request_id:
                continue

            senders = list(sender_names.find({"request_ids": request_id, "status": {"$in": ["pending", "suspension_requested"]}}))
            if not senders:
                logger.debug(f"No senders found for request_id: {request_id}")
                continue

            result, data = mail.search(None, f'(SUBJECT "{request_id}")')
            if result != 'OK':
                logger.debug(f"No emails found for request_id: {request_id}")
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
                            
                            matched_senders = check_response_contains_senders(file_data, senders, filename)
                            logger.debug(f"Matched senders for {filename}: {[s['sender_name'] for s in matched_senders]}")
                            
                            existing_notifications = {
                                (n["sender_name"], n["status"]): n
                                for n in notifications.find({
                                    "request_id": request_id,
                                    "sender_name": {"$in": [s["sender_name"] for s in senders]},
                                    "status": {"$in": ["received", "error"]}
                                })
                            }

                            for doc in senders:
                                sender_name = doc["sender_name"]
                                user_id = doc["created_by"]
                                thai_date = doc["thai_date"]
                                
                                # ข้ามการอัปเดตหากมี "received" ใน status แล้ว
                                if "received" in doc["status"]:
                                    logger.debug(f"Skipping update for {sender_name}: already has 'received' status")
                                    continue
                                
                                if (sender_name, "received") in existing_notifications or (sender_name, "error") in existing_notifications:
                                    logger.debug(f"Notification already exists for {sender_name} with status 'received' or 'error'")
                                    continue
                                
                                is_valid = any(s["sender_name"] == sender_name for s in matched_senders)
                                new_status = "received" if is_valid else "error"
                                
                                # ป้องกันการเพิ่ม "error" ซ้ำ
                                if new_status == "error" and "error" in doc["status"]:
                                    new_status = None
                                
                                # กำหนดสถานะที่จะลบ: ลบ "error" เมื่อ new_status = "received"
                                status_filter = ["error"] if new_status == "received" else []
                                
                                # อัปเดต status โดยคง "pending" และ "suspension_requested"
                                current_status = doc["status"]
                                new_status_list = [s for s in current_status if s not in status_filter]
                                if new_status:
                                    new_status_list.append(new_status)
                                
                                update_data = {
                                    "$set": {
                                        "status": new_status_list,
                                        "reply_file_id": reply_id if is_valid else doc.get("reply_file_id"),
                                        "updated_at": datetime.datetime.now()
                                    }
                                }
                                
                                try:
                                    result = sender_names.update_one(
                                        {"sender_name": sender_name, "phone_number": doc["phone_number"], "request_ids": request_id},
                                        update_data
                                    )
                                    logger.debug(f"Updated sender {sender_name} with status {new_status or 'unchanged'}, matched: {result.matched_count}, modified: {result.modified_count}")
                                except Exception as e:
                                    logger.error(f"Failed to update sender {sender_name}: {str(e)}")
                                    continue

                                if is_valid:
                                    for sender in matched_senders:
                                        if sender["sender_name"] == sender_name:
                                            response_from_telco.insert_one({
                                                "sender_name": sender["sender_name"],
                                                "phone_number": sender["phone_number"],
                                                "request_id": request_id,
                                                "reply_file_id": reply_id,
                                                "data": sender.get("data", {}),
                                                "created_at": datetime.datetime.now(),
                                                "updated_at": datetime.datetime.now()
                                            })
                                
                                if new_status:  # สร้าง notification เฉพาะเมื่อมีสถานะใหม่
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
    except Exception as e:
        logger.error(f"Error in check_inbox_and_save_reply: {str(e)}")
        if mail:
            mail.logout()

def check_response_contains_senders(file_data, senders, filename):
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(BytesIO(file_data))
        else:
            df = pd.read_excel(BytesIO(file_data))
        
        logger.debug(f"Columns in file {filename}: {list(df.columns)}")
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace(r'[^\w]', '', regex=True)
        
        sender_col = next((col for col in df.columns if any(k in col for k in ["sender", "sendername", "name"])), None)
        phone_col = next((col for col in df.columns if any(k in col for k in ["phone", "phonenumber", "number", "mobile"])), None)
        
        if not sender_col or not phone_col:
            logger.warning(f"No sender_name or phone_number column found in {filename}")
            return []

        df[sender_col] = df[sender_col].astype(str).str.strip().str.lower()
        df[phone_col] = df[phone_col].astype(str).str.replace(r'\D', '', regex=True).str.lstrip('0')
        
        matched_senders = []
        for doc in senders:
            sender_name_clean = doc["sender_name"].strip().lower()
            phone_number_clean = ''.join(filter(str.isdigit, str(doc["phone_number"]))).lstrip('0')
            match = df[(df[sender_col] == sender_name_clean) & (df[phone_col] == phone_number_clean)]
            if not match.empty:
                matched_data = match.to_dict('records')[0]
                matched_senders.append({
                    "sender_name": doc["sender_name"],
                    "phone_number": doc["phone_number"],
                    "data": matched_data
                })
        
        return matched_senders
    except Exception as e:
        logger.error(f"Error processing file {filename}: {str(e)}")
        return []