import { Router } from 'express';
import { AuthRequest, authenticate } from '../../middleware/auth';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from './calendar.service';

const router = Router();

router.get('/events', authenticate, async (req, res) => {
  try {
    const { start, end, relationType, relationId } = req.query;
    const events = await listCalendarEvents({
      start: start as string | undefined,
      end: end as string | undefined,
      relationType: relationType as any,
      relationId: relationId as string | undefined,
    });

    res.json(Array.isArray(events) ? events : []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت رویدادها' });
  }
});

router.post('/events', authenticate, async (req: AuthRequest, res) => {
  try {
    const event = await createCalendarEvent(req.body, req.user?.id);
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_DATE') {
      return res.status(400).json({ error: 'تاریخ نامعتبر است' });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در ایجاد رویداد' });
  }
});

router.put('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await updateCalendarEvent(id, req.body);
    res.json(event);
  } catch (error) {
    if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
      return res.status(404).json({ error: 'رویداد یافت نشد' });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی رویداد' });
  }
});

router.delete('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCalendarEvent(id);
    res.json({ message: 'رویداد حذف شد' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف رویداد' });
  }
});

export default router;


