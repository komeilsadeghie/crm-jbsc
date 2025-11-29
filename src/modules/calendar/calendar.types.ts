export type CalendarEventRelationType = 'CUSTOMER' | 'DEAL' | 'COACHING_PROGRAM' | 'CONTENT_ITEM';

export interface CalendarEventPayload {
  date?: string;
  jalaliDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  title: string;
  description?: string | null;
  relationType?: CalendarEventRelationType | null;
  relationId?: string | null;
  customerId?: string | null;
  dealId?: string | null;
  programId?: string | null;
}

export interface CalendarFilterParams {
  start?: string;
  end?: string;
  relationType?: CalendarEventRelationType;
  relationId?: string;
}


