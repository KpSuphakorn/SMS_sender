// Types for telco data management
export interface TelcoRecord {
  id: string;
  registrationDate: string;
  registrantId: string;
  fullName: string;
  simType: string;
  registrationType: string;
  imei: string;
  callSite: string;
  incidentCount: number;
  hasLog: boolean;
  cibResult: string;
  caseId: string;
  contactInfo: string;
  note: string;
  // File uploads
  registrationDocument?: File;
  paymentProof?: File;
  idCard?: File;
  // Upload status
  isUploaded: boolean;
  isSubmitted: boolean;
  // Submission timestamp
  submittedAt?: Date;
  // Additional metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TelcoStats {
  total: number;
  submitted: number;
  pending: number;
  withDocuments: number;
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
}

// Excel mapping configuration
export interface ExcelColumnMapping {
  registrationDate: string;
  registrantId: string;
  fullName: string;
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

export const DEFAULT_EXCEL_MAPPING: ExcelColumnMapping = {
  registrationDate: 'วันที่จดทะเบียนเบอร์',
  registrantId: 'IDผู้ลงทะเบียน',
  fullName: 'ชื่อสกุลผู้จดทะเบียน',
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
