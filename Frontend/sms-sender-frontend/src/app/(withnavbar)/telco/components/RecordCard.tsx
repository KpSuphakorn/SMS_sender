import React, { useState } from 'react';
import { FileText, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TelcoRecord } from '../types';
import { FileUploadButton } from './FileUploadButton';

interface RecordCardProps {
  record: TelcoRecord;
  onUpdate: (id: string, updates: Partial<TelcoRecord>) => void;
  onSubmit: (id: string) => void;
  isSubmitting?: boolean;
}

export const RecordCard: React.FC<RecordCardProps> = ({ 
  record, 
  onUpdate, 
  onSubmit,
  isSubmitting = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFile = (field: keyof TelcoRecord, file: File | null) => {
    onUpdate(record.id, { [field]: file, updatedAt: new Date() });
  };

  const canSubmit = record.registrationDocument && record.paymentProof && record.idCard && !record.isSubmitted;

  const getStatusBadge = () => {
    if (record.isSubmitted) {
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
          <CheckCircle2 className="w-4 h-4" />
          ส่งข้อมูลแล้ว
        </span>
      );
    }
    if (canSubmit) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
          <CheckCircle2 className="w-4 h-4" />
          พร้อมส่ง
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 rounded-full">
        <AlertCircle className="w-4 h-4" />
        รอเอกสาร
      </span>
    );
  };

  const getCibResultColor = (result: string) => {
    switch (result) {
      case 'Clean':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Suspicious':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Flagged':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{record.fullName}</h3>
              <p className="text-sm text-gray-600">Case ID: {record.caseId}</p>
              <p className="text-sm text-gray-500">ID: {record.registrantId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              title={isExpanded ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด'}
            >
              {isExpanded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Quick Info Grid */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs text-gray-500 font-medium">วันที่จดทะเบียน</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{record.registrationDate}</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs text-gray-500 font-medium">ประเภทซิม</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{record.simType}</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs text-gray-500 font-medium">ครั้งการก่อเหตุ</p>
            <p className="text-sm font-semibold text-red-600 mt-1">{record.incidentCount} ครั้ง</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs text-gray-500 font-medium">ผล CIB</p>
            <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full border mt-1 ${getCibResultColor(record.cibResult)}`}>
              {record.cibResult}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="p-6 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                ข้อมูลทั่วไป
              </h4>
              <div className="space-y-3 pl-4">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">ประเภทการลงทะเบียนซิม:</span>
                  <p className="font-medium text-gray-900">{record.registrationType}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">IMEI:</span>
                  <p className="font-mono font-medium text-gray-900">{record.imei}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Call Site:</span>
                  <p className="font-medium text-gray-900">{record.callSite}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">พบ log การรับ:</span>
                  <span className={`font-medium ${record.hasLog ? 'text-green-600' : 'text-red-600'}`}>
                    {record.hasLog ? '✓ มี' : '✗ ไม่มี'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                ข้อมูลการติดต่อ
              </h4>
              <div className="space-y-3 pl-4">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">เบอร์ติดต่อ:</span>
                  <p className="font-medium text-gray-900">{record.contactInfo}</p>
                </div>
                {record.note && (
                  <div>
                    <span className="text-gray-500 text-sm">หมายเหตุ:</span>
                    <p className="font-medium text-gray-900 mt-1 p-2 bg-white rounded border text-sm">
                      {record.note}
                    </p>
                  </div>
                )}
                {record.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">ส่งข้อมูลเมื่อ:</span>
                    <p className="font-medium text-green-600">
                      {record.submittedAt.toLocaleString('th-TH')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              อัปโหลดเอกสาร
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">จำเป็นทั้ง 3 ไฟล์</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUploadButton
                label="บัญชีผู้จดทะเบียน"
                accept=".pdf,.jpg,.jpeg,.png"
                onFileSelect={(file) => updateFile('registrationDocument', file)}
                hasFile={!!record.registrationDocument}
                fileName={record.registrationDocument?.name}
                required={true}
              />
              <FileUploadButton
                label="หลักฐานการชำระเงิน"
                accept=".pdf,.jpg,.jpeg,.png"
                onFileSelect={(file) => updateFile('paymentProof', file)}
                hasFile={!!record.paymentProof}
                fileName={record.paymentProof?.name}
                required={true}
              />
              <FileUploadButton
                label="บัตรประชาชนผู้จดทะเบียน"
                accept=".pdf,.jpg,.jpeg,.png"
                onFileSelect={(file) => updateFile('idCard', file)}
                hasFile={!!record.idCard}
                fileName={record.idCard?.name}
                required={true}
              />
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {canSubmit ? (
                  <span className="text-green-600 font-medium">✓ พร้อมส่งข้อมูล</span>
                ) : record.isSubmitted ? (
                  <span className="text-blue-600 font-medium">✓ ส่งข้อมูลเรียบร้อยแล้ว</span>
                ) : (
                  <span>กรุณาอัปโหลดเอกสารให้ครบทั้ง 3 ไฟล์</span>
                )}
              </div>
              <button
                onClick={() => onSubmit(record.id)}
                disabled={!canSubmit || isSubmitting}
                className={`
                  px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2
                  ${canSubmit && !isSubmitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    กำลังส่ง...
                  </>
                ) : record.isSubmitted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    ส่งข้อมูลแล้ว
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    ส่งข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
