import { TelcoRecord, TelcoFilters, ExcelData, DEFAULT_EXCEL_MAPPING } from './types';

// Template validation result interface
export interface TemplateValidationResult {
  isValid: boolean;
  missingColumns: string[];
  extraColumns: string[];
  warnings: string[];
}

// Validate if Excel headers match the expected template
export const validateExcelTemplate = (headers: string[]): TemplateValidationResult => {
  const mapping = DEFAULT_EXCEL_MAPPING;
  const expectedColumns = Object.values(mapping);
  const actualColumns = headers.filter(header => header && header.trim() !== '');
  
  // Find missing required columns
  const missingColumns = expectedColumns.filter(col => 
    !actualColumns.some(actual => 
      actual.toLowerCase().trim() === col.toLowerCase().trim()
    )
  );
  
  // Find extra columns that don't match template
  const extraColumns = actualColumns.filter(col => 
    !expectedColumns.some(expected => 
      expected.toLowerCase().trim() === col.toLowerCase().trim()
    )
  );
  
  // Generate warnings
  const warnings: string[] = [];
  
  if (missingColumns.length > 0) {
    warnings.push(`ไม่พบคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}`);
  }
  
  if (extraColumns.length > 0) {
    warnings.push(`พบคอลัมน์ที่ไม่อยู่ในแม่แบบ: ${extraColumns.join(', ')}`);
  }
  
  if (actualColumns.length === 0) {
    warnings.push('ไม่พบหัวคอลัมน์ในไฟล์ Excel');
  }
  
  // Check for common Excel issues
  if (headers.some(h => h && h.toString().includes('Unnamed'))) {
    warnings.push('พบคอลัมน์ที่ไม่มีชื่อ (Unnamed columns) - อาจเกิดจากการมีข้อมูลในคอลัมน์ที่ไม่ควรมี');
  }
  
  // Check for duplicate headers
  const duplicates = actualColumns.filter((item, index) => actualColumns.indexOf(item) !== index);
  if (duplicates.length > 0) {
    warnings.push(`พบหัวคอลัมน์ซ้ำ: ${[...new Set(duplicates)].join(', ')}`);
  }
  
  const isValid = missingColumns.length === 0 && actualColumns.length > 0 && duplicates.length === 0;
  
  return {
    isValid,
    missingColumns,
    extraColumns,
    warnings
  };
};

// Check if Excel file structure is correct
export const checkExcelStructure = (jsonData: any[][]): TemplateValidationResult => {
  if (!jsonData || jsonData.length === 0) {
    return {
      isValid: false,
      missingColumns: [],
      extraColumns: [],
      warnings: ['ไฟล์ Excel ว่างเปล่าหรือไม่สามารถอ่านได้']
    };
  }
  
  if (jsonData.length < 2) {
    return {
      isValid: false,
      missingColumns: [],
      extraColumns: [],
      warnings: ['ไฟล์ Excel ต้องมีหัวคอลัมน์และข้อมูลอย่างน้อย 1 แถว']
    };
  }
  
  const headers = jsonData[0] as string[];
  return validateExcelTemplate(headers);
};

// Get helpful suggestions based on validation results
export const getTemplateHelpSuggestions = (validation: TemplateValidationResult): string[] => {
  const suggestions: string[] = [];
  
  if (validation.missingColumns.length > 0) {
    suggestions.push('ตรวจสอบว่าคอลัมน์ที่จำเป็นครบถ้วน โดยเฉพาะ: ' + validation.missingColumns.slice(0, 3).join(', '));
  }
  
  if (validation.extraColumns.length > 0) {
    suggestions.push('ลบคอลัมน์ที่ไม่จำเป็นออก หรือเปลี่ยนชื่อให้ตรงกับแม่แบบ');
  }
  
  suggestions.push('ดาวน์โหลดแม่แบบใหม่และคัดลอกข้อมูลไปใส่');
  suggestions.push('ตรวจสอบว่าแถวแรกเป็นหัวคอลัมน์ (Header) ไม่ใช่ข้อมูล');
  suggestions.push('บันทึกไฟล์ในรูปแบบ Excel (.xlsx) ไม่ใช่ CSV หรือรูปแบบอื่น');
  
  return suggestions;
};

// Utility functions for telco data processing
export const generateMockRecord = (index: number): TelcoRecord => ({
  id: `record-${index + 1}`,
  requestId: `REQ-${index + 1}`,
  senderName: `Sender-${index + 1}`,
  phoneNumber: `0${80000000 + index}`,
  mobileProvider: index % 3 === 0 ? 'AIS' : index % 3 === 1 ? 'TRUE' : 'DTAC',
  fullName: `นายทดสอบ ${index + 1}`,
  date: new Date(2025, 0, 15 + index).toLocaleDateString('th-TH'),
  registrationDate: new Date(2025, 0, 15 + index).toLocaleDateString('th-TH'),
  simType: index % 2 === 0 ? 'Pre-paid' : 'Post-paid',
  registrationType: index % 3 === 0 ? 'บุคคลธรรมดา' : 'นิติบุคคล',
  imei: `${350000000000000 + index}`,
  callSite: `Site-${index + 1}`,
  incidentCount: Math.floor(Math.random() * 5) + 1,
  hasLog: Math.random() > 0.3 ? 'มี' : 'ไม่มี',
  cibResult: ['Clean', 'Suspicious', 'Flagged'][Math.floor(Math.random() * 3)],
  caseId: `CASE-${(2025000 + index).toString()}`,
  contactInfo: `0${80000000 + index}`,
  note: index % 4 === 0 ? `หมายเหตุสำหรับเคส ${index + 1}` : '',
  status: [{
    name: 'pending',
    updated_at: new Date().toISOString()
  }],
  latestStatus: 'pending',
  statusDescription: 'รอการดำเนินการ',
  isResponseSubmitted: false,
  dataPdfId: null,
  suspensionPdfId: `PDF-${index + 1}`,
  replyFileId: `REPLY-${index + 1}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Check if a row has meaningful data (not completely empty)
export const isValidExcelRow = (row: ExcelData): boolean => {
  const mapping = DEFAULT_EXCEL_MAPPING;
  
  // Check essential fields that should have data
  const essentialFields = [
    row[mapping.fullName],
    row[mapping.senderName],
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
    requestId: `REQ-${index + 1}`,
    senderName: row[mapping.senderName] || `Sender-${index + 1}`,
    phoneNumber: row[mapping.phoneNumber] || '',
    mobileProvider: row[mapping.mobileProvider] || '',
    fullName: row[mapping.fullName] || `ไม่ระบุชื่อ ${index + 1}`,
    date: row[mapping.registrationDate] || '',
    registrationDate: row[mapping.registrationDate] || '',
    simType: row[mapping.simType] || '',
    registrationType: row[mapping.registrationType] || '',
    imei: row[mapping.imei] || '',
    callSite: row[mapping.callSite] || '',
    incidentCount: parseInt(row[mapping.incidentCount]) || 0,
    hasLog: row[mapping.hasLog] === 'มี' || row[mapping.hasLog] === 'Yes' ? 'มี' : 'ไม่มี',
    cibResult: row[mapping.cibResult] || '',
    caseId: row[mapping.caseId] || `CASE-${index + 1}`,
    contactInfo: row[mapping.contactInfo] || '',
    note: row[mapping.note] || '',
    status: [{
      name: 'pending',
      updated_at: new Date().toISOString()
    }],
    latestStatus: 'pending',
    statusDescription: 'รอการดำเนินการ',
    isResponseSubmitted: false,
    dataPdfId: null,
    suspensionPdfId: `PDF-${index + 1}`,
    replyFileId: `REPLY-${index + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
        record.senderName,
        record.phoneNumber,
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
          if (!record.isResponseSubmitted) return false;
          break;
        case 'pending':
          if (record.isResponseSubmitted) return false;
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
    submitted: records.filter(r => r.isResponseSubmitted).length,
    pending: records.filter(r => !r.isResponseSubmitted).length,
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
      mapping.senderName,
      mapping.phoneNumber,
      mapping.mobileProvider,
      mapping.fullName,
      mapping.registrationDate,
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
    ['12345', '0800000001', 'AIS', 'นายตัวอย่าง 1', '15/01/2025', 'Pre-paid', 'บุคคลธรรมดา', '350000000000001', 'Site-1', '2', 'มี', 'Clean', 'CASE-2025001', '0800000001', 'หมายเหตุตัวอย่าง'],
    ['12346', '0800000002', 'TRUE', 'นายตัวอย่าง 2', '16/01/2025', 'Post-paid', 'นิติบุคคล', '350000000000002', 'Site-2', '1', 'ไม่มี', 'Suspicious', 'CASE-2025002', '0800000002', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], // Empty row for user input
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
        aValue = a.isResponseSubmitted ? 1 : 0;
        bValue = b.isResponseSubmitted ? 1 : 0;
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

// Validate if a record is ready for submission
export const canSubmitRecord = (record: TelcoRecord): boolean => {
  return !!(record.registrationDocument && record.paymentProof && record.idCard && !record.isResponseSubmitted);
};

// Get submission validation results for all records
export const getSubmissionValidation = (records: TelcoRecord[]) => {
  const submittableRecords = records.filter(canSubmitRecord);
  const alreadySubmitted = records.filter(record => record.isResponseSubmitted);
  const missingDocuments = records.filter(record => 
    !record.isResponseSubmitted && !canSubmitRecord(record)
  );

  return {
    submittableRecords,
    alreadySubmitted,
    missingDocuments,
    canSubmitAll: submittableRecords.length > 0,
    totalReadyToSubmit: submittableRecords.length
  };
};
