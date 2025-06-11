"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import getRequestList from "@/libs/getRequestList";
import downloadFile from "@/libs/downloadFile";
import Datepicker from "@/components/DatePicker";
import { RequestLog } from "../../../interface";
import { Download } from "lucide-react";

export default function HistoryPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<RequestLog[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      const userToken = session?.user.token;
      if (!userToken) return alert("กรุณาเข้าสู่ระบบใหม่");
      setToken(userToken);

      try {
        const result = await getRequestList(userToken);
        setLogs(result);
        setFilteredLogs(result);
      } catch (err) {
        console.error(err);
        alert("โหลดประวัติล้มเหลว");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) {
      setFilteredLogs(logs);
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filtered = logs.filter((log) => {
      const logDate = new Date(log.thai_date);
      return logDate >= start && logDate <= end;
    });
    setFilteredLogs(filtered);
  }, [startDate, endDate, logs]);

  const handleDownload = async (fileId: string, isPdf: boolean) => {
    if (!token) return alert("กรุณาเข้าสู่ระบบใหม่");

    try {
      const { blob, filename } = await downloadFile(fileId, token, isPdf);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("ดาวน์โหลดไฟล์ไม่สำเร็จ");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">📜 ประวัติการส่งคำขอ</h1>

      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <Datepicker
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-xl overflow-hidden bg-white shadow-md">
          <thead className="bg-gray-100 text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">📅 วันที่</th>
              <th className="px-4 py-3 text-left">🆔 Request ID</th>
              <th className="px-4 py-3 text-center">กำลังขอข้อมูล</th>
              <th className="px-4 py-3 text-center">ได้รับข้อมูล</th>
              <th className="px-4 py-3 text-center">ร้องขอระงับสัญญาณ</th>
              <th className="px-4 py-3 text-center">ระงับสัญญาณแล้ว</th>
              <th className="px-4 py-3 text-center">📤 ไฟล์ที่ส่ง</th>
              <th className="px-4 py-3 text-center">📥 ไฟล์ตอบกลับ</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800">
            {filteredLogs.map((log, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50 border-t border-gray-200"}
              >
                <td className="px-4 py-3 text-left">{log.thai_date}</td>
                <td className="px-4 py-3 text-left">{log.request_id}</td>
                <td className="px-4 py-3 text-center">
                  {log.status.includes("pending") ? (
                    <span className="text-green-500 font-bold">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {log.status.includes("received") ? (
                    <span className="text-green-500 font-bold">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {log.status.includes("suspension_requested") ? (
                    <span className="text-green-500 font-bold">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {log.status.includes("suspended") ? (
                    <span className="text-green-500 font-bold">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col gap-1">
                    {log.pdf_sent_data_id && (
                      <button
                        onClick={() => handleDownload(log.pdf_sent_data_id!, true)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF ข้อมูล
                      </button>
                    )}
                    {log.pdf_sent_suspension_id && (
                      <button
                        onClick={() => handleDownload(log.pdf_sent_suspension_id!, true)}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF คำร้องระงับ
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {log.reply_file_id ? (
                    <button
                      onClick={() => handleDownload(log.reply_file_id!, false)}
                      className="inline-flex items-center text-green-600 hover:text-green-800 hover:underline cursor-pointer"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Excel/CSV
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}