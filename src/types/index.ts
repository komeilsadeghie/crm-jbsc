export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'coach' | 'sales_manager' | 'user';
  full_name?: string;
  created_at: string;
}

export interface Customer {
  id?: number;
  name: string;
  type: 'company' | 'individual' | 'export' | 'import' | 'coaching';
  email?: string;
  phone?: string;
  company_name?: string;
  address?: string;
  website?: string;
  score: number;
  status: 'active' | 'inactive' | 'lead' | 'customer' | 'partner';
  category?: string;
  notes?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Interaction {
  id?: number;
  customer_id: number;
  type: 'call' | 'email' | 'meeting' | 'whatsapp' | 'sms' | 'deposit' | 'service';
  subject?: string;
  description?: string;
  amount?: number;
  deposit_date?: string;
  deposit_stage?: string;
  website_model?: string;
  website_designer?: string;
  services?: string;
  additional_notes?: string;
  created_by?: number;
  created_at?: string;
}

export interface CoachingSession {
  id?: number;
  customer_id: number;
  coach_id: number;
  session_date: string;
  duration?: number;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  created_at?: string;
}

export interface Goal {
  id?: number;
  customer_id: number;
  title: string;
  description?: string;
  type: 'kpi' | 'okr';
  target_value?: number;
  current_value?: number;
  unit?: string;
  deadline?: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Exercise {
  id?: number;
  goal_id?: number;
  customer_id: number;
  title: string;
  description?: string;
  instructions?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_date?: string;
  notes?: string;
  created_by?: number;
  created_at?: string;
}

export interface GrowthReport {
  id?: number;
  customer_id: number;
  report_date: string;
  metrics?: Record<string, any>;
  achievements?: string;
  challenges?: string;
  next_steps?: string;
  overall_score?: number;
  created_by?: number;
  created_at?: string;
}

export interface MessageAutomation {
  id?: number;
  name: string;
  trigger_type: 'schedule' | 'event' | 'condition';
  channel: 'email' | 'sms' | 'whatsapp';
  template: string;
  conditions?: Record<string, any>;
  is_active: boolean;
  created_at?: string;
}

export interface DashboardKPI {
  total_customers: number;
  active_customers: number;
  total_revenue: number;
  pending_interactions: number;
  coaching_sessions_scheduled: number;
  goals_completed: number;
  goals_in_progress: number;
  average_customer_score: number;
  top_customers: Customer[];
  recent_interactions: Interaction[];
}



