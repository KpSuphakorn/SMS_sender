"use client";
import { useState } from "react";

// Dummy data for demonstration
const dummyCases = Array.from({ length: 100 }).map((_, i) => ({
  id: `0x12344${i}`,
  date: "12-12-25",
  sender: "Sender name",
  telco: "AIS",
  actualTelco: "TRUE",
  statuses: [
    { label: "ขอข้อมูลแล้ว", done: true },
    { label: "ได้รับข้อมูลแล้ว", done: false },
    { label: "ขอระงับแล้ว", done: true },
    { label: "ระงับแล้ว", done: false },
  ],
  // Add more fields for full data
  details: `รายละเอียดของเคส ${i + 1} ...`,
}));

export default function AllDataPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);

  // In the future, filter cases by date here
  const filteredCases = dummyCases; // Replace with real filter logic

  return (
    <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center">
      {/* Title and Filter */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-6">
        <h1 className="text-4xl font-extrabold underline decoration-blue-500 mb-2">
          ข้อมูลทั้งหมด
        </h1>
        <div className="flex flex-row items-center gap-4 bg-gray-200 rounded-xl px-4 py-2 w-full max-w-4xl">
          <span className="text-2xl font-bold">ตั้งแต่</span>
          <input
            type="date"
            className="bg-gray-100 rounded px-3 py-1 text-lg font-semibold"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <span className="text-2xl font-bold">ถึง</span>
          <input
            type="date"
            className="bg-gray-100 rounded px-3 py-1 text-lg font-semibold"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Cards */}
      <div className="w-full max-w-6xl overflow-y-auto" style={{ maxHeight: "70vh" }}>
        {filteredCases.map((c, idx) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl shadow-md p-6 mb-6 flex flex-col gap-2 cursor-pointer hover:bg-gray-50 transition"
            onClick={() => setSelectedCase(c)}
          >
            <div className="flex flex-row items-center gap-8">
              <div className="text-2xl font-bold w-32">{c.date}</div>
              <div className="flex-1 flex flex-row items-center gap-8">
                <div>
                  <div className="font-semibold">Sender name</div>
                  <div className="text-gray-500">{c.telco}</div>
                </div>
                <div>
                  <div className="font-semibold">Actual Telco.</div>
                  <div className="text-gray-500">{c.actualTelco}</div>
                </div>
                {/* Status Bar */}
                <div className="flex-1 flex flex-row items-center gap-2 ml-8">
                  {c.statuses.map((s, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className={`h-2 w-24 rounded-full mb-1 ${
                          s.done ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold ${
                          s.done ? "text-green-700" : "text-gray-500"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right text-gray-500 text-sm mt-2">
              Case ID : {c.id}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl w-full relative flex flex-row gap-8">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-5xl font-bold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-14 h-14 flex items-center justify-center transition"
              onClick={() => setSelectedCase(null)}
              aria-label="Close"
            >
              ×
            </button>
            {/* Left Column: Main Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4">รายละเอียดเคส</h2>
              <div className="mb-2"><b>Case ID:</b> {selectedCase.id}</div>
              <div className="mb-2"><b>วันที่:</b> {selectedCase.date}</div>
              <div className="mb-2"><b>Sender:</b> {selectedCase.sender} ({selectedCase.telco})</div>
              <div className="mb-2"><b>Actual Telco:</b> {selectedCase.actualTelco}</div>
              <div className="mb-2"><b>สถานะ:</b>
                <ul className="list-disc ml-6">
                  {selectedCase.statuses.map((s, i) => (
                    <li key={i} className={s.done ? "text-green-700" : "text-gray-500"}>
                      {s.label} {s.done ? "✓" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Right Column: รายละเอียดของเคส */}
            <div className="flex-1 border-l pl-8">
              <h3 className="text-xl font-bold mb-2">รายละเอียดของเคส</h3>
              <div className="text-gray-700 whitespace-pre-line">{selectedCase.details}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}