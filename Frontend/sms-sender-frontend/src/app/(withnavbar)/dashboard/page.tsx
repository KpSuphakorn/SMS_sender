"use client";
import { useState } from "react";

export default function Dashboard() {
  // Dummy data for now
  const [summary, setSummary] = useState({
    totalCases: 12345,
    totalLoss: 35000.4,
    monthlyLoss: 350.4,
    dailyLoss: 35.4,
    docsApproved: 154,
    docsPending: 154,
  });

  return (
    <div className="min-h-screen bg-white px-8 py-8">
      {/* Title */}
      <h1 className="text-6xl font-extrabold mb-8">DASHBOARD</h1>

      {/* Top Section: Bar Chart & Donut Chart */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        {/* Bar Chart Placeholder */}
        <div className="flex-1 bg-white rounded-2xl shadow-md p-8">
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-lg font-semibold">Revenue</div>
              <div className="text-2xl font-bold">จำนวนเคส <span className="text-green-500 text-base font-normal ml-2">↑ 2.1% vs last week</span></div>
              <div className="text-gray-400 text-sm">Sales from 1-12 Dec, 2020</div>
            </div>
            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold border border-blue-100 hover:bg-blue-100 transition">View Report</button>
          </div>
          {/* Bar Chart Placeholder */}
          <div className="h-48 flex items-end gap-2 mt-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-4 rounded-t bg-blue-400`} style={{ height: `${40 + Math.random() * 80}px` }} />
                <div className="w-4 h-2 bg-gray-200 rounded-b" />
                <div className="text-xs text-gray-400 mt-1">{String(i+1).padStart(2, "0")}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Last 6 days</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Last Week</div>
          </div>
        </div>
        {/* Donut Chart Placeholder */}
        <div className="flex-1 bg-white rounded-2xl shadow-md p-8 flex flex-col items-center justify-center">
          <div className="flex justify-between w-full mb-2">
            <div className="text-lg font-semibold">สถานะ</div>
            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold border border-blue-100 hover:bg-blue-100 transition">View Report</button>
          </div>
          <div className="flex flex-col items-center">
            {/* Donut Chart Placeholder */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="40,60" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#a5b4fc" strokeWidth="4" strokeDasharray="32,68" strokeDashoffset="40" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#fbbf24" strokeWidth="4" strokeDasharray="28,72" strokeDashoffset="72" />
              </svg>
              {/* Tooltip Example */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-900 text-white px-4 py-2 rounded-lg shadow-lg text-center text-sm">
                Afternoon<br />1pm - 4pm<br /><span className="text-lg font-bold">1,890 orders</span>
              </div>
            </div>
            <div className="flex gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" /> ระงับแล้ว 40%</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-300 inline-block" /> อยู่ระหว่างดำเนินการ 32%</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> รอดำเนินการ 28%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Bubbles and Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Bubble Chart Placeholder */}
        <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center">
          <div className="text-lg font-semibold mb-2">เปอร์เซ็นต์ค่าย</div>
          <div className="text-gray-400 text-sm mb-4">เปอร์เซ็นของเคส แยกตามค่าย</div>
          <div className="flex items-end gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-blue-300 rounded-full flex items-center justify-center text-white text-xl font-bold">92%<br /><span className="text-xs">DTAC</span></div>
            </div>
            <div className="relative">
              <div className="w-24 h-24 bg-purple-400 rounded-full flex items-center justify-center text-white text-xl font-bold">85%<br /><span className="text-xs">AIS</span></div>
            </div>
            <div className="relative -ml-8">
              <div className="w-32 h-32 bg-orange-300 rounded-full flex items-center justify-center text-white text-2xl font-bold">85%<br /><span className="text-base">TRUE</span></div>
            </div>
          </div>
        </div>
        {/* Stat Cards */}
        <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4">
            <div className="bg-indigo-100 text-indigo-500 rounded-full p-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 20v-6m0 0V4m0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-gray-400 text-sm">มูลค่าความเสียหายรวม</div>
              <div className="text-2xl font-bold">${summary.totalLoss}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4">
            <div className="bg-indigo-100 text-indigo-500 rounded-full p-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 20v-6m0 0V4m0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-gray-400 text-sm">ความเสียหายเดือนนี้</div>
              <div className="text-2xl font-bold">${summary.monthlyLoss}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4">
            <div className="bg-indigo-100 text-indigo-500 rounded-full p-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 20v-6m0 0V4m0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-gray-400 text-sm">ความเสียหายวันนี้</div>
              <div className="text-2xl font-bold">${summary.dailyLoss}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4">
            <div className="bg-blue-100 text-blue-500 rounded-full p-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 20v-6m0 0V4m0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-gray-400 text-sm">เอกสารที่รับรองแล้ว</div>
              <div className="text-2xl font-bold">{summary.docsApproved}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4">
            <div className="bg-red-100 text-red-500 rounded-full p-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 20v-6m0 0V4m0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-gray-400 text-sm">เอกสารรอรับรอง</div>
              <div className="text-2xl font-bold">{summary.docsPending}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4">
            <div className="bg-red-100 text-red-500 rounded-full p-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 20v-6m0 0V4m0 10c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-gray-400 text-sm">จำนวนเคสสะสม</div>
              <div className="text-2xl font-bold">{summary.totalCases}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}