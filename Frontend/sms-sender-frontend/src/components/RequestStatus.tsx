interface RequestStatusProps {
  status: string; // eng status from backend
}

// Mapping แสดงชื่อสถานะภาษาไทย
const statusMap: Record<string, string> = {
  pending: "กำลังขอข้อมูล",
  received: "ได้รับข้อมูลแล้ว",
  pending_suspension: "กำลังขอระงับสัญญาณ",
  suspended: "ระงับสำเร็จ",
};

// ลำดับสถานะตาม flow
const statusOrder = [
  "pending",
  "received",
  "pending_suspension",
  "suspended",
];

export default function RequestStatus({ status }: RequestStatusProps) {
  // หา index ของสถานะปัจจุบัน
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="flex flex-col items-start gap-1">
      {statusOrder.map((st, i) => (
        <div key={st}>
          {i <= currentIndex ? "✓" : "✗"} {statusMap[st]}
        </div>
      ))}
    </div>
  );
}
