"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function PolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="flex justify-center mb-6">
            <Image src="/ccib-logo.png" alt="Logo" width={100} height={100} />
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            นโยบายความเป็นส่วนตัว
          </h1>
          
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
          >
            ← กลับ
          </button>

          {/* Privacy Policy Content */}
          <div className="prose max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">1. ข้อมูลที่เราเก็บรวบรวม</h2>
              <p>
                เราเก็บรวบรวมข้อมูลส่วนบุคคลและข้อมูลการใช้งานดังต่อไปนี้:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>ข้อมูลบัญชีผู้ใช้ (อีเมล, รหัสผ่าน)</li>
                <li>ข้อมูลการเข้าสู่ระบบและการใช้งาน</li>
                <li>ข้อมูลที่ผู้ใช้บันทึกในระบบ</li>
                <li>ข้อมูล SMS และผู้ส่ง</li>
                <li>ข้อมูลเกี่ยวกับอุปกรณ์และการเชื่อมต่อ</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
              <p>
                เราใช้ข้อมูลของท่านเพื่อวัตถุประสงค์ดังต่อไปนี้:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>การให้บริการระบบ SMS Sender</li>
                <li>การยืนยันตัวตนและการจัดการบัญชีผู้ใช้</li>
                <li>การติดตามและวิเคราะห์การใช้งานระบบ</li>
                <li>การปรับปรุงและพัฒนาระบบ</li>
                <li>การปฏิบัติตามกฎหมายและระเบียบที่เกี่ยวข้อง</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">3. การแบ่งปันข้อมูล</h2>
              <p>
                เราจะไม่แบ่งปันข้อมูลส่วนบุคคลของท่านให้แก่บุคคลที่สาม ยกเว้นกรณีดังต่อไปนี้:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>เมื่อได้รับความยินยอมจากท่าน</li>
                <li>เมื่อกฎหมายกำหนดให้ต้องเปิดเผย</li>
                <li>เพื่อปกป้องสิทธิ์และความปลอดภัยขององค์กร</li>
                <li>เพื่อการดำเนินงานของระบบที่จำเป็น</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">4. การรักษาความปลอดภัยของข้อมูล</h2>
              <p>
                เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อป้องกันการเข้าถึง 
                การใช้ การเปิดเผย การแก้ไข หรือการทำลายข้อมูลส่วนบุคคลโดยไม่ได้รับอนุญาต 
                รวมถึง:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>การเข้ารหัสข้อมูล (Encryption)</li>
                <li>การควบคุมการเข้าถึงระบบ</li>
                <li>การตรวจสอบและติดตามการใช้งาน</li>
                <li>การสำรองข้อมูลอย่างปลอดภัย</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">5. สิทธิ์ของผู้ใช้ข้อมูล</h2>
              <p>
                ท่านมีสิทธิ์ดังต่อไปนี้เกี่ยวกับข้อมูลส่วนบุคคลของท่าน:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>สิทธิ์ในการเข้าถึงข้อมูล</li>
                <li>สิทธิ์ในการแก้ไขข้อมูล</li>
                <li>สิทธิ์ในการลบข้อมูล</li>
                <li>สิทธิ์ในการคัดค้านการใช้ข้อมูล</li>
                <li>สิทธิ์ในการถอนความยินยอม</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">6. การเก็บรักษาข้อมูล</h2>
              <p>
                เราจะเก็บรักษาข้อมูลส่วนบุคคลของท่านเป็นระยะเวลาที่จำเป็นสำหรับการให้บริการ
                และการปฏิบัติตามกฎหมาย หรือตามที่ได้รับความยินยอมจากท่าน
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">7. การแก้ไขนโยบาย</h2>
              <p>
                เราอาจแก้ไขนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว 
                การแก้ไขใดๆ จะมีผลตั้งแต่วันที่เผยแพร่บนเว็บไซต์ 
                เราขอแนะนำให้ท่านตรวจสอบนโยบายนี้เป็นประจำ
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">8. การติดต่อ</h2>
              <p>
                หากท่านมีคำถามหรือข้อกังวลเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ 
                หรือต้องการใช้สิทธิ์ของท่าน กรุณาติดต่อ:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>หน่วยงาน:</strong> ศูนย์ปราบปรามอาชญากรรมทางเทคโนโลยี</p>
                <p><strong>อีเมล:</strong> support@ccib.go.th</p>
                <p><strong>โทรศัพท์:</strong> 02-xxx-xxxx</p>
              </div>
            </section>
          </div>

          {/* Last Updated */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500 text-center">
            อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')}
          </div>
        </div>
      </div>
    </div>
  );
}
