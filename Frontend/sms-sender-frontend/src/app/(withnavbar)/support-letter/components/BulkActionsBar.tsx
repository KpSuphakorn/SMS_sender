import { CheckCircle, Filter } from "lucide-react";

interface BulkActionsBarProps {
  allFilteredSelected: boolean;
  selected: string[];
  filteredBooks: any[];
  totalBooks: number;
  onSelectAll: () => void;
  onApprove: () => void;
}

export const BulkActionsBar = ({
  allFilteredSelected,
  selected,
  filteredBooks,
  totalBooks,
  onSelectAll,
  onApprove
}: BulkActionsBarProps) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <button
          onClick={onSelectAll}
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
            {filteredBooks.length !== totalBooks && (
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
        onClick={onApprove}
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
);
