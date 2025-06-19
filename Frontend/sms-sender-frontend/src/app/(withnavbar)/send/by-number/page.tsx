"use client";
import { useState } from "react";

// Dummy data for demonstration
const dummyCases = Array.from({ length: 10 }).map((_, i) => ({
  id: `0x12344${i}`,
  date: "12-12-25",
  sender: "Sender name",
  telco: "AIS",
  actualTelco: "TRUE",
  statuses: [
    { label: "ขอข้อมูลแล้ว", done: true },
    { label: "ได้รับข้อมูลแล้ว", done: true },
    { label: "ขอระงับแล้ว", done: false },
    { label: "ระงับแล้ว", done: false },
  ],
  details: `รายละเอียดของเคส ${i + 1} ...`,
}));

export default function SelectCasesPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalCase, setModalCase] = useState<any | null>(null);

  const handleCheck = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    // Replace with your submit logic
    alert("Selected case IDs: " + selected.join(", "));
  };

  return (
    <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center">
      {/* Title and Filter */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-6">
        <h1 className="text-4xl font-extrabold underline decoration-blue-500 mb-2">
          เลือกข้อมูลที่จะส่ง
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
      <div className="w-full max-w-6xl overflow-y-auto" style={{ maxHeight: "60vh" }}>
        {dummyCases.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl shadow-md p-6 mb-6 flex flex-row items-center gap-4 transition cursor-pointer ${selected.includes(c.id) ? "bg-blue-100" : "bg-white"}`}
            onClick={e => {
              if ((e.target as HTMLElement).tagName.toLowerCase() !== "input") {
                setModalCase(c);
              }
            }}
          >
            <div className="flex-1 flex flex-col gap-2">
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
                          className={`h-2 w-24 rounded-full mb-1 ${s.done ? "bg-green-500" : "bg-gray-300"}`}
                        />
                        <span
                          className={`text-sm font-semibold ${s.done ? "text-green-700" : "text-gray-500"}`}
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
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selected.includes(c.id)}
              onChange={() => handleCheck(c.id)}
              className="w-6 h-6 accent-blue-500 cursor-pointer"
              onClick={e => e.stopPropagation()}
            />
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="w-full max-w-6xl flex justify-end mt-8">
        <button
          onClick={handleSubmit}
          className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full px-10 py-4 shadow-md transition"
          disabled={selected.length === 0}
        >
          ส่งข้อมูลที่เลือก
        </button>
      </div>

      {/* Modal */}
      {modalCase && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl w-full relative flex flex-row gap-8">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-5xl font-bold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-14 h-14 flex items-center justify-center transition"
              onClick={() => setModalCase(null)}
              aria-label="Close"
            >
              ×
            </button>
            {/* Left Column: Main Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4">รายละเอียดเคส</h2>
              <div className="mb-2"><b>Case ID:</b> {modalCase.id}</div>
              <div className="mb-2"><b>วันที่:</b> {modalCase.date}</div>
              <div className="mb-2"><b>Sender:</b> {modalCase.sender} ({modalCase.telco})</div>
              <div className="mb-2"><b>Actual Telco:</b> {modalCase.actualTelco}</div>
              <div className="mb-2"><b>สถานะ:</b>
                <ul className="list-disc ml-6">
                  {modalCase.statuses.map((s: any, i: number) => (
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
              <div className="text-gray-700 whitespace-pre-line">{modalCase.details}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}