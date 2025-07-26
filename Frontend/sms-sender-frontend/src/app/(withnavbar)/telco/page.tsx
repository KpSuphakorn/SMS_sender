"use client";
import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Download, Search, Filter, CheckCircle2, AlertCircle, Upload, FileText } from "lucide-react";
import * as XLSX from 'xlsx';

// Import types and utilities
import { ApiSenderData, TelcoRecord, TelcoRequestGroup, TELCO_EXCEL_MAPPING } from './types';
import { 
  fetchIspPendingSenders,
  downloadFile,
  submitIspResponse,
  convertApiDataToTelcoRecord,
  generateTelcoExcelTemplate
} from './api';

// Import components
import { TelcoAccessGuard } from './components';

// Main telco page component
export default function TelcoPage() {
  const { data: session, status } = useSession();
  const [requestGroups, setRequestGroups] = useState<TelcoRequestGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittingRequests, setSubmittingRequests] = useState<Set<string>>(new Set());
  
  // File upload states for each request
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, {
    excel?: File;
    attachments: File[];
  }>>({});

  // Track which requests have been successfully submitted
  const [submittedRequests, setSubmittedRequests] = useState<Set<string>>(new Set());

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!session?.user?.token) {
      setError('No authentication token available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchIspPendingSenders(session.user.token);
      
      if (result.success && result.data) {
        if (Object.keys(result.data).length === 0) {
          // Show user-friendly message instead of technical error
          setError('ยังไม่มีหนังสือขอข้อมูล');
          setIsLoading(false);
          return;
        }
        
        // Convert API data to request groups
        const groups: TelcoRequestGroup[] = Object.entries(result.data).map(([requestId, senders]) => {
          const records = senders.map(convertApiDataToTelcoRecord);
          return {
            requestId,
            records,
            canSubmit: records.some(r => !r.isResponseSubmitted),
            allFilesUploaded: false // Will be updated when files are uploaded
          };
        });
        
        setRequestGroups(groups);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.token, session?.user?.role]); // Only depend on specific session properties

  // Load data on component mount
  useEffect(() => {
    // Only fetch if we have a valid session with token
    if (session?.user?.token) {
      fetchData();
    }
  }, [session?.user?.token, fetchData]); // Only depend on the token, not the entire session object

  // Download Excel template with data
  const downloadExcelWithData = useCallback((group: TelcoRequestGroup) => {
    const data = generateTelcoExcelTemplate(group.records);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Telco_Data");
    XLSX.writeFile(wb, `telco_data_${group.requestId}.xlsx`);
  }, []);

  // Handle Excel file upload and auto-fill data
  const handleExcelUpload = useCallback((requestId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const [headers, ...dataRows] = jsonData as string[][];
        
        // Update records with Excel data
        setRequestGroups(prev => prev.map(group => {
          if (group.requestId !== requestId) return group;
          
          const updatedRecords = group.records.map(record => {
            // Find matching row in Excel
            const excelRow = dataRows.find(row => 
              row[0] === record.senderName || 
              row[1] === record.phoneNumber
            );
            
            if (excelRow) {
              const mapping = TELCO_EXCEL_MAPPING;
              const headerMap: Record<string, number> = {};
              headers.forEach((header, index) => {
                headerMap[header] = index;
              });
              
              return {
                ...record,
                simType: excelRow[headerMap[mapping.simType]] || record.simType,
                registrationType: excelRow[headerMap[mapping.registrationType]] || record.registrationType,
                imei: excelRow[headerMap[mapping.imei]] || record.imei,
                callSite: excelRow[headerMap[mapping.callSite]] || record.callSite,
                incidentCount: excelRow[headerMap[mapping.incidentCount]] || record.incidentCount,
                hasLog: excelRow[headerMap[mapping.hasLog]] || record.hasLog,
                cibResult: excelRow[headerMap[mapping.cibResult]] || record.cibResult,
                caseId: excelRow[headerMap[mapping.caseId]] || record.caseId,
                contactInfo: excelRow[headerMap[mapping.contactInfo]] || record.contactInfo,
                note: excelRow[headerMap[mapping.note]] || record.note,
              };
            }
            return record;
          });
          
          return { ...group, records: updatedRecords };
        }));

        // Store uploaded file
        setUploadedFiles(prev => ({
          ...prev,
          [requestId]: {
            excel: file,
            attachments: prev[requestId]?.attachments || []
          }
        }));
        
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel');
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input
    event.target.value = '';
  }, []);

  // Handle additional file uploads
  const handleFileUpload = useCallback((requestId: string, files: File[]) => {
    setUploadedFiles(prev => ({
      ...prev,
      [requestId]: {
        excel: prev[requestId]?.excel,
        attachments: [...(prev[requestId]?.attachments || []), ...files]
      }
    }));
  }, []);

  // Remove individual attachment file
  const removeAttachmentFile = useCallback((requestId: string, fileIndex: number) => {
    // Prevent removal if request has been successfully submitted
    if (submittedRequests.has(requestId)) {
      alert('ไม่สามารถลบไฟล์ได้ เนื่องจากข้อมูลได้ถูกส่งเรียบร้อยแล้ว');
      return;
    }
    
    setUploadedFiles(prev => ({
      ...prev,
      [requestId]: {
        excel: prev[requestId]?.excel,
        attachments: prev[requestId]?.attachments?.filter((_, index) => index !== fileIndex) || []
      }
    }));
  }, [submittedRequests]);

  // Remove Excel file
  const removeExcelFile = useCallback((requestId: string) => {
    // Prevent removal if request has been successfully submitted
    if (submittedRequests.has(requestId)) {
      alert('ไม่สามารถลบไฟล์ได้ เนื่องจากข้อมูลได้ถูกส่งเรียบร้อยแล้ว');
      return;
    }
    
    setUploadedFiles(prev => ({
      ...prev,
      [requestId]: {
        excel: undefined,
        attachments: prev[requestId]?.attachments || []
      }
    }));
  }, [submittedRequests]);

  // Submit request with files
  const submitRequest = useCallback(async (requestId: string) => {
    const files = uploadedFiles[requestId];
    if (!files?.excel) {
      alert('กรุณาอัปโหลดไฟล์ Excel ก่อนส่งข้อมูล');
      return;
    }

    if (!session?.user?.token) {
      alert('ไม่พบข้อมูลการเข้าสู่ระบบ');
      return;
    }

    setSubmittingRequests(prev => new Set([...prev, requestId]));
    
    try {
      const allFiles = [files.excel, ...files.attachments];
      const result = await submitIspResponse(requestId, allFiles, session.user.token);
      
      if (result.success) {
        // Get the actual count of cases being sent (from the request group)
        const currentGroup = requestGroups.find(g => g.requestId === requestId);
        const caseCount = currentGroup?.records?.length || 0;
        const apiSuccessCount = result.data?.successful_count || 0;
        const failedCount = result.data?.failed_count || 0;
        
        // Use the actual case count that was sent, not the API's successful_count
        let message = `ส่งข้อมูลสำเร็จ!`;
        
        // Only show API processing details if there were failures
        // if (failedCount > 0) {
        //   message += `\n(Excel: สำเร็จ ${apiSuccessCount} รายการ, ไม่สำเร็จ ${failedCount} รายการ)`;
        // }
        
        alert(message);
        
        // Log detailed information for debugging
        console.log('Submission result:', {
          request_id: requestId,
          cases_sent: caseCount,
          api_successful_count: apiSuccessCount,
          api_failed_count: failedCount,
          details: result.data?.details
        });
        
        // Refresh data
        await fetchData();
        
        // Mark this request as successfully submitted to prevent file removal
        setSubmittedRequests(prev => new Set([...prev, requestId]));
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.error}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setSubmittingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestId);
        return updated;
      });
    }
  }, [uploadedFiles, fetchData, session, requestGroups]);

  // Submit all requests that have Excel files uploaded
  const submitAllRequests = useCallback(async () => {
    if (!session?.user?.token) {
      alert('ไม่พบข้อมูลการเข้าสู่ระบบ');
      return;
    }

    // Find all groups that can be submitted and have Excel files
    const submittableGroups = requestGroups.filter(g => 
      g.canSubmit && uploadedFiles[g.requestId]?.excel
    );

    if (submittableGroups.length === 0) {
      alert('ไม่มีข้อมูลที่พร้อมส่ง กรุณาอัปโหลดไฟล์ Excel ก่อน');
      return;
    }

    // Confirm before submitting
    const confirmSubmit = confirm(
      `คุณต้องการส่งข้อมูล ${submittableGroups.length} รายการหรือไม่?`
    );
    
    if (!confirmSubmit) {
      return;
    }

    let totalCasesSent = 0;
    let totalFailed = 0;
    const failedRequests: string[] = [];

    // Submit all requests sequentially
    for (const group of submittableGroups) {
      setSubmittingRequests(prev => new Set([...prev, group.requestId]));
      
      try {
        const files = uploadedFiles[group.requestId];
        const allFiles = [files.excel!, ...files.attachments];
        const result = await submitIspResponse(group.requestId, allFiles, session.user.token);
        
        if (result.success) {
          // Count the actual cases sent, not the API's successful_count
          totalCasesSent += group.records.length;
          // Mark this request as successfully submitted
          setSubmittedRequests(prev => new Set([...prev, group.requestId]));
        } else {
          totalFailed++;
          failedRequests.push(group.requestId);
        }
      } catch (error) {
        console.error(`Submission error for ${group.requestId}:`, error);
        totalFailed++;
        failedRequests.push(group.requestId);
      } finally {
        setSubmittingRequests(prev => {
          const updated = new Set(prev);
          updated.delete(group.requestId);
          return updated;
        });
      }
    }

    // Show summary result
    let message = `ส่งข้อมูลเสร็จสิ้น!\nประมวลผลสำเร็จ: ${totalCasesSent} รายการ`;
    
    if (totalFailed > 0) {
      message += `\nไม่สำเร็จ: ${totalFailed} คำขอ`;
      if (failedRequests.length > 0) {
        message += `\nRequest ID ที่ไม่สำเร็จ: ${failedRequests.join(', ')}`;
      }
    }
    
    alert(message);
    
    // Refresh data after all submissions
    await fetchData();
  }, [requestGroups, uploadedFiles, session, fetchData]);

  // Download PDF file
  const handleDownloadPdf = useCallback(async (fileId: string, filename: string) => {
    if (!session?.user?.token) {
      alert('ไม่พบข้อมูลการเข้าสู่ระบบ');
      return;
    }

    try {
      const result = await downloadFile(fileId, session.user.token);
      if (result.success && result.data) {
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(`ไม่สามารถดาวน์โหลดไฟล์ได้: ${result.error}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด');
    }
  }, [session]);

  // Filter groups based on search
  const filteredGroups = requestGroups.filter(group =>
    searchTerm === '' || 
    group.requestId.includes(searchTerm) ||
    group.records.some(r => 
      r.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phoneNumber.includes(searchTerm) ||
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (status === "loading" || isLoading) {
    return (
      <TelcoAccessGuard userRole={session?.user?.role} isLoading={true}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </TelcoAccessGuard>
    );
  }

  if (error) {
    const isNoDataError = error === 'ยังไม่มีหนังสือขอข้อมูล';
    
    return (
      <TelcoAccessGuard userRole={session?.user?.role}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            {isNoDataError ? (
              <>
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ยังไม่มีข้อมูล</h2>
                <p className="text-gray-600 mb-6">ยังไม่มีหนังสือขอข้อมูลสำหรับ Telco ของคุณ</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
                <p className="text-gray-600 mb-6">{error}</p>
              </>
            )}
            <button
              onClick={fetchData}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {isNoDataError ? 'รีเฟรชข้อมูล' : 'ลองใหม่'}
            </button>
          </div>
        </div>
      </TelcoAccessGuard>
    );
  }

  return (
    <TelcoAccessGuard userRole={session?.user?.role}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ระบบจัดการข้อมูล Telco
            </h1>
            <p className="text-gray-600">
              จัดการข้อมูลผู้ส่งข้อความจากผู้ให้บริการโทรคมนาคม
            </p>
          </div>

          {/* Search and Actions */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="ค้นหา Request ID, ชื่อผู้ส่ง, เบอร์โทร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              {/* Send All Button */}
              {requestGroups.some(g => g.canSubmit && uploadedFiles[g.requestId]?.excel) && (
                <button
                  onClick={submitAllRequests}
                  disabled={submittingRequests.size > 0}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submittingRequests.size > 0 && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  ส่งทั้งหมด
                </button>
              )}
              
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                รีเฟรชข้อมูล
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">คำขอทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">{requestGroups.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">รอดำเนินการ</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {requestGroups.filter(g => g.canSubmit).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">ส่งแล้ว</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {requestGroups.filter(g => !g.canSubmit).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">รายการทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {requestGroups.reduce((sum, g) => sum + g.records.length, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Request Groups */}
          <div className="space-y-8">
            {filteredGroups.length === 0 && searchTerm && (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูล</h3>
                <p className="text-gray-500">ลองเปลี่ยนคำค้นหาและลองใหม่</p>
              </div>
            )}

            {filteredGroups.map((group) => (
              <div key={group.requestId} className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Group Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Request ID: {group.requestId}
                      </h2>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>รายการ: {group.records.length} รายการ</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          group.canSubmit 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {group.canSubmit ? 'รอดำเนินการ' : 'ส่งแล้ว'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {/* Download Excel Template */}
                      <button
                        onClick={() => downloadExcelWithData(group)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        ดาวน์โหลดเทมเพลต
                      </button>

                      {/* Upload Excel */}
                      {group.canSubmit && (
                        <div className="relative">
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => handleExcelUpload(group.requestId, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            อัปโหลด Excel
                          </button>
                        </div>
                      )}

                      {/* Additional Files Upload */}
                      {group.canSubmit && (
                        <div className="relative">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => handleFileUpload(group.requestId, Array.from(e.target.files || []))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            เอกสารแนบ
                          </button>
                        </div>
                      )}

                      {/* Submit Button */}
                      {group.canSubmit && (
                        <button
                          onClick={() => submitRequest(group.requestId)}
                          disabled={submittingRequests.has(group.requestId) || !uploadedFiles[group.requestId]?.excel}
                          className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          {submittingRequests.has(group.requestId) && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
                          ส่งข้อมูล
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File Upload Status */}
                  {uploadedFiles[group.requestId] && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">ไฟล์ที่อัปโหลด:</h4>
                      <div className="space-y-2 text-sm">
                        {uploadedFiles[group.requestId]?.excel && (
                          <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Excel: {uploadedFiles[group.requestId].excel?.name}</span>
                            </div>
                            {!submittedRequests.has(group.requestId) && (
                              <button
                                onClick={() => removeExcelFile(group.requestId)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                                title="ลบไฟล์ Excel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                        {uploadedFiles[group.requestId]?.attachments?.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700">
                              <FileText className="h-4 w-4" />
                              <span>{file.name}</span>
                            </div>
                            {!submittedRequests.has(group.requestId) && (
                              <button
                                onClick={() => removeAttachmentFile(group.requestId, index)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                                title="ลบไฟล์แนบ"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Records List */}
                <div className="p-6">
                  <div className="grid gap-4">
                    {group.records.map((record) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ชื่อผู้ส่ง
                            </label>
                            <p className="text-sm text-gray-900">{record.senderName}</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              เบอร์โทร
                            </label>
                            <p className="text-sm text-gray-900">{record.phoneNumber}</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ผู้ให้บริการ
                            </label>
                            <p className="text-sm text-gray-900">{record.mobileProvider}</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ชื่อผู้ลงทะเบียน
                            </label>
                            <p className="text-sm text-gray-900">{record.fullName || 'ไม่ระบุ'}</p>
                          </div>
                        </div>

                        {/* PDF Download Links */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {record.dataPdfId && (
                            <button
                              onClick={() => handleDownloadPdf(record.dataPdfId!, 'data.pdf')}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                            >
                              ดาวน์โหลดข้อมูล
                            </button>
                          )}
                          {record.suspensionPdfId && (
                            <button
                              onClick={() => handleDownloadPdf(record.suspensionPdfId!, 'suspension.pdf')}
                              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                            >
                              ดาวน์โหลดหนังสือ
                            </button>
                          )}
                          {record.replyFileId && (
                            <button
                              onClick={() => handleDownloadPdf(record.replyFileId!, 'reply.pdf')}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                            >
                              ดาวน์โหลดตอบกลับ
                            </button>
                          )}
                        </div>

                        {/* Status */}
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            record.isResponseSubmitted
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.isResponseSubmitted ? 'ส่งแล้ว' : 'รอดำเนินการ'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {requestGroups.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มีข้อมูล</h3>
              <p className="text-gray-500 mb-6">ยังไม่มีคำขอจากผู้ประกอบการ</p>
              <button
                onClick={fetchData}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                รีเฟรชข้อมูล
              </button>
            </div>
          )}
        </div>
      </div>
    </TelcoAccessGuard>
  );
}
