"use client";
import { useState } from "react";

// Dummy data for demonstration
const dummyBooks = Array.from({ length: 5 }).map((_, i) => ({
  id: `book-${i + 1}`,
  date: "12-12-25",
  senderCount: 10,
  ais: 2,
  trueDtac: 4,
  nt: 2,
  other: 2,
  cases: Array.from({ length: 3 }).map((_, j) => ({
    id: `0x12344${i}${j}`,
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
    details: `รายละเอียดของเคส ${j + 1} ...`,
  })),
}));

export default function SupportLetterPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalBook, setModalBook] = useState<any | null>(null);

  const handleCheck = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApprove = () => {
    alert("Selected book IDs: " + selected.join(", "));
  };

  return (
    <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center">
      {/* Title and Filter */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-6">
        <h1 className="text-4xl font-extrabold mb-2">รออนุมัติ</h1>
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
        {dummyBooks.map((book) => (
          <div
            key={book.id}
            className={`rounded-2xl shadow-md p-6 mb-6 flex flex-row items-center gap-4 transition cursor-pointer ${selected.includes(book.id) ? "bg-blue-100" : "bg-white"}`}
            onClick={e => {
              if ((e.target as HTMLElement).tagName.toLowerCase() !== "input") {
                setModalBook(book);
              }
            }}
          >
            {/* Book summary */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex flex-row items-center gap-8">
                <div className="text-2xl font-bold w-32">{book.date}</div>
                <div className="flex-1 flex flex-row items-center gap-8">
                  <div className="font-semibold">จำนวน sender name</div>
                  <div className="text-center w-12">{book.senderCount}</div>
                  <div className="font-semibold">AIS</div>
                  <div className="text-center w-8">{book.ais}</div>
                  <div className="font-semibold">TRUE/DTAC</div>
                  <div className="text-center w-8">{book.trueDtac}</div>
                  <div className="font-semibold">NT</div>
                  <div className="text-center w-8">{book.nt}</div>
                  <div className="font-semibold">Other</div>
                  <div className="text-center w-8">{book.other}</div>
                </div>
              </div>
              <div className="text-right text-gray-500 text-sm mt-2">
                Case ID : {book.id}
              </div>
            </div>
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selected.includes(book.id)}
              onChange={() => handleCheck(book.id)}
              className="w-6 h-6 accent-blue-500 cursor-pointer"
              onClick={e => e.stopPropagation()}
            />
          </div>
        ))}
      </div>

      {/* Approve Button */}
      <div className="w-full max-w-6xl flex justify-end mt-8">
        <button
          onClick={handleApprove}
          className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full px-10 py-4 shadow-md transition"
          disabled={selected.length === 0}
        >
          อนุมัติ
        </button>
      </div>

      {/* Modal for Book Cases */}
      {modalBook && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl w-full relative">
            <button
              className="absolute top-4 right-4 text-5xl font-bold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-14 h-14 flex items-center justify-center transition"
              onClick={() => setModalBook(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4">รายการเคสในหนังสือ</h2>
            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {modalBook.cases.map((c: any) => (
                <div
                  key={c.id}
                  className="bg-gray-50 rounded-xl shadow p-4 mb-4"
                >
                  <div className="flex flex-row items-center gap-8">
                    <div className="text-lg font-bold w-32">{c.date}</div>
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
                        {c.statuses.map((s: any, i: number) => (
                          <div key={i} className="flex flex-col items-center">
                            <div
                              className={`h-2 w-16 rounded-full mb-1 ${s.done ? "bg-green-500" : "bg-gray-300"}`}
                            />
                            <span
                              className={`text-xs font-semibold ${s.done ? "text-green-700" : "text-gray-500"}`}
                            >
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-gray-500 text-xs mt-2">
                    Case ID : {c.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
