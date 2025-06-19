"use client";
import { useState, useEffect } from "react";
import createRequest from "@/libs/createRequest";
import getAvailableSenders from "@/libs/getAvailableSenders";

// Dummy data for demonstration
const telcos = ["AIS", "TRUE", "DTAC", "NT"];
const senders = [
  "Sender A", "Sender B", "Sender C", "Sender D", "Sender E",
  "Sender F", "Sender G", "Sender H", "Sender I", "Sender J"
];
const fullNames = [
  "นายทดสอบ A", "นายทดสอบ B", "นายทดสอบ C", "นายทดสอบ D", "นายทดสอบ E",
  "นายทดสอบ F", "นายทดสอบ G", "นายทดสอบ H", "นายทดสอบ I", "นายทดสอบ J"
];
const STATUS_LABELS: Record<string, string> = {
  pending: "ขอข้อมูลแล้ว",
  suspension_requested: "ขอระงับแล้ว",
  received: "ได้รับข้อมูลแล้ว",
  suspended: "ระงับแล้ว"
};

const initialCases = Array.from({ length: 10 }).map((_, i) => ({
  id: `0x12344${i}`,
  date: `2025-05-${(i+10).toString().slice(-2)}`,
  sender: senders[i],
  telco: telcos[i % telcos.length],
  actualTelco: telcos[(i+1) % telcos.length],
  phone_number: `08112345${(i+10).toString().slice(-2)}`,
  full_name: fullNames[i],
  statuses: [
    { label: "ขอข้อมูลแล้ว", done: false },
    { label: "ได้รับข้อมูลแล้ว", done: false },
    { label: "ขอระงับแล้ว", done: false },
    { label: "ระงับแล้ว", done: false },
  ],
  details: `รายละเอียดของเคส ${i + 1} ...`,
}));

export default function SendAllCasesPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [modalCase, setModalCase] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cases, setCases] = useState(initialCases);

  // On first load, fetch latest statuses from DB and update cases
  useEffect(() => {
    (async () => {
      try {
        const updated = await getAvailableSenders();
        setCases(prevCases => prevCases.map(c => {
          const item = updated.find((u: any) => u.phone_number === c.phone_number);
          if (!item || !item.status) return c;
          const dbStatusNames = (typeof item.status[0] === "string"
            ? item.status
            : item.status.map((s: any) => s.name)
          );
          return {
            ...c,
            statuses: c.statuses.map(statusEl => {
              const dbKey = Object.keys(STATUS_LABELS).find(key => STATUS_LABELS[key] === statusEl.label);
              return {
                ...statusEl,
                done: dbKey ? dbStatusNames.includes(dbKey) : false
              };
            })
          };
        }));
      } catch (e) {
        // Optionally handle error
      }
    })();
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const fields = ["sender_name", "mobile_provider", "phone_number", "full_name", "date"];
    const rows = cases.map(c => ({
      sender_name: c.sender,
      mobile_provider: c.telco,
      phone_number: c.phone_number,
      full_name: c.full_name,
      date: c.date
    }));
    const postData = { fields, rows };
    try {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODRmYjFkY2ZmOTI3OWMwNGJiOTczYmEiLCJlbWFpbCI6InRoYW1AZ21haWwuY29tIiwibmFtZSI6IlRob3JudGhhbiBMZXJkaGlydW53b25nIiwicm9sZSI6InVzZXIiLCJleHAiOjE3NTI5MDUwNTd9.HIkARjQGjQTfeZ5zxAgm4l5hESnGfNhGkNMdRglDezo";
      const res = await createRequest(postData, token);
      alert(`${res.message}\nRequest ID: ${res.request_id}`);
      // After sending, fetch updated status for the cases
      const updated = await getAvailableSenders();
      setCases(prevCases => prevCases.map(c => {
        const item = updated.find((u: any) => u.phone_number === c.phone_number);
        if (!item || !item.status) return c;
        const dbStatusNames = (typeof item.status[0] === "string"
          ? item.status
          : item.status.map((s: any) => s.name)
        );
        return {
          ...c,
          statuses: c.statuses.map(statusEl => {
            const dbKey = Object.keys(STATUS_LABELS).find(key => STATUS_LABELS[key] === statusEl.label);
            return {
              ...statusEl,
              done: dbKey ? dbStatusNames.includes(dbKey) : false
            };
          })
        };
      }));
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter cases by date
  const filteredCases = cases.filter(c => {
    if (fromDate && c.date < fromDate) return false;
    if (toDate && c.date > toDate) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center">
      {/* Title and Filter */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-6">
        <h1 className="text-4xl font-extrabold underline decoration-blue-500 mb-2">
          ส่งข้อมูลรายวันทั้งหมด
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
        {filteredCases.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl shadow-md p-6 mb-6 flex flex-row items-center gap-4 transition cursor-pointer bg-white`}
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
                    <div className="text-gray-500">{c.sender}</div>
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
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="w-full max-w-6xl flex justify-end mt-8">
        <button
          onClick={handleSubmit}
          className={`bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full px-10 py-4 shadow-md transition flex items-center justify-center ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-6 w-6 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              กำลังส่งข้อมูลทั้งหมด...
            </>
          ) : (
            "ส่งข้อมูลทั้งหมด"
          )}
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