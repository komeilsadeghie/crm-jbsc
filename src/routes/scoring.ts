import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { addScoringEvent, calculateLeadScore, autoScoreLead } from '../services/scoring';

const router = express.Router();

// Auto-score a lead
router.post('/leads/:id/auto-score', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM leads WHERE id = ?', [id], async (err, lead: any) => {
    if (err || !lead) {
      return res.status(404).json({ error: 'سرنخ یافت نشد' });
    }

    try {
      const score = autoScoreLead(lead);
      db.run(
        'UPDATE leads SET lead_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [score, id],
        function() {
          res.json({ 
            message: 'امتیاز محاسبه شد',
            score 
          });
        }
      );
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
});

// Add scoring event
router.post('/leads/:id/events', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { event_type, description } = req.body;

  try {
    await addScoringEvent(parseInt(id), event_type, description);
    const newScore = await calculateLeadScore(parseInt(id));
    res.json({ 
      message: 'رویداد امتیازدهی ثبت شد',
      new_score: newScore
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get scoring history
router.get('/leads/:id/events', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM lead_scoring_events WHERE lead_id = ? ORDER BY created_at DESC',
    [id],
    (err, events) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت تاریخچه امتیازدهی' });
      }
      res.json(events);
    }
  );
});

export default router;


