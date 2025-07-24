"use client";

import { useState } from "react";
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

export default function Dashboard() {
  // State
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [highValueFilter, setHighValueFilter] = useState<boolean>(false);
  const [overdueFilter, setOverdueFilter] = useState<"waiting_3days" | "sent_7days" | null>(null);

  // Data
  const cases: CaseData[] = [
    { senderName: "0812345678", caseId: "CASE112", network: "AIS", status: "waiting_approval", reportDate: "2025-06-24", amount: 5000, assignedTo: "นาย ก", isRecurring: true },
    { senderName: "0891234567", network: "DTAC", status: "sent_to_nbtc", reportDate: "2025-06-24", amount: 3000, assignedTo: "นาง ข", approvedBy: "ผบ.สมชาย" },
    { senderName: "0801234567", caseId: "CASE115", network: "TRUE", status: "data_received", reportDate: "2025-06-23", amount: 8000, assignedTo: "นาย ค", approvedBy: "ผบ.สมชาย" },
    { senderName: "0812345678", caseId: "CASE112", network: "AIS", status: "sent_to_nbtc", reportDate: "2025-06-22", amount: 12000, assignedTo: "นาย ก", approvedBy: "ผบ.สมชาย", isRecurring: true },
    { senderName: "0876543210", network: "TRUE", status: "waiting_approval", reportDate: "2025-06-25", amount: 15000, assignedTo: "นาง ง" },
    { senderName: "0898765432", caseId: "CASE118", network: "DTAC", status: "data_received", reportDate: "2025-06-21", amount: 7500, assignedTo: "นาย จ", approvedBy: "ผบ.วิชาญ" }
  ];

  const networks: NetworkData[] = [
    { name: "AIS", totalCases: 150, waitingApproval: 45, sentToNbtc: 23, dataReceived: 70, avgResponseTime: 3.2 },
    { name: "DTAC", totalCases: 120, waitingApproval: 35, sentToNbtc: 18, dataReceived: 59, avgResponseTime: 4.1 },
    { name: "TRUE", totalCases: 130, waitingApproval: 40, sentToNbtc: 20, dataReceived: 60, avgResponseTime: 2.8 },
  ];

  // Filter logic
  const filteredCases = cases.filter(case_ => {
    const caseDate = new Date(case_.reportDate);
    const networkMatch = selectedNetwork ? case_.network === selectedNetwork : true;
    const statusMatch = statusFilter === "all" ? true : case_.status === statusFilter;
    const highValueMatch = highValueFilter ? case_.amount >= 10000 : true;
    const overdueMatch = overdueFilter
      ? (overdueFilter === "waiting_3days" && case_.status === "waiting_approval" &&
         new Date().getTime() - caseDate.getTime() > 3 * 24 * 60 * 60 * 1000) ||
        (overdueFilter === "sent_7days" && case_.status === "sent_to_nbtc" &&
         new Date().getTime() - caseDate.getTime() > 7 * 24 * 60 * 60 * 1000)
      : true;
    return networkMatch && statusMatch && highValueMatch && overdueMatch;
  });

  // Summary
  const totalCases = filteredCases.length;
  const totalWaiting = filteredCases.filter(c => c.status === 'waiting_approval').length;
  const totalSent = filteredCases.filter(c => c.status === 'sent_to_nbtc').length;
  const totalReceived = filteredCases.filter(c => c.status === 'data_received').length;
  const highValueCases = filteredCases.filter(c => c.amount >= 10000).length;
  const dailyLoss = filteredCases.reduce((sum, c) => sum + c.amount, 0);

  // Chart data
  const filteredNetworks = selectedNetwork ? networks.filter(n => n.name === selectedNetwork) : networks;
  const getNetworkColors = (nets: NetworkData[]) =>
    nets.map(n => n.name === 'AIS' ? "#4B5EFC" : n.name === 'DTAC' ? "#10B981" : n.name === 'TRUE' ? "#F59E0B" : "#EF4444");

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
        setSelectedDate(index.toString());
      }
    },
  };

  // UI
  return (
    <MantineProvider>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">DASHBOARD</h1>
            {selectedNetwork && (
              <p className="text-lg text-gray-600">
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
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border-l-4 border-blue-500 p-4 rounded-lg shadow flex flex-col items-center">
            <div className="text-blue-500 text-2xl mb-2">📊</div>
            <div className="text-sm text-gray-600 mb-1">เคสทั้งหมด</div>
            <div className="text-2xl font-bold text-gray-900">{totalCases}</div>
          </div>
          <div className="bg-white border-l-4 border-yellow-500 p-4 rounded-lg shadow flex flex-col items-center">
            <div className="text-yellow-500 text-2xl mb-2">⏳</div>
            <div className="text-sm text-gray-600 mb-1">รออนุมัติ</div>
            <div className="text-2xl font-bold text-gray-900">{totalWaiting}</div>
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
              การแจกแจงตามเครือข่าย {selectedNetwork && `(${selectedNetwork})`}
            </h2>
            <div className="h-64">
              <Pie data={networkDistribution} options={pieOptions} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">เคสใหม่ต่อวัน</h2>
            <div className="h-64">
              <Bar data={dailyNewCases} options={barOptions} />
            </div>
          </div>
        </div>
      </div>
    </MantineProvider>
  );
}