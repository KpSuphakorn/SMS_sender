"use client";
import { useState } from "react";
import { Calendar, Users, Phone, CheckCircle, XCircle, Eye, Filter, Search, Bell } from "lucide-react";

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
  AIS: 'bg-green-100 text-green-800',
  TRUE: 'bg-red-100 text-red-800',
  DTAC: 'bg-blue-100 text-blue-800',
  NT: 'bg-purple-100 text-purple-800',
  Other: 'bg-gray-100 text-gray-800'
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
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `book-${i + 1}`,
    date: "12-12-25",
    senderCount: 10,
    ais: 2,
    trueDtac: 4,
    nt: 2,
    other: 2,
    status: i % 4 === 0 ? 'urgent' : i % 3 === 0 ? 'processing' : i % 2 === 0 ? 'completed' : 'pending',
          cases: Array.from({ length: 3 }).map((_, j) => ({
        id: `0x12344${i}${j}`,
        date: "12-12-25",
        sender: "Sender name",
        telco: "AIS" as TelcoType,
        actualTelco: "TRUE" as TelcoType,
        statuses: [
          { label: "ขอข้อมูลแล้ว", done: true },
          { label: "ได้รับข้อมูลแล้ว", done: j % 2 === 0 },
          { label: "ขอระงับแล้ว", done: j % 3 === 0 },
          { label: "ระงับแล้ว", done: false },
        ],
        details: `รายละเอียดของเคส ${j + 1} ...`,
      })),
  }));
};

// Utility functions
const getProgressPercentage = (statuses: Status[]): number => {
  const completed = statuses.filter(s => s.done).length;
  return (completed / statuses.length) * 100;
};

// Components
const Header = ({ bookCount }: { bookCount: number }) => (
  <div className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">รออนุมัติ</h1>
            <p className="text-gray-600">จัดการหนังสือขออนุมัติ</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 px-4 py-2 rounded-full">
            <span className="text-blue-800 font-semibold">{bookCount} รายการ</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SearchAndFilters = ({
  searchTerm,
  setSearchTerm,
  filterOpen,
  setFilterOpen,
  fromDate,
  setFromDate,
  toDate,
  setToDate
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterOpen: boolean;
  setFilterOpen: (value: boolean) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
}) => (
  <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ค้นหาหนังสือ..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>ตัวกรอง</span>
        </button>
      </div>
      
      {filterOpen && (
        <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium">ช่วงวันที่:</span>
          </div>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <span className="text-gray-500">ถึง</span>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>
      )}
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
}) => (
  <div
    className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
    }`}
  >
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[book.status]}`}></div>
            <span className="text-sm font-medium text-gray-600">{STATUS_LABELS[book.status]}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-xl font-bold text-gray-900">{book.date}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onViewDetails}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>ดูรายละเอียด</span>
          </button>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-5 h-5 accent-blue-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{book.senderCount}</div>
          <div className="text-sm text-gray-600">Sender</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{book.ais}</div>
          <div className="text-sm text-green-700">AIS</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{book.trueDtac}</div>
          <div className="text-sm text-red-700">TRUE/DTAC</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{book.nt}</div>
          <div className="text-sm text-purple-700">NT</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{book.other}</div>
          <div className="text-sm text-gray-700">Other</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Case ID: <span className="font-mono">{book.id}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600">ความคืบหน้าโดยรวม:</div>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage(book.cases[0]?.statuses || [])}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(getProgressPercentage(book.cases[0]?.statuses || []))}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CaseModal = ({
  book,
  onClose
}: {
  book: Book | null;
  onClose: () => void;
}) => {
  if (!book) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">รายการเคสในหนังสือ</h2>
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={onClose}
          >
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div className="grid gap-4">
            {book.cases.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-bold text-gray-900">{c.date}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${TELCO_COLORS[c.telco]}`}>
                      {c.telco}
                    </span>
                    <span className="text-sm text-gray-600">→</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${TELCO_COLORS[c.actualTelco]}`}>
                      {c.actualTelco}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 font-mono">{c.id}</div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-gray-700">สถานะการดำเนินการ</div>
                    <div className="text-sm text-gray-500">
                      {c.statuses.filter(s => s.done).length} / {c.statuses.length} ขั้นตอน
                    </div>
                  </div>
                  <div className="space-y-3">
                    {c.statuses.map((s, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {s.done ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${s.done ? 'text-green-700' : 'text-gray-500'}`}>
                            {s.label}
                          </div>
                        </div>
                        {s.done && (
                          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            เสร็จแล้ว
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">ความคืบหน้า</div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              getProgressPercentage(c.statuses) === 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${getProgressPercentage(c.statuses)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {Math.round(getProgressPercentage(c.statuses))}%
                        </span>
                      </div>
                    </div>
                  </div>
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
  const [filterOpen, setFilterOpen] = useState(false);

  const handleCheck = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filteredBookIds = filteredBooks.map(book => book.id);
    const allFilteredSelected = filteredBookIds.every(id => selected.includes(id));
    
    if (allFilteredSelected) {
      // Deselect all filtered items
      setSelected(prev => prev.filter(id => !filteredBookIds.includes(id)));
    } else {
      // Select all filtered items (keep existing selections)
      setSelected(prev => [...new Set([...prev, ...filteredBookIds])]);
    }
  };

  const handleApprove = () => {
    alert("Selected book IDs: " + selected.join(", "));
  };

  const filteredBooks = books.filter(book => 
    book.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.date.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header bookCount={books.length} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <SearchAndFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
        />

        {/* Select All and Bulk Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{selected.length === filteredBooks.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}</span>
              </button>
              {selected.length > 0 && (
                <span className="text-sm text-gray-600">
                  เลือกแล้ว {selected.length} จาก {filteredBooks.length} รายการ
                </span>
              )}
            </div>
            {selected.length > 0 && (
              <button
                onClick={handleApprove}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                อนุมัติ ({selected.length})
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6">
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
      </div>

      <CaseModal book={modalBook} onClose={() => setModalBook(null)} />
    </div>
  );
}