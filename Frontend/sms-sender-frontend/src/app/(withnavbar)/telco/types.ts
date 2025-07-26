// Types for telco data management

// API Response types from backend
export interface ApiSenderData {
  sender_name: string;
  phone_number: string;
  mobile_provider: string;
  full_name: string;
  date: string;
  sender_created_date: string;
  status: Array<{
    name: string;
    updated_at: string;
  }>;
  latest_request_id: string;
  request_ids: Array<{
    id: string;
    status: string;
  }>;
  latest_request_status: string;
  status_description: string;
  created_at: string;
  updated_at: string;
  data: Record<string, any>;
  reply_file_id: string;
  pdf_sent_data_id: string;
  pdf_sent_suspension_id: string;
  request_id: string;
  data_pdf_id: string | null;
  is_response_submitted: boolean;
  // Additional telco data fields that might be filled from Excel
  sim_type?: string;
  registration_type?: string;
  imei?: string;
  call_site?: string;
  incident_count?: string | number;
  log_found?: string;
  cib_ccib_result?: string;
  case_id?: string;
  contact_info?: string;
  note?: string;
}

// Frontend telco record type (converted from API data)
export interface TelcoRecord {
  id: string;
  requestId: string;
  senderName: string;
  phoneNumber: string;
  mobileProvider: string;
  fullName: string;
  date: string;
  registrationDate: string;
  
  // Excel fillable fields
  simType: string;
  registrationType: string;
  imei: string;
  callSite: string;
  incidentCount: number | string;
  hasLog: string;
  cibResult: string;
  caseId: string;
  contactInfo: string;
  note: string;
  
  // Status and submission info
  status: Array<{
    name: string;
    updated_at: string;
  }>;
  latestStatus: string;
  statusDescription: string;
  isResponseSubmitted: boolean;
  
  // File uploads
  registrationDocument?: File;
  paymentProof?: File;
  idCard?: File;
  
  // PDF IDs
  dataPdfId: string | null;
  suspensionPdfId: string;
  replyFileId: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Request grouping
export interface TelcoRequestGroup {
  requestId: string;
  records: TelcoRecord[];
  canSubmit: boolean;
  allFilesUploaded: boolean;
}

export interface TelcoStats {
  total: number;
  submitted: number;
  pending: number;
  withDocuments: number;
  byProvider: Record<string, number>;
}

export interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File | null) => void;
  hasFile: boolean;
  fileName?: string;
  required?: boolean;
  maxSize?: number; // in MB
}

export interface ExcelData {
  [key: string]: any;
}

// API response types for future backend integration
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TelcoSubmissionRequest {
  recordId: string;
  registrationDocument: File;
  paymentProof: File;
  idCard: File;
  metadata?: {
    submittedBy: string;
    submittedAt: Date;
    notes?: string;
  };
}

export interface TelcoSubmissionResponse {
  id: string;
  status: 'submitted' | 'processing' | 'approved' | 'rejected';
  submittedAt: Date;
  processedAt?: Date;
  notes?: string;
}

// Filter and search types
export interface TelcoFilters {
  search: string;
  status: 'all' | 'submitted' | 'pending' | 'with_documents';
  cibResult: 'all' | 'Clean' | 'Suspicious' | 'Flagged';
  dateRange: {
    start?: Date;
    end?: Date;
  };
  simType: 'all' | 'Pre-paid' | 'Post-paid';
  requestId?: string;
}

// Excel mapping configuration for telco response
export interface TelcoExcelMapping {
  senderName: string;
  phoneNumber: string;
  mobileProvider: string;
  fullName: string;
  date: string;
  simType: string;
  registrationType: string;
  imei: string;
  callSite: string;
  incidentCount: string;
  hasLog: string;
  cibResult: string;
  caseId: string;
  contactInfo: string;
  note: string;
}

export const TELCO_EXCEL_MAPPING: TelcoExcelMapping = {
  senderName: 'หมายเลขที่แสดง/Sender Name',
  phoneNumber: 'เบอร์โทรศัพท์',
  mobileProvider: 'โครงข่ายที่ใช้งาน(โครงข่ายต้นทาง)',
  fullName: 'ชื่อสกุลผู้จดทะเบียน',
  date: 'วันที่จดทะเบียนเบอร์',
  simType: 'ประเภทซิม',
  registrationType: 'ประเภทการลงทะเบียนซิม',
  imei: 'IMEI',
  callSite: 'Call Site',
  incidentCount: 'จำนวนครั้งการก่อเหตุ',
  hasLog: 'พบ log การรับไหม',
  cibResult: 'ผลการตรวจสอบCIB/CCIB',
  caseId: 'case ID NO',
  contactInfo: 'ข้อมูลการติดต่อ',
  note: 'Note'
};

// API types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IspResponseApiRequest {
  request_id: string;
  files: File[];
}

export interface IspResponseApiResponse {
  message: string;
  file_ids: string[];
  successful_count: number;
  failed_count: number;
  details: {
    successful: string[];
    failed: string[];
  };
}

// Excel column mapping for telco data template
export const DEFAULT_EXCEL_MAPPING = {
  senderName: 'หมายเลขที่แสดง/Sender Name',
  phoneNumber: 'เบอร์โทรศัพท์',
  mobileProvider: 'โครงข่ายที่ใช้งาน(โครงข่ายต้นทาง)',
  fullName: 'ชื่อสกุลผู้จดทะเบียน',
  registrationDate: 'วันที่จดทะเบียนเบอร์',
  simType: 'ประเภทซิม',
  registrationType: 'ประเภทการลงทะเบียนซิม',
  imei: 'IMEI',
  callSite: 'Call Site',
  incidentCount: 'จำนวนครั้งการก่อเหตุ',
  hasLog: 'พบ log การรับไหม',
  cibResult: 'ผลการตรวจสอบCIB/CCIB',
  caseId: 'case ID NO',
  contactInfo: 'ข้อมูลการติดต่อ',
  note: 'Note'
} as const;
