"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileCheck,
  FileClock,
  AlertTriangle,
  BarChart3,
  Users,
  Calendar,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PieChart as RechartsPieChart,
  Tooltip,
} from "recharts"

// Card Components
const Card = ({ className = "", children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) => (
  <div className={`rounded-lg border bg-white text-gray-900 shadow-sm ${className}`} {...props}>
    {children}
  </div>
)

const CardHeader = ({ className = "", children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
)

const CardTitle = ({ className = "", children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
)

const CardDescription = ({ className = "", children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) => (
  <div className={`text-sm text-gray-500 ${className}`} {...props}>
    {children}
  </div>
)

const CardContent = ({ className = "", children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
)

// Badge Component
const Badge = ({ className = "", variant = "default", children, ...props }: { className?: string; variant?: "default" | "secondary"; children: React.ReactNode; [key: string]: any }) => {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

// Button Component
const Button = ({ className = "", variant = "default", size = "default", children, ...props }: { className?: string; variant?: "default" | "outline"; size?: "default" | "sm"; children: React.ReactNode; [key: string]: any }) => {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
  }

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  // Mock data - structured for easy MongoDB integration
  const [summary, setSummary] = useState({
    totalCases: 12345,
    totalLoss: 35000.4,
    monthlyLoss: 350.4,
    dailyLoss: 35.4,
    docsApproved: 154,
    docsPending: 154,
    growthRate: 2.1,
    lastUpdated: new Date().toISOString(),
  })

  // Chart data
  const revenueData = [
    { month: "Jan", cases: 186, lastWeek: 120 },
    { month: "Feb", cases: 305, lastWeek: 200 },
    { month: "Mar", cases: 237, lastWeek: 180 },
    { month: "Apr", cases: 173, lastWeek: 150 },
    { month: "May", cases: 209, lastWeek: 190 },
    { month: "Jun", cases: 314, lastWeek: 250 },
    { month: "Jul", cases: 290, lastWeek: 220 },
    { month: "Aug", cases: 425, lastWeek: 300 },
    { month: "Sep", cases: 380, lastWeek: 280 },
    { month: "Oct", cases: 456, lastWeek: 350 },
    { month: "Nov", cases: 398, lastWeek: 320 },
    { month: "Dec", cases: 520, lastWeek: 400 },
  ]

  const statusData = [
    { name: "ระงับแล้ว", value: 40, color: "#6366f1" },
    { name: "อยู่ระหว่างดำเนินการ", value: 32, color: "#a5b4fc" },
    { name: "รอดำเนินการ", value: 28, color: "#fbbf24" },
  ]

  const carrierData = [
    { name: "TRUE", percentage: 85, cases: 4200, color: "#f97316" },
    { name: "AIS", percentage: 85, cases: 3800, color: "#8b5cf6" },
    { name: "DTAC", percentage: 92, cases: 4345, color: "#06b6d4" },
  ]

  const statCards = [
    {
      title: "มูลค่าความเสียหายรวม",
      value: `$${summary.totalLoss.toLocaleString()}`,
      icon: DollarSign,
      trend: "up",
      trendValue: "12.5%",
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "ความเสียหายเดือนนี้",
      value: `$${summary.monthlyLoss.toLocaleString()}`,
      icon: TrendingUp,
      trend: "down",
      trendValue: "2.1%",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "ความเสียหายวันนี้",
      value: `$${summary.dailyLoss.toLocaleString()}`,
      icon: AlertTriangle,
      trend: "up",
      trendValue: "5.2%",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: "เอกสารที่รับรองแล้ว",
      value: summary.docsApproved.toLocaleString(),
      icon: FileCheck,
      trend: "up",
      trendValue: "8.1%",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "เอกสารรอรับรอง",
      value: summary.docsPending.toLocaleString(),
      icon: FileClock,
      trend: "down",
      trendValue: "3.2%",
      color: "text-red-600",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: "จำนวนเคสสะสม",
      value: summary.totalCases.toLocaleString(),
      icon: Users,
      trend: "up",
      trendValue: "15.3%",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Dashboard Overview</h1>
            <p className="text-slate-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last updated: {new Date().toLocaleDateString("th-TH")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">Refresh Data</Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <Badge variant={stat.trend === "up" ? "default" : "secondary"} className="text-xs">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {stat.trendValue}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl font-semibold">จำนวนเคส</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-green-600 bg-green-50">
                  <TrendingUp className="h-3 w-3 mr-1" />↑ 2.1% vs last week
                </Badge>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lastWeek" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl font-semibold">สถานะเคส</CardTitle>
              <CardDescription>การกระจายตัวของสถานะเคส</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{payload[0]?.payload?.name}</p>
                            <p className="text-sm text-slate-600">{payload[0]?.value}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => (
                      <span className="text-sm">
                        {value} ({entry?.payload?.value || 0}%)
                      </span>
                    )}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Carrier Analysis */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">เปอร์เซ็นต์ค่าย</CardTitle>
          <CardDescription>เปอร์เซ็นของเคส แยกตามค่าย</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {carrierData.map((carrier, index) => (
              <div key={index} className="text-center group">
                <div
                  className="relative mx-auto mb-4 rounded-full flex items-center justify-center text-white font-bold transition-transform duration-300 group-hover:scale-110 shadow-lg"
                  style={{
                    backgroundColor: carrier.color,
                    width: `${80 + carrier.percentage * 0.8}px`,
                    height: `${80 + carrier.percentage * 0.8}px`,
                  }}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold">{carrier.percentage}%</div>
                    <div className="text-xs opacity-90">{carrier.name}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">{carrier.cases.toLocaleString()} เคส</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}