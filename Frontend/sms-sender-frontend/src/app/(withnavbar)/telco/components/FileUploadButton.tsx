import React from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { FileUploadProps } from '../types';
import { validateFile, formatFileSize } from '../utils';

export const FileUploadButton: React.FC<FileUploadProps> = ({ 
  label, 
  accept, 
  onFileSelect, 
  hasFile,
  fileName,
  required = false,
  maxSize = 10
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (file) {
      const validation = validateFile(file, maxSize);
      if (!validation.valid) {
        alert(validation.error);
        event.target.value = '';
        return;
      }
    }
    
    onFileSelect(file);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-2">
        <label className={`
          flex-1 cursor-pointer border-2 border-dashed rounded-lg p-4 text-center
          transition-all duration-200 hover:bg-gray-50
          ${hasFile 
            ? 'border-green-300 bg-green-50 hover:bg-green-100' 
            : 'border-gray-300 bg-white hover:border-gray-400'
          }
        `}>
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2">
            {hasFile ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-left">
                  <span className="text-green-600 text-sm font-medium block">{fileName}</span>
                  <span className="text-xs text-green-500">คลิกเพื่อเปลี่ยนไฟล์</span>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-gray-400" />
                <div className="text-center">
                  <span className="text-gray-500 text-sm block">คลิกเพื่ออัปโหลดไฟล์</span>
                  <span className="text-xs text-gray-400">ขนาดไม่เกิน {maxSize}MB</span>
                </div>
              </>
            )}
          </div>
        </label>
        {hasFile && (
          <button
            onClick={() => onFileSelect(null)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="ลบไฟล์"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {hasFile && (
        <p className="text-xs text-gray-500 mt-1">
          รองรับ: PDF, JPG, PNG • ขนาดไม่เกิน {maxSize}MB
        </p>
      )}
    </div>
  );
};
