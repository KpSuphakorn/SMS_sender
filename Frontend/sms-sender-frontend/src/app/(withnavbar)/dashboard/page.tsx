"use client"

import { useState } from "react";
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

interface NetworkData {
  name: string;
  totalCases: number;
  waitingApproval: number;
  sentToNbtc: number;
  dataReceived: number;
  avgResponseTime: number;
}

export default function FraudDashboard() {
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("2025-06-20");
  const [dateTo, setDateTo] = useState("2025-06-30");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  // Filter cases based on date range and status
  const filteredCases = cases.filter(case_ => {
    const caseDate = new Date(case_.reportDate);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    const dateMatch = caseDate >= fromDate && caseDate <= toDate;
    const networkMatch = selectedNetwork ? case_.network === selectedNetwork : true;
    const statusMatch = statusFilter === "all" ? true : case_.status === statusFilter;
    
    return dateMatch && networkMatch && statusMatch;
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
    link.setAttribute("download", `fraud_report_${dateFrom}_to_${dateTo}.csv`);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">FRAUD DASHBOARD</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่เริ่มต้น</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่สิ้นสุด</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="waiting_approval">รออนุมัติ</option>
              <option value="sent_to_nbtc">ส่งไป กสทช. แล้ว</option>
              <option value="data_received">ได้รับข้อมูลแล้ว</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFrom("2025-06-20");
                setDateTo("2025-06-30");
                setStatusFilter("all");
                setSelectedNetwork(null);
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              รีเซ็ตตัวกรอง
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          พบข้อมูล: {filteredCases.length} รายการ
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
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

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
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

        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
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
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-blue-500 text-3xl mb-2">📊</div>
          <div className="text-sm font-medium text-gray-600 mb-1">เคสทั้งหมด</div>
          <div className="text-2xl font-bold text-gray-900">{totalCases}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-yellow-500 text-3xl mb-2">⏳</div>
          <div className="text-sm font-medium text-gray-600 mb-1">รออนุมัติ</div>
          <div className="text-2xl font-bold text-gray-900">{totalWaiting}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-blue-500 text-3xl mb-2">📤</div>
          <div className="text-sm font-medium text-gray-600 mb-1">ส่งไป กสทช.</div>
          <div className="text-2xl font-bold text-gray-900">{totalSent}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="text-red-500 text-3xl mb-2">🚨</div>
          <div className="text-sm font-medium text-gray-600 mb-1">เคสมูลค่าสูง</div>
          <div className="text-2xl font-bold text-gray-900">{highValueCases}</div>
          <div className="text-xs text-gray-500">≥ 10,000 บาท</div>
        </div>
      </div>

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
            <Bar data={dailyNewCases} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">แนวโน้มความเสียหาย</h2>
          <div className="h-64">
            <Line data={lossHistory} options={chartOptions} />
          </div>
        </div>
      </div>


    </div>
  );
}