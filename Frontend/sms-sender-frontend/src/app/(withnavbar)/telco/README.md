# Telco Data Management System

## Overview
This is a comprehensive telco-side platform for uploading and managing Excel data within the SMS Sender system. The platform allows telco operators to upload structured data, attach required documents, and submit them for processing.

## Features

### 🔐 Role-Based Access Control
- **Access**: Only users with role `"telco"` can access this platform
- **Authentication**: Integrated with NextAuth.js for secure authentication
- **Authorization**: Middleware enforces role-based access restrictions

### 📊 Excel Data Processing
- **Upload**: Support for `.xlsx` and `.xls` files
- **Template**: Downloadable Excel template with required columns
- **Validation**: Data validation and error handling
- **Mock Data**: Generate sample data for testing purposes

### 📄 Document Management
- **Required Documents**:
  1. บัญชีผู้จดทะเบียน (Registration Document)
  2. หลักฐานการชำระเงิน (Payment Proof) 
  3. บัตรประชาชนผู้จดทะเบียน (ID Card)
- **File Types**: PDF, JPG, PNG supported
- **File Size**: Maximum 10MB per file
- **Validation**: Client-side file type and size validation

### 🎛️ Data Filtering & Search
- **Search**: Full-text search across multiple fields
- **Status Filter**: All, Submitted, Pending, With Documents
- **CIB Result Filter**: Clean, Suspicious, Flagged
- **SIM Type Filter**: Pre-paid, Post-paid
- **Date Range**: Filter by registration date

### 📈 Statistics Dashboard
- Total records count
- Submitted records count
- Pending records count
- Records with complete documents count

### 🎨 User Interface
- **Responsive Design**: Works on desktop and mobile
- **Modern UI**: Clean, professional interface with gradients
- **Interactive Cards**: Expandable record cards with detailed views
- **Loading States**: Visual feedback for all operations
- **Success/Error Messages**: User-friendly notifications

## File Structure

```
telco/
├── page.tsx                 # Main telco page component
├── types.ts                 # TypeScript type definitions
├── utils.ts                 # Utility functions
├── api.ts                   # API helper functions
├── components/
│   ├── index.ts            # Component exports
│   ├── TelcoAccessGuard.tsx # Role-based access control
│   ├── ExcelUploadSection.tsx # Excel upload interface
│   ├── StatsCards.tsx      # Statistics display cards
│   ├── RecordCard.tsx      # Individual record card
│   └── FileUploadButton.tsx # File upload component
```

## Data Structure

### TelcoRecord Interface
```typescript
interface TelcoRecord {
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
  // Status tracking
  isUploaded: boolean;
  isSubmitted: boolean;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Excel Template Columns

The system expects Excel files with the following columns:

| Column | Description | Type | Required |
|--------|-------------|------|----------|
| วันที่จดทะเบียนเบอร์ | Registration Date | Date | Yes |
| IDผู้ลงทะเบียน | Registrant ID | String | Yes |
| ชื่อสกุลผู้จดทะเบียน | Full Name | String | Yes |
| ประเภทซิม | SIM Type | String | Yes |
| ประเภทการลงทะเบียนซิม | Registration Type | String | Yes |
| IMEI | IMEI Number | String | Yes |
| Call Site | Call Site | String | Yes |
| จำนวนครั้งการก่อเหตุ | Incident Count | Number | Yes |
| พบ log การรับไหม | Has Log | Boolean | Yes |
| ผลการตรวจสอบCIB/CCIB | CIB Result | String | Yes |
| case ID NO | Case ID | String | Yes |
| ข้อมูลการติดต่อ | Contact Info | String | Yes |
| Note | Notes | String | No |

## Backend Integration

### API Endpoints (Ready for Implementation)

The system is designed to easily connect to backend APIs. The following endpoints are expected:

```typescript
// Submit telco record with files
POST /api/telco/submit
- Body: FormData with files and metadata
- Response: TelcoSubmissionResponse

// Get all telco records  
GET /api/telco/records
- Response: TelcoRecord[]

// Update telco record
PUT /api/telco/records/:id
- Body: Partial<TelcoRecord>
- Response: TelcoRecord

// Delete telco record
DELETE /api/telco/records/:id
- Response: { deleted: boolean }

// Bulk submit records
POST /api/telco/bulk-submit
- Body: { recordIds: string[] }
- Response: { successful: string[], failed: { id: string, error: string }[] }

// Get submission status
GET /api/telco/submissions/:recordId
- Response: TelcoSubmissionResponse
```

### Environment Variables

Add these to your `.env.local` file for backend integration:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Usage Instructions

### For Telco Users:

1. **Login** with telco role credentials
2. **Download Template** to get the correct Excel format
3. **Prepare Excel Data** following the template structure
4. **Upload Excel File** using the upload interface
5. **Review Records** and verify data accuracy
6. **Upload Documents** for each record (3 files required per record)
7. **Submit Records** individually when documents are complete

### For Developers:

#### Adding New Features:
1. Add types to `types.ts`
2. Add utility functions to `utils.ts`
3. Create new components in `components/`
4. Update main page in `page.tsx`

#### Backend Integration:
1. Set `NEXT_PUBLIC_API_URL` environment variable
2. Update `api.ts` to disable mock mode
3. Implement backend endpoints as documented
4. Test API integration

## Security Considerations

- **Role Verification**: Middleware ensures only telco users can access
- **File Validation**: Client-side file type and size validation
- **CSRF Protection**: Built-in NextAuth.js CSRF protection
- **Sanitization**: All user inputs should be sanitized on backend

## Testing

### Mock Data Generation:
- Use "สร้างข้อมูลตัวอย่าง" button to generate test records
- Mock data includes various CIB results, SIM types, and incident counts

### File Testing:
- Test with various file types and sizes
- Ensure error handling works for invalid files

## Future Enhancements

### Planned Features:
- [ ] Bulk document upload
- [ ] Excel validation before upload
- [ ] Progress tracking for submissions
- [ ] Audit log for all actions
- [ ] Export functionality
- [ ] Advanced filtering options
- [ ] Dashboard analytics
- [ ] Email notifications

### Technical Improvements:
- [ ] Offline support with service workers  
- [ ] Real-time updates with WebSocket
- [ ] File compression before upload
- [ ] Batch processing capabilities
- [ ] Advanced search with indexing

## Support

For technical support or feature requests:
1. Check this documentation
2. Review error messages in browser console
3. Contact the development team

## License

This system is part of the SMS Sender Platform and follows the same licensing terms.
