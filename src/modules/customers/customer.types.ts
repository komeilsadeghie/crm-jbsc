export type CustomerType = 'company' | 'individual' | 'export' | 'import' | 'coaching';
export type CustomerStatus = 'active' | 'inactive' | 'lead' | 'customer' | 'partner';

export interface CustomerFilters {
  type?: CustomerType;
  status?: CustomerStatus;
  category?: string;
  search?: string;
  tagIds?: string[];
  customerModels?: number[];
  createdById?: string;
  dateFrom?: string;
  dateTo?: string;
  journey_stage?: string;
  coach_id?: string;
}

export interface CustomerPayload {
  name: string;
  type: CustomerType;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  address?: string | null;
  website?: string | null;
  score?: number;
  status?: CustomerStatus;
  category?: string | null;
  notes?: string | null;
  customerModel?: number | null;
  tagIds?: string[];
}
