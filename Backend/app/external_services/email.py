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
from pymongo import UpdateOne
from contextlib import contextmanager

load_dotenv()

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
IMAP_SERVER = os.getenv("IMAP_SERVER")

# Provider email mapping
PROVIDER_EMAILS = {
    "ais": os.getenv("PROVIDER_EMAIL_AIS"),
    "dtac": os.getenv("PROVIDER_EMAIL_DTAC"),
    "true": os.getenv("PROVIDER_EMAIL_TRUE"),
    "nt": os.getenv("PROVIDER_EMAIL_NT"),
    "unknown": os.getenv("PROVIDER_EMAIL_NBTC")
}

@contextmanager
def imap_connection():
    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    try:
        mail.login(SENDER_EMAIL, SENDER_PASSWORD)
        mail.select("inbox")
        yield mail
    finally:
        mail.logout()

@contextmanager
def smtp_connection():
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    try:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        yield server
    finally:
        server.quit()

def send_email(subject, body, file_ids, recipient=None):
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient if recipient else os.getenv("RECIPIENT_EMAIL")
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

    with smtp_connection() as server:
        server.send_message(msg)
        print(f"Email sent with subject: {subject} to {msg['To']}")

def is_status_object(status):
    return all(isinstance(s, dict) and "name" in s for s in status) if status else False

def has_final_status(doc, request_id, existing_notifications):
    sender_name = doc["sender_name"]
    status = doc.get("status", [])
    if is_status_object(status):
        status_names = [s["name"] for s in status]
    else:
        status_names = status
    return (
        "received" in status_names or
        (sender_name, "received") in existing_notifications or
        (sender_name, "error") in existing_notifications
    )

def update_sender_status(doc, request_id, is_valid, reply_id):
    updated_at = datetime.datetime.now()
    new_status_name = "received" if is_valid else "error"
    current_status = doc.get("status", [])
    
    if is_status_object(current_status):
        status_names = [s["name"] for s in current_status]
        new_status = None if new_status_name == "error" and "error" in status_names else {"name": new_status_name, "updated_at": updated_at}
        status_filter = ["error"] if new_status_name == "received" else []
        new_status_list = [s for s in current_status if s["name"] not in status_filter]
    else:
        new_status = {"name": new_status_name, "updated_at": updated_at}
        status_filter = ["error"] if new_status_name == "received" else []
        new_status_list = [{"name": s, "updated_at": doc.get("updated_at", updated_at)} for s in current_status if s not in status_filter]
    
    if new_status:
        new_status_list.append(new_status)

    new_request_ids = [
        {"id": req["id"], "status": new_status_name if req["id"] == request_id and new_status else req["status"]}
        for req in doc.get("request_ids", [])
    ]

    return {
        "status": new_status_list,
        "request_ids": new_request_ids,
        "reply_file_id": reply_id if is_valid else doc.get("reply_file_id"),
        "updated_at": updated_at
    }, new_status_name if new_status else None

def get_provider_from_email(email_address):
    """
    Determine which provider sent the email based on email address
    """
    if not email_address:
        return "unknown"
    
    email_lower = email_address.lower()
    
    # Check against each provider email
    for provider, provider_email in PROVIDER_EMAILS.items():
        if provider_email and provider_email.lower() in email_lower:
            return provider
    
    # If no exact match, try to detect from domain or common patterns
    if "ais" in email_lower:
        return "ais"
    elif "dtac" in email_lower:
        return "dtac"
    elif "true" in email_lower:
        return "true"
    elif "nt" in email_lower or "tot" in email_lower:
        return "nt"
    
    return "unknown"

def check_inbox_and_save_reply():
    try:
        with imap_connection() as mail:
            sender_names = sender_names_collection()
            notifications = notifications_collection()
            response_from_telco = response_from_telco_collection()

            request_ids = set()
            for doc in sender_names.find(
                {"request_ids": {"$elemMatch": {"status": {"$in": ["pending", "suspension_requested"]}}}},
                {"request_ids": 1}
            ):
                request_ids.update(
                    req["id"] for req in doc.get("request_ids", []) if req["status"] in ["pending", "suspension_requested"]
                )

            print(f"Checking inbox for {len(request_ids)} request IDs")

            for request_id in request_ids:
                if not request_id:
                    continue

                # Get all senders for this request_id
                all_senders = list(sender_names.find({
                    "request_ids.id": request_id,
                    "request_ids.status": {"$in": ["pending", "suspension_requested"]}
                }))
                
                if not all_senders:
                    print(f"No senders found for request_id: {request_id}")
                    continue

                result, data = mail.search(None, f'(SUBJECT "{request_id}")')
                if result != 'OK':
                    print(f"No emails found for request_id: {request_id}")
                    continue

                for num in data[0].split():
                    _, msg_data = mail.fetch(num, "(RFC822)")
                    msg = email.message_from_bytes(msg_data[0][1])
                    
                    # Skip if it's our own email
                    if msg["From"] and SENDER_EMAIL.lower() in msg["From"].lower():
                        continue
                    
                    # Determine which provider sent this email
                    reply_provider = get_provider_from_email(msg["From"])
                    print(f"Email from {msg['From']} detected as provider: {reply_provider}")
                    
                    # Filter senders to only those from the same provider
                    provider_senders = [
                        sender for sender in all_senders 
                        if sender.get("mobile_provider", "").lower() == reply_provider.lower() or 
                        (reply_provider == "unknown" and not sender.get("mobile_provider"))
                    ]
                    
                    if not provider_senders:
                        print(f"No senders found for provider {reply_provider} in request_id: {request_id}")
                        continue
                    
                    print(f"Processing {len(provider_senders)} senders for provider {reply_provider}")
                    
                    for part in msg.walk():
                        if part.get_content_maintype() == 'multipart' or part.get('Content-Disposition') is None:
                            continue
                        filename = part.get_filename()
                        if filename and filename.lower().endswith((".csv", ".xlsx")):
                            file_data = part.get_payload(decode=True)
                            reply_id = grid_fs.put(file_data, filename=filename, request_id=request_id, file_type="reply", provider=reply_provider)
                            
                            # Only check against senders from the same provider
                            matched_senders = check_response_contains_senders(file_data, provider_senders, filename)
                            print(f"Found {len(matched_senders)} matched senders for {filename} from provider {reply_provider}")
                            
                            existing_notifications = {
                                (n["sender_name"], n["status"]): n
                                for n in notifications.find({
                                    "request_id": request_id,
                                    "sender_name": {"$in": [s["sender_name"] for s in provider_senders]},
                                    "status": {"$in": ["received", "error"]}
                                })
                            }

                            bulk_updates = []
                            any_valid = False
                            
                            # **แก้ไขส่วนนี้ - ประมวลผลเฉพาะ senders ที่พบในไฟล์เท่านั้น**
                            matched_sender_keys = {(s["sender_name"], s["phone_number"]) for s in matched_senders}
                            
                            for doc in provider_senders:
                                sender_name = doc["sender_name"]
                                phone_number = doc["phone_number"]
                                user_id = doc["created_by"]
                                updated_at = datetime.datetime.now()
                                
                                if has_final_status(doc, request_id, existing_notifications):
                                    print(f"Skipping update for {sender_name}: already has final status")
                                    continue
                                
                                sender_key = (sender_name, phone_number)
                                is_valid = sender_key in matched_sender_keys
                                
                                if is_valid:
                                    any_valid = True
                                    print(f"Updating {sender_name} to 'received' status")
                                    # อัปเดตเป็น received เฉพาะ sender ที่พบในไฟล์
                                    update_data, new_status = update_sender_status(doc, request_id, True, reply_id)
                                    
                                    bulk_updates.append(
                                        UpdateOne(
                                            {"sender_name": sender_name, "phone_number": phone_number, "request_ids.id": request_id},
                                            {"$set": update_data}
                                        )
                                    )

                                    # บันทึกข้อมูลใน response_from_telco
                                    for sender in matched_senders:
                                        if sender["sender_name"] == sender_name and sender["phone_number"] == phone_number:
                                            response_from_telco.insert_one({
                                                "sender_name": sender["sender_name"],
                                                "phone_number": sender["phone_number"],
                                                "request_id": request_id,
                                                "reply_file_id": reply_id,
                                                "provider": reply_provider,
                                                "status": [{"name": "received", "updated_at": updated_at}],
                                                "data": sender.get("data", {}),
                                                "created_at": datetime.datetime.now(),
                                                "updated_at": updated_at
                                            })
                                            break
                                    
                                    # สร้าง notification เฉพาะเมื่อมีการเปลี่ยนแปลงสถานะ
                                    if new_status:
                                        notifications.insert_one({
                                            "request_id": request_id,
                                            "sender_name": sender_name,
                                            "status": new_status,
                                            "user_id": user_id,
                                            "provider": reply_provider,
                                            "is_read": False,
                                            "thai_date": updated_at.strftime("%d %B %Y"),
                                            "created_at": datetime.datetime.now()
                                        })
                                else:
                                    # **ไม่ทำอะไรกับ sender ที่ไม่พบในไฟล์**
                                    # เหตุผล: อาจเป็น sender ของ provider อื่น ที่ยังรอการตอบกลับ
                                    print(f"Sender {sender_name} not found in {reply_provider} response - keeping current status")
                            
                            if bulk_updates:
                                sender_names.bulk_write(bulk_updates)
                                print(f"Updated {len(bulk_updates)} senders for provider {reply_provider}")
                            
                            if not any_valid:
                                grid_fs.delete(reply_id)
                                print(f"Deleted unused file {filename} from provider {reply_provider}")
                            
                            mail.store(num, '+FLAGS', '\\Seen')
                            break
                            
            # **เพิ่ม logic สำหรับการตรวจสอบ error cases**
            # ตรวจสอบ senders ที่ยังเป็น pending นานเกินไป (เช่น 24 ชั่วโมง)
            # และ mark เป็น error ถ้าไม่ได้รับการตอบกลับ
            check_timeout_senders()
                            
    except Exception as e:
        print(f"Error checking inbox: {str(e)}")

def check_timeout_senders():
    """
    ตรวจสอบและ mark senders ที่ pending นานเกินไปเป็น error
    """
    try:
        sender_names = sender_names_collection()
        notifications = notifications_collection()
        
        # หาทุก sender ที่ยัง pending และเกิน timeout (24 ชั่วโมง)
        timeout_threshold = datetime.datetime.now() - datetime.timedelta(hours=24)
        
        timeout_senders = list(sender_names.find({
            "request_ids": {
                "$elemMatch": {
                    "status": {"$in": ["pending", "suspension_requested"]}
                }
            },
            "updated_at": {"$lt": timeout_threshold}
        }))
        
        bulk_updates = []
        
        for doc in timeout_senders:
            sender_name = doc["sender_name"]
            user_id = doc["created_by"]
            updated_at = datetime.datetime.now()
            
            # หา request_ids ที่ยัง pending
            pending_requests = [
                req for req in doc.get("request_ids", [])
                if req["status"] in ["pending", "suspension_requested"]
            ]
            
            for req in pending_requests:
                request_id = req["id"]
                
                # อัปเดตสถานะเป็น error
                update_data, new_status = update_sender_status(doc, request_id, False, None)
                
                bulk_updates.append(
                    UpdateOne(
                        {"sender_name": sender_name, "phone_number": doc["phone_number"], "request_ids.id": request_id},
                        {"$set": update_data}
                    )
                )
                
                # สร้าง notification
                if new_status:
                    notifications.insert_one({
                        "request_id": request_id,
                        "sender_name": sender_name,
                        "status": "error",
                        "user_id": user_id,
                        "provider": doc.get("mobile_provider", "unknown"),
                        "is_read": False,
                        "thai_date": updated_at.strftime("%d %B %Y"),
                        "created_at": datetime.datetime.now()
                    })
        
        if bulk_updates:
            sender_names.bulk_write(bulk_updates)
            print(f"Marked {len(bulk_updates)} timeout senders as error")
            
    except Exception as e:
        print(f"Error checking timeout senders: {str(e)}")

def check_response_contains_senders(file_data, senders, filename):
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(BytesIO(file_data))
        else:
            df = pd.read_excel(BytesIO(file_data))
        
        print(f"Processing file {filename} with columns: {list(df.columns)}")
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace(r'[^\w]', '', regex=True)
        
        sender_col = next((col for col in df.columns if any(k in col.lower() for k in ["sender", "sendername", "name"])), None)
        phone_col = next((col for col in df.columns if any(k in col.lower() for k in ["phone", "phonenumber", "number", "mobile"])), None)
        
        if not sender_col or not phone_col:
            print(f"No sender_name or phone_number column found in {filename}")
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
        print(f"Error processing file {filename}: {str(e)}")
        return []