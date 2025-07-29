"use client";
import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Download, 
  Search, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  RotateCcw,
  Trash2,
  Eye
} from "lucide-react";
import * as XLSX from 'xlsx';

// Import types and utilities
import { ApiSenderData, TelcoRecord, TelcoRequestGroup } from './types';
import { 
  fetchIspPendingSenders,
  downloadFile,
  submitIspResponse,
  convertApiDataToTelcoRecord
} from './api';

// Import components
import { TelcoAccessGuard } from './components';

// Exact column headers that match the backend API
const BACKEND_REQUIRED_HEADERS = {
  senderName: "หมายเลขที่แสดง/Sender Name",
  phoneNumber: "เบอร์โทรศัพท์", 
  mobileProvider: "โครงข่ายที่ใช้งาน(โครงข่ายต้นทาง)",
  fullName: "ชื่อสกุลผู้จดทะเบียน",
  registrationDate: "วันที่จดทะเบียนเบอร์",
  simType: "ประเภทซิม",
  registrationType: "ประเภทการลงทะเบียนซิม",
  imei: "IMEI",
  callSite: "Call Site",
  incidentCount: "จำนวนครั้งการก่อเหตุ",
  hasLog: "พบ log การรับไหม",
  cibResult: "ผลการตรวจสอบCIB/CCIB",
  caseId: "case ID NO",
  contactInfo: "ข้อมูลการติดต่อ",
  note: "Note"
} as const;

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
    isValidated?: boolean;
  }>>({});

  // Track which requests have been successfully submitted
  const [submittedRequests, setSubmittedRequests] = useState<Set<string>>(new Set());
  
  // Active view state
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!session?.user?.token) {
      setError('No authentication token available');
      setIsLoading(false);
      return;
    }

    console.log('🔄 Fetching ISP pending senders data...');
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchIspPendingSenders(session.user.token);
      console.log('📥 API response received:', result.success ? 'success' : 'failed', result);
      
      if (result.success && result.data) {
        if (Object.keys(result.data).length === 0) {
          setError('ยังไม่มีหนังสือขอข้อมูลสำหรับบทบาทของคุณ');
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
            allFilesUploaded: false
          };
        });
        
        console.log(`✅ Data loaded: ${groups.length} request groups, ${groups.reduce((sum, g) => sum + g.records.length, 0)} total records`);
        setRequestGroups(groups);
      } else {
        console.error('❌ API request failed:', result.error);
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('💥 Error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.token]);

  // Load data on component mount
  useEffect(() => {
    if (session?.user?.token) {
      fetchData();
    }
  }, [session?.user?.token, fetchData]);

  // Generate Excel template with correct backend headers
  const generateExcelTemplate = useCallback((records: TelcoRecord[]) => {
    const headers = Object.values(BACKEND_REQUIRED_HEADERS);
    
    const dataRows = records.map(record => [
      record.senderName,                    // หมายเลขที่แสดง/Sender Name
      record.phoneNumber,                   // เบอร์โทรศัพท์
      record.mobileProvider,                // โครงข่ายที่ใช้งาน(โครงข่ายต้นทาง)
      record.fullName || '',                // ชื่อสกุลผู้จดทะเบียน
      record.date,                          // วันที่จดทะเบียนเบอร์
      '',                                   // ประเภทซิม
      '',                                   // ประเภทการลงทะเบียนซิม
      '',                                   // IMEI
      '',                                   // Call Site
      '',                                   // จำนวนครั้งการก่อเหตุ
      '',                                   // พบ log การรับไหม
      '',                                   // ผลการตรวจสอบCIB/CCIB
      '',                                   // case ID NO
      '',                                   // ข้อมูลการติดต่อ
      ''                                    // Note
    ]);

    return [headers, ...dataRows];
  }, []);

  // Download Excel template
  const downloadExcelTemplate = useCallback((group: TelcoRequestGroup) => {
    console.log(`📥 Generating Excel template for request ${group.requestId}...`);
    
    const data = generateExcelTemplate(group.records);
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Auto-size columns
    const columnWidths = data[0].map((_, colIndex) => {
      const maxLength = Math.max(
        ...data.map(row => String(row[colIndex] || '').length)
      );
      return { wch: Math.min(Math.max(maxLength + 2, 15), 50) };
    });
    ws['!cols'] = columnWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Telco_Response");
    
    const filename = `telco_response_${group.requestId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    console.log(`✅ Excel template downloaded: ${filename}`);
    console.log('📝 Template headers:', data[0]);
  }, [generateExcelTemplate]);

  // Validate Excel file
  const validateExcelFile = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const [headers] = jsonData as string[][];
          
          const requiredHeader = BACKEND_REQUIRED_HEADERS.senderName;
          
          console.log('🔍 Excel validation:', {
            filename: file.name,
            headers: headers,
            requiredHeader: requiredHeader,
            hasRequiredHeader: headers?.includes(requiredHeader)
          });
          
          if (!headers || !headers.includes(requiredHeader)) {
            alert(`❌ ไฟล์ Excel ไม่ถูกต้อง!\n\nไม่พบคอลัมน์ที่จำเป็น: "${requiredHeader}"\n\nกรุณา:\n1. ดาวน์โหลดเทมเพลตใหม่\n2. อย่าเปลี่ยนชื่อคอลัมน์\n3. อัปโหลดไฟล์ที่ถูกต้อง`);
            resolve(false);
            return;
          }
          
          resolve(true);
        } catch (error) {
          console.error('💥 Excel validation error:', error);
          alert('เกิดข้อผิดพลาดในการตรวจสอบไฟล์ Excel');
          resolve(false);
        }
      };
      reader.readAsBinaryString(file);
    });
  }, []);

  // Handle Excel file upload
  const handleExcelUpload = useCallback(async (requestId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`📤 Uploading Excel file for request ${requestId}:`, file.name);

    // Validate the Excel file
    const isValid = await validateExcelFile(file);
    if (!isValid) {
      event.target.value = ''; // Reset the input
      return;
    }

    // Store the validated file
    setUploadedFiles(prev => ({
      ...prev,
      [requestId]: {
        excel: file,
        attachments: prev[requestId]?.attachments || [],
        isValidated: true
      }
    }));

    console.log(`✅ Excel file uploaded and validated for request ${requestId}`);
    event.target.value = ''; // Reset the input
  }, [validateExcelFile]);

  // Handle additional file uploads
  const handleFileUpload = useCallback((requestId: string, files: File[]) => {
    console.log(`📎 Adding ${files.length} attachment(s) for request ${requestId}`);
    
    setUploadedFiles(prev => ({
      ...prev,
      [requestId]: {
        excel: prev[requestId]?.excel,
        attachments: [...(prev[requestId]?.attachments || []), ...files],
        isValidated: prev[requestId]?.isValidated
      }
    }));
  }, []);

  // Remove file
  const removeFile = useCallback((requestId: string, type: 'excel' | 'attachment', index?: number) => {
    if (submittedRequests.has(requestId)) {
      alert('❌ ไม่สามารถลบไฟล์ได้ เนื่องจากได้ส่งข้อมูลแล้ว');
      return;
    }

    setUploadedFiles(prev => {
      const current = prev[requestId];
      if (!current) return prev;

      if (type === 'excel') {
        return {
          ...prev,
          [requestId]: {
            attachments: current.attachments,
            isValidated: false
          }
        };
      } else if (type === 'attachment' && typeof index === 'number') {
        return {
          ...prev,
          [requestId]: {
            excel: current.excel,
            attachments: current.attachments.filter((_, i) => i !== index),
            isValidated: current.isValidated
          }
        };
      }

      return prev;
    });
  }, [submittedRequests]);

  // Submit individual request
  const submitRequest = useCallback(async (requestId: string) => {
    const files = uploadedFiles[requestId];
    if (!files?.excel) {
      alert('❌ กรุณาอัปโหลดไฟล์ Excel ก่อนส่งข้อมูล');
      return;
    }

    if (!files.isValidated) {
      alert('❌ ไฟล์ Excel ยังไม่ได้รับการตรวจสอบ กรุณาอัปโหลดใหม่');
      return;
    }

    if (!session?.user?.token) {
      alert('❌ ไม่พบข้อมูลการเข้าสู่ระบบ');
      return;
    }

    console.log(`🚀 Submitting request ${requestId}...`);
    setSubmittingRequests(prev => new Set([...prev, requestId]));
    
    try {
      const allFiles = [files.excel, ...files.attachments];
      console.log(`📁 Submitting ${allFiles.length} files:`, allFiles.map(f => f.name));
      
      const result = await submitIspResponse(requestId, allFiles, session.user.token);
      
      if (result.success) {
        const successCount = result.data?.successful_count || 0;
        const failedCount = result.data?.failed_count || 0;
        
        console.log('✅ Submission result:', {
          requestId,
          successCount,
          failedCount,
          details: result.data?.details
        });

        if (successCount > 0) {
          // Mark as submitted and refresh data
          setSubmittedRequests(prev => new Set([...prev, requestId]));
          alert(`✅ ส่งข้อมูลสำเร็จ!\n\nสำเร็จ: ${successCount} รายการ${failedCount > 0 ? `\nไม่สำเร็จ: ${failedCount} รายการ` : ''}`);
          await fetchData();
        } else {
          alert(`❌ การส่งข้อมูลไม่สำเร็จ!\n\nไม่สำเร็จ: ${failedCount} รายการ\n\nกรุณาตรวจสอบ:\n• บทบาทของคุณตรงกับผู้ให้บริการหรือไม่\n• ข้อมูลใน Excel ถูกต้องหรือไม่`);
        }
      } else {
        console.error('❌ Submission failed:', result.error);
        alert(`❌ เกิดข้อผิดพลาด: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Submission error:', error);
      alert('❌ เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setSubmittingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestId);
        return updated;
      });
    }
  }, [uploadedFiles, session, fetchData, submittedRequests]);

  // Submit all requests
  const submitAllRequests = useCallback(async () => {
    if (!session?.user?.token) {
      alert('❌ ไม่พบข้อมูลการเข้าสู่ระบบ');
      return;
    }

    const submittableGroups = requestGroups.filter(g => 
      g.canSubmit && 
      uploadedFiles[g.requestId]?.excel && 
      uploadedFiles[g.requestId]?.isValidated &&
      !submittedRequests.has(g.requestId)
    );

    if (submittableGroups.length === 0) {
      alert('❌ ไม่มีข้อมูลที่พร้อมส่ง\n\nกรุณาอัปโหลดไฟล์ Excel ที่ถูกต้องก่อน');
      return;
    }

    const confirmed = confirm(
      `🚀 ส่งข้อมูลทั้งหมด?\n\nจำนวน: ${submittableGroups.length} รายการ\nรายการ: ${submittableGroups.map(g => g.requestId).join(', ')}\n\nต้องการดำเนินการต่อหรือไม่?`
    );
    
    if (!confirmed) return;

    console.log(`🚀 Starting batch submission for ${submittableGroups.length} requests...`);
    let successCount = 0;
    let failCount = 0;

    for (const group of submittableGroups) {
      setSubmittingRequests(prev => new Set([...prev, group.requestId]));
      
      try {
        const files = uploadedFiles[group.requestId];
        const allFiles = [files.excel!, ...files.attachments];
        
        const result = await submitIspResponse(group.requestId, allFiles, session.user.token);
        
        if (result.success && (result.data?.successful_count || 0) > 0) {
          setSubmittedRequests(prev => new Set([...prev, group.requestId]));
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`💥 Batch submission error for ${group.requestId}:`, error);
        failCount++;
      } finally {
        setSubmittingRequests(prev => {
          const updated = new Set(prev);
          updated.delete(group.requestId);
          return updated;
        });
      }
    }

    alert(`🎉 ส่งข้อมูลเสร็จสิ้น!\n\nสำเร็จ: ${successCount} รายการ${failCount > 0 ? `\nไม่สำเร็จ: ${failCount} รายการ` : ''}`);
    await fetchData();
  }, [requestGroups, uploadedFiles, session, fetchData, submittedRequests]);

  // Download PDF file
  const handleDownloadPdf = useCallback(async (fileId: string, filename: string) => {
    if (!session?.user?.token) {
      alert('❌ ไม่พบข้อมูลการเข้าสู่ระบบ');
      return;
    }

    try {
      console.log(`📥 Downloading file: ${fileId}`);
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
        console.log(`✅ File downloaded: ${result.filename || filename}`);
      } else {
        alert(`❌ ไม่สามารถดาวน์โหลดไฟล์ได้: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Download error:', error);
      alert('❌ เกิดข้อผิดพลาดในการดาวน์โหลด');
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

  // Toggle request expansion
  const toggleExpansion = useCallback((requestId: string) => {
    setExpandedRequests(prev => {
      const updated = new Set(prev);
      if (updated.has(requestId)) {
        updated.delete(requestId);
      } else {
        updated.add(requestId);
      }
      return updated;
    });
  }, []);

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <TelcoAccessGuard userRole={session?.user?.role} isLoading={true}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </TelcoAccessGuard>
    );
  }

  // Error state
  if (error) {
    return (
      <TelcoAccessGuard userRole={session?.user?.role}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchData}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <RotateCcw className="h-4 w-4" />
              ลองใหม่
            </button>
          </div>
        </div>
      </TelcoAccessGuard>
    );
  }

  // Main UI
  return (
    <TelcoAccessGuard userRole={session?.user?.role}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🏢 ระบบจัดการข้อมูล Telco
            </h1>
            <p className="text-gray-600 text-lg">
              จัดการข้อมูลผู้ส่งข้อความจากผู้ให้บริการโทรคมนาคม
            </p>
            <div className="mt-4 bg-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">บทบาทของคุณ: {session?.user?.role?.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="🔍 ค้นหา Request ID, ชื่อผู้ส่ง, เบอร์โทร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
            
            <div className="flex gap-3">
              {/* Send All Button */}
              {requestGroups.some(g => 
                g.canSubmit && 
                uploadedFiles[g.requestId]?.excel && 
                uploadedFiles[g.requestId]?.isValidated &&
                !submittedRequests.has(g.requestId)
              ) && (
                <button
                  onClick={submitAllRequests}
                  disabled={submittingRequests.size > 0}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
                >
                  {submittingRequests.size > 0 ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      กำลังส่งทั้งหมด...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      🚀 ส่งทั้งหมด
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg"
              >
                <RotateCcw className="h-4 w-4" />
                รีเฟรชข้อมูล
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 transform hover:scale-105 transition-transform">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">คำขอทั้งหมด</p>
                  <p className="text-3xl font-bold text-gray-900">{requestGroups.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 transform hover:scale-105 transition-transform">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">รอดำเนินการ</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {requestGroups.filter(g => g.canSubmit && !submittedRequests.has(g.requestId)).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 transform hover:scale-105 transition-transform">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">ส่งแล้ว</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {requestGroups.filter(g => !g.canSubmit || submittedRequests.has(g.requestId)).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 transform hover:scale-105 transition-transform">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">รายการทั้งหมด</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {requestGroups.reduce((sum, g) => sum + g.records.length, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Request Groups */}
          <div className="space-y-6">
            {filteredGroups.length === 0 && searchTerm && (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">ไม่พบข้อมูล</h3>
                <p className="text-gray-500">ลองเปลี่ยนคำค้นหาและลองใหม่</p>
              </div>
            )}

            {filteredGroups.map((group) => {
              const isExpanded = expandedRequests.has(group.requestId);
              const files = uploadedFiles[group.requestId];
              const canSubmit = group.canSubmit && !submittedRequests.has(group.requestId);
              const isSubmitting = submittingRequests.has(group.requestId);
              const isSubmitted = submittedRequests.has(group.requestId);

              return (
                <div key={group.requestId} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* Group Header */}
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold text-gray-900">
                            📋 Request ID: {group.requestId}
                          </h2>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            isSubmitted
                              ? 'bg-green-100 text-green-800'
                              : canSubmit 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isSubmitted ? '✅ ส่งแล้ว' : canSubmit ? '⏳ รอดำเนินการ' : '🔒 ไม่สามารถส่งได้'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>📊 รายการ: {group.records.length} รายการ</span>
                          <span>👥 ผู้ให้บริการ: {group.records[0]?.mobileProvider}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {/* Download Template */}
                        <button
                          onClick={() => downloadExcelTemplate(group)}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2 shadow-md"
                        >
                          <Download className="h-4 w-4" />
                          📥 ดาวน์โหลดเทมเพลต
                        </button>

                        {/* Upload Excel */}
                        {canSubmit && (
                          <div className="relative">
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={(e) => handleExcelUpload(group.requestId, e)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md">
                              <Upload className="h-4 w-4" />
                              📤 อัปโหลด Excel
                            </button>
                          </div>
                        )}

                        {/* Upload Attachments */}
                        {canSubmit && (
                          <div className="relative">
                            <input
                              type="file"
                              multiple
                              onChange={(e) => handleFileUpload(group.requestId, Array.from(e.target.files || []))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-md">
                              <Upload className="h-4 w-4" />
                              📎 เอกสารแนบ
                            </button>
                          </div>
                        )}

                        {/* Submit Button */}
                        {canSubmit && (
                          <button
                            onClick={() => submitRequest(group.requestId)}
                            disabled={isSubmitting || !files?.excel || !files?.isValidated}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                กำลังส่ง...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                🚀 ส่งข้อมูล
                              </>
                            )}
                          </button>
                        )}

                        {/* Expand/Collapse */}
                        <button
                          onClick={() => toggleExpansion(group.requestId)}
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {isExpanded ? '🔼 ซ่อน' : '🔽 แสดง'}
                        </button>
                      </div>
                    </div>

                    {/* File Upload Status */}
                    {files && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          📁 ไฟล์ที่อัปโหลด
                        </h4>
                        <div className="space-y-2">
                          {/* Excel File */}
                          {files.excel && (
                            <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="font-medium">📊 Excel: {files.excel.name}</span>
                                {files.isValidated && <span className="text-xs bg-green-200 px-2 py-1 rounded-full">✅ ตรวจสอบแล้ว</span>}
                              </div>
                              {!isSubmitted && (
                                <button
                                  onClick={() => removeFile(group.requestId, 'excel')}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                                  title="ลบไฟล์ Excel"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Attachment Files */}
                          {files.attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2 text-blue-700">
                                <FileText className="h-4 w-4" />
                                <span>📎 {file.name}</span>
                              </div>
                              {!isSubmitted && (
                                <button
                                  onClick={() => removeFile(group.requestId, 'attachment', index)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                                  title="ลบไฟล์แนบ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Records Details */}
                  {isExpanded && (
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        📋 รายละเอียดข้อมูล ({group.records.length} รายการ)
                      </h3>
                      <div className="grid gap-4">
                        {group.records.map((record, index) => (
                          <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  👤 ชื่อผู้ส่ง
                                </label>
                                <p className="text-sm text-gray-900 font-semibold">{record.senderName}</p>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  📱 เบอร์โทร
                                </label>
                                <p className="text-sm text-gray-900">{record.phoneNumber}</p>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  🏢 ผู้ให้บริการ
                                </label>
                                <p className="text-sm text-gray-900 font-semibold">{record.mobileProvider}</p>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  📝 ชื่อผู้ลงทะเบียน
                                </label>
                                <p className="text-sm text-gray-900">{record.fullName || 'ไม่ระบุ'}</p>
                              </div>
                            </div>

                            {/* PDF Download Links */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {record.replyFileId && (
                                <button
                                  onClick={() => handleDownloadPdf(record.replyFileId!, 'reply.pdf')}
                                  className="text-xs bg-green-100 text-green-700 px-3 py-2 rounded-md hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                  <Download className="h-3 w-3" />
                                  📄 ดาวน์โหลดตอบกลับ
                                </button>
                              )}
                            </div>

                            {/* Status */}
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                                record.isResponseSubmitted
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {record.isResponseSubmitted ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    ✅ ส่งแล้ว
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3 w-3" />
                                    ⏳ รอดำเนินการ
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {requestGroups.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <FileText className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-medium text-gray-900 mb-2">ไม่มีข้อมูล</h3>
              <p className="text-gray-500 mb-6 text-lg">ยังไม่มีคำขอจากผู้ประกอบการสำหรับบทบาทของคุณ</p>
              <button
                onClick={fetchData}
                className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="h-4 w-4" />
                รีเฟรชข้อมูล
              </button>
            </div>
          )}
        </div>
      </div>
    </TelcoAccessGuard>
  );
}
