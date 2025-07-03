import { Calendar, XCircle, CheckCircle } from "lucide-react";
import { Book } from '../types';
import { TELCO_COLORS } from '../constants';
import { formatDate, getProgressPercentage } from '../utils';

interface CaseModalProps {
  book: Book | null;
  onClose: () => void;
}

export const CaseModal = ({ book, onClose }: CaseModalProps) => {
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
