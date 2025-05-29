// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface Sender {
  sender_name: string;
  mobile_provider: string;
  phone_number: string;
  full_name: string;
  date: string;
}


const allFields = [
  "sender_name",
  "ค่ายมือถือ",
  "เบอร์มือถือ",
  "ชื่อ-สกุล"
];

export default function DashboardPage() {
  const [date, setDate] = useState<string>("2025-05-29");
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(allFields));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`/mock-data?date=${date}`).then((res) => {
      setSenders(res.data);
    });
  }, [date]);

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
    setLoading(true);
    try {
      const res = await axios.post("/request", {
        fields: Array.from(selectedFields),
        rows: selectedData
      });
      alert("ส่งคำขอเรียบร้อย\nRequest ID: " + res.data.request_id);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📋 ส่งคำขอข้อมูลจาก Sender</h1>

      <div className="mb-4">
        <label className="font-medium">วันที่ (YYYY-MM-DD): </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border px-2 py-1 ml-2"
        />
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
              {field}
            </label>
          ))}
        </div>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">เลือก</th>
            {allFields.map((f) => (
              <th key={f} className="p-2 border">{f}</th>
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
                <td key={f} className="p-2 border">{(sender as any)[f]}</td>
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