"use client";
import { useState, useMemo } from "react";
import { Calendar, Users, Phone, CheckCircle, XCircle, Eye, Filter, Search, Bell, FileText, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// Types
interface Status {
  label: string;
  done: boolean;
}

type TelcoType = 'AIS' | 'TRUE' | 'DTAC' | 'NT' | 'Other';

interface Case {
  id: string;
  date: string;
  sender: string;
  telco: TelcoType;
  actualTelco: TelcoType;
  statuses: Status[];
  details: string;
}

interface Book {
  id: string;
  date: string;
  senderCount: number;
  ais: number;
  trueDtac: number;
  nt: number;
  other: number;
  status: 'urgent' | 'processing' | 'completed' | 'pending';
  cases: Case[];
}

// Constants
const TELCO_COLORS = {
  AIS: 'bg-green-100 text-green-800 border-green-200',
  TRUE: 'bg-red-100 text-red-800 border-red-200',
  DTAC: 'bg-blue-100 text-blue-800 border-blue-200',
  NT: 'bg-purple-100 text-purple-800 border-purple-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200'
} as const;

const STATUS_COLORS = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500', 
  completed: 'bg-green-500',
  urgent: 'bg-red-500'
} as const;

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  processing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
  urgent: 'เร่งด่วน'
} as const;

// Dummy data
const createDummyBooks = (): Book[] => {
  const dates = ["2025-01-15", "2025-01-20", "2025-01-22", "2025-02-01", "2025-02-05"];
  const senderNames = ["บริษัท ABC จำกัด", "หน่วยงาน XYZ", "องค์กร DEF", "บริษัท GHI จำกัด", "สำนักงาน JKL"];
  
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `BOOK-${String(i + 1).padStart(3, '0')}`,
    date: dates[i % dates.length],
    senderCount: Math.floor(Math.random() * 15) + 5,
    ais: Math.floor(Math.random() * 5) + 1,
    trueDtac: Math.floor(Math.random() * 6) + 2,
    nt: Math.floor(Math.random() * 4) + 1,
    other: Math.floor(Math.random() * 3) + 1,
    status: i % 4 === 0 ? 'urgent' : i % 3 === 0 ? 'processing' : i % 2 === 0 ? 'completed' : 'pending',
    cases: Array.from({ length: Math.floor(Math.random() * 5) + 2 }).map((_, j) => ({
      id: `CASE-${i + 1}${String(j + 1).padStart(2, '0')}`,
      date: dates[i % dates.length],
      sender: senderNames[j % senderNames.length],
      telco: ["AIS", "TRUE", "DTAC", "NT", "Other"][Math.floor(Math.random() * 5)] as TelcoType,
      actualTelco: ["AIS", "TRUE", "DTAC", "NT", "Other"][Math.floor(Math.random() * 5)] as TelcoType,
      statuses: [
        { label: "ขอข้อมูลแล้ว", done: true },
        { label: "ได้รับข้อมูลแล้ว", done: j % 2 === 0 },
        { label: "ขอระงับแล้ว", done: j % 3 === 0 },
        { label: "ระงับแล้ว", done: j > 2 },
      ],
      details: `รายละเอียดของเคส ${j + 1} สำหรับการขออนุมัติจาก ${senderNames[j % senderNames.length]}`,
    })),
  }));
};

// Utility functions
const getProgressPercentage = (statuses: Status[]): number => {
  const completed = statuses.filter(s => s.done).length;
  return (completed / statuses.length) * 100;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: '2-digit',
    month: '2-digit', 
    day: '2-digit'
  });
};

// Components
const Header = ({ bookCount, selectedCount }: { bookCount: number; selectedCount: number }) => (
  <div className="bg-white shadow-lg border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              ระบบจัดการหนังสือขออนุมัติ
            </h1>
            <p className="text-gray-600 mt-1">จัดการและติดตามสถานะหนังสือขออนุมัติ</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-semibold">{bookCount} รายการทั้งหมด</span>
            </div>
          </div>
          {selectedCount > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3 rounded-xl border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-semibold">{selectedCount} รายการที่เลือก</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const SearchAndFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  totalBooks,
  filteredCount
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  totalBooks: number;
  filteredCount: number;
}) => (
  <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center">
        <Search className="w-5 h-5 mr-2 text-blue-600" />
        ค้นหาและกรองข้อมูล
      </h2>
      <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
        แสดง {filteredCount} จาก {totalBooks} รายการ
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* Search Input */}
      <div className="lg:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            suppressHydrationWarning={true}
            type="text"
            placeholder="ค้นหาหมายเลขหนังสือ, วันที่, หรือชื่อผู้ส่ง..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        >
          <option value="">ทุกสถานะ</option>
          <option value="urgent">เร่งด่วน</option>
          <option value="processing">กำลังดำเนินการ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="completed">เสร็จสิ้น</option>
        </select>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ช่วงวันที่</label>
        <div className="space-y-2">
          <input
            type="date"
            placeholder="วันที่เริ่มต้น"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <input
            type="date"
            placeholder="วันที่สิ้นสุด"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  </div>
);

const BookCard = ({
  book,
  isSelected,
  onToggleSelect,
  onViewDetails
}: {
  book: Book;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const overallProgress = book.cases.length > 0 
    ? book.cases.reduce((acc, c) => acc + getProgressPercentage(c.statuses), 0) / book.cases.length 
    : 0;

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
        isSelected ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-blue-200" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[book.status]} shadow-sm`}></div>
              <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {STATUS_LABELS[book.status]}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span suppressHydrationWarning={true} className="text-xl font-bold">{formatDate(book.date)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onViewDetails}
              className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Eye className="w-4 h-4" />
              <span className="font-medium">ดูรายละเอียด</span>
            </button>
            <div className="relative">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="w-6 h-6 accent-blue-500 cursor-pointer rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Book ID */}
        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-1">หมายเลขหนังสือ</div>
          <div className="text-2xl font-bold text-gray-900 font-mono bg-gray-50 px-4 py-2 rounded-lg inline-block">
            {book.id}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
            <div className="flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900" suppressHydrationWarning={true}>{book.senderCount}</div>
            <div className="text-sm text-gray-600 font-medium">ผู้ส่ง</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
            <div className="text-2xl font-bold text-green-700" suppressHydrationWarning={true}>{book.ais}</div>
            <div className="text-sm text-green-700 font-medium">AIS</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 text-center border border-red-200">
            <div className="text-2xl font-bold text-red-700" suppressHydrationWarning={true}>{book.trueDtac}</div>
            <div className="text-sm text-red-700 font-medium">TRUE/DTAC</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
            <div className="text-2xl font-bold text-purple-700" suppressHydrationWarning={true}>{book.nt}</div>
            <div className="text-sm text-purple-700 font-medium">NT</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
            <div className="text-2xl font-bold text-gray-700" suppressHydrationWarning={true}>{book.other}</div>
            <div className="text-sm text-gray-700 font-medium">อื่นๆ</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">ความคืบหน้าโดยรวม</div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-gray-900" suppressHydrationWarning={true}>{Math.round(overallProgress)}%</span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div 
              suppressHydrationWarning={true}
              className={`h-3 rounded-full transition-all duration-500 ${
                overallProgress === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : 
                overallProgress > 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                'bg-gradient-to-r from-yellow-500 to-orange-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span suppressHydrationWarning={true}>{book.cases.filter(c => getProgressPercentage(c.statuses) === 100).length} เสร็จสิ้น</span>
            <span suppressHydrationWarning={true}>{book.cases.length} เคสทั้งหมด</span>
          </div>
        </div>

        {/* Expanded Cases Preview */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">เคสในหนังสือนี้ ({book.cases.length} เคส)</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {book.cases.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-600">{c.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${TELCO_COLORS[c.telco]}`}>
                      {c.telco}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${getProgressPercentage(c.statuses)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{Math.round(getProgressPercentage(c.statuses))}%</span>
                  </div>
                </div>
              ))}
              {book.cases.length > 3 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  และอีก {book.cases.length - 3} เคส...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CaseModal = ({
  book,
  onClose
}: {
  book: Book | null;
  onClose: () => void;
}) => {
  if (!book) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">รายละเอียดหนังสือ {book.id}</h2>
            <p className="text-gray-600 mt-1">จำนวน {book.cases.length} เคส • วันที่ {formatDate(book.date)}</p>
          </div>
          <button
            className="p-3 hover:bg-gray-100 rounded-full transition-colors"
            onClick={onClose}
          >
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div className="grid gap-6">
            {book.cases.map((c) => (
              <div key={c.id} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <span className="font-bold text-gray-900 text-lg">{formatDate(c.date)}</span>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border-2 ${TELCO_COLORS[c.telco]}`}>
                      {c.telco}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border-2 ${TELCO_COLORS[c.actualTelco]}`}>
                      {c.actualTelco}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-lg">{c.id}</div>
                </div>

                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-1">ผู้ส่ง</div>
                  <div className="text-lg font-semibold text-gray-900">{c.sender}</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-semibold text-gray-800">สถานะการดำเนินการ</div>
                    <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {c.statuses.filter(s => s.done).length} / {c.statuses.length} ขั้นตอน
                    </div>
                  </div>
                  <div className="space-y-4">
                    {c.statuses.map((s, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {s.done ? (
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`text-base font-medium ${s.done ? 'text-green-700' : 'text-gray-500'}`}>
                            {s.label}
                          </div>
                        </div>
                        {s.done && (
                          <div className="text-xs text-green-700 bg-green-100 px-3 py-1 rounded-full font-medium">
                            เสร็จแล้ว
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-700">ความคืบหน้า</div>
                      <span className="text-sm font-bold text-gray-900">
                        {Math.round(getProgressPercentage(c.statuses))}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getProgressPercentage(c.statuses) === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                        }`}
                        style={{ width: `${getProgressPercentage(c.statuses)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">รายละเอียดเพิ่มเติม</div>
                  <div className="text-gray-800">{c.details}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component
export default function SupportLetterPage() {
  const [books] = useState<Book[]>(createDummyBooks());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalBook, setModalBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Enhanced filtering logic
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        book.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.date.includes(searchTerm) ||
        book.cases.some(c => c.sender.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const statusMatch = statusFilter === "" || book.status === statusFilter;

      // Date range filter
      const bookDate = new Date(book.date);
      const fromDateMatch = fromDate === "" || bookDate >= new Date(fromDate);
      const toDateMatch = toDate === "" || bookDate <= new Date(toDate);

      return searchMatch && statusMatch && fromDateMatch && toDateMatch;
    });
  }, [books, searchTerm, statusFilter, fromDate, toDate]);

  const handleCheck = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filteredBookIds = filteredBooks.map(book => book.id);
    const allFilteredSelected = filteredBookIds.every(id => selected.includes(id));
    
    if (allFilteredSelected) {
      setSelected(prev => prev.filter(id => !filteredBookIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...filteredBookIds])]);
    }
  };

  const handleApprove = () => {
    if (selected.length === 0) return;
    alert(`กำลังดำเนินการอนุมัติหนังสือ:\n${selected.join('\n')}\n\nจำนวน: ${selected.length} รายการ`);
  };

  const allFilteredSelected = filteredBooks.length > 0 && filteredBooks.every(book => selected.includes(book.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header bookCount={books.length} selectedCount={selected.length} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <SearchAndFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          totalBooks={books.length}
          filteredCount={filteredBooks.length}
        />

        {/* Bulk Actions Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={handleSelectAll}
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  allFilteredSelected 
                    ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 hover:from-red-200 hover:to-red-300' 
                    : 'bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-700 hover:from-blue-200 hover:to-indigo-300'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>{allFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}</span>
              </button>
              
              {selected.length > 0 && (
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-xl border border-green-200">
                    <span className="text-green-800 font-semibold">
                      เลือกแล้ว {selected.length} จาก {filteredBooks.length} รายการ
                    </span>
                  </div>
                  {filteredBooks.length !== books.length && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-xl border border-yellow-200">
                      <span className="text-yellow-800 font-medium">
                        <Filter className="w-4 h-4 inline mr-1" />
                        กรองแล้ว
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button - Always visible */}
            <button
              onClick={handleApprove}
              disabled={selected.length === 0}
              className={`flex items-center space-x-3 px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                selected.length > 0
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-200 hover:shadow-green-300 transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-gray-200'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>อนุมัติหนังสือ</span>
              {selected.length > 0 && (
                <span className="bg-white/20 px-2 py-1 rounded-full text-sm">
                  {selected.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Results Summary */}
        {filteredBooks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบรายการที่ตรงกับเงื่อนไข</h3>
            <p className="text-gray-600 mb-6">ลองปรับเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setFromDate("");
                setToDate("");
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
            >
              ล้างตัวกรอง
            </button>
          </div>
        ) : (
          <div className="grid gap-8">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isSelected={selected.includes(book.id)}
                onToggleSelect={() => handleCheck(book.id)}
                onViewDetails={() => setModalBook(book)}
              />
            ))}
          </div>
        )}

        {/* Floating Action Button for Mobile */}
        {selected.length > 0 && (
          <div className="fixed bottom-6 right-6 md:hidden">
            <button
              onClick={handleApprove}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-full shadow-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-110"
            >
              <CheckCircle className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      <CaseModal book={modalBook} onClose={() => setModalBook(null)} />
    </div>
  );
}