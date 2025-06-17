"use client";
import { useRouter } from "next/navigation";

export default function SendMenu() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-extrabold mb-10 underline decoration-blue-500" style={{fontFamily: "inherit"}}>
        ส่งข้อมูล
      </h1>
      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        {/* รายวัน */}
        <button
          onClick={() => router.push("/send/daily")}
          className="bg-yellow-300 shadow-md rounded-xl h-56 flex items-center justify-center text-5xl font-bold text-white hover:bg-yellow-400 transition"
        >
          รายวัน
        </button>
        {/* รายเดือน */}
        <button
          onClick={() => router.push("/send/monthly")}
          className="bg-red-400 shadow-md rounded-xl h-56 flex items-center justify-center text-5xl font-bold text-white hover:bg-red-500 transition"
        >
          รายเดือน
        </button>
        {/* รายสัปดาห์ */}
        <button
          onClick={() => router.push("/send/weekly")}
          className="bg-green-600 shadow-md rounded-xl h-56 flex items-center justify-center text-5xl font-bold text-white hover:bg-green-700 transition col-span-2 sm:col-span-1"
          style={{ gridColumn: "1 / span 1" }}
        >
          รายสัปดาห์
        </button>
        {/* รายหมายเลข */}
        <button
          onClick={() => router.push("/send/by-number")}
          className="bg-blue-500 shadow-md rounded-xl h-56 flex items-center justify-center text-5xl font-bold text-white hover:bg-blue-600 transition col-span-1"
        >
          รายหมายเลข
        </button>
      </div>
    </div>
  );
}