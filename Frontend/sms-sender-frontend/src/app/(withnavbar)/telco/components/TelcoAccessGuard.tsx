import React from 'react';

interface TelcoAccessGuardProps {
  children: React.ReactNode;
  userRole?: string;
  isLoading?: boolean;
}

export const TelcoAccessGuard: React.FC<TelcoAccessGuardProps> = ({ 
  children, 
  userRole,
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">กำลังตรวจสอบสิทธิ์...</p>
          <p className="text-gray-500 text-sm mt-2">โปรดรอสักครู่</p>
        </div>
      </div>
    );
  }

  if (userRole !== "telco") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-6xl mb-6">🚫</div>
          <h1 className="text-2xl font-bold text-red-600 mb-3">ไม่มีสิทธิ์เข้าใช้</h1>
          <p className="text-gray-600 mb-4 leading-relaxed">
            หน้านี้สำหรับผู้ใช้งานที่มีบทบาทเป็น <strong>"Telco"</strong> เท่านั้น
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600">
              <strong>บทบาทปัจจุบัน:</strong> {userRole || 'ไม่ระบุ'}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าใช้งาน
          </p>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              ← กลับหน้าก่อนหน้า
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
