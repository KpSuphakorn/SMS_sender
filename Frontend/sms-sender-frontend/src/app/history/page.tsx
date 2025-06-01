"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import getRequestList from "@/libs/getRequestList";
import downloadPdf from "@/libs/downloadPdf";
import Datepicker from "@/components/DatePicker";
import RequestStatus from "@/components/RequestStatus";
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

  const handleDownload = async (fileId: string) => {
    if (!token) return alert("กรุณาเข้าสู่ระบบใหม่");

    try {
      const blob = await downloadPdf(fileId, token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `document_${fileId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("ดาวน์โหลดไฟล์ไม่สำเร็จ");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📜 ประวัติการส่งคำขอ</h1>

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <Datepicker
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-xl overflow-hidden bg-white shadow">
          <thead className="bg-gray-100 text-gray-700 text-sm font-medium">
            <tr>
              <th className="px-4 py-3 text-left">📅 วันที่</th>
              <th className="px-4 py-3 text-left">🆔 Request ID</th>
              <th className="px-4 py-3 text-left">📌 สถานะ</th>
              <th className="px-4 py-3 text-center">📤 PDF ส่ง</th>
              <th className="px-4 py-3 text-center">📥 PDF ตอบกลับ</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800">
            {filteredLogs.map((log, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50 border-t border-gray-100"}
                >
                <td className="px-4 py-3">{log.thai_date}</td>
                <td className="px-4 py-3">{log.request_id}</td>
                <td className="px-4 py-3">
                  <RequestStatus status={log.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  {log.pdf_sent_file_id && (
                    <button
                      onClick={() => handleDownload(log.pdf_sent_file_id!)}
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      ดาวน์โหลด
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {log.pdf_reply_file_id ? (
                    <button
                      onClick={() => handleDownload(log.pdf_reply_file_id!)}
                      className="inline-flex items-center text-green-600 hover:underline"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      ดาวน์โหลด
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
