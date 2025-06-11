"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getSession } from "next-auth/react";
import getNotifications from "@/libs/getNotification";
import markNotificationAsRead from "@/libs/markRequestAsRead";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notis, setNotis] = useState<any[]>([]);

  const fetchNotifications = async () => {
    const session = await getSession();
    const token = session?.user.token;
    if (!token) return;

    try {
      const data = await getNotifications(token);
      setNotis(data);
    } catch (err) {
      console.error("โหลดแจ้งเตือนไม่สำเร็จ", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
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
      await Promise.all(
        unread.map((n) => markNotificationAsRead(n.notification_id, token))
      );
      await fetchNotifications();
    }
  };

  const getStatusDisplay = (status: string) => {
    if (status === "suspended") return "ระงับสัญญาณแล้ว";
    if (status === "suspension_requested") return "ร้องขอระงับสัญญาณ";
    if (status === "received") return "ได้รับข้อมูล";
    return "กำลังขอข้อมูล";
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
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow z-50 max-h-96 overflow-y-auto">
          <div className="p-2 font-semibold border-b">การแจ้งเตือน</div>
          {notis.length === 0 ? (
            <div className="p-2 text-gray-500">ยังไม่มีการตอบกลับหรือการระงับสัญญาณ</div>
          ) : (
            notis.map((n) => (
              <div
                key={n.notification_id}
                className={`p-3 text-sm ${
                  n.is_read
                    ? "bg-gray-100 text-gray-500"
                    : "bg-white font-medium"
                }`}
              >
                <div className="flex flex-col">
                  <div>
                    📩 {getStatusDisplay(n.status)} (ID: {n.request_id})
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    วันที่: {n.thai_date}
                  </div>
                  {n.status === "suspended" && (
                    <div className="text-green-500 text-xs mt-1">
                      ดำเนินการระงับโดย กสทช. เรียบร้อย
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}