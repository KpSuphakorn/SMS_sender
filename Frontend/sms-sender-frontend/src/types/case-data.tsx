export interface CaseData {
  id: string;
  date: string;
  sender: string;
  telco: string;
  actualTelco: string;
  statuses: Array<{ label: string; done: boolean }>;
  details: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
  fields: string[];
  request_ids: Array<{ id: string; status: string }>;
  reply_file_id?: string;
  full_name?: string;
}