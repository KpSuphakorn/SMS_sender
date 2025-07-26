"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
} from "chart.js";
import { DatePickerInput } from '@mantine/dates';
import { MantineProvider } from '@mantine/core';
import { CheckCircle, Clock, AlertCircle, Download } from "lucide-react";
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

// Import API functions
import getPendingRequests from "@/libs/getPendingRequests";
import approveRequest from "@/libs/approveRequest";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, LineElement, PointElement);

interface CaseData {
  senderName: string;
  caseId?: string;
  network: string;
  status: string;
  reportDate: string;
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

export default function Dashboard() {
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

  const handleDateRangeChange = (value: [string | null, string | null]) => {
    const convertedRange: [Date | null, Date | null] = [
      value[0] ? new Date(value[0]) : null,
      value[1] ? new Date(value[1]) : null
    ];
    setDateRange(convertedRange);
    setSelectedDate(null); // Clear specific date filter when date range changes
  };

  // Mock data with more realistic cases
  const cases: CaseData[] = [
    { 
      senderName: "0812345678", 
      caseId: "CASE112", 
      network: "AIS", 
      status: "waiting_approval", 
      reportDate: "2025-06-24", 
      amount: 5000,
      assignedTo: "นาย ก",
      isRecurring: true
    },
    { 
      senderName: "0891234567", 
      network: "DTAC", 
      status: "sent_to_nbtc", 
      reportDate: "2025-06-24", 
      amount: 3000,
      assignedTo: "นาง ข",
      approvedBy: "ผบ.สมชาย"
    },
    { 
      senderName: "0801234567", 
      caseId: "CASE115", 
      network: "TRUE", 
      status: "data_received", 
      reportDate: "2025-06-23", 
      amount: 8000,
      assignedTo: "นาย ค",
      approvedBy: "ผบ.สมชาย"
    },
    { 
      senderName: "0812345678", 
      caseId: "CASE112", 
      network: "AIS", 
      status: "sent_to_nbtc", 
      reportDate: "2025-06-22", 
      amount: 12000,
      assignedTo: "นาย ก",
      approvedBy: "ผบ.สมชาย",
      isRecurring: true
    },
    { 
      senderName: "0876543210", 
      network: "TRUE", 
      status: "waiting_approval", 
      reportDate: "2025-06-25", 
      amount: 15000,
      assignedTo: "นาง ง"
    },
    { 
      senderName: "0898765432", 
      caseId: "CASE118", 
      network: "DTAC", 
      status: "data_received", 
      reportDate: "2025-06-21", 
      amount: 7500,
      assignedTo: "นาย จ",
      approvedBy: "ผบ.วิชาญ"
    }
  ];

  const networks: NetworkData[] = [
    { name: "AIS", totalCases: 150, waitingApproval: 45, sentToNbtc: 23, dataReceived: 70, avgResponseTime: 3.2 },
    { name: "DTAC", totalCases: 120, waitingApproval: 35, sentToNbtc: 18, dataReceived: 59, avgResponseTime: 4.1 },
    { name: "TRUE", totalCases: 130, waitingApproval: 40, sentToNbtc: 20, dataReceived: 60, avgResponseTime: 2.8 },
  ];

  // Filter cases based on all criteria
  const filteredCases = cases.filter(case_ => {
    const caseDate = new Date(case_.reportDate);
    const [fromDate, toDate] = dateRange;
    
    const dateMatch = selectedDate 
      ? case_.reportDate === selectedDate
      : fromDate && toDate 
      ? caseDate >= fromDate && caseDate <= toDate 
      : true;
    
    const networkMatch = selectedNetwork ? case_.network === selectedNetwork : true;
    const statusMatch = statusFilter === "all" ? true : case_.status === statusFilter;
    const highValueMatch = highValueFilter ? case_.amount >= 10000 : true;
    
    const overdueMatch = overdueFilter 
      ? (overdueFilter === "waiting_3days" && case_.status === "waiting_approval" && 
         new Date().getTime() - new Date(case_.reportDate).getTime() > 3 * 24 * 60 * 60 * 1000) ||
        (overdueFilter === "sent_7days" && case_.status === "sent_to_nbtc" && 
         new Date().getTime() - new Date(case_.reportDate).getTime() > 7 * 24 * 60 * 60 * 1000)
      : true;

    return dateMatch && networkMatch && statusMatch && highValueMatch && overdueMatch;
  });

  // Calculate totals from filtered data
  const totalCases = filteredCases.length;
  const totalWaiting = filteredCases.filter(c => c.status === 'waiting_approval').length;
  const totalSent = filteredCases.filter(c => c.status === 'sent_to_nbtc').length;
  const totalReceived = filteredCases.filter(c => c.status === 'data_received').length;
  const highValueCases = filteredCases.filter(c => c.amount >= 10000).length;
  const dailyLoss = filteredCases.reduce((sum, c) => sum + c.amount, 0);

  // Export function
  const exportReport = () => {
    const [fromDate, toDate] = dateRange;
    const fromStr = fromDate?.toISOString().split('T')[0] || 'start';
    const toStr = toDate?.toISOString().split('T')[0] || 'end';
    
    const csvContent = [
      ["Sender Name", "Case ID", "Network", "Status", "Amount", "Report Date", "Assigned To", "Approved By"].join(","),
      ...filteredCases.map(case_ => [
        case_.senderName,
        case_.caseId || "ไม่มี Case ID",
        case_.network,
        getStatusText(case_.status),
        case_.amount,
        case_.reportDate,
        case_.assignedTo || "-",
        case_.approvedBy || "-"
      ].join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${fromStr}_to_${toStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'waiting_approval': return 'รออนุมัติ';
      case 'sent_to_nbtc': return 'ส่งไป กสทช. แล้ว';
      case 'data_received': return 'ได้รับข้อมูลจาก กสทช.';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'waiting_approval': return 'bg-yellow-100 text-yellow-800';
      case 'sent_to_nbtc': return 'bg-blue-100 text-blue-800';
      case 'data_received': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Chart data
  const filteredNetworks = selectedNetwork ? networks.filter(n => n.name === selectedNetwork) : networks;
  
  const getNetworkColors = (networks: NetworkData[]) => {
    return networks.map(n => {
      if (n.name === 'AIS') return "#4B5EFC";
      if (n.name === 'DTAC') return "#10B981";
      if (n.name === 'TRUE') return "#F59E0B";
      return "#EF4444";
    });
  };
  
  const networkDistribution = {
    labels: filteredNetworks.map(n => n.name),
    datasets: [{
      data: filteredNetworks.map(n => n.totalCases),
      backgroundColor: getNetworkColors(filteredNetworks),
      borderColor: "#FFFFFF",
      borderWidth: 2,
    }],
  };

  const dailyNewCases = {
    labels: ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"],
    datasets: [{
      label: "เคสใหม่",
      data: [45, 52, 48, 61, 55, 67, 58],
      backgroundColor: "#4B5EFC",
      borderRadius: 6,
    }],
  };

  const lossHistory = {
    labels: ["มิ.ย. 18", "มิ.ย. 19", "มิ.ย. 20", "มิ.ย. 21", "มิ.ย. 22", "มิ.ย. 23", "มิ.ย. 24"],
    datasets: [{
      label: "ความเสียหาย (บาท)",
      data: [280000, 320000, 310000, 340000, 330000, 360000, 350000],
      borderColor: "#EF4444",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      tension: 0.4,
      fill: true,
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

  const pieOptions = {
    ...chartOptions,
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const networkName = filteredNetworks[index]?.name;
        setSelectedNetwork(selectedNetwork === networkName ? null : networkName);
      }
    },
  };

  const barOptions = {
    ...chartOptions,
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const dayOffset = index; // Assuming Monday (จ) is 0 days from start of week
        const startDate = new Date(dateRange[0] || new Date());
        const selected = new Date(startDate);
        selected.setDate(startDate.getDate() + dayOffset);
        setSelectedDate(selected.toISOString().split('T')[0]);
      }
    },
  };

  const lineOptions = {
    ...chartOptions,
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const dateLabel = lossHistory.labels[index]; // e.g., "มิ.ย. 24"
        const day = parseInt(dateLabel.split(" ")[1]);
        const selected = new Date(2025, 5, day); // June 2025
        setSelectedDate(selected.toISOString().split('T')[0]);
      }
    },
  };

  // Reset all filters
  const resetFilters = () => {
    setDateRange([new Date(), new Date()]);
    setStatusFilter("all");
    setSelectedNetwork(null);
    setSelectedDate(null);
    setHighValueFilter(false);
    setOverdueFilter(null);
  };

  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">DASHBOARD</h1>
            {selectedNetwork && (
              <p className="text-lg text-gray-600 mt-2">
                แสดงข้อมูล: {selectedNetwork} 
                <button 
                  onClick={() => setSelectedNetwork(null)}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  (ดูทั้งหมด)
                </button>
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={exportReport}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2"
            >
              📊 Export Report
            </button>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg">
              ดูรายละเอียดเคส
            </button>
            <button className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-lg">
              อนุมัติคำขอ ({totalWaiting})
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">ตัวกรองข้อมูล</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col">
              <label className={`block text-sm font-medium mb-2 ${dateRange[0] && dateRange[1] ? 'text-blue-600' : 'text-gray-700'}`}>
                ช่วงเวลา
              </label>
              <DatePickerInput
                type="range"
                value={[
                  dateRange[0] ? dateRange[0].toISOString().split('T')[0] : null,
                  dateRange[1] ? dateRange[1].toISOString().split('T')[0] : null
                ]}
                onChange={handleDateRangeChange}
                placeholder="เลือกช่วงวันที่"
                valueFormat="DD/MM/YYYY"
                size="md"
                radius="md"
                styles={{
                  input: {
                    border: `1px solid ${dateRange[0] && dateRange[1] ? '#3b82f6' : '#d1d5db'}`,
                    backgroundColor: dateRange[0] && dateRange[1] ? '#eff6ff' : '#ffffff',
                    height: '44px',
                    '&:focus': {
                      borderColor: '#3b82f6',
                      boxShadow: '0 0 0 1px #3b82f6'
                    }
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <label className={`block text-sm font-medium mb-2 ${statusFilter !== 'all' ? 'text-blue-600' : 'text-gray-700'}`}>
                สถานะ
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full px-3 py-2 h-[44px] border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                  statusFilter !== 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                }`}
              >
                <option value="all">ทั้งหมด</option>
                <option value="waiting_approval">รออนุมัติ</option>
                <option value="sent_to_nbtc">ส่งไป กสทช. แล้ว</option>
                <option value="data_received">ได้รับข้อมูลแล้ว</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className={`block text-sm font-medium mb-2 ${selectedNetwork ? 'text-blue-600' : 'text-gray-700'}`}>
                เครือข่าย
              </label>
              <select
                value={selectedNetwork || "all"}
                onChange={(e) => setSelectedNetwork(e.target.value === "all" ? null : e.target.value)}
                className={`w-full px-3 py-2 h-[44px] border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                  selectedNetwork ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                }`}
              >
                <option value="all">ทั้งหมด</option>
                <option value="AIS">AIS</option>
                <option value="DTAC">DTAC</option>
                <option value="TRUE">TRUE</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2"> </label>
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 h-[44px] bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                รีเซ็ตตัวกรอง
              </button>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">พบข้อมูล:</span>
                <span className="font-semibold text-blue-600">{filteredCases.length} รายการ</span>
              </div>
              {dateRange[0] && dateRange[1] && !selectedDate && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
                    ช่วงเวลา: {dateRange[0] instanceof Date ? dateRange[0].toLocaleDateString('th-TH') : dateRange[0]} - {dateRange[1] instanceof Date ? dateRange[1].toLocaleDateString('th-TH') : dateRange[1]}
                  </span>
                </div>
              )}
              {selectedDate && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
                    วันที่: {new Date(selectedDate).toLocaleDateString('th-TH')}
                  </span>
                </div>
              )}
              {selectedNetwork && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium">
                    เครือข่าย: {selectedNetwork}
                  </span>
                </div>
              )}
              {statusFilter !== "all" && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
                    สถานะ: {getStatusText(statusFilter)}
                  </span>
                </div>
              )}
              {highValueFilter && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md font-medium">
                    มูลค่า: ≥ 10,000 บาท
                  </span>
                </div>
              )}
              {overdueFilter && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                    สถานะล่าช้า: {overdueFilter === "waiting_3days" ? "รออนุมัติเกิน 3 วัน" : "ส่ง กสทช. เกิน 7 วัน"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div 
            className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg cursor-pointer hover:bg-red-100"
            onClick={() => setOverdueFilter(overdueFilter === "waiting_3days" ? null : "waiting_3days")}
          >
            <div className="flex items-center">
              <div className="text-red-400 text-2xl mr-3">⚠️</div>
              <div>
                <p className="text-sm text-red-800 font-medium">รออนุมัติเกิน 3 วัน</p>
                <p className="text-2xl font-bold text-red-900">
                  {filteredCases.filter(c => c.status === 'waiting_approval' && 
                    new Date().getTime() - new Date(c.reportDate).getTime() > 3 * 24 * 60 * 60 * 1000).length}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg cursor-pointer hover:bg-yellow-100"
            onClick={() => setOverdueFilter(overdueFilter === "sent_7days" ? null : "sent_7days")}
          >
            <div className="flex items-center">
              <div className="text-yellow-400 text-2xl mr-3">📤</div>
              <div>
                <p className="text-sm text-yellow-800 font-medium">ส่ง กสทช. เกิน 7 วัน</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {filteredCases.filter(c => c.status === 'sent_to_nbtc' && 
                    new Date().getTime() - new Date(c.reportDate).getTime() > 7 * 24 * 60 * 60 * 1000).length}
                </p>
              </div>
            </div>
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
      </div>
    </MantineProvider>
  );
}