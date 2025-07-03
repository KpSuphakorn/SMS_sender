// Types for support letter page
export interface Status {
  label: string;
  done: boolean;
}

export type TelcoType = 'AIS' | 'TRUE' | 'DTAC' | 'NT' | 'Other';

export interface Case {
  id: string;
  date: string;
  sender: string;
  telco: TelcoType;
  actualTelco: TelcoType;
  statuses: Status[];
  details: string;
}

export interface Book {
  id: string;
  date: string;
  senderCount: number;
  ais: number;
  trueDtac: number;
  nt: number;
  other: number;
  status: 'urgent' | 'processing' | 'completed' | 'pending';
  cases: Case[];
}
