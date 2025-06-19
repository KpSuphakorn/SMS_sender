'use client'
import { useRouter } from "next/navigation";

const menuItems = [
  { label: "DASHBOARD", path: "/dashboard" }, //change path to actual path
  { label: "ส่งข้อมูล", path: "/send" },
  { label: "หนังสือตรวจรออนุมัติ", path: "/support-letter" },
  { label: "ส่งข้อมูลให้ผู้รับผิดชอบ", path: "/cases" },
  { label: "พิมพ์รายงานที่ยังไม่ได้ส่ง", path: "/print-unread-report" },
  { label: "ค้นหาข้อมูลทั้งหมด", path: "/all-data" },
];

export default function MainMenu() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.path)}
            className="bg-gray-200 rounded-lg shadow-md flex items-center justify-center h-40 text-3xl font-bold text-blue-900 hover:bg-gray-400 transition"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}