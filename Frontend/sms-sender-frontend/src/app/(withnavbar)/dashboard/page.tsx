"use client";

import { useState, useEffect, useCallback } from "react";
<<<<<<< HEAD
import { useSession } from "next-auth/react";
import { Pie, Bar, Line } from "react-chartjs-2";
=======
import { Pie, Bar } from "react-chartjs-2";
>>>>>>> seen2
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
import { CheckCircle, Clock, AlertCircle, Download } from "lucide-react";
import '@mantine/core/styles.css';

<<<<<<< HEAD
// Import API functions
import getPendingRequests from "@/libs/getPendingRequests";
import approveRequest from "@/libs/approveRequest";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement);
=======
ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
>>>>>>> seen2

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

interface PendingRequest {
  request_id: string;
  senders: Array<{
    sender_name: string;
    phone_number: string;
    mobile_provider: string;
    full_name?: string;
    date: string;
  }>;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
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
<<<<<<< HEAD
  const { data: session } = useSession();
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(), // Today: July 1, 2025
    new Date()  // Today: July 1, 2025
  ]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [highValueFilter, setHighValueFilter] = useState<boolean>(false);
  const [overdueFilter, setOverdueFilter] = useState<"waiting_3days" | "sent_7days" | null>(null);
  
  // New states for pending requests
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [approvingRequests, setApprovingRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    if (!session?.user?.token) return;
    
    setIsLoadingRequests(true);
    setError(null);
    
    try {
      const result = await getPendingRequests(session.user.token);
      setPendingRequests(result);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoadingRequests(false);
    }
  }, [session?.user?.token]);

  // Load pending requests on component mount
  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Approve request function
  const handleApproveRequest = useCallback(async (requestId: string) => {
    if (!session?.user?.token) return;
    
    setApprovingRequests(prev => new Set([...prev, requestId]));
    
    try {
      await approveRequest(requestId, session.user.token);
      // Refresh pending requests after approval
      await fetchPendingRequests();
      alert(`อนุมัติคำขอ ${requestId} สำเร็จ`);
    } catch (err) {
      console.error('Error approving request:', err);
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setApprovingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestId);
        return updated;
      });
    }
  }, [session?.user?.token, fetchPendingRequests]);
=======
  // State: ลบ state ที่เกี่ยวข้องกับการโต้ตอบของผู้ใช้ออก
  // const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null); // ลบออก
  // const [selectedDate, setSelectedDate] = useState<string | null>(null); // ลบออก
>>>>>>> seen2

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
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // ฟังก์ชันสำหรับดึงข้อมูล
  // ลบ dependency ที่เกี่ยวกับการโต้ตอบของผู้ใช้ออก
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ดึงข้อมูล Summary
      const summaryRes = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
      if (!summaryRes.ok) throw new Error(`HTTP error! status: ${summaryRes.status}`);
      const summaryData: SummaryData = await summaryRes.json();
      setSummary(summaryData);

      // ดึงข้อมูล Network Distribution
      const networkRes = await fetch(`${API_BASE_URL}/api/dashboard/network-distribution`);
      if (!networkRes.ok) throw new Error(`HTTP error! status: ${networkRes.status}`);
      const networkData: NetworkData[] = await networkRes.json();
      setNetworks(networkData);

      // ดึงข้อมูล Daily New Cases
      const dailyRes = await fetch(`${API_BASE_URL}/api/dashboard/daily-new-cases`);
      if (!dailyRes.ok) throw new Error(`HTTP error! status: ${dailyRes.status}`);
      const dailyData: DailyNewCasesData = await dailyRes.json();
      setDailyNewCasesData(dailyData);

      // ดึงข้อมูล Cases (ไม่มี filter จาก UI แล้ว)
      // ลบ params.append สำหรับ selected_network, statusFilter, highValueFilter, overdueFilter ออกทั้งหมด
      const casesRes = await fetch(`${API_BASE_URL}/api/dashboard/cases`);
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
  // console.log("dailyNewCasesData", dailyNewCasesData);
  // console.log("Bar chart data", dailyNewCasesChartData);
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
<<<<<<< HEAD
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="text-blue-400 text-2xl mr-3">💰</div>
              <div>
                <p className="text-sm text-blue-800 font-medium">ความเสียหายรวม</p>
                <p className="text-2xl font-bold text-blue-900">{dailyLoss.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg cursor-pointer hover:bg-green-100"
            onClick={() => setStatusFilter(statusFilter === "data_received" ? "all" : "data_received")}
          >
            <div className="flex items-center">
              <div className="text-green-400 text-2xl mr-3">✅</div>
              <div>
                <p className="text-sm text-green-800 font-medium">ได้รับข้อมูลแล้ว</p>
                <p className="text-2xl font-bold text-green-900">{totalReceived}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div 
            className="bg-white rounded-xl shadow-md p-6 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => setStatusFilter(statusFilter === "all" ? "all" : "all")}
          >
            <div className="text-blue-500 text-3xl mb-2">📊</div>
            <div className="text-sm font-medium text-gray-600 mb-1">เคสทั้งหมด</div>
            <div className="text-2xl font-bold text-gray-900">{totalCases}</div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-md p-6 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => setStatusFilter(statusFilter === "waiting_approval" ? "all" : "waiting_approval")}
          >
            <div className="text-yellow-500 text-3xl mb-2">⏳</div>
            <div className="text-sm font-medium text-gray-600 mb-1">รออนุมัติ</div>
            <div className="text-2xl font-bold text-gray-900">{totalWaiting}</div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-md p-6 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => setStatusFilter(statusFilter === "sent_to_nbtc" ? "all" : "sent_to_nbtc")}
          >
            <div className="text-blue-500 text-3xl mb-2">📤</div>
            <div className="text-sm font-medium text-gray-600 mb-1">ส่งไป กสทช.</div>
            <div className="text-2xl font-bold text-gray-900">{totalSent}</div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-md p-6 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => setHighValueFilter(!highValueFilter)}
          >
            <div className="text-red-500 text-3xl mb-2">🚨</div>
            <div className="text-sm font-medium text-gray-600 mb-1">เคสมูลค่าสูง</div>
            <div className="text-2xl font-bold text-gray-900">{highValueCases}</div>
            <div className="text-xs text-gray-500">≥ 10,000 บาท</div>
          </div>
        </div>

        {/* Admin Approval Section */}
        {session?.user?.role === 'admin' && (
          <div className="mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Clock className="h-6 w-6 mr-2 text-orange-500" />
                  คำขอรออนุมัติ
                </h2>
                <button
                  onClick={fetchPendingRequests}
                  disabled={isLoadingRequests}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {isLoadingRequests ? 'กำลังโหลด...' : 'รีเฟรช'}
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>ไม่มีคำขอรออนุมัติ</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests
                    .filter(req => !req.is_approved)
                    .map((request) => (
                    <div key={request.request_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Request ID: {request.request_id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            สร้างเมื่อ: {new Date(request.created_at).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleApproveRequest(request.request_id)}
                          disabled={approvingRequests.has(request.request_id)}
                          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          {approvingRequests.has(request.request_id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              กำลังอนุมัติ...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              อนุมัติ
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          รายการผู้ส่ง ({request.senders.length} รายการ):
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {request.senders.slice(0, 6).map((sender, index) => (
                            <div key={index} className="bg-white rounded p-2 text-xs">
                              <div className="font-medium text-gray-900">
                                {sender.sender_name}
                              </div>
                              <div className="text-gray-600">
                                {sender.phone_number}
                              </div>
                              <div className="text-gray-500">
                                {sender.mobile_provider}
                              </div>
                            </div>
                          ))}
                          {request.senders.length > 6 && (
                            <div className="bg-gray-100 rounded p-2 text-xs text-center text-gray-600 flex items-center justify-center">
                              +{request.senders.length - 6} รายการ
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              การแจกแจงตามเครือข่าย {selectedNetwork && `(${selectedNetwork})`}
            </h2>
            <div className="h-64">
              <Pie data={networkDistribution} options={pieOptions} />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">คลิกเพื่อกรองข้อมูล</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">เคสใหม่ต่อวัน</h2>
            <div className="h-64">
              <Bar data={dailyNewCases} options={barOptions} />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">คลิกเพื่อกรองตามวัน</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">แนวโน้มความเสียหาย</h2>
            <div className="h-64">
              <Line data={lossHistory} options={lineOptions} />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">คลิกเพื่อกรองตามวันที่</p>
          </div>
        </div>
=======
          </>
        )}
>>>>>>> seen2
      </div>
    </MantineProvider>
  );
}