import dayjs from 'dayjs';
import jalaliday from 'jalaliday';
import { db } from '../../database/db';
import { CalendarEventPayload, CalendarFilterParams } from './calendar.types';

dayjs.extend(jalaliday);

// Helper functions for database operations
const dbGet = (query: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (query: string, params: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const dbRun = (query: string, params: any[]): Promise<{ lastID?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const isIsoDate = (value?: string | null) => {
  if (!value) return false;
  return /\d{4}-\d{2}-\d{2}T/.test(value);
};

const toGregorianDayjs = (value?: string | null) => {
  if (!value) return null;
  if (isIsoDate(value)) {
    return dayjs(value);
  }
  return dayjs(value, { jalali: true }).calendar('gregory');
};

const toJalaliString = (date: dayjs.Dayjs) => {
  return date.calendar('jalali').format('YYYY-MM-DD');
};

const buildRelationFields = (
  relationType?: string | null,
  relationId?: string | null,
) => {
  if (!relationType || !relationId) {
    return {
      relationType: null,
      relationId: null,
      customerId: null,
      dealId: null,
      programId: null,
    };
  }

  switch (relationType) {
    case 'CUSTOMER':
      return { relationType, relationId, customerId: relationId, dealId: null, programId: null };
    case 'DEAL':
      return { relationType, relationId, customerId: null, dealId: relationId, programId: null };
    case 'COACHING_PROGRAM':
      return { relationType, relationId, customerId: null, dealId: null, programId: relationId };
    default:
      return {
        relationType: null,
        relationId: null,
        customerId: null,
        dealId: null,
        programId: null,
      };
  }
};

export const listCalendarEvents = async (params: CalendarFilterParams) => {
  const start = toGregorianDayjs(params.start);
  const end = toGregorianDayjs(params.end);

  let query = 'SELECT * FROM calendar_events WHERE 1=1';
  const queryParams: any[] = [];

  if (start) {
    query += ' AND start_at >= ?';
    queryParams.push(start.format('YYYY-MM-DD HH:mm:ss'));
  }

  if (end) {
    query += ' AND start_at <= ?';
    queryParams.push(end.format('YYYY-MM-DD HH:mm:ss'));
  }

  if (params.relationType && params.relationId) {
    query += ' AND relation_type = ? AND relation_id = ?';
    queryParams.push(params.relationType, params.relationId);
  }

  query += ' ORDER BY start_at ASC';

  const events = await dbAll(query, queryParams);

  // Get related entities
  const eventsWithRelations = await Promise.all(
    events.map(async (event: any) => {
      const result: any = { ...event };

      if (event.customer_id) {
        const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [event.customer_id]);
        result.customer = customer;
      }

      if (event.deal_id) {
        const deal = await dbGet('SELECT * FROM deals WHERE id = ?', [event.deal_id]);
        result.deal = deal;
      }

      if (event.program_id) {
        const program = await dbGet('SELECT * FROM coaching_programs WHERE id = ?', [event.program_id]);
        result.program = program;
      }

      return result;
    })
  );

  return eventsWithRelations;
};

export const createCalendarEvent = async (payload: CalendarEventPayload, ownerId?: string) => {
  const baseDate = toGregorianDayjs(payload.jalaliDate || payload.date);

  if (!baseDate) {
    throw new Error('INVALID_DATE');
  }

  const jalaliDate = toJalaliString(baseDate);
  const relationFields = buildRelationFields(payload.relationType, payload.relationId);

  // Combine date and time for start_at
  let startAt = baseDate.format('YYYY-MM-DD');
  if (payload.startTime) {
    startAt = `${startAt} ${payload.startTime}`;
  } else {
    startAt = `${startAt} 00:00:00`;
  }

  // Combine date and time for end_at
  let endAt: string | null = null;
  if (payload.endTime) {
    endAt = `${baseDate.format('YYYY-MM-DD')} ${payload.endTime}`;
  }

  const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await dbRun(
    `INSERT INTO calendar_events 
     (id, title, description, start_at, end_at, relation_type, relation_id, customer_id, deal_id, program_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      payload.title,
      payload.description || null,
      startAt,
      endAt,
      relationFields.relationType,
      relationFields.relationId,
      relationFields.customerId,
      relationFields.dealId,
      relationFields.programId,
      ownerId || null,
    ]
  );

  const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);

  // Get related entities
  const result: any = { ...event };

  if (event.customer_id) {
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [event.customer_id]);
    result.customer = customer;
  }

  if (event.deal_id) {
    const deal = await dbGet('SELECT * FROM deals WHERE id = ?', [event.deal_id]);
    result.deal = deal;
  }

  if (event.program_id) {
    const program = await dbGet('SELECT * FROM coaching_programs WHERE id = ?', [event.program_id]);
    result.program = program;
  }

  return result;
};

export const updateCalendarEvent = async (id: string, payload: CalendarEventPayload) => {
  const existing = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);

  if (!existing) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const baseDate = toGregorianDayjs(payload.jalaliDate || payload.date) || dayjs(existing.start_at);
  const jalaliDate = toJalaliString(baseDate);
  const relationFields = buildRelationFields(payload.relationType, payload.relationId);

  // Combine date and time for start_at
  let startAt = baseDate.format('YYYY-MM-DD');
  if (payload.startTime !== undefined) {
    startAt = payload.startTime ? `${startAt} ${payload.startTime}` : `${startAt} 00:00:00`;
  } else {
    startAt = existing.start_at;
  }

  // Combine date and time for end_at
  let endAt: string | null = null;
  if (payload.endTime !== undefined) {
    endAt = payload.endTime ? `${baseDate.format('YYYY-MM-DD')} ${payload.endTime}` : null;
  } else {
    endAt = existing.end_at;
  }

  await dbRun(
    `UPDATE calendar_events 
     SET title = ?, description = ?, start_at = ?, end_at = ?, 
         relation_type = ?, relation_id = ?, customer_id = ?, deal_id = ?, program_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      payload.title ?? existing.title,
      payload.description ?? existing.description,
      startAt,
      endAt,
      relationFields.relationType ?? existing.relation_type,
      relationFields.relationId ?? existing.relation_id,
      relationFields.customerId ?? existing.customer_id,
      relationFields.dealId ?? existing.deal_id,
      relationFields.programId ?? existing.program_id,
      id,
    ]
  );

  const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);

  // Get related entities
  const result: any = { ...event };

  if (event.customer_id) {
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [event.customer_id]);
    result.customer = customer;
  }

  if (event.deal_id) {
    const deal = await dbGet('SELECT * FROM deals WHERE id = ?', [event.deal_id]);
    result.deal = deal;
  }

  if (event.program_id) {
    const program = await dbGet('SELECT * FROM coaching_programs WHERE id = ?', [event.program_id]);
    result.program = program;
  }

  return result;
};

export const deleteCalendarEvent = async (id: string) => {
  await dbRun('DELETE FROM calendar_events WHERE id = ?', [id]);
};
