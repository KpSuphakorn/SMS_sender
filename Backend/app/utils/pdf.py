import os
from fpdf import FPDF
from io import BytesIO
from app.models.database import grid_fs
from dotenv import load_dotenv

load_dotenv()

THAI_FONT_PATH_NORMAL = os.getenv("THAI_FONT_PATH_NORMAL")

FIELD_LABELS = {
    "sender_name": "ชื่อผู้ส่ง",
    "mobile_provider": "ค่ายมือถือ",
    "phone_number": "เบอร์มือถือ",
    "full_name": "ชื่อ-สกุล",
    "date": "วันที่"
}

def generate_custom_pdf_and_store(rows, fields, request_id, date_display):
    pdf = FPDF(orientation='L')
    pdf.add_font('THSarabunNew', '', THAI_FONT_PATH_NORMAL, uni=True)
    pdf.set_font('THSarabunNew', '', 14)
    pdf.add_page()

    page_width = pdf.w - 2 * pdf.l_margin
    col_width = page_width / len(fields) if fields else 40

    pdf.cell(0, 10, f"Request ID: {request_id}", 0, 1)
    pdf.cell(0, 10, f"วันที่: {date_display}", 0, 1)
    pdf.ln(5)

    for field in fields:
        label = FIELD_LABELS.get(field, field)
        pdf.cell(col_width, 10, label, 1)
    pdf.ln()

    for row in rows:
        for field in fields:
            value = str(row.get(field, "-"))
            pdf.cell(col_width, 10, value, 1)
        pdf.ln()

    pdf_stream = BytesIO(pdf.output(dest='S'))
    return grid_fs.put(
        pdf_stream,
        filename=f"{request_id}_data.pdf",
        request_id=request_id,
        file_type="sent_data"
    )

def generate_suspension_pdf(request_id: str, date_display, recipient="เจ้าหน้าที่ผู้เกี่ยวข้อง"):
    pdf = FPDF()
    pdf.add_font('THSarabunNew', '', THAI_FONT_PATH_NORMAL, uni=True)
    pdf.set_font('THSarabunNew', '', 16)
    pdf.add_page()

    pdf.cell(0, 10, f"เรียน {recipient}", 0, 1)
    pdf.ln(10)
    pdf.multi_cell(0, 10, f"ขอให้ดำเนินการระงับสัญญาณตามข้อมูลในเอกสารแนบ (Request ID: {request_id})")
    pdf.ln(10)
    pdf.cell(0, 10, "ด้วยความเคารพ", 0, 1)
    pdf.cell(0, 10, "ผู้ยื่นคำขอ", 0, 1)
    pdf.ln(10)
    pdf.set_text_color(255, 0, 0)
    pdf.cell(0, 10, f"วันที่: {date_display}", 0, 1)

    pdf_stream = BytesIO(pdf.output(dest='S'))
    return grid_fs.put(
        pdf_stream,
        filename=f"{request_id}_suspension.pdf",
        request_id=request_id,
        file_type="sent_suspension"
    )