// Extended types for comprehensive CRM

export interface Lead {
  id?: number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
  source?: string;
  tags?: string;
  lead_score: number;
  status: 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted';
  industry?: string;
  budget_range?: string;
  decision_maker_role?: string;
  notes?: string;
  assigned_to?: number;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id?: number;
  name: string;
  industry?: string;
  size?: string;
  country?: string;
  website?: string;
  site_model?: string;
  designer_id?: number;
  service_package?: string;
  acquisition_channel?: string;
  lead_id?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id?: number;
  account_id?: number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  role?: string;
  opt_in: boolean;
  communication_preference?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Deal {
  id?: number;
  customer_id?: number;
  account_id?: number;
  contact_id?: number;
  title: string;
  stage: 'discovery' | 'proposal' | 'contract' | 'design' | 'development' | 'qa' | 'delivery' | 'support';
  budget?: number;
  probability: number;
  services?: string;
  site_model?: string;
  designer_id?: number;
  start_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id?: number;
  deal_id?: number;
  account_id?: number;
  invoice_number?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'due' | 'overdue' | 'cancelled';
  due_date?: string;
  paid_amount: number;
  payment_stage?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Estimate {
  id?: number;
  deal_id?: number;
  account_id?: number;
  estimate_number?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  valid_until?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id?: number;
  invoice_id?: number;
  deal_id?: number;
  amount: number;
  currency: string;
  payment_method?: string;
  paid_at?: string;
  reference_number?: string;
  notes?: string;
  created_at?: string;
}

export interface CoachingProgram {
  id?: number;
  account_id?: number;
  contact_id?: number;
  program_type?: 'individual' | 'corporate';
  duration_months?: number;
  price?: number;
  start_date?: string;
  end_date?: string;
  overall_goals?: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  coach_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OKR {
  id?: number;
  program_id?: number;
  account_id?: number;
  objective: string;
  period?: string;
  owner_id?: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface KeyResult {
  id?: number;
  okr_id: number;
  name: string;
  target_value?: number;
  current_value: number;
  unit?: string;
  deadline?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContentBrief {
  id?: number;
  deal_id?: number;
  account_id?: number;
  objective?: string;
  message?: string;
  persona?: string;
  keywords?: string;
  cta?: string;
  platform?: string;
  status: 'draft' | 'approved' | 'in_production' | 'completed';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContentItem {
  id?: number;
  brief_id?: number;
  deal_id?: number;
  content_type: 'post' | 'video' | 'reels' | 'blog' | 'page';
  title?: string;
  status: 'briefed' | 'producing' | 'review' | 'scheduled' | 'published' | 'archived';
  platform?: string;
  publish_date?: string;
  links?: string;
  notes?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id?: number;
  account_id?: number;
  contact_id?: number;
  deal_id?: number;
  lead_id?: number;
  activity_type: 'call' | 'email' | 'whatsapp' | 'sms' | 'meeting' | 'note' | 'task';
  subject?: string;
  body?: string;
  channel?: string;
  occurred_at?: string;
  duration_min?: number;
  attachments?: string;
  created_by?: number;
  created_at?: string;
}

export interface Task {
  id?: number;
  deal_id?: number;
  account_id?: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assigned_to?: number;
  created_by?: number;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}


