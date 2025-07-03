import { Search } from "lucide-react";

interface NoResultsProps {
  onClearFilters: () => void;
}

export const NoResults = ({ onClearFilters }: NoResultsProps) => (
  <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
    <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
      <Search className="w-12 h-12 text-gray-400" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบรายการที่ตรงกับเงื่อนไข</h3>
    <p className="text-gray-600 mb-6">ลองปรับเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง</p>
    <button
      onClick={onClearFilters}
      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
    >
      ล้างตัวกรอง
    </button>
  </div>
);
