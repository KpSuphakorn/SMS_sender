import { TelcoType } from './types';

// Constants
export const TELCO_COLORS = {
  AIS: 'bg-green-100 text-green-800 border-green-200',
  TRUE: 'bg-red-100 text-red-800 border-red-200',
  DTAC: 'bg-blue-100 text-blue-800 border-blue-200',
  NT: 'bg-purple-100 text-purple-800 border-purple-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200'
} as const;

export const STATUS_COLORS = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500', 
  completed: 'bg-green-500',
  urgent: 'bg-red-500'
} as const;

export const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  processing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
  urgent: 'เร่งด่วน'
} as const;
