import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';
import dayjs from 'dayjs';
import jalaliday from 'jalaliday';

dayjs.extend(jalaliday);

const router = express.Router();

// Get all calendar events
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, relation_type, relation_id } = req.query;

  let query = `
    SELECT ce.*, 
           a.name as account_name,
           d.title as deal_title
    FROM calendar_events ce
    LEFT JOIN accounts a ON ce.relation_type = 'CUSTOMER' AND ce.relation_id = a.id
    LEFT JOIN deals d ON ce.relation_type = 'DEAL' AND ce.relation_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (start_date) {
    query += ' AND DATE(ce.start_at) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(ce.start_at) <= ?';
    params.push(end_date);
  }

  if (relation_type) {
    query += ' AND ce.relation_type = ?';
    params.push(relation_type);
  }

  if (relation_id) {
    query += ' AND ce.relation_id = ?';
    params.push(relation_id);
  }

  query += ' ORDER BY ce.start_at ASC';

  db.all(query, params, (err, events) => {
    if (err) {
      console.error('Error fetching calendar events:', err);
      return res.status(500).json({ error: 'خطا در دریافت رویدادها' });
    }
    
    // اصلاح تاریخ‌های اشتباه (سال 2647 یا سال‌های بزرگتر از 2100) به میلادی صحیح
    const fixedEvents = (events || []).map((event: any) => {
      if (event.start_at) {
        const startDateStr = event.start_at.toString();
        // اگر سال بزرگتر از 2100 باشد، تاریخ اشتباه است
        const startYear = parseInt(startDateStr.split('-')[0]);
        if (startYear > 2100) {
          // تلاش برای تبدیل تاریخ شمسی به میلادی
          try {
            const dateParts = startDateStr.split('T')[0].split('-');
            if (dateParts.length === 3) {
              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]);
              const day = parseInt(dateParts[2]);
              
              // اگر سال بین 1300 تا 1500 باشد، تاریخ شمسی است
              // اگر سال بزرگتر از 2000 باشد اما ماه و روز معقول باشند، ممکن است یک خطای تبدیل باشد
              // در این صورت، سعی می‌کنیم آن را به عنوان تاریخ شمسی تفسیر کنیم
              if ((year >= 1300 && year <= 1500) || (year > 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) {
                // اگر سال بزرگتر از 2000 است، احتمالاً یک خطای تبدیل است
                // سعی می‌کنیم آن را به عنوان تاریخ شمسی تفسیر کنیم
                let jalaliYear = year;
                if (year > 2000) {
                  // احتمالاً سال شمسی به اشتباه به میلادی تبدیل شده است
                  // سعی می‌کنیم با کم کردن 621 سال (تقریبی) آن را به سال شمسی تبدیل کنیم
                  jalaliYear = year - 621;
                  // اگر هنوز بزرگتر از 1500 است، احتمالاً یک خطای دیگر است
                  if (jalaliYear > 1500) {
                    jalaliYear = year - 621 - 1; // یک سال دیگر کم می‌کنیم
                  }
                }
                
                // اگر سال شمسی معقول است (بین 1300 تا 1500)
                if (jalaliYear >= 1300 && jalaliYear <= 1500) {
                  const jalaliDateStr = `${jalaliYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const jalaliDayjs = dayjs(jalaliDateStr, { jalali: true });
                  
                  if (jalaliDayjs.isValid()) {
                    const gregorianDayjs = jalaliDayjs.calendar('gregory');
                    if (gregorianDayjs.isValid()) {
                      const timePart = startDateStr.includes('T') ? startDateStr.split('T')[1] : '09:00:00';
                      event.start_at = `${gregorianDayjs.format('YYYY-MM-DD')}T${timePart}`;
                      console.log(`Fixed start_at: ${startDateStr} -> ${event.start_at}`);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error fixing start_at date:', err, event);
          }
        }
      }
      
      if (event.end_at) {
        const endDateStr = event.end_at.toString();
        const endYear = parseInt(endDateStr.split('-')[0]);
        if (endYear > 2100) {
          try {
            const dateParts = endDateStr.split('T')[0].split('-');
            if (dateParts.length === 3) {
              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]);
              const day = parseInt(dateParts[2]);
              
              if ((year >= 1300 && year <= 1500) || (year > 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) {
                let jalaliYear = year;
                if (year > 2000) {
                  jalaliYear = year - 621;
                  if (jalaliYear > 1500) {
                    jalaliYear = year - 621 - 1;
                  }
                }
                
                if (jalaliYear >= 1300 && jalaliYear <= 1500) {
                  const jalaliDateStr = `${jalaliYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const jalaliDayjs = dayjs(jalaliDateStr, { jalali: true });
                  
                  if (jalaliDayjs.isValid()) {
                    const gregorianDayjs = jalaliDayjs.calendar('gregory');
                    if (gregorianDayjs.isValid()) {
                      const timePart = endDateStr.includes('T') ? endDateStr.split('T')[1] : '10:00:00';
                      event.end_at = `${gregorianDayjs.format('YYYY-MM-DD')}T${timePart}`;
                      console.log(`Fixed end_at: ${endDateStr} -> ${event.end_at}`);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error fixing end_at date:', err, event);
          }
        }
      }
      
      // اطمینان از اینکه رنگ به درستی حفظ می‌شود
      if (!event.color) {
        event.color = '#6366F1'; // رنگ پیش‌فرض
      }
      return event;
    });
    
    res.json(fixedEvents);
  });
});

// Get single calendar event
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT ce.*, 
           a.name as account_name,
           d.title as deal_title
    FROM calendar_events ce
    LEFT JOIN accounts a ON ce.relation_type = 'CUSTOMER' AND ce.relation_id = a.id
    LEFT JOIN deals d ON ce.relation_type = 'DEAL' AND ce.relation_id = d.id
    WHERE ce.id = ?
  `, [id], (err, event) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت رویداد' });
    }
    if (!event) {
      return res.status(404).json({ error: 'رویداد یافت نشد' });
    }
    res.json(event);
  });
});

// Create calendar event
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const event: any = req.body;
  const userId = req.user?.id;

  const {
    title,
    description,
    date,
    startTime = '09:00',
    endTime,
    relationType = 'CUSTOMER',
    relationId,
    color,
  } = event;

  if (!title || !date) {
    return res.status(400).json({ error: 'عنوان و تاریخ الزامی است' });
  }

  // تبدیل تاریخ شمسی به میلادی اگر لازم باشد
  let gregorianDate = date;
  
  // بررسی اینکه آیا تاریخ شمسی است (سال بین 1300 تا 1500)
  const dateParts = date.split('-');
  if (dateParts.length === 3) {
    const year = parseInt(dateParts[0]);
    // اگر سال بین 1300 تا 1500 باشد، تاریخ شمسی است
    if (year >= 1300 && year <= 1500) {
      try {
        // استفاده از روش صحیح jalaliday: ساخت تاریخ شمسی و سپس تبدیل به میلادی
        const jalaliDateStr = `${year}-${dateParts[1]}-${dateParts[2]}`;
        const jalaliDayjs = dayjs(jalaliDateStr, { jalali: true });
        
        if (!jalaliDayjs.isValid()) {
          throw new Error('Invalid Jalali date');
        }
        
        // تبدیل به میلادی
        const gregorianDayjs = jalaliDayjs.calendar('gregory');
        
        if (!gregorianDayjs.isValid()) {
          throw new Error('Invalid Gregorian conversion');
        }
        
        // سپس به Date object تبدیل می‌کنیم
        const gregorianDateObj = gregorianDayjs.toDate();
        gregorianDate = gregorianDateObj.toISOString().split('T')[0];
        
        // بررسی معتبر بودن سال میلادی
        const gregorianYear = gregorianDateObj.getFullYear();
        if (gregorianYear < 1900 || gregorianYear > 2100) {
          console.error('Invalid conversion:', {
            jalali: date,
            jalaliDateStr,
            gregorianFormat: gregorianDayjs.format('YYYY-MM-DD'),
            gregorianYear,
            gregorianDate
          });
          throw new Error(`Invalid Gregorian year: ${gregorianYear}`);
        }
        
        console.log(`Converted Jalali date ${date} to Gregorian ${gregorianDate}`);
      } catch (err) {
        console.error('Error converting Jalali to Gregorian:', err);
        return res.status(400).json({ error: `خطا در تبدیل تاریخ شمسی: ${err instanceof Error ? err.message : 'تاریخ نامعتبر است'}` });
      }
    }
  }

  // Combine date and time
  const startAt = `${gregorianDate}T${startTime}:00`;
  const endAt = endTime ? `${gregorianDate}T${endTime}:00` : null;

  // Generate unique ID for calendar event
  const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  db.run(
    `INSERT INTO calendar_events (
      id, title, description, start_at, end_at, relation_type, relation_id, color, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      title,
      description || null,
      startAt,
      endAt,
      relationType,
      relationId || null,
      color || '#6366F1',
      userId ? parseInt(String(userId)) : null
    ],
    function(err) {
      if (err) {
        console.error('Error creating calendar event:', err);
        return res.status(500).json({ error: 'خطا در ثبت رویداد: ' + err.message });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'create',
        entityType: 'calendar_event',
        entityId: undefined, // calendar_events uses TEXT id, not number
        description: `Created calendar event: ${title} (ID: ${eventId})`,
        ...clientInfo
      });

      // Return the created event with proper format for calendar
      db.get('SELECT * FROM calendar_events WHERE id = ?', [eventId], (err, newEvent: any) => {
        if (!err && newEvent) {
          res.status(201).json({
            id: newEvent.id,
            message: 'رویداد با موفقیت ثبت شد',
            event: {
              ...newEvent,
              name: newEvent.title,
              start: newEvent.start_at,
              end: newEvent.end_at,
              type: 'event',
              color: newEvent.color || '#6366F1'
            }
          });
        } else {
          res.status(201).json({ id: eventId, message: 'رویداد با موفقیت ثبت شد' });
        }
      });
    }
  );
});

// Update calendar event
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const event: any = req.body;
  const userId = req.user?.id;

  const {
    title,
    description,
    date,
    startTime,
    endTime,
    relationType,
    relationId,
    color,
  } = event;

  // Check if event exists
  db.get('SELECT * FROM calendar_events WHERE id = ?', [id], (err, existingEvent: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی رویداد' });
    }
    if (!existingEvent) {
      return res.status(404).json({ error: 'رویداد یافت نشد' });
    }

    // تبدیل تاریخ شمسی به میلادی اگر لازم باشد
    let gregorianDate = date;
    if (date) {
      const dateParts = date.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        // اگر سال بین 1300 تا 1500 باشد، تاریخ شمسی است
        if (year >= 1300 && year <= 1500) {
          try {
            // استفاده از روش صحیح jalaliday: ساخت تاریخ شمسی و سپس تبدیل به میلادی
            const jalaliDateStr = `${year}-${dateParts[1]}-${dateParts[2]}`;
            const jalaliDayjs = dayjs(jalaliDateStr, { jalali: true });
            
            if (!jalaliDayjs.isValid()) {
              throw new Error('Invalid Jalali date');
            }
            
            // تبدیل به میلادی
            const gregorianDayjs = jalaliDayjs.calendar('gregory');
            
            if (!gregorianDayjs.isValid()) {
              throw new Error('Invalid Gregorian conversion');
            }
            
            // سپس به Date object تبدیل می‌کنیم
            const gregorianDateObj = gregorianDayjs.toDate();
            gregorianDate = gregorianDateObj.toISOString().split('T')[0];
            
            // بررسی معتبر بودن سال میلادی
            const gregorianYear = gregorianDateObj.getFullYear();
            if (gregorianYear < 1900 || gregorianYear > 2100) {
              console.error('Invalid conversion:', {
                jalali: date,
                jalaliDateStr,
                gregorianFormat: gregorianDayjs.format('YYYY-MM-DD'),
                gregorianYear,
                gregorianDate
              });
              throw new Error(`Invalid Gregorian year: ${gregorianYear}`);
            }
            
            console.log(`Converted Jalali date ${date} to Gregorian ${gregorianDate}`);
          } catch (err) {
            console.error('Error converting Jalali to Gregorian:', err);
            return res.status(400).json({ error: `خطا در تبدیل تاریخ شمسی: ${err instanceof Error ? err.message : 'تاریخ نامعتبر است'}` });
          }
        }
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (gregorianDate && startTime !== undefined) {
      const startAt = `${gregorianDate}T${startTime}:00`;
      updates.push('start_at = ?');
      params.push(startAt);
    } else if (gregorianDate) {
      // Update only date, keep existing time
      const existingStart = existingEvent.start_at;
      if (existingStart) {
        const timePart = existingStart.split('T')[1] || '09:00:00';
        const startAt = `${gregorianDate}T${timePart}`;
        updates.push('start_at = ?');
        params.push(startAt);
      }
    }
    if (endTime !== undefined) {
      if (endTime && gregorianDate) {
        const endAt = `${gregorianDate}T${endTime}:00`;
        updates.push('end_at = ?');
        params.push(endAt);
      } else {
        updates.push('end_at = ?');
        params.push(null);
      }
    }
    if (relationType !== undefined) {
      updates.push('relation_type = ?');
      params.push(relationType);
    }
    if (relationId !== undefined) {
      updates.push('relation_id = ?');
      params.push(relationId || null);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.run(
      `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`,
      params,
      function(err) {
        if (err) {
          console.error('Error updating calendar event:', err);
          return res.status(500).json({ error: 'خطا در به‌روزرسانی رویداد: ' + err.message });
        }

        const clientInfo = getClientInfo(req);
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'update',
          entityType: 'calendar_event',
          entityId: undefined, // calendar_events uses TEXT id, not number
          description: `Updated calendar event: ${title || existingEvent.title} (ID: ${id})`,
          ...clientInfo
        });

        res.json({ message: 'رویداد با موفقیت به‌روزرسانی شد' });
      }
    );
  });
});

// Delete calendar event
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.get('SELECT * FROM calendar_events WHERE id = ?', [id], (err, event: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی رویداد' });
    }
    if (!event) {
      return res.status(404).json({ error: 'رویداد یافت نشد' });
    }

    db.run('DELETE FROM calendar_events WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting calendar event:', err);
        return res.status(500).json({ error: 'خطا در حذف رویداد' });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'delete',
        entityType: 'calendar_event',
        entityId: undefined, // calendar_events uses TEXT id, not number
        description: `Deleted calendar event: ${event.title} (ID: ${id})`,
        ...clientInfo
      });

      res.json({ message: 'رویداد با موفقیت حذف شد' });
    });
  });
});

export default router;

