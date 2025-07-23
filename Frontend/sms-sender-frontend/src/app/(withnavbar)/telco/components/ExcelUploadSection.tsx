import React from 'react';
import { Upload, CheckCircle, Download, FileText } from 'lucide-react';

interface ExcelUploadSectionProps {
  isUploading: boolean;
  uploadSuccess: boolean;
  onExcelUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateMockData: () => void;
  onDownloadTemplate: () => void;
}

export const ExcelUploadSection: React.FC<ExcelUploadSectionProps> = ({
  isUploading,
  uploadSuccess,
  onExcelUpload,
  onGenerateMockData,
  onDownloadTemplate
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">อัปโหลดไฟล์ Excel</h2>
        <p className="text-gray-600 mb-6">
          เลือกไฟล์ Excel ที่มีข้อมูล Telco เพื่อนำเข้าสู่ระบบ<br />
          <span className="text-sm text-gray-500">
            ไฟล์ต้องมีคอลัมน์ตามแม่แบบที่กำหนด
          </span>
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Excel Upload Button */}
          <label className={`
            cursor-pointer px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3
            ${isUploading 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
            }
          `}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={onExcelUpload}
              disabled={isUploading}
              className="hidden"
            />
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                <span>กำลังประมวลผล...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>เลือกไฟล์ Excel</span>
              </>
            )}
          </label>
          
          {/* Download Template Button */}
          <button
            onClick={onDownloadTemplate}
            className="px-6 py-4 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>ดาวน์โหลดแม่แบบ</span>
          </button>
          
          {/* Mock Data Button */}
          <button
            onClick={onGenerateMockData}
            className="px-6 py-4 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            สร้างข้อมูลตัวอย่าง
          </button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500 space-y-1">
          <p>รองรับไฟล์: .xlsx, .xls (ขนาดไม่เกิน 10MB)</p>
          <p>แม่แบบประกอบด้วย: วันที่จดทะเบียน, ID ผู้ลงทะเบียน, ชื่อผู้จดทะเบียน และอื่นๆ</p>
        </div>

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">อัปโหลดสำเร็จ!</span>
          </div>
        )}
      </div>
    </div>
  );
};
