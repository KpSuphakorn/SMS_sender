"use client";

import { useState, useEffect, useCallback } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

// ใช้ interfaces ที่คุณมีอยู่
interface CaseData {
  sender_name: string;
  phone_number: string;
  mobile_provider: string;
  status: Array<{ name: string; updated_at: string }>;
  latest_request_status: string;
  reportDate?: string;
  amount: number;
  assignedTo?: string;
  approvedBy?: string;
  isRecurring?: boolean;
}

interface NetworkData {
  name: string;
  totalCases: number;
  waitingApproval: number;
  sentToNbtc: number;
  dataReceived: number;
  avgResponseTime: number;
}

interface SummaryData {
  totalCases: number;
  totalWaitingApproval: number;
  totalDataReceived: number;
  totalSuspended: number;
}

interface DailyNewCasesData {
  labels: string[];
  data: number[];
}

export default function Dashboard() {
  // State: ลบ state ที่เกี่ยวข้องกับการโต้ตอบของผู้ใช้ออก
  // const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null); // ลบออก
  // const [selectedDate, setSelectedDate] = useState<string | null>(null); // ลบออก

  // State สำหรับข้อมูลจริงที่ดึงจาก Backend
  const [cases, setCases] = useState<CaseData[]>([]);
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalCases: 0,
    totalWaitingApproval: 0,
    totalDataReceived: 0,
    totalSuspended: 0,
  });
  const [dailyNewCasesData, setDailyNewCasesData] = useState<DailyNewCasesData>({
    labels: [],
    data: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // API Base URL (ตรวจสอบให้แน่ใจว่าตรงกับที่ FastAPI รันอยู่)
  const API_BASE_URL = "http://localhost:8000/api";

  // ฟังก์ชันสำหรับดึงข้อมูล
  // ลบ dependency ที่เกี่ยวกับการโต้ตอบของผู้ใช้ออก
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ดึงข้อมูล Summary
      const summaryRes = await fetch(`${API_BASE_URL}/dashboard/summary`);
      if (!summaryRes.ok) throw new Error(`HTTP error! status: ${summaryRes.status}`);
      const summaryData: SummaryData = await summaryRes.json();
      setSummary(summaryData);

      // ดึงข้อมูล Network Distribution
      const networkRes = await fetch(`${API_BASE_URL}/dashboard/network-distribution`);
      if (!networkRes.ok) throw new Error(`HTTP error! status: ${networkRes.status}`);
      const networkData: NetworkData[] = await networkRes.json();
      setNetworks(networkData);

      // ดึงข้อมูล Daily New Cases
      const dailyRes = await fetch(`${API_BASE_URL}/dashboard/daily-new-cases`);
      if (!dailyRes.ok) throw new Error(`HTTP error! status: ${dailyRes.status}`);
      const dailyData: DailyNewCasesData = await dailyRes.json();
      setDailyNewCasesData(dailyData);

      // ดึงข้อมูล Cases (ไม่มี filter จาก UI แล้ว)
      // ลบ params.append สำหรับ selected_network, statusFilter, highValueFilter, overdueFilter ออกทั้งหมด
      const casesRes = await fetch(`${API_BASE_URL}/dashboard/cases`);
      if (!casesRes.ok) throw new Error(`HTTP error! status: ${casesRes.status}`);
      const casesData: CaseData[] = await casesRes.json();
      setCases(casesData);

    } catch (err: any) {
      setError(`Failed to fetch data: ${err.message}`);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []); // <<< Dependency array ว่างเปล่า เพื่อให้ fetch ข้อมูลแค่ครั้งเดียวเมื่อ component mount

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summary (ใช้ข้อมูลจาก `summary` state)
  const totalCases = summary.totalCases;
  const totalWaiting = summary.totalWaitingApproval;
  const totalReceived = summary.totalDataReceived;
  const totalSuspended = summary.totalSuspended;
  // highValueCases และ dailyLoss จะยังคง filter ใน frontend เพราะ Backend ไม่ได้มี endpoint สำหรับ filter นี้
  const highValueCases = cases.filter(c => c.amount >= 10000).length;
  const dailyLoss = cases.reduce((sum, c) => sum + c.amount, 0);

  // Chart data
  const NETWORK_COLORS: Record<string, string> = {
    "AIS": "#59cc33",
    "DTAC": "#47afd1",
    "TRUE": "#FF0000",
    "NT": "#ffff4d", // เพิ่ม NT หรือเครือข่ายอื่นๆ ได้
  };

  const getNetworkColors = (nets: NetworkData[]) =>
    nets.map(n => {
      // แปลงชื่อเป็นตัวพิมพ์ใหญ่หมดเพื่อกันสะกดผิด
      const key = n.name?.toUpperCase?.() || "";
      return NETWORK_COLORS[key] || "#EF4444"; // fallback สีแดงถ้าไม่รู้จัก
    });

  const networkDistribution = {
    labels: networks.map(n => n.name), // ใช้ networks ตรงๆ
    datasets: [{
      data: networks.map(n => n.totalCases), // ใช้ networks ตรงๆ
      backgroundColor: getNetworkColors(networks), // ใช้ networks ตรงๆ
      borderColor: "#FFFFFF",
      borderWidth: 2,
    }],
  };

  const dailyNewCasesChartData = {
    labels: dailyNewCasesData.labels,
    datasets: [{
      label: "เคสใหม่",
      data: dailyNewCasesData.data,
      backgroundColor: "#4B5EFC",
      borderRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#374151", font: { size: 12 } }
      },
      tooltip: {
        backgroundColor: "#1F2937",
        titleColor: "#F9FAFB",
        bodyColor: "#F9FAFB",
      }
    },
  };

  // ลบ onClick handlers ออกจาก chart options เพื่อไม่ให้มีปฏิสัมพันธ์
  const pieOptions = {
    ...chartOptions,
    // onClick: (event: any, elements: any) => { ... } // ลบออก
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
          callback: function(value: number | string) {
            return Number(value).toFixed(0);
          }
        }
      }
    }
  };

  // UI
  // ก่อน return UI
  console.log("dailyNewCasesData", dailyNewCasesData);
  console.log("Bar chart data", dailyNewCasesChartData);
  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header: ลบส่วนแสดงข้อมูล selectedNetwork และปุ่ม "ดูทั้งหมด" */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">DASHBOARD</h1>
            {/* {selectedNetwork && ( ... )} // ลบออก */}
          </div>
          {/* ลบ Filter controls div ออกทั้งหมด */}
        </header>

        {loading && <div className="text-center text-gray-600 text-xl">กำลังโหลดข้อมูล...</div>}
        {error && <div className="text-center text-red-600 text-xl">เกิดข้อผิดพลาด: {error}</div>}

        {!loading && !error && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border-l-4 border-blue-500 p-4 rounded-lg shadow flex flex-col items-center">
                <div className="text-blue-500 text-2xl mb-2">📊</div>
                <div className="text-sm text-gray-600 mb-1">เคสทั้งหมด</div>
                <div className="text-2xl font-bold text-gray-900">{totalCases}</div>
              </div>
              <div className="bg-white border-l-4 border-red-500 p-4 rounded-lg shadow flex flex-col items-center">
                <div className="text-yellow-500 text-2xl mb-2">⛔</div>
                <div className="text-sm text-gray-600 mb-1">ระงับแล้ว</div>
                <div className="text-2xl font-bold text-gray-900">{totalSuspended}</div>
              </div>
              <div className="bg-white border-l-4 border-green-500 p-4 rounded-lg shadow flex flex-col items-center">
                <div className="text-green-500 text-2xl mb-2">✅</div>
                <div className="text-sm text-gray-600 mb-1">ได้รับข้อมูลแล้ว</div>
                <div className="text-2xl font-bold text-gray-900">{totalReceived}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  การแจกแจงตามเครือข่าย
                </h2>
                <div className="h-64">
                  {/* ไม่ต้องมี selectedNetwork ในหัวข้อแล้ว */}
                  <Pie data={networkDistribution} options={pieOptions} />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">เคสใหม่ต่อวัน</h2>
                <div className="h-64">
                  <Bar data={dailyNewCasesChartData} options={barOptions} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MantineProvider>
  );
}