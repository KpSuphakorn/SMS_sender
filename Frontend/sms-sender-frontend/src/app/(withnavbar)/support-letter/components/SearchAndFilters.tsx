import { Search } from "lucide-react";
import { DatePicker } from "../../../../libs/DatePicker";
import { DatesRangeValue } from '@mantine/dates';
import { Popover, Button } from '@mantine/core';
import { formatDateRange } from '../utils';

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  dateRange: DatesRangeValue;
  setDateRange: (value: DatesRangeValue) => void;
  popoverOpened: boolean;
  setPopoverOpened: (value: boolean) => void;
  totalBooks: number;
  filteredCount: number;
}

export const SearchAndFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
  popoverOpened,
  setPopoverOpened,
  totalBooks,
  filteredCount
}: SearchAndFiltersProps) => {
  const handleClearAll = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDateRange([null, null]);
    setPopoverOpened(false);
  };

  return (
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
          <Popover
            opened={popoverOpened}
            onChange={setPopoverOpened}
            position="bottom-start"
            withArrow
            shadow="md"
          >
            <Popover.Target>
              <Button
                variant="outline"
                onClick={() => setPopoverOpened(!popoverOpened)}
                size="md"
                color="blue"
                radius="md"
                className="w-full h-12"
              >
                {formatDateRange(dateRange)}
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <div className="p-2">
                <DatePicker
                  value={dateRange}
                  onChange={(value) => {
                    const newRange = value as DatesRangeValue;
                    setDateRange(newRange);
                    
                    // Only close popover if both dates are selected or if range is cleared
                    const [start, end] = newRange;
                    if ((start && end) || (!start && !end)) {
                      setPopoverOpened(false);
                    }
                  }}
                />
                {/* Show instruction text when only start date is selected */}
                {dateRange[0] && !dateRange[1] && (
                  <div className="text-sm text-blue-600 mt-2 text-center">
                    กรุณาเลือกวันที่สิ้นสุด
                  </div>
                )}
                {/* Manual close button if needed */}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setPopoverOpened(false)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </Popover.Dropdown>
          </Popover>
        </div>
      </div>

      {/* Clear All Filters Button */}
      {((dateRange[0] || dateRange[1]) || statusFilter || searchTerm) && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
};
