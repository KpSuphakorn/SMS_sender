"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DailyPage() {
  const router = useRouter();

  // Example data, replace with real fetch in the future
  const [report, setReport] = useState({
    total: 1245,
    ais: 123,
    trueDtac: 344,
    nt: 256,
    other: 17,
  });

  return (
    <div className="min-h-screen bg-white px-8 py-8 flex flex-col items-center">
      {/* Title */}
      <h1 className="text-4xl font-extrabold mb-8 underline decoration-blue-500 self-start">
        ข้อมูลรายสัปดาห์
      </h1>

      {/* Report Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md border p-8 mb-16">
        <div className="text-xl font-medium mb-6">Total: {report.total} Reports</div>
        <div className="flex justify-between items-end gap-4">
          {/* AIS */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-lg font-semibold mb-2">AIS</span>
            <div className="bg-green-300 rounded-xl h-20 w-full flex items-center justify-center text-3xl font-bold text-black shadow">
              {report.ais}
            </div>
          </div>
          {/* TRUE/DTAC */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-lg font-semibold mb-2">TRUE/DTAC</span>
            <div className="bg-red-400 rounded-xl h-20 w-full flex items-center justify-center text-3xl font-bold text-black shadow">
              {report.trueDtac}
            </div>
          </div>
          {/* NT */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-lg font-semibold mb-2">NT</span>
            <div className="bg-yellow-300 rounded-xl h-20 w-full flex items-center justify-center text-3xl font-bold text-black shadow">
              {report.nt}
            </div>
          </div>
          {/* Other */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-lg font-semibold mb-2">Other</span>
            <div className="bg-gray-300 rounded-xl h-20 w-full flex items-center justify-center text-3xl font-bold text-black shadow">
              {report.other}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-row gap-12 w-full max-w-4xl justify-center">
        <button
          onClick={() => router.push("/send/weekly/select")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-3xl font-extrabold rounded-2xl shadow-md px-10 py-8 w-1/2"
        >
          เลือกข้อมูลที่จะส่ง<br />ด้วยตัวเอง
        </button>
        <button
          onClick={() => router.push("/send/daily/all")}
          className="bg-green-500 hover:bg-green-600 text-white text-3xl font-extrabold rounded-2xl shadow-md px-10 py-8 w-1/2"
        >
          ส่งข้อมูล<br />รายสัปดาห์ทั้งหมด
        </button>
      </div>
    </div>
  );
}