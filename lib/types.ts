export interface CaseRecord {
  id: number;
  date: string;
  ticket_number: string;
  surgeon: string;
  diagnosis: string;
  procedure_name: string;
  is_add_on: number;
  location: string;
  anesthetic_type: string;
  start_time: string;
  end_time: string;
  asa_code: string;
  asa_billing_code: string;
  base_value: number;
  total_time: number;
  time_units: number;
  modifiers: number;
  procedure_units: number;
  total_units: number;
  adjusted_units: number;
  work_units: number;
  is_split: number;
  split_provider: string;
  split_units: number;
  net_work_units: number;
  insurance_company: string;
  notes: string;
  created_at: string;
}

export interface CaseFormValues {
  date: Date;
  ticket_number: string;
  surgeon: string;
  diagnosis: string;
  procedure_name: string;
  is_add_on: boolean;
  location: string;
  anesthetic_type: string;
  start_time: Date;
  end_time: Date;
  asa_code: string;
  asa_billing_code: string;
  base_value: string;
  time_units: string;
  modifiers: string;
  procedure_units: string;
  adjusted_units: string;
  is_split: boolean;
  split_provider: string;
  split_units: string;
  insurance_company: string;
  notes: string;
}

export interface DashboardStats {
  cases: number;
  totalUnits: number;
  workUnits: number;
  totalHours: number;
  daysWorked: number;
  unitsPerHour: number;
  unitsPerDay: number;
  unitsPerCase: number;
}

export type Period = 'day' | 'week' | 'month' | 'year';
export type SortOption = 'date_desc' | 'date_asc' | 'units_desc';
