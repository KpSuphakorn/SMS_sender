"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, getSession } from "next-auth/react";
import createRequest from "@/libs/createRequest";
import getAvailableSenders from "@/libs/getAvailableSenders";
import FieldSelector from "@/components/FieldSelector";
import SenderTable from "@/components/SenderTable";
import Datepicker from "@/components/DatePicker";
import NotificationBell from "@/components/NotificationBell";
import { Sender } from "../../interface";

const fieldLabels: Record<keyof Sender, string> = {
  sender_name: "ชื่อผู้ส่ง",
  mobile_provider: "ค่ายมือถือ",
  phone_number: "เบอร์มือถือ",
  full_name: "ชื่อ-สกุล",
  date: "วันที่",
};

const allFields = Object.keys(fieldLabels) as (keyof Sender)[];

export default function DashboardPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(allFields));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let data;
        if (!startDate && !endDate) {
          // ถ้าไม่ได้เลือกช่วง → ดึงทั้งหมด
          data = await getAvailableSenders();
        } else {
          // ดึงตามช่วงที่ระบุ
          data = await getAvailableSenders(startDate, endDate);
        }
        setSenders(data);
      } catch (err) {
        console.error("โหลดข้อมูล senders ล้มเหลว", err);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const toggleRow = (index: number) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) => {
      const newSet = new Set(prev);
      newSet.has(field) ? newSet.delete(field) : newSet.add(field);
      return newSet;
    });
  };

  const handleSubmit = async () => {
    const selectedData = Array.from(selectedRows).map((i) => senders[i]);
    if (!selectedData.length || !selectedFields.size) {
      alert("กรุณาเลือกข้อมูลและ field");
      return;
    }

    const session = await getSession();
    const token = session?.user.token;
    if (!token) {
      alert("หมดเวลาการเข้าสู่ระบบ กรุณา login ใหม่");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await createRequest(
        {
          fields: Array.from(selectedFields),
          rows: selectedData,
        },
        token
      );
      alert("ส่งคำขอเรียบร้อย\nRequest ID: " + res.request_id);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📋 ส่งคำขอข้อมูลจาก Sender</h1>

        <div className="flex items-center space-x-4">
          <NotificationBell /> {/* 👈 กระดิ่งอยู่ซ้ายสุดของกลุ่มปุ่ม */}
          
          <button
            onClick={() => router.push("/history")}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer"
          >
            ดูประวัติคำขอ
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <Datepicker
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <FieldSelector
          allFields={allFields}
          fieldLabels={fieldLabels}
          selectedFields={selectedFields}
          onToggle={toggleField}
        />
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <SenderTable
          senders={senders}
          allFields={allFields}
          fieldLabels={fieldLabels}
          selectedRows={selectedRows}
          onToggleRow={toggleRow}
        />
      </div>

      <div className="flex justify-end">
        <button
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "กำลังส่ง..." : "✅ ส่งคำขอ"}
        </button>
      </div>
    </div>
  );
}