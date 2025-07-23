"use client";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Download, Search, Filter } from "lucide-react";
import * as XLSX from 'xlsx';

// Import types and utilities
import { TelcoRecord, TelcoFilters } from './types';                  <span>ล้างตัวกรอง</span>
import { 
  generateMockRecord, 
  convertExcelRowToRecord, 
  calculateStats, 
  filterRecords,
  generateExcelTemplate,
  isValidExcelRow
} from './utils';

// Import components
import {
  TelcoAccessGuard,
  ExcelUploadSection,
  StatsCards,
  RecordCard
} from './components';

// Main telco page component
export default function TelcoPage() {
  const { data: session, status } = useSession();
  const [records, setRecords] = useState<TelcoRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TelcoRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<TelcoFilters>({
    search: '',
    status: 'all',
    cibResult: 'all',
    dateRange: {},
    simType: 'all'
  });

  // Apply filters whenever records or filters change
  const applyFilters = useCallback(() => {
    const filtered = filterRecords(records, filters);
    setFilteredRecords(filtered);
  }, [records, filters]);

  // Update filters and apply them
  const updateFilters = (newFilters: Partial<TelcoFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    const filtered = filterRecords(records, updatedFilters);
    setFilteredRecords(filtered);
  };

  // Handle Excel file upload
  const handleExcelUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Convert headers to use first row as keys
        const [headers, ...dataRows] = jsonData as string[][];
        const mappedData = dataRows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        // Convert to TelcoRecord format and filter out empty rows
        const excelRecords = mappedData
          .filter((row: any) => isValidExcelRow(row)) // Filter empty rows first
          .map((row: any, index: number) => convertExcelRowToRecord(row, index));

        setRecords(excelRecords);
        setFilteredRecords(excelRecords);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input
    event.target.value = '';
  }, []);

  // Generate mock data for testing
  const generateMockData = () => {
    const mockRecords = Array.from({ length: 8 }, (_, index) => generateMockRecord(index));
    setRecords(mockRecords);
    setFilteredRecords(mockRecords);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  // Download template
  const downloadTemplate = () => {
    const templateData = generateExcelTemplate();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "telco_data_template.xlsx");
  };

  // Update record
  const updateRecord = (id: string, updates: Partial<TelcoRecord>) => {
    setRecords(prev => {
      const updated = prev.map(record => 
        record.id === id ? { ...record, ...updates } : record
      );
      return updated;
    });
    
    // Also update filtered records
    setFilteredRecords(prev => 
      prev.map(record => 
        record.id === id ? { ...record, ...updates } : record
      )
    );
  };

  // Submit record
  const submitRecord = async (id: string) => {
    setSubmittingIds(prev => new Set([...prev, id]));
    
    try {
      // TODO: Replace with actual API call
      console.log('Submitting record:', id);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      updateRecord(id, { 
        isSubmitted: true, 
        submittedAt: new Date(),
        updatedAt: new Date()
      });
      
      alert('ส่งข้อมูลเรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Error submitting record:', error);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmittingIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters: TelcoFilters = {
      search: '',
      status: 'all',
      cibResult: 'all',
      dateRange: {},
      simType: 'all'
    };
    setFilters(clearedFilters);
    setFilteredRecords(records);
  };

  const stats = calculateStats(records);
  const filteredStats = calculateStats(filteredRecords);

  return (
    <TelcoAccessGuard userRole={session?.user?.role} isLoading={status === "loading"}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ระบบจัดการข้อมูล Telco</h1>
                <p className="text-gray-600 mt-1">อัปโหลดและจัดการข้อมูลจากไฟล์ Excel</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>ดาวน์โหลดแม่แบบ</span>
                </button>
                {uploadSuccess && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                    <span>อัปโหลดสำเร็จ!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Cards */}
          {records.length > 0 && <StatsCards stats={stats} />}

          {/* Excel Upload Section */}
          <ExcelUploadSection
            isUploading={isUploading}
            uploadSuccess={uploadSuccess}
            onExcelUpload={handleExcelUpload}
            onGenerateMockData={generateMockData}
            onDownloadTemplate={downloadTemplate}
          />

          {/* Filters and Search */}
          {records.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="ค้นหาด้วยชื่อ, Case ID, เบอร์โทร, IMEI..."
                      value={filters.search}
                      onChange={(e) => updateFilters({ search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Status Filter */}
                <select
                  value={filters.status}
                  onChange={(e) => updateFilters({ status: e.target.value as any })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">สถานะทั้งหมด</option>
                  <option value="submitted">ส่งข้อมูลแล้ว</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="with_documents">มีเอกสารครบ</option>
                </select>

                {/* CIB Result Filter */}
                <select
                  value={filters.cibResult}
                  onChange={(e) => updateFilters({ cibResult: e.target.value as any })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">ผล CIB ทั้งหมด</option>
                  <option value="Clean">Clean</option>
                  <option value="Suspicious">Suspicious</option>
                  <option value="Flagged">Flagged</option>
                </select>

                {/* SIM Type Filter */}
                <select
                  value={filters.simType}
                  onChange={(e) => updateFilters({ simType: e.target.value as any })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">ประเภทซิมทั้งหมด</option>
                  <option value="Pre-paid">Pre-paid</option>
                  <option value="Post-paid">Post-paid</option>
                </select>

                {/* Clear Filters */}
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>ล้างตัวกรong</span>
                </button>
              </div>
              
              {/* Filter Results Summary */}
              {(filteredRecords.length !== records.length || filters.search || filters.status !== 'all' || filters.cibResult !== 'all' || filters.simType !== 'all') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    แสดงผล {filteredRecords.length.toLocaleString()} จาก {records.length.toLocaleString()} รายการ
                    {filteredStats.submitted !== stats.submitted && (
                      <span className="ml-2">
                        (ส่งข้อมูลแล้ว: {filteredStats.submitted}/{stats.submitted})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Records Display */}
          {filteredRecords.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  รายการข้อมูล
                  <span className="text-gray-500 font-normal ml-2">
                    ({filteredRecords.length.toLocaleString()} รายการ)
                  </span>
                </h2>
              </div>
              
              {filteredRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onUpdate={updateRecord}
                  onSubmit={submitRecord}
                  isSubmitting={submittingIds.has(record.id)}
                />
              ))}
            </div>
          ) : records.length > 0 ? (
            // No results from filtering
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                ไม่พบข้อมูลที่ตรงกับการค้นหา
              </h3>
              <p className="text-gray-500 mb-4">
                ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง
              </p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            // No records at all
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                ยังไม่มีข้อมูลในระบบ
              </h3>
              <p className="text-gray-500">
                กรุณาอัปโหลดไฟล์ Excel หรือสร้างข้อมูลตัวอย่างเพื่อเริ่มต้นใช้งาน
              </p>
            </div>
          )}
        </div>
      </div>
    </TelcoAccessGuard>
  );
}
