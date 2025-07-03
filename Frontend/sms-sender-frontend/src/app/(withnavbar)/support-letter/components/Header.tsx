import { Clock, CheckCircle, FileText } from "lucide-react";

interface HeaderProps {
  bookCount: number;
  selectedCount: number;
}

export const Header = ({ bookCount, selectedCount }: HeaderProps) => (
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
