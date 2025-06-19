"use client";
import { useState, useEffect } from "react";
import getAvailableSenders from "@/libs/getAvailableSenders";

// Helper function to map API status to display status
const STATUS_ORDER = [
  { key: "pending", label: "ขอข้อมูลแล้ว" },
  { key: "received", label: "ได้รับข้อมูลแล้ว" },
  { key: "suspension_requested", label: "ขอระงับแล้ว" },
  { key: "suspended", label: "ระงับแล้ว" }
];

const mapStatusToDisplay = (statusArray: any[]) => {
  // Convert to object array if needed
  const statusObjArr = (typeof statusArray[0] === "string")
    ? statusArray.map(s => ({ name: s }))
    : statusArray;

  // Create a set of present statuses
  const present = new Set(statusObjArr.map(s => s.name));

  // Map to full status order, marking as done if present
  return STATUS_ORDER.map(s => ({
    label: s.label,
    done: present.has(s.key)
  }));
};

export default function AllDataPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAvailableSenders(fromDate, toDate);
        
        // Map API data to card format
        const mappedCases = data.map((item: any) => ({
          id: item.sender_name || `case-${item.phone_number}`,
          date: item.date,
          sender: item.sender_name,
          telco: item.mobile_provider,
          actualTelco: item.mobile_provider,
          statuses: mapStatusToDisplay(item.status || []),
          details: `รายละเอียดของเคส ${item.sender_name}\nเบอร์โทร: ${item.phone_number}\nค่ายมือถือ: ${item.mobile_provider}\nวันที่สร้าง: ${item.created_at}\nอัปเดตล่าสุด: ${item.updated_at}`,
          // Additional fields from API
          phone_number: item.phone_number,
          created_at: item.created_at,
          updated_at: item.updated_at,
          fields: item.fields || [],
          request_ids: item.request_ids || [],
          reply_file_id: item.reply_file_id,
        }));
        
        setCases(mappedCases);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fromDate, toDate]);

  // Filter cases based on date range
  const filteredCases = cases;

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-red-500">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

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
        {filteredCases.length === 0 ? (
          <div className="text-center text-gray-500 text-xl py-8">
            No data found for the selected date range.
          </div>
        ) : (
          filteredCases.map((c, idx) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl shadow-md p-6 mb-6 flex flex-col gap-2 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => setSelectedCase(c)}
            >
              <div className="flex flex-row items-center gap-8">
                <div className="text-2xl font-bold w-32">{c.date}</div>
                <div className="flex-1 flex flex-row items-center gap-8">
                  <div>
                    <div className="font-semibold">{c.sender}</div>
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
                Case ID : 
              </div>
            </div>
          ))
        )}
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
              <div className="mb-2"><b>วันที่:</b> {selectedCase.date}</div>
              <div className="mb-2"><b>Sender:</b> {selectedCase.sender} ({selectedCase.telco})</div>
              <div className="mb-2"><b>เบอร์โทร:</b> {selectedCase.phone_number}</div>
              <div className="mb-2"><b>Actual Telco:</b> {selectedCase.actualTelco}</div>
              <div className="mb-2"><b>สถานะ:</b>
                <ul className="list-disc ml-6">
                  {selectedCase.statuses.map((s: any, i: number) => (
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
              {selectedCase.request_ids && selectedCase.request_ids.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">Request IDs:</h4>
                  <ul className="list-disc ml-4">
                    {selectedCase.request_ids.map((req: any, i: number) => (
                      <li key={i} className="text-sm">
                        {req.id} - {req.status}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}