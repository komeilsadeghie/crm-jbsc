// Lead Scoring Service
import { db } from '../database/db';

export interface ScoringRule {
  event_type: string;
  points: number;
  description: string;
}

// Default scoring rules
const DEFAULT_RULES: ScoringRule[] = [
  // Engagement (0-40 points)
  { event_type: 'email_opened', points: 5, description: 'باز کردن ایمیل' },
  { event_type: 'email_clicked', points: 10, description: 'کلیک روی لینک ایمیل' },
  { event_type: 'whatsapp_replied', points: 15, description: 'پاسخ به واتساپ' },
  { event_type: 'website_visited', points: 10, description: 'بازدید از وب‌سایت' },
  { event_type: 'form_submitted', points: 20, description: 'ثبت فرم' },
  
  // Fit (0-30 points)
  { event_type: 'industry_match', points: 10, description: 'سازگاری صنعت' },
  { event_type: 'budget_qualified', points: 15, description: 'بودجه مناسب' },
  { event_type: 'decision_maker', points: 20, description: 'تصمیم‌گیر اصلی' },
  
  // Intent (0-30 points)
  { event_type: 'demo_requested', points: 25, description: 'درخواست دمو' },
  { event_type: 'proposal_requested', points: 30, description: 'درخواست پروپوزال' },
  { event_type: 'pricing_viewed', points: 15, description: 'مشاهده قیمت' },
  { event_type: 'case_study_viewed', points: 10, description: 'مطالعه نمونه کار' },
];

export const calculateLeadScore = (leadId: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT SUM(points) as total FROM lead_scoring_events WHERE lead_id = ?',
      [leadId],
      (err, result: any) => {
        if (err) {
          reject(err);
        } else {
          const score = Math.min(100, Math.max(0, result[0]?.total || 0));
          resolve(score);
        }
      }
    );
  });
};

export const addScoringEvent = (
  leadId: number,
  eventType: string,
  description?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const rule = DEFAULT_RULES.find(r => r.event_type === eventType);
    if (!rule) {
      reject(new Error('Event type not found'));
      return;
    }

    db.run(
      'INSERT INTO lead_scoring_events (lead_id, event_type, points, description) VALUES (?, ?, ?, ?)',
      [leadId, eventType, rule.points, description || rule.description],
      (err) => {
        if (err) {
          reject(err);
        } else {
          // Update lead score
          calculateLeadScore(leadId).then(score => {
            db.run(
              'UPDATE leads SET lead_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [score, leadId],
              () => resolve()
            );
          });
        }
      }
    );
  });
};

export const autoScoreLead = (lead: any): number => {
  let score = 0;

  // Engagement scoring
  if (lead.email) score += 5;
  if (lead.phone) score += 5;
  if (lead.whatsapp) score += 5;
  if (lead.company_name) score += 5;

  // Fit scoring
  if (lead.industry) score += 10;
  if (lead.budget_range) score += 15;
  if (lead.decision_maker_role) score += 20;

  // Intent scoring
  if (lead.source === 'website') score += 10;
  if (lead.tags && lead.tags.includes('urgent')) score += 15;

  return Math.min(100, score);
};


