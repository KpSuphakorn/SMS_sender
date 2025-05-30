// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, getSession } from "next-auth/react";
import createRequest from "@/libs/createRequest";
import getMockData from "@/libs/getMockData";
import { Sender } from "../../interface";

const fieldLabels: Record<keyof Sender, string> = {
  sender_name: "ชื่อผู้ส่ง",
  mobile_provider: "ค่ายมือถือ",
  phone_number: "เบอร์มือถือ",
  full_name: "ชื่อ-สกุล",
  date: "วันที่"
};

const allFields = Object.keys(fieldLabels) as (keyof Sender)[];

export default function DashboardPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(allFields));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    Promise.all(dates.map((d) => getMockData(d)))
      .then((results) => {
        setSenders(results.flat());
      })
      .catch((err) => {
        console.error("โหลดข้อมูล mock ล้มเหลว", err);
      });
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
    if (!selectedData.length || !selectedFields.size) return alert("กรุณาเลือกข้อมูลและ field");

    const session = await getSession();
    const token = session?.user.token;
    if (!token) {
      alert("หมดเวลาการเข้าสู่ระบบ กรุณา login ใหม่");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await createRequest({
        fields: Array.from(selectedFields),
        rows: selectedData
      }, token);
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📋 ส่งคำขอข้อมูลจาก Sender</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ออกจากระบบ
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <div>
          <label className="font-medium">วันที่เริ่มต้น:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border px-2 py-1 ml-2"
          />
        </div>
        <div>
          <label className="font-medium">วันที่สิ้นสุด:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border px-2 py-1 ml-2"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="font-medium">เลือก Field ที่ต้องการส่ง:</label>
        <div className="flex gap-4 flex-wrap mt-2">
          {allFields.map((field) => (
            <label key={field} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selectedFields.has(field)}
                onChange={() => toggleField(field)}
              />
              {fieldLabels[field]}
            </label>
          ))}
        </div>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">เลือก</th>
            {allFields.map((f) => (
              <th key={f} className="p-2 border">{fieldLabels[f]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {senders.map((sender, index) => (
            <tr key={index}>
              <td className="p-2 border text-center">
                <input
                  type="checkbox"
                  checked={selectedRows.has(index)}
                  onChange={() => toggleRow(index)}
                />
              </td>
              {allFields.map((f) => (
                <td key={f} className="p-2 border">{sender[f]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "กำลังส่ง..." : "✅ ส่งคำขอ"}
      </button>
    </div>
  );
}
