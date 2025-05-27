# --- MongoDB Settings ---
MONGO_CONNECTION_STRING = "mongodb+srv://police:TdfMR9Y2dsv7OhYr@policesystem.ja6b66c.mongodb.net/ccib_data_storage?retryWrites=true&w=majority"
MONGO_DATABASE_NAME = "ccib_data_storage"
MONGO_REQUESTS_COLLECTION = "sms_requests"
# GridFS จะใช้ collection ชื่อ fs.files และ fs.chunks โดยอัตโนมัติ

# --- SMTP (Email Sending) Settings ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "suphakorn04413@gmail.com"
SENDER_PASSWORD = "hicgmcrpnmenjqmw"

# --- IMAP (Email Reading) Settings ---
IMAP_SERVER = "imap.gmail.com"

# --- Recipient Settings ---
RECIPIENT_EMAIL_FOR_TESTING = "kp.suphakorn@gmail.com"
# RECIPIENT_EMAIL_NBTC = "nbtc_official_email@example.com"

# --- PDF and Font Settings ---
PDF_OUTPUT_DIR = "generated_pdfs"
THAI_FONT_PATH_NORMAL = "Fonts/THSarabunNew.ttf"
THAI_FONT_PATH_BOLD = "Fonts/THSarabunNew Bold.ttf"
THAI_FONT_PATH_ITALIC = "Fonts/THSarabunNew Italic.ttf"

# --- Application Settings ---
NUMBER_OF_MOCK_SENDERS = 5
REQUEST_TRACKER_FILE = "request_tracker.json" # ชื่อไฟล์สำหรับเก็บสถานะ

# --- Continuous Monitoring Settings ---
MONITORING_INTERVAL_SECONDS = 30  # ตรวจสอบอีเมลตอบกลับรอบใหม่ทุกๆ กี่วินาที (เช่น 300 วินาที = 5 นาที)
                                   # ปรับค่านี้ตามความเหมาะสม ไม่ควรถี่เกินไปเพื่อไม่ให้กระทบ IMAP server