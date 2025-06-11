interface RequestStatusProps {
  status: string[];
}

// Mapping แสดงชื่อสถานะภาษาไทย
const statusMap: Record<string, string> = {
  pending: "กำลังขอข้อมูล",
  received: "ได้รับข้อมูล",
  suspension_requested: "ร้องขอระงับสัญญาณ",
  suspended: "ระงับสัญญาณแล้ว",
};

// ลำดับสถานะตาม flow
const statusOrder = [
  "pending",
  "received",
  "suspension_requested",
  "suspended",
];

export default function RequestStatus({ status }: RequestStatusProps) {
  return (
    <div className="flex flex-col items-start gap-1">
      {statusOrder.map((st) => (
        <div key={st}>
          {status.includes(st) ? "✓" : "✗"} {statusMap[st]}
        </div>
      ))}
    </div>
  );
}