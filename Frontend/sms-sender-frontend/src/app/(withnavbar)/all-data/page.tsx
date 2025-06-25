"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import getAvailableSenders from "@/libs/getAvailableSenders";
import { DatePicker } from "../../../libs/DatePicker";
import { DatesRangeValue } from "@mantine/dates";
import { Popover, Button } from '@mantine/core';

// Helper function to map API status to display status
const STATUS_ORDER = [
  { key: "pending", label: "ขอข้อมูลแล้ว" },
  { key: "received", label: "ได้รับข้อมูลแล้ว" },
  { key: "suspension_requested", label: "ขอระงับแล้ว" },
  { key: "suspended", label: "ระงับแล้ว" }
];

const mapStatusToDisplay = (statusArray: any[]) => {
  if (!Array.isArray(statusArray)) return STATUS_ORDER.map(s => ({ label: s.label, done: false }));
  
  // Handle both string array and object array formats
  const statusNames = statusArray.map(s => 
    typeof s === "string" ? s : s?.name
  ).filter(Boolean);

  const present = new Set(statusNames);

  return STATUS_ORDER.map(s => ({
    label: s.label,
    done: present.has(s.key)
  }));
};

// Helper function to check if a date is within range
const isDateInRange = (dateStr: string, startDate: any, endDate: any): boolean => {
  if (!startDate && !endDate) return true;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  
  // Convert start and end dates to proper Date objects
  const start = startDate ? (startDate instanceof Date ? startDate : new Date(startDate)) : null;
  const end = endDate ? (endDate instanceof Date ? endDate : new Date(endDate)) : null;
  
  // Check if converted dates are valid
  const isStartValid = start ? !isNaN(start.getTime()) : true;
  const isEndValid = end ? !isNaN(end.getTime()) : true;
  
  if (!isStartValid && !isEndValid) return true;
  
  if (start && end && isStartValid && isEndValid) {
    // Set time to start/end of day for proper comparison
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    
    return date >= startOfDay && date <= endOfDay;
  } else if (start && isStartValid) {
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    return date >= startOfDay;
  } else if (end && isEndValid) {
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    return date <= endOfDay;
  }
  
  return true;
};

// Helper function to format date range display
const formatDateRange = (dateRange: DatesRangeValue): string => {
  const [start, end] = dateRange;
  
  const format = (d: any): string => {
    if (!d) return "";
    
    // Handle different date formats
    let date: Date;
    if (d instanceof Date) {
      date = d;
    } else if (typeof d === 'string') {
      date = new Date(d);
    } else if (d && typeof d === 'object' && d.$date) {
      date = new Date(d.$date);
    } else {
      return "";
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) return "";
    
    return date.toLocaleDateString('th-TH');
  };

  if (!start && !end) return "เลือกช่วงวันที่";
  if (start && !end) return format(start);
  if (start && end) return `${format(start)} - ${format(end)}`;
  return "เลือกช่วงวันที่";
};

// API function to create request
const createRequest = async (data: any, tokens: string) => {
  const URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODRmYjFkY2ZmOTI3OWMwNGJiOTczYmEiLCJlbWFpbCI6InRoYW1AZ21haWwuY29tIiwibmFtZSI6IlRob3JudGhhbiBMZXJkaGlydW53b25nIiwicm9sZSI6InVzZXIiLCJleHAiOjE3NTM0MTE3MzR9.rvaYFb7UFy9zAIabdaShRstGSuPzxJBi4GtA7EZfjJE`
  return fetch(`${URL}/api/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  }).then(res => res.json());
};

interface CaseData {
  id: string;
  date: string;
  sender: string;
  telco: string;
  actualTelco: string;
  statuses: Array<{ label: string; done: boolean }>;
  details: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
  fields: string[];
  request_ids: Array<{ id: string; status: string }>;
  reply_file_id?: string;
  full_name?: string;
}

export default function AllDataPage() {
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [allCases, setAllCases] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [showUnsentOnly, setShowUnsentOnly] = useState(false);
  
  // New state for case selection and submission
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Memoized filtered cases based on date range and unsent filter
  const filteredCases = useMemo(() => {
    let cases = allCases;
    
    // Apply date range filter
    if (dateRange[0] || dateRange[1]) {
      cases = cases.filter(caseItem => 
        isDateInRange(caseItem.date, dateRange[0], dateRange[1])
      );
    }
    
    // Apply unsent filter
    if (showUnsentOnly) {
      cases = cases.filter(caseItem => 
        !caseItem.statuses.some(status => status.done)
      );
    }
    
    return cases;
  }, [allCases, dateRange, showUnsentOnly]);

  // Get currently visible case IDs
  const visibleCaseIds = useMemo(() => 
    filteredCases.map(c => c.id), 
    [filteredCases]
  );

  // Check if all visible cases are selected
  const isAllVisibleSelected = useMemo(() => 
    visibleCaseIds.length > 0 && visibleCaseIds.every(id => selectedCases.has(id)), 
    [visibleCaseIds, selectedCases]
  );

  // Fetch all data from API (only once on component mount)
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data without date restrictions
      const data = await getAvailableSenders("", "");
      
      // Map API data to card format
      const mappedCases: CaseData[] = data.map((item: any, idx: number) => ({
        id: item._id?.$oid || `${item.sender_name}-${idx}`,
        date: item.date,
        sender: item.sender_name || `Sender ${idx + 1}`,
        telco: item.mobile_provider || 'Unknown',
        actualTelco: item.mobile_provider || 'Unknown',
        statuses: mapStatusToDisplay(item.status || []),
        details: `รายละเอียดของเคส ${item.sender_name || 'Unknown'}\nชื่อเต็ม: ${item.full_name || 'ไม่ระบุ'}\nเบอร์โทร: ${item.phone_number || 'ไม่ระบุ'}\nค่ายมือถือ: ${item.mobile_provider || 'ไม่ระบุ'}\nวันที่สร้าง: ${item.created_at ? new Date(item.created_at.$date || item.created_at).toLocaleString('th-TH') : 'ไม่ระบุ'}\nอัปเดตล่าสุด: ${item.updated_at ? new Date(item.updated_at.$date || item.updated_at).toLocaleString('th-TH') : 'ไม่ระบุ'}`,
        phone_number: item.phone_number || 'ไม่ระบุ',
        created_at: item.created_at?.$date || item.created_at || '',
        updated_at: item.updated_at?.$date || item.updated_at || '',
        fields: item.fields || [],
        request_ids: item.request_ids || [],
        reply_file_id: item.reply_file_id?.$oid || item.reply_file_id,
        full_name: item.full_name,
      }));
      
      // Sort by date (newest first)
      mappedCases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAllCases(mappedCases);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data only once on component mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DatesRangeValue) => {
    setDateRange(range);
    
    // Only close popover if both dates are selected or if range is cleared
    const [start, end] = range;
    if ((start && end) || (!start && !end)) {
      setPopoverOpened(false);
    }
    // Keep popover open if only start date is selected (waiting for end date)
  }, []);

  // Handle period change
  const handlePeriodChange = useCallback((newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(newPeriod);
  }, []);

  // Handle case selection
  const handleCaseClick = useCallback((caseItem: CaseData) => {
    setSelectedCase(caseItem);
  }, []);

  // Handle unsent filter toggle
  const handleUnsentToggle = useCallback(() => {
    setShowUnsentOnly(prev => !prev);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setSelectedCase(null);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle individual case selection
  const handleCaseSelection = useCallback((caseId: string, isSelected: boolean) => {
    setSelectedCases(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(caseId);
      } else {
        newSet.delete(caseId);
      }
      return newSet;
    });
  }, []);

  // Handle select all toggle
  const handleSelectAllToggle = useCallback(() => {
    setSelectedCases(prev => {
      if (isAllVisibleSelected) {
        // Deselect all visible cases
        const newSet = new Set(prev);
        visibleCaseIds.forEach(id => newSet.delete(id));
        return newSet;
      } else {
        // Select all visible cases
        const newSet = new Set(prev);
        visibleCaseIds.forEach(id => newSet.add(id));
        return newSet;
      }
    });
  }, [isAllVisibleSelected, visibleCaseIds]);

  // Handle submit selected cases
  const handleSubmit = useCallback(async () => {
    if (selectedCases.size === 0) {
      setSubmitError('กรุณาเลือกเคสที่ต้องการส่ง');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      // Get selected case data
      const selectedCaseData = allCases.filter(c => selectedCases.has(c.id));
      
      // Prepare data for API
      const requestData = {
        fields: ["sender_name", "mobile_provider", "phone_number", "full_name", "date"],
        rows: selectedCaseData.map(caseItem => ({
          sender_name: caseItem.sender,
          mobile_provider: caseItem.telco,
          phone_number: caseItem.phone_number,
          full_name: caseItem.full_name || '',
          date: caseItem.date
        }))
      };

      // Get token (you may need to implement this based on your auth system)
      const token = localStorage.getItem('token') || '';

      // Submit to API
      const response = await createRequest(requestData, token);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update status of submitted cases
      setAllCases(prevCases => 
        prevCases.map(caseItem => {
          if (selectedCases.has(caseItem.id)) {
            // Update the first and third status to "done" (pending)
            const updatedStatuses = caseItem.statuses.map((status, index) => 
              (index === 0 || index === 2) ? { ...status, done: true } : status
            );
            return { ...caseItem, statuses: updatedStatuses };
          }
          return caseItem;
        })
      );

      setSubmitSuccess(`ส่งข้อมูล ${selectedCases.size} เคสสำเร็จ`);
      setSelectedCases(new Set()); // Clear selection
      
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(null), 3000);

    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCases, allCases]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedCases(new Set());
  }, [dateRange, showUnsentOnly]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-2xl font-bold text-gray-600">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-red-500 mb-4">{error}</div>
        <button 
          onClick={handleRefresh}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center">
      {/* Title and Filter Section - Fixed */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-6 bg-white sticky top-0 z-10 pb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-extrabold underline decoration-blue-500">
            ข้อมูลทั้งหมด
          </h1>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
          >
            รีเฟรช
          </button>
        </div>
        
        <div className="flex flex-row items-center gap-4 bg-gray-100 rounded-xl px-4 py-3 w-full">
          <span className="text-lg font-bold text-gray-700">ตัวกรอง:</span>
          
          {/* Unsent Reports Filter Button */}
          <button
            onClick={handleUnsentToggle}
            className={`px-4 py-2 rounded-lg font-semibold border transition-all duration-200 ${
              showUnsentOnly 
                ? 'bg-red-600 text-white border-red-700 shadow-md' 
                : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
            }`}
          >
            รายงานที่ยังไม่เคยส่ง
          </button>
          
          <span className="text-lg font-bold text-gray-700">ช่วงวันที่:</span>
          
          {/* DatePicker Popover Button */}
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
                onClick={() => setPopoverOpened((o) => !o)}
                size="md"
                color="blue"
                radius="md"
                className="min-w-48"
              >
                {formatDateRange(dateRange)}
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <div className="p-2">
                <DatePicker
                  type="range"
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  locale="th"
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

          {/* Clear All Filters Button */}
          {((dateRange[0] || dateRange[1]) || showUnsentOnly) && (
            <button
              onClick={() => {
                setDateRange([null, null]);
                setShowUnsentOnly(false);
                setPopoverOpened(false);
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
          
          {/* Period Filter Buttons */}
          <div className="flex gap-2 ml-auto">
            {[
              { key: 'daily', label: 'รายวัน' },
              { key: 'weekly', label: 'รายสัปดาห์' },
              { key: 'monthly', label: 'รายเดือน' }
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${
                  period === key 
                    ? 'bg-blue-600 text-white border-blue-700' 
                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                }`}
                onClick={() => handlePeriodChange(key as 'daily' | 'weekly' | 'monthly')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Selection and Submit Section */}
        {filteredCases.length > 0 && (
          <div className="flex flex-row items-center gap-4 bg-blue-50 rounded-xl px-4 py-3 w-full">
            <div className="flex items-center gap-4">
              {/* Select All Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  onChange={handleSelectAllToggle}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700">
                  เลือกทั้งหมด ({filteredCases.length} เคส)
                </span>
              </label>

              {/* Selected Count */}
              {selectedCases.size > 0 && (
                <span className="text-blue-700 font-semibold">
                  เลือกแล้ว: {selectedCases.size} เคส
                </span>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-2 ml-auto">
              {submitSuccess && (
                <span className="text-green-600 font-semibold text-sm">
                  ✓ {submitSuccess}
                </span>
              )}
              {submitError && (
                <span className="text-red-600 font-semibold text-sm">
                  ✗ {submitError}
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={selectedCases.size === 0 || isSubmitting}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  selectedCases.size === 0 || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    กำลังส่ง...
                  </div>
                ) : (
                  `ส่งข้อมูล ${selectedCases.size > 0 ? `(${selectedCases.size})` : ''}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            แสดงผล {filteredCases.length} จาก {allCases.length} เคสทั้งหมด
            {showUnsentOnly && <span className="text-red-600 font-semibold"> (เฉพาะรายงานที่ยังไม่เคยส่ง)</span>}
          </div>
          {showUnsentOnly && (
            <div className="text-red-600 font-semibold">
              🚨 กำลังแสดงเฉพาะเคสที่ยังไม่มีสถานะ
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Cards Section */}
      <div className="w-full max-w-6xl overflow-y-auto flex-1" style={{ maxHeight: "70vh" }}>
        {filteredCases.length === 0 ? (
          <div className="text-center text-gray-500 text-xl py-12">
            {allCases.length === 0 ? 
              'ไม่มีข้อมูลในระบบ' : 
              showUnsentOnly ? 
                'ไม่พบรายงานที่ยังไม่เคยส่ง' : 
                'ไม่พบข้อมูลตามเงื่อนไขที่เลือก'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className={`bg-white rounded-xl shadow-md border p-6 transition-all duration-200 ${
                  selectedCases.has(caseItem.id)
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:shadow-lg hover:border-blue-300'
                }`}
              >
                <div className="flex flex-row items-center gap-6">
                  {/* Selection Checkbox */}
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCases.has(caseItem.id)}
                      onChange={(e) => handleCaseSelection(caseItem.id, e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>

                  <div 
                    className="flex-1 flex flex-row items-center gap-6 cursor-pointer"
                    onClick={() => handleCaseClick(caseItem)}
                  >
                    <div className="text-lg font-bold text-blue-600 min-w-28">
                      {new Date(caseItem.date).toLocaleDateString('th-TH')}
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-semibold text-gray-800">{caseItem.sender}</div>
                        <div className="text-gray-500 text-sm">{caseItem.telco}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">Actual Telco</div>
                        <div className="text-gray-500 text-sm">{caseItem.actualTelco}</div>
                      </div>
                    </div>
                    
                    {/* Status Bar */}
                    <div className="flex-1 flex flex-row items-center gap-2 min-w-96">
                      {caseItem.statuses.map((status, i) => (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div
                            className={`h-2 w-full rounded-full mb-1 transition-colors ${
                              status.done ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium text-center ${
                              status.done ? "text-green-700" : "text-gray-500"
                            }`}
                          > 
                            {status.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-gray-400 text-xs mt-3">
                  Case ID: {caseItem.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center transition-colors z-10"
              onClick={handleModalClose}
              aria-label="Close"
            >
              ×
            </button>
            
            <div className="p-8 flex flex-col lg:flex-row gap-8">
              {/* Left Column: Main Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">รายละเอียดเคส</h2>
                <div className="space-y-3">
                  <div><span className="font-semibold">วันที่:</span> {new Date(selectedCase.date).toLocaleDateString('th-TH')}</div>
                  <div><span className="font-semibold">Sender:</span> {selectedCase.sender}</div>
                  <div><span className="font-semibold">ชื่อเต็ม:</span> {selectedCase.full_name || 'ไม่ระบุ'}</div>
                  <div><span className="font-semibold">เบอร์โทร:</span> {selectedCase.phone_number}</div>
                  <div><span className="font-semibold">ค่ายมือถือ:</span> {selectedCase.telco}</div>
                  <div><span className="font-semibold">Actual Telco:</span> {selectedCase.actualTelco}</div>
                  <div>
                    <span className="font-semibold">สถานะ:</span>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      {selectedCase.statuses.map((status, i) => (
                        <li key={i} className={`${status.done ? "text-green-700" : "text-gray-500"}`}>
                          {status.label} {status.done ? "✓" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Right Column: Additional Details */}
              <div className="flex-1 border-l border-gray-200 pl-8">
                <h3 className="text-xl font-bold mb-4 text-gray-800">ข้อมูลเพิ่มเติม</h3>
                <div className="text-gray-700 whitespace-pre-line text-sm leading-relaxed mb-6">
                  {selectedCase.details}
                </div>
                
                {selectedCase.request_ids && selectedCase.request_ids.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-bold mb-3 text-gray-800">Request IDs:</h4>
                    <ul className="space-y-2">
                      {selectedCase.request_ids.map((req, i) => (
                        <li key={i} className="text-sm bg-gray-50 p-2 rounded">
                          <span className="font-mono">{req.id}</span> - 
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            req.status === 'completed' ? 'bg-green-100 text-green-800' :
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {req.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}