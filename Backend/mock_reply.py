import pandas as pd
import os

# ข้อมูลตัวอย่างสำหรับ request_id: "123e4567-e89b-12d3-a456-426614174000"
senders = [
    {
        "sender_name": "Sender 1",
        "phone_number": "0811234567",
        "mobile_provider": "AIS",
        "full_name": "นายทดสอบ 1",
        "status": "pending",
        "comment": ""
    },
    {
        "sender_name": "Sender 2",
        "phone_number": "0821234567",
        "mobile_provider": "TRUE",
        "full_name": "นายทดสอบ 2",
        "status": "pending",
        "comment": ""
    },
    {
        "sender_name": "Sender 3",
        "phone_number": "0831234567",
        "mobile_provider": "AIS",
        "full_name": "นายทดสอบ 3",
        "status": "pending",
        "comment": ""
    },
    {
        "sender_name": "Sender 4",
        "phone_number": "0841234567",
        "mobile_provider": "TRUE",
        "full_name": "นายทดสอบ 4",
        "status": "pending",
        "comment": ""
    },
    {
        "sender_name": "Sender 5",
        "phone_number": "0851234567",
        "mobile_provider": "AIS",
        "full_name": "นายทดสอบ 5",
        "status": "pending",
        "comment": ""
    }
]

# สร้างโฟลเดอร์สำหรับเก็บไฟล์ mock
output_dir = "mock_nbtc_responses"
os.makedirs(output_dir, exist_ok=True)

# เคส 1: ข้อมูลครบถ้วนและถูกต้อง
case_1_data = senders.copy()
for sender in case_1_data:
    sender["status"] = "suspended"
    sender["comment"] = "ระงับสัญญาณเรียบร้อย"
pd.DataFrame(case_1_data).to_excel(f"{output_dir}/response_case_1_complete.xlsx", index=False)

# เคส 2: ข้อมูลบางส่วนขาดหาย
case_2_data = [
    {
        "sender_name": "Sender 1",
        "phone_number": "0811234567",
        "mobile_provider": "AIS",
        "full_name": "นายทดสอบ 1",
        "status": "suspended",
        "comment": "ระงับสัญญาณเรียบร้อย"
    },
    {
        "sender_name": "Sender 2",
        "phone_number": "",  # ขาด phone_number
        "mobile_provider": "TRUE",
        "full_name": "นายทดสอบ 2",
        "status": "unknown",
        "comment": "ไม่มีข้อมูลเบอร์โทร"
    },
    {
        "sender_name": "Sender 3",
        "phone_number": "0831234567",
        "mobile_provider": "",  # ขาด mobile_provider
        "full_name": "",
        "status": "suspended",
        "comment": "ระงับสัญญาณเรียบร้อย"
    }
]
pd.DataFrame(case_2_data).to_excel(f"{output_dir}/response_case_2_missing_data.xlsx", index=False)

# เคส 3: ข้อมูลไม่ตรง
case_3_data = [
    {
        "sender_name": "Sender 1",
        "phone_number": "0819999999",  # เบอร์โทรผิด
        "mobile_provider": "AIS",
        "full_name": "นายทดสอบ 1",
        "status": "suspended",
        "comment": "ระงับสัญญาณเรียบร้อย"
    },
    {
        "sender_name": "Sender 2",
        "phone_number": "0821234567",
        "mobile_provider": "TRUE",
        "full_name": "นายทดสอบอื่น",  # ชื่อผิด
        "status": "suspended",
        "comment": "ระงับสัญญาณเรียบร้อย"
    }
]
pd.DataFrame(case_3_data).to_excel(f"{output_dir}/response_case_3_incorrect_data.xlsx", index=False)

# เคส 4: ไม่มีข้อมูลของ sender บางตัว
case_4_data = [
    {
        "sender_name": "Sender 1",
        "phone_number": "0811234567",
        "mobile_provider": "AIS",
        "full_name": "นายทดสอบ 1",
        "status": "suspended",
        "comment": "ระงับสัญญาณเรียบร้อย"
    },
    {
        "sender_name": "Sender 3",
        "phone_number": "0831234567",
        "mobile_provider": "AIS",
        "full_name": "นายทดสอบ 3",
        "status": "suspended",
        "comment": "ระงับสัญญาณเรียบร้อย"
    }
    # ขาด Sender 2, Sender 4, Sender 5
]
pd.DataFrame(case_4_data).to_excel(f"{output_dir}/response_case_4_missing_senders.xlsx", index=False)

# เคส 5: ไฟล์ว่าง
case_5_data = []
pd.DataFrame(case_5_data).to_excel(f"{output_dir}/response_case_5_empty.xlsx", index=False)

# เคส 6: ข้อมูลเพิ่มเติมที่ไม่เกี่ยวข้อง
case_6_data = senders.copy() + [
    {
        "sender_name": "Sender Unknown",
        "phone_number": "0999999999",
        "mobile_provider": "DTAC",
        "full_name": "นายไม่รู้จัก",
        "status": "active",
        "comment": "ไม่พบในคำขอ"
    }
]
for sender in case_6_data[:5]:
    sender["status"] = "suspended"
    sender["comment"] = "ระงับสัญญาณเรียบร้อย"
pd.DataFrame(case_6_data).to_excel(f"{output_dir}/response_case_6_extra_data.xlsx", index=False)

print(f"✅ สร้างไฟล์ Excel mock สำหรับการตอบกลับจาก กสทช เสร็จสิ้นในโฟลเดอร์ {output_dir}")