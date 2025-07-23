"use client";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Download, Search, Filter, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';

// Import types and utilities
import { TelcoRecord, TelcoFilters } from './types';                  <span>ล้างตัวกรอง</span>
import { 
  generateMockRecord, 
  convertExcelRowToRecord, 
  calculateStats, 
  filterRecords,
  generateExcelTemplate,
  isValidExcelRow,
  canSubmitRecord,
  getSubmissionValidation,
  validateExcelTemplate,
  checkExcelStructure,
  getTemplateHelpSuggestions,
  TemplateValidationResult
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
  const [templateValidation, setTemplateValidation] = useState<TemplateValidationResult | null>(null);
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
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
    setTemplateValidation(null); // Reset previous validation
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Validate template structure first
        const validation = checkExcelStructure(jsonData as string[][]);
        setTemplateValidation(validation);

        if (!validation.isValid) {
          // Show error but continue processing if possible
          console.warn('Template validation failed:', validation.warnings);
        }

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
        
        // Only show success if template is valid or has minor issues
        if (validation.isValid || excelRecords.length > 0) {
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        setTemplateValidation({
          isValid: false,
          missingColumns: [],
          extraColumns: [],
          warnings: ['เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์']
        });
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
    setTemplateValidation(null); // Clear any template warnings
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

  // Submit all eligible records
  const submitAllRecords = async () => {
    const validation = getSubmissionValidation(records);
    
    if (!validation.canSubmitAll) {
      alert('ไม่มีข้อมูลที่พร้อมส่ง กรุณาตรวจสอบว่าได้อัปโหลดเอกสารครบทุกไฟล์แล้ว');
      return;
    }

    const confirmMessage = `คุณต้องการส่งข้อมูลทั้งหมด ${validation.totalReadyToSubmit} รายการหรือไม่?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsSubmittingAll(true);
    
    try {
      // Submit each eligible record
      const submitPromises = validation.submittableRecords.map(async (record) => {
        setSubmittingIds(prev => new Set([...prev, record.id]));
        
        try {
          // TODO: Replace with actual API call
          console.log('Submitting record:', record.id);
          
          // Mock API call
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          
          updateRecord(record.id, { 
            isSubmitted: true, 
            submittedAt: new Date(),
            updatedAt: new Date()
          });
          
          return { success: true, recordId: record.id };
        } catch (error) {
          console.error('Error submitting record:', record.id, error);
          return { success: false, recordId: record.id, error };
        } finally {
          setSubmittingIds(prev => {
            const updated = new Set(prev);
            updated.delete(record.id);
            return updated;
          });
        }
      });

      const results = await Promise.all(submitPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed === 0) {
        alert(`ส่งข้อมูลสำเร็จทั้งหมด ${successful} รายการ!`);
      } else {
        alert(`ส่งข้อมูลเสร็จสิ้น\nสำเร็จ: ${successful} รายการ\nล้มเหลว: ${failed} รายการ`);
      }
    } catch (error) {
      console.error('Error in bulk submission:', error);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingAll(false);
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
  const submissionValidation = getSubmissionValidation(records);

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
                
                {records.length > 0 && (
                  <button
                    onClick={submitAllRecords}
                    disabled={!submissionValidation.canSubmitAll || isSubmittingAll}
                    className={`
                      flex items-center gap-2 px-6 py-2 font-semibold rounded-lg transition-all duration-200
                      ${submissionValidation.canSubmitAll && !isSubmittingAll
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }
                    `}
                    title={
                      !submissionValidation.canSubmitAll 
                        ? 'ไม่มีข้อมูลที่พร้อมส่ง กรุณาอัปโหลดเอกสารให้ครบทุกไฟล์'
                        : `ส่งข้อมูลทั้งหมด ${submissionValidation.totalReadyToSubmit} รายการ`
                    }
                  >
                    {isSubmittingAll ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                        กำลังส่งทั้งหมด...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        ส่งข้อมูลทั้งหมด ({submissionValidation.totalReadyToSubmit})
                      </>
                    )}
                  </button>
                )}
                
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

          {/* Template Validation Warning */}
          {templateValidation && !templateValidation.isValid && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    ⚠️ ไฟล์ Excel ไม่ตรงกับแม่แบบ
                  </h3>
                  <div className="space-y-2 mb-4">
                    {templateValidation.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-red-700">
                        • {warning}
                      </p>
                    ))}
                  </div>
                  
                  {/* Show missing/extra columns details */}
                  {(templateValidation.missingColumns.length > 0 || templateValidation.extraColumns.length > 0) && (
                    <div className="mb-4 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-2">📋 รายละเอียดปัญหา:</p>
                      {templateValidation.missingColumns.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-red-700">คอลัมน์ที่ขาดหายไป:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {templateValidation.missingColumns.map((col, index) => (
                              <span key={index} className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {templateValidation.extraColumns.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-700">คอลัมน์ที่ไม่ควรมี:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {templateValidation.extraColumns.map((col, index) => (
                              <span key={index} className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 p-4 bg-red-100 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      💡 วิธีแก้ไข:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {getTemplateHelpSuggestions(templateValidation).map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setTemplateValidation(null)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  title="ปิดการแจ้งเตือน"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Template Validation Warnings (Minor Issues) */}
          {templateValidation && templateValidation.isValid && (templateValidation.extraColumns.length > 0 || templateValidation.missingColumns.length > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    ⚠️ คำเตือนเกี่ยวกับแม่แบบ
                  </h3>
                  <div className="space-y-2">
                    {templateValidation.extraColumns.length > 0 && (
                      <p className="text-sm text-yellow-700">
                        • พบคอลัมน์เพิ่มเติม: <strong>{templateValidation.extraColumns.join(', ')}</strong>
                      </p>
                    )}
                    {templateValidation.missingColumns.length > 0 && (
                      <p className="text-sm text-yellow-700">
                        • ไม่พบคอลัมน์: <strong>{templateValidation.missingColumns.join(', ')}</strong>
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-yellow-600 mt-2">
                    ระบบจะประมวลผลข้อมูลที่สามารถอ่านได้ แต่แนะนำให้ใช้แม่แบบที่ถูกต้องเพื่อความแม่นยำ
                  </p>
                </div>
                <button
                  onClick={() => setTemplateValidation(null)}
                  className="text-yellow-400 hover:text-yellow-600 transition-colors"
                  title="ปิดการแจ้งเตือน"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

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
            <>
              {/* Submission Status Summary */}
              {submissionValidation.totalReadyToSubmit > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">
                          มี {submissionValidation.totalReadyToSubmit} รายการพร้อมส่งข้อมูล
                        </p>
                        <p className="text-sm text-green-600">
                          เอกสารครบแล้ว สามารถส่งข้อมูลได้
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={submitAllRecords}
                      disabled={isSubmittingAll}
                      className={`
                        px-6 py-2 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2
                        ${!isSubmittingAll
                          ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {isSubmittingAll ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                          กำลังส่งทั้งหมด...
                        </>
                      ) : (
                        <>
                          ส่งทั้งหมด
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Missing Documents Warning */}
              {submissionValidation.missingDocuments.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-800 mb-2">
                        มี {submissionValidation.missingDocuments.length} รายการที่ยังไม่พร้อมส่ง
                      </p>
                      <p className="text-sm text-yellow-600 mb-3">
                        กรุณาอัปโหลดเอกสารให้ครบทั้ง 3 ไฟล์ก่อนส่งข้อมูล:
                      </p>
                      <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                        <li>• เอกสารการจดทะเบียน (PDF, JPG, PNG)</li>
                        <li>• หลักฐานการชำระเงิน (PDF, JPG, PNG)</li>
                        <li>• บัตรประชาชนผู้จดทะเบียน (PDF, JPG, PNG)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

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
            </>
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
                  isSubmittingAll={isSubmittingAll}
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
