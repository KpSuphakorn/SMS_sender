from dotenv import load_dotenv
import os

load_dotenv()

# --- MongoDB ---
MONGO_CONNECTION_STRING = os.getenv("MONGO_CONNECTION_STRING")
MONGO_DATABASE_NAME = os.getenv("MONGO_DATABASE_NAME")
MONGO_REQUESTS_COLLECTION = os.getenv("MONGO_REQUESTS_COLLECTION")
MONGO_MOCK_COLLECTION = os.getenv("MONGO_MOCK_COLLECTION")

# --- SMTP (Email Sending) ---
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")

# --- IMAP (Email Reading) ---
IMAP_SERVER = os.getenv("IMAP_SERVER")
RECIPIENT_EMAIL_FOR_TESTING = os.getenv("RECIPIENT_EMAIL_FOR_TESTING")

# --- PDF and Font Settings (not secret, so hardcoded) ---
PDF_OUTPUT_DIR = "generated_pdfs"
THAI_FONT_PATH_NORMAL = "Fonts/THSarabunNew.ttf"
