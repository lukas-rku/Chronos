export interface User {
  id: number;
  email: string;
  name: string;
  api_key: string;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  type: 'in' | 'out' | 'break_start' | 'break_end';
  timestamp: string;
}

export interface DaySummary {
  date: string;
  totalWorkedMs: number;
  totalBreakMs: number;
  entries: TimeEntry[];
}
