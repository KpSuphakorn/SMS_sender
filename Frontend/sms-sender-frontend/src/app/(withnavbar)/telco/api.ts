// API helper functions for telco backend integration
import { ApiSenderData, TelcoRecord, IspResponseApiResponse } from './types';

// Base API URL - adjust this to match your backend
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Helper function to get auth headers
const getAuthHeaders = (token?: string) => {
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {},
  token?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const url = `${BACKEND_URL}/api${endpoint}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(token),
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API Request Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Fetch pending senders for the current telco user
 * Returns data grouped by request_id
 */
export async function fetchIspPendingSenders(token?: string): Promise<{ success: boolean; data?: Record<string, ApiSenderData[]>; error?: string }> {
  return apiRequest<Record<string, ApiSenderData[]>>('/isp-pending-senders', {}, token);
}

/**
 * Download file by ID (for PDFs, Excel files, etc.)
 */
export async function downloadFile(fileId: string, token?: string): Promise<{ success: boolean; data?: Blob; filename?: string; error?: string }> {
  try {
    const url = `${BACKEND_URL}/api/file/${fileId}`;
    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download';
    
    return { success: true, data: blob, filename };
  } catch (error) {
    console.error('Download Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    };
  }
}

/**
 * Submit ISP response with Excel file and attachments
 */
export async function submitIspResponse(
  requestId: string, 
  files: File[],
  token?: string
): Promise<{ success: boolean; data?: IspResponseApiResponse; error?: string }> {
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
    });

    const url = `${BACKEND_URL}/api/isp-response/${requestId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Submission failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Submission Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Submission failed' 
    };
  }
}

/**
 * Check if a sender is suspended
 */
export async function checkSenderSuspension(
  senderName: string,
  token?: string
): Promise<{ success: boolean; data?: { is_suspended: boolean; sender_name: string }; error?: string }> {
  return apiRequest<{ is_suspended: boolean; sender_name: string }>(`/check-suspension/${encodeURIComponent(senderName)}`, {}, token);
}

/**
 * Convert API sender data to frontend TelcoRecord format
 */
export function convertApiDataToTelcoRecord(apiData: ApiSenderData): TelcoRecord {
  return {
    id: `${apiData.sender_name}-${apiData.request_id}`,
    requestId: apiData.request_id,
    senderName: apiData.sender_name,
    phoneNumber: apiData.phone_number,
    mobileProvider: apiData.mobile_provider,
    fullName: apiData.full_name || '',
    date: apiData.date,
    registrationDate: apiData.sender_created_date,
    
    // Excel fillable fields (may be empty initially)
    simType: apiData.sim_type || '',
    registrationType: apiData.registration_type || '',
    imei: apiData.imei || '',
    callSite: apiData.call_site || '',
    incidentCount: apiData.incident_count || '',
    hasLog: apiData.log_found || '',
    cibResult: apiData.cib_ccib_result || '',
    caseId: apiData.case_id || '',
    contactInfo: apiData.contact_info || '',
    note: apiData.note || '',
    
    // Status and submission info
    status: apiData.status,
    latestStatus: apiData.latest_request_status,
    statusDescription: apiData.status_description,
    isResponseSubmitted: apiData.is_response_submitted,
    
    // PDF IDs
    dataPdfId: apiData.data_pdf_id,
    suspensionPdfId: apiData.pdf_sent_suspension_id,
    replyFileId: apiData.reply_file_id,
    
    // Metadata
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
  };
}

/**
 * Generate Excel template with data from fetched records
 */
export function generateTelcoExcelTemplate(records: TelcoRecord[]): any[][] {
  const headers = [
    'หมายเลขที่แสดง/Sender Name',
    'เบอร์โทรศัพท์',
    'โครงข่ายที่ใช้งาน(โครงข่ายต้นทาง)',
    'ชื่อสกุลผู้จดทะเบียน',
    'วันที่จดทะเบียนเบอร์',
    'ประเภทซิม',
    'ประเภทการลงทะเบียนซิม',
    'IMEI',
    'Call Site',
    'จำนวนครั้งการก่อเหตุ',
    'พบ log การรับไหม',
    'ผลการตรวจสอบCIB/CCIB',
    'case ID NO',
    'ข้อมูลการติดต่อ',
    'Note'
  ];

  const dataRows = records.map(record => [
    record.senderName,
    record.phoneNumber,
    record.mobileProvider,
    record.fullName,
    record.date,
    record.simType || '',
    record.registrationType || '',
    record.imei || '',
    record.callSite || '',
    record.incidentCount || '',
    record.hasLog || '',
    record.cibResult || '',
    record.caseId || '',
    record.contactInfo || '',
    record.note || ''
  ]);

  return [headers, ...dataRows];
}

/**
 * Download Excel template with data
 */
export function downloadExcelTemplate(records: TelcoRecord[], requestId: string) {
  // This function will be called from the component with XLSX library
  const data = generateTelcoExcelTemplate(records);
  return data;
}