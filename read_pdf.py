from pymongo import MongoClient
import gridfs
from bson.objectid import ObjectId

# --- เชื่อม Mongo ---
client = MongoClient("mongodb+srv://police:TdfMR9Y2dsv7OhYr@policesystem.ja6b66c.mongodb.net/ccib_data_storage?retryWrites=true&w=majority")
db = client["ccib_data_storage"]
fs = gridfs.GridFS(db)

# --- อ่านไฟล์จาก ObjectId และบันทึกเป็นไฟล์ .pdf ---
def download_pdf(file_id_str, output_path):
    file_id = ObjectId(file_id_str)
    if fs.exists(file_id):
        gridout = fs.get(file_id)
        with open(output_path, 'wb') as f:
            f.write(gridout.read())
        print(f"✅ ไฟล์ถูกดาวน์โหลดไปยัง: {output_path}")
    else:
        print("❌ ไม่พบไฟล์ใน GridFS")

# === ตัวอย่างเรียกใช้ ===
download_pdf("68360beab03fc42658ea76af", "read_pdfs/downloaded_reply.pdf")
