import os
import re
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
from app.models.response_from_telco import response_from_telco_collection
import datetime
import pandas as pd
from io import BytesIO
from pymongo import UpdateOne
from contextlib import contextmanager
import base64
from datetime import time
from email.header import decode_header

load_dotenv()

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
IMAP_SERVER = os.getenv("IMAP_SERVER")

PROVIDER_EMAILS = {
    "ais": os.getenv("PROVIDER_EMAIL_AIS"),
    "dtac": os.getenv("PROVIDER_EMAIL_DTAC"),
    "true": os.getenv("PROVIDER_EMAIL_TRUE"),
    "nt": os.getenv("PROVIDER_EMAIL_NT"),
    "nbtc": os.getenv("PROVIDER_EMAIL_NBTC")
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

def send_email(subject, body, file_ids):
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = PROVIDER_EMAILS["nbtc"]
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
        print(f"Email sent - Subject: {subject}")

def is_status_object(status):
    return all(isinstance(s, dict) and "name" in s for s in status) if status else False

def has_final_status(doc, request_id):
    status = doc.get("status", [])
    if is_status_object(status):
        status_names = [s["name"] for s in status]
    else:
        status_names = status
    return "received" in status_names or "error" in status_names

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
    if not email_address:
        return "unknown"
    
    email_lower = email_address.lower()
    
    if "suphakorn850@gmail.com" in email_lower or "04413_supphakon@pcccr.ac.th" in email_lower:
        return "nbtc"
    
    for provider, provider_email in PROVIDER_EMAILS.items():
        if provider_email and provider_email.lower() in email_lower:
            return provider
    
    if "ais" in email_lower:
        return "ais"
    elif "dtac" in email_lower:
        return "dtac"
    elif "true" in email_lower:
        return "true"
    elif "nt" in email_lower or "tot" in email_lower:
        return "nt"
    elif "nbtc" in email_lower:
        return "nbtc"
    
    return "unknown"

def check_response_contains_senders(file_data, senders, filename):
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(BytesIO(file_data), encoding='utf-8')
        else:
            df = pd.read_excel(BytesIO(file_data))
        
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace(r'[^\w]', '', regex=True)
        
        possible_columns = [
            "sender", "sendername", "name", "หมายเลขทแสดงsender_name", 
            "หมายเลขที่แสดง", "sender_name", "หมายเลขทแสดงsendername",
            "หมายเลขที่แสดงsender"
        ]
        sender_col = next((col for col in df.columns if any(k in col.lower() for k in possible_columns)), None)
        
        if not sender_col:
            print(f"No sender column found in {filename}")
            return []

        df[sender_col] = df[sender_col].astype(str).str.strip().str.replace("_x000D_", "").str.replace(r'\s+', '', regex=True).str.replace(r'[^\w\d]', '', regex=True).str.lower()
        
        for col in df.columns:
            df[col] = df[col].apply(lambda x: x.strftime('%H:%M:%S') if isinstance(x, time) else x)
        
        matched_senders = []
        
        for doc in senders:
            sender_name_clean = doc["sender_name"].strip()
            sender_name_clean = sender_name_clean.replace("_x000D_", "")
            sender_name_clean = re.sub(r'\s+', '', sender_name_clean)
            sender_name_clean = re.sub(r'[^\w\d]', '', sender_name_clean).lower()
            
            match = df[df[sender_col] == sender_name_clean]
            if not match.empty:
                matched_data = match.to_dict('records')[0]
                matched_senders.append({
                    "sender_name": doc["sender_name"],
                    "phone_number": doc["phone_number"],
                    "data": matched_data
                })
        
        print(f"File {filename}: {len(matched_senders)}/{len(senders)} matched")
        return matched_senders
        
    except Exception as e:
        print(f"Error processing file {filename}: {str(e)}")
        return []

def check_inbox_and_save_reply():
    try:
        print("=== Starting inbox check ===")
        
        with imap_connection() as mail:
            sender_names = sender_names_collection()
            response_from_telco = response_from_telco_collection()

            request_ids = set()
            for doc in sender_names.find(
                {"request_ids": {"$elemMatch": {"status": {"$in": ["pending", "suspension_requested"]}}}},
                {"request_ids": 1}
            ):
                request_ids.update(
                    req["id"] for req in doc.get("request_ids", []) if req["status"] in ["pending", "suspension_requested"]
                )

            print(f"Found {len(request_ids)} pending requests")

            for request_id in request_ids:
                if not request_id:
                    continue

                all_senders = list(sender_names.find({
                    "request_ids.id": request_id,
                    "request_ids.status": {"$in": ["pending", "suspension_requested"]}
                }))
                
                if not all_senders:
                    continue

                result, data = mail.search(None, f'(SUBJECT "{request_id}")')
                if result != 'OK':
                    continue

                email_nums = data[0].split() if data[0] else []
                
                if email_nums:
                    print(f"Processing {len(email_nums)} emails for {request_id}")

                for num in email_nums:
                    _, msg_data = mail.fetch(num, "(RFC822)")
                    msg = email.message_from_bytes(msg_data[0][1])
                    
                    if msg["From"] and SENDER_EMAIL.lower() in msg["From"].lower():
                        continue
                    
                    reply_provider = get_provider_from_email(msg["From"])
                    
                    has_valid_attachments = False
                    
                    for part in msg.walk():
                        if part.get_content_maintype() == 'multipart':
                            continue
                        
                        content_disposition = part.get('Content-Disposition')
                        if content_disposition is None:
                            continue
                            
                        filename = part.get_filename()
                        if filename:
                            try:
                                decoded_filename = decode_header(filename)[0][0]
                                if isinstance(decoded_filename, bytes):
                                    decoded_filename = decoded_filename.decode('utf-8', errors='ignore')
                            except Exception as e:
                                decoded_filename = filename
                            
                            if decoded_filename.lower().endswith((".csv", ".xlsx")) or filename.lower().endswith((".csv", ".xlsx")):
                                has_valid_attachments = True
                                
                                file_data = part.get_payload(decode=True)
                                reply_id = grid_fs.put(file_data, filename=decoded_filename, request_id=request_id, file_type="reply", provider=reply_provider)
                                
                                matched_senders = check_response_contains_senders(file_data, all_senders, decoded_filename)
                                
                                bulk_updates = []
                                any_valid = False
                                
                                matched_sender_keys = {s["sender_name"] for s in matched_senders}
                                
                                for doc in all_senders:
                                    if has_final_status(doc, request_id):
                                        continue
                                    
                                    sender_name = doc["sender_name"]
                                    phone_number = doc["phone_number"]
                                    is_valid = sender_name in matched_sender_keys
                                    
                                    if is_valid:
                                        any_valid = True
                                        update_data, new_status = update_sender_status(doc, request_id, True, reply_id)
                                        
                                        bulk_updates.append(
                                            UpdateOne(
                                                {"sender_name": sender_name, "phone_number": phone_number, "request_ids.id": request_id},
                                                {"$set": update_data}
                                            )
                                        )

                                        for sender in matched_senders:
                                            if sender["sender_name"] == sender_name:
                                                response_from_telco.insert_one({
                                                    "sender_name": sender["sender_name"],
                                                    "phone_number": sender["phone_number"],
                                                    "request_id": request_id,
                                                    "reply_file_id": reply_id,
                                                    "provider": reply_provider,
                                                    "status": [{"name": "received", "updated_at": datetime.datetime.now()}],
                                                    "data": sender.get("data", {}),
                                                    "created_at": datetime.datetime.now(),
                                                    "updated_at": datetime.datetime.now()
                                                })
                                                break
                                
                                if bulk_updates:
                                    sender_names.bulk_write(bulk_updates)
                                    print(f"Updated {len(bulk_updates)} senders for {reply_provider}")
                                
                                if not any_valid:
                                    grid_fs.delete(reply_id)
                                
                                mail.store(num, '+FLAGS', '\\Seen')
                                break
            
            print("=== Inbox check completed ===")
            check_timeout_senders()
                            
    except Exception as e:
        print(f"Error in inbox check: {str(e)}")
        import traceback
        traceback.print_exc()

def check_timeout_senders():
    try:
        print("=== Checking timeout senders ===")
        
        sender_names = sender_names_collection()
        timeout_threshold = datetime.datetime.now() - datetime.timedelta(hours=24)
        
        timeout_senders = list(sender_names.find({
            "request_ids": {
                "$elemMatch": {
                    "status": {"$in": ["pending", "suspension_requested"]}
                }
            },
            "updated_at": {"$lt": timeout_threshold}
        }))
        
        if not timeout_senders:
            print("No timeout senders found")
            return
        
        bulk_updates = []
        timeout_count = 0
        
        for doc in timeout_senders:
            sender_name = doc["sender_name"]
            
            pending_requests = [
                req for req in doc.get("request_ids", [])
                if req["status"] in ["pending", "suspension_requested"]
            ]
            
            for req in pending_requests:
                request_id = req["id"]
                update_data, new_status = update_sender_status(doc, request_id, False, None)
                
                bulk_updates.append(
                    UpdateOne(
                        {"sender_name": sender_name, "phone_number": doc["phone_number"], "request_ids.id": request_id},
                        {"$set": update_data}
                    )
                )
                timeout_count += 1
        
        if bulk_updates:
            sender_names.bulk_write(bulk_updates)
            print(f"Marked {timeout_count} timeout senders as error")
            
    except Exception as e:
        print(f"Error checking timeout senders: {str(e)}")