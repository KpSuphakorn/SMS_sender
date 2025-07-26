import { useState } from "react";
import { Calendar, Users, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Book } from '../types';
import { STATUS_COLORS, STATUS_LABELS, TELCO_COLORS } from '../constants';
import { formatDate, getProgressPercentage } from '../utils';

interface BookCardProps {
  book: Book;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
}

export const BookCard = ({
  book,
  isSelected,
  onToggleSelect,
  onViewDetails
}: BookCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const overallProgress = book.cases.length > 0 
    ? book.cases.reduce((acc, c) => acc + getProgressPercentage(c.statuses), 0) / book.cases.length 
    : 0;

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
        book.is_response_submitted 
          ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-green-200" 
          : isSelected 
            ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-blue-200" 
            : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Response Submitted Banner */}
      {book.is_response_submitted && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center py-2 rounded-t-xl">
          <div className="font-semibold text-sm">
            ✅ ได้รับการตอบกลับจากผู้ให้บริการแล้ว - ไม่สามารถอนุมัติซ้ำได้
          </div>
        </div>
      )}
      
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
                disabled={book.is_response_submitted} // Disable selection if response submitted
                className={`w-6 h-6 cursor-pointer rounded-lg ${
                  book.is_response_submitted 
                    ? "accent-gray-400 cursor-not-allowed opacity-50" 
                    : "accent-blue-500"
                }`}
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
