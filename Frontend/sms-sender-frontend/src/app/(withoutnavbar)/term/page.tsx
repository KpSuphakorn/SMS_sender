"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function TermsPage() {
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
            ข้อตกลงและเงื่อนไขการใช้งาน
          </h1>
          
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
          >
            ← กลับ
          </button>

          {/* Terms Content */}
          <div className="prose max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">1. การยอมรับข้อตกลง</h2>
              <p>
                การใช้งานระบบ SMS Sender นี้ถือว่าท่านได้อ่าน เข้าใจ และยอมรับข้อตกลงและเงื่อนไขการใช้งานทั้งหมด 
                หากท่านไม่ยอมรับข้อตกลงเหล่านี้ กรุณาหยุดการใช้งานระบบ
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">2. การใช้งานระบบ</h2>
              <ul className="list-disc ml-6 space-y-2">
                <li>ระบบนี้จัดทำขึ้นเพื่อการทำงานภายในองค์กรเท่านั้น</li>
                <li>ผู้ใช้งานต้องมีสิทธิ์ในการเข้าถึงข้อมูลที่เกี่ยวข้อง</li>
                <li>ห้ามนำข้อมูลไปใช้เพื่อวัตถุประสงค์ส่วนตัวหรือเพื่อการค้า</li>
                <li>ต้องรักษาความลับของข้อมูลและรหัสผ่าน</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">3. ความรับผิดชอบของผู้ใช้</h2>
              <ul className="list-disc ml-6 space-y-2">
                <li>ผู้ใช้งานมีหน้าที่ดูแลรักษาบัญชีผู้ใช้และรหัสผ่านของตนเอง</li>
                <li>ห้ามแบ่งปันบัญชีผู้ใช้หรือรหัสผ่านให้บุคคลอื่น</li>
                <li>ต้องแจ้งให้ผู้ดูแลระบบทราบทันทีหากพบการใช้งานที่ผิดปกติ</li>
                <li>ต้องใช้งานระบบอย่างเหมาะสมและไม่ก่อให้เกิดความเสียหาย</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">4. การคุ้มครองข้อมูล</h2>
              <p>
                ระบบจะเก็บรักษาข้อมูลส่วนบุคคลและข้อมูลการใช้งานอย่างปลอดภัย 
                และจะไม่นำไปเปิดเผยแก่บุคคลที่สามโดยไม่ได้รับอนุญาต 
                ยกเว้นกรณีที่กฎหมายกำหนดให้ต้องเปิดเผย
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">5. การแก้ไขข้อตกลง</h2>
              <p>
                องค์กรขอสงวนสิทธิ์ในการแก้ไขข้อตกลงและเงื่อนไขนี้ได้ตลอดเวลา 
                โดยจะแจ้งให้ผู้ใช้งานทราบล่วงหน้าอย่างเหมาะสม
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">6. การติดต่อ</h2>
              <p>
                หากมีข้อสงสัยเกี่ยวกับข้อตกลงและเงื่อนไขการใช้งาน 
                กรุณาติดต่อทีมผู้ดูแลระบบ
              </p>
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
