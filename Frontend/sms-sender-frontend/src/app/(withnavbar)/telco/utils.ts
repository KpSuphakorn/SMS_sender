import { TelcoRecord, TelcoFilters, ExcelData, DEFAULT_EXCEL_MAPPING } from './types';

// Utility functions for telco data processing
export const generateMockRecord = (index: number): TelcoRecord => ({
  id: `record-${index + 1}`,
  registrationDate: new Date(2025, 0, 15 + index).toLocaleDateString('th-TH'),
  registrantId: `ID${(1000 + index).toString()}`,
  fullName: `นายทดสอบ ${index + 1}`,
  simType: index % 2 === 0 ? 'Pre-paid' : 'Post-paid',
  registrationType: index % 3 === 0 ? 'บุคคลธรรมดา' : 'นิติบุคคล',
  imei: `${350000000000000 + index}`,
  callSite: `Site-${index + 1}`,
  incidentCount: Math.floor(Math.random() * 5) + 1,
  hasLog: Math.random() > 0.3,
  cibResult: ['Clean', 'Suspicious', 'Flagged'][Math.floor(Math.random() * 3)],
  caseId: `CASE-${(2025000 + index).toString()}`,
  contactInfo: `0${80000000 + index}`,
  note: index % 4 === 0 ? `หมายเหตุสำหรับเคส ${index + 1}` : '',
  isUploaded: true,
  isSubmitted: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Check if a row has meaningful data (not completely empty)
export const isValidExcelRow = (row: ExcelData): boolean => {
  const mapping = DEFAULT_EXCEL_MAPPING;
  
  // Check essential fields that should have data
  const essentialFields = [
    row[mapping.fullName],
    row[mapping.registrantId],
    row[mapping.caseId]
  ];
  
  // At least one essential field must have meaningful content
  return essentialFields.some(field => 
    field && 
    typeof field === 'string' && 
    field.toString().trim() !== '' &&
    !field.toString().match(/^ไม่ระบุ|^$|^undefined|^null/i)
  );
};

// Convert Excel row data to TelcoRecord
export const convertExcelRowToRecord = (row: ExcelData, index: number): TelcoRecord => {
  const mapping = DEFAULT_EXCEL_MAPPING;
  
  return {
    id: `excel-${index + 1}`,
    registrationDate: row[mapping.registrationDate] || '',
    registrantId: row[mapping.registrantId] || '',
    fullName: row[mapping.fullName] || `ไม่ระบุชื่อ ${index + 1}`,
    simType: row[mapping.simType] || '',
    registrationType: row[mapping.registrationType] || '',
    imei: row[mapping.imei] || '',
    callSite: row[mapping.callSite] || '',
    incidentCount: parseInt(row[mapping.incidentCount]) || 0,
    hasLog: row[mapping.hasLog] === 'มี' || row[mapping.hasLog] === 'Yes' || row[mapping.hasLog] === true,
    cibResult: row[mapping.cibResult] || '',
    caseId: row[mapping.caseId] || `CASE-${index + 1}`,
    contactInfo: row[mapping.contactInfo] || '',
    note: row[mapping.note] || '',
    isUploaded: true,
    isSubmitted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Filter records based on filters
export const filterRecords = (records: TelcoRecord[], filters: TelcoFilters): TelcoRecord[] => {
  return records.filter(record => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableFields = [
        record.fullName,
        record.caseId,
        record.registrantId,
        record.contactInfo,
        record.imei,
        record.note
      ].join(' ').toLowerCase();
      
      if (!searchableFields.includes(searchTerm)) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'submitted':
          if (!record.isSubmitted) return false;
          break;
        case 'pending':
          if (record.isSubmitted) return false;
          break;
        case 'with_documents':
          if (!record.registrationDocument || !record.paymentProof || !record.idCard) {
            return false;
          }
          break;
      }
    }

    // CIB Result filter
    if (filters.cibResult !== 'all' && record.cibResult !== filters.cibResult) {
      return false;
    }

    // SIM Type filter
    if (filters.simType !== 'all' && record.simType !== filters.simType) {
      return false;
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const recordDate = new Date(record.registrationDate);
      if (filters.dateRange.start && recordDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && recordDate > filters.dateRange.end) {
        return false;
      }
    }

    return true;
  });
};

// Calculate statistics
export const calculateStats = (records: TelcoRecord[]) => {
  return {
    total: records.length,
    submitted: records.filter(r => r.isSubmitted).length,
    pending: records.filter(r => !r.isSubmitted).length,
    withDocuments: records.filter(r => 
      r.registrationDocument && r.paymentProof && r.idCard
    ).length
  };
};

// Validate file upload
export const validateFile = (file: File, maxSizeMB = 10): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `ขนาดไฟล์ต้องไม่เกิน ${maxSizeMB}MB`
    };
  }

  // Check file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'รองรับเฉพาะไฟล์ PDF, JPG, JPEG, PNG เท่านั้น'
    };
  }

  return { valid: true };
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate Excel template data
export const generateExcelTemplate = () => {
  const mapping = DEFAULT_EXCEL_MAPPING;
  return [
    [
      mapping.registrationDate,
      mapping.registrantId,
      mapping.fullName,
      mapping.simType,
      mapping.registrationType,
      mapping.imei,
      mapping.callSite,
      mapping.incidentCount,
      mapping.hasLog,
      mapping.cibResult,
      mapping.caseId,
      mapping.contactInfo,
      mapping.note
    ],
    // Example rows
    ['15/01/2025', 'ID1001', 'นายตัวอย่าง 1', 'Pre-paid', 'บุคคลธรรมดา', '350000000000001', 'Site-1', '2', 'มี', 'Clean', 'CASE-2025001', '0800000001', 'หมายเหตุตัวอย่าง'],
    ['16/01/2025', 'ID1002', 'นายตัวอย่าง 2', 'Post-paid', 'นิติบุคคล', '350000000000002', 'Site-2', '1', 'ไม่มี', 'Suspicious', 'CASE-2025002', '0800000002', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''], // Empty row for user input
  ];
};

// Sort records by different criteria
export const sortRecords = (records: TelcoRecord[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): TelcoRecord[] => {
  const sortedRecords = [...records];
  
  sortedRecords.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'fullName':
        aValue = a.fullName;
        bValue = b.fullName;
        break;
      case 'registrationDate':
        aValue = new Date(a.registrationDate);
        bValue = new Date(b.registrationDate);
        break;
      case 'caseId':
        aValue = a.caseId;
        bValue = b.caseId;
        break;
      case 'incidentCount':
        aValue = a.incidentCount;
        bValue = b.incidentCount;
        break;
      case 'cibResult':
        aValue = a.cibResult;
        bValue = b.cibResult;
        break;
      case 'status':
        aValue = a.isSubmitted ? 1 : 0;
        bValue = b.isSubmitted ? 1 : 0;
        break;
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
    }

    if (aValue < bValue) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return sortedRecords;
};
