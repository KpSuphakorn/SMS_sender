export interface Sender {
  sender_name: string;
  mobile_provider: string;
  phone_number: string;
  full_name: string;
  date: string;
}

export interface FieldSelectorProps {
  allFields: string[];
  fieldLabels: Record<string, string>;
  selectedFields: Set<string>;
  onToggle: (field: string) => void;
}

export interface SenderTableProps {
  senders: Sender[];
  allFields: (keyof Sender)[];
  fieldLabels: Record<keyof Sender, string>;
  selectedRows: Set<number>;
  onToggleRow: (index: number) => void;
}

export interface DatepickerProps {
  startDate: string;
  endDate: string;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
}

export interface RequestLog {
  request_id: string;
  thai_date: string;
  status: string[];
  pdf_sent_data_id?: string;
  pdf_sent_suspension_id?: string;
  reply_file_id?: string;
  is_read: boolean;
  read_by: string[];
}