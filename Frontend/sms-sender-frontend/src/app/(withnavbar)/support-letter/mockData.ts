import { Book } from './types';

// Dummy data generator
export const createDummyBooks = (): Book[] => {
  const dates = ["2025-01-15", "2025-01-20", "2025-01-22", "2025-02-01", "2025-02-05"];
  const senderNames = ["บริษัท ABC จำกัด", "หน่วยงาน XYZ", "องค์กร DEF", "บริษัท GHI จำกัด", "สำนักงาน JKL"];
  
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `BOOK-${String(i + 1).padStart(3, '0')}`,
    date: dates[i % dates.length],
    senderCount: Math.floor(Math.random() * 15) + 5,
    ais: Math.floor(Math.random() * 5) + 1,
    trueDtac: Math.floor(Math.random() * 6) + 2,
    nt: Math.floor(Math.random() * 4) + 1,
    other: Math.floor(Math.random() * 3) + 1,
    status: i % 4 === 0 ? 'urgent' : i % 3 === 0 ? 'processing' : i % 2 === 0 ? 'completed' : 'pending',
    cases: Array.from({ length: Math.floor(Math.random() * 5) + 2 }).map((_, j) => ({
      id: `CASE-${i + 1}${String(j + 1).padStart(2, '0')}`,
      date: dates[i % dates.length],
      sender: senderNames[j % senderNames.length],
      telco: ["AIS", "TRUE", "DTAC", "NT", "Other"][Math.floor(Math.random() * 5)] as any,
      actualTelco: ["AIS", "TRUE", "DTAC", "NT", "Other"][Math.floor(Math.random() * 5)] as any,
      statuses: [
        { label: "ขอข้อมูลแล้ว", done: true },
        { label: "ได้รับข้อมูลแล้ว", done: j % 2 === 0 },
        { label: "ขอระงับแล้ว", done: j % 3 === 0 },
        { label: "ระงับแล้ว", done: j > 2 },
      ],
      details: `รายละเอียดของเคส ${j + 1} สำหรับการขออนุมัติจาก ${senderNames[j % senderNames.length]}`,
    })),
  }));
};
