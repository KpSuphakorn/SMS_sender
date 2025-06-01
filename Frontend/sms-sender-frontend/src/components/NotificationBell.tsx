"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import getRequestList from "@/libs/getRequestList";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import markRequestAsRead from "@/libs/markRequestAsRead";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notis, setNotis] = useState<any[]>([]);
  const router = useRouter();

  const fetchData = async () => {
    const session = await getSession();
    const token = session?.user.token;
    if (!token) return;

    try {
      const all = await getRequestList(token);
      const received = all.filter((req: any) => req.status === "received");
      setNotis(received);
    } catch (err) {
      console.error("โหลดแจ้งเตือนไม่สำเร็จ", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notis.filter((n) => !n.is_read).length;

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen) {
      const session = await getSession();
      const token = session?.user.token;
      if (!token) return;

      const unread = notis.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => markRequestAsRead(n.request_id, token)));
      await fetchData();
    }
  };

  return (
    <div className="relative">
      <button onClick={handleToggle} className="relative">
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow z-50 max-h-64 overflow-y-auto">
          <div className="p-2 font-semibold border-b">การแจ้งเตือน</div>
          {notis.length === 0 ? (
            <div className="p-2 text-gray-500">ยังไม่มีการตอบกลับ</div>
          ) : (
            notis.map((n) => (
              <div
                key={n.request_id}
                className={`p-2 text-sm ${
                  n.is_read
                    ? "bg-gray-100 text-gray-500"
                    : "bg-white font-medium"
                }`}
              >
                📩 ได้รับข้อมูลสำหรับ {n.request_id}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
