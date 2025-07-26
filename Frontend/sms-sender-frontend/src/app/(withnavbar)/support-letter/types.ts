// Types for support letter page
export interface Status {
  key: string;
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
  phone_number: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  fields: string[];
  request_ids: Array<{ id: string; status: string }>;
  reply_file_id?: string;
  is_response_submitted?: boolean; // Track if response has been submitted
}

export interface Book {
  id: string; // This will be the request_id
  date: string;
  senderCount: number;
  ais: number;
  trueDtac: number;
  nt: number;
  other: number;
  status: 'urgent' | 'processing' | 'completed' | 'pending';
  cases: Case[];
  is_response_submitted?: boolean; // True if any case in this book has been responded to
  canApprove?: boolean; // True if this book can be approved (no responses submitted)
}

// Raw data interface from API
export interface RawCaseData {
  _id: { $oid: string };
  sender_name: string;
  mobile_provider: string;
  phone_number: string;
  full_name: string;
  date: string;
  status: Array<{
    name: string;
    updated_at: { $date: string };
  }>;
  created_at: { $date: string };
  updated_at: { $date: string };
  created_by: string;
  fields: string[];
  request_ids: Array<{ id: string; status: string }>;
  reply_file_id?: { $oid: string };
  is_response_submitted?: boolean; // From API response
}
