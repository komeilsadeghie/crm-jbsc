import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get unified calendar events
router.get('/events', authenticate, (req: AuthRequest, res: Response) => {
  const { start_date, end_date, event_type } = req.query;

  const events: any[] = [];

  // Tasks
  let taskQuery = `
    SELECT 
      id,
      title as name,
      due_date as start,
      due_date as end,
      'task' as type,
      status,
      priority,
      assigned_to
    FROM tasks
    WHERE due_date IS NOT NULL
  `;
  const taskParams: any[] = [];

  if (start_date) {
    taskQuery += ' AND DATE(due_date) >= ?';
    taskParams.push(start_date);
  }

  if (end_date) {
    taskQuery += ' AND DATE(due_date) <= ?';
    taskParams.push(end_date);
  }

  if (event_type && event_type !== 'task') {
    // Skip tasks if not requested
  } else {
    db.all(taskQuery, taskParams, (err, tasks) => {
      if (!err && tasks) {
        events.push(...tasks.map((t: any) => ({
          ...t,
          color: t.status === 'done' ? '#10B981' : t.priority === 'high' ? '#EF4444' : '#3B82F6'
        })));
      }

      // Invoice due dates
      let invoiceQuery = `
        SELECT 
          id,
          invoice_number as name,
          due_date as start,
          due_date as end,
          'invoice' as type,
          status,
          total_amount as amount
        FROM invoices
        WHERE due_date IS NOT NULL
      `;
      const invoiceParams: any[] = [];

      if (start_date) {
        invoiceQuery += ' AND DATE(due_date) >= ?';
        invoiceParams.push(start_date);
      }

      if (end_date) {
        invoiceQuery += ' AND DATE(due_date) <= ?';
        invoiceParams.push(end_date);
      }

      if (event_type && event_type !== 'invoice') {
        // Skip invoices if not requested
      } else {
        db.all(invoiceQuery, invoiceParams, (err, invoices) => {
          if (!err && invoices) {
            events.push(...invoices.map((i: any) => ({
              ...i,
              color: i.status === 'paid' ? '#10B981' : '#F59E0B'
            })));
          }

          // Contract expiry dates
          let contractQuery = `
            SELECT 
              id,
              title as name,
              expiry_date as start,
              expiry_date as end,
              'contract' as type,
              status
            FROM contracts
            WHERE expiry_date IS NOT NULL
          `;
          const contractParams: any[] = [];

          if (start_date) {
            contractQuery += ' AND DATE(expiry_date) >= ?';
            contractParams.push(start_date);
          }

          if (end_date) {
            contractQuery += ' AND DATE(expiry_date) <= ?';
            contractParams.push(end_date);
          }

          if (event_type && event_type !== 'contract') {
            // Skip contracts if not requested
          } else {
            db.all(contractQuery, contractParams, (err, contracts) => {
              if (!err && contracts) {
                events.push(...contracts.map((c: any) => ({
                  ...c,
                  color: c.status === 'active' ? '#3B82F6' : '#6B7280'
                })));
              }

              // Project milestones
              let milestoneQuery = `
                SELECT 
                  pm.id,
                  pm.name,
                  pm.target_date as start,
                  pm.target_date as end,
                  'milestone' as type,
                  pm.status,
                  p.name as project_name
                FROM project_milestones pm
                LEFT JOIN projects p ON pm.project_id = p.id
                WHERE pm.target_date IS NOT NULL
              `;
              const milestoneParams: any[] = [];

              if (start_date) {
                milestoneQuery += ' AND DATE(pm.target_date) >= ?';
                milestoneParams.push(start_date);
              }

              if (end_date) {
                milestoneQuery += ' AND DATE(pm.target_date) <= ?';
                milestoneParams.push(end_date);
              }

              if (event_type && event_type !== 'milestone') {
                // Skip milestones if not requested
              } else {
                db.all(milestoneQuery, milestoneParams, (err, milestones) => {
                  if (!err && milestones) {
                    events.push(...milestones.map((m: any) => ({
                      ...m,
                      color: m.status === 'completed' ? '#10B981' : '#8B5CF6'
                    })));
                  }

                  // Calendar Events
                  let calendarEventQuery = `
                    SELECT 
                      id,
                      title as name,
                      start_at as start,
                      end_at as end,
                      'event' as type,
                      description,
                      relation_type,
                      color
                    FROM calendar_events
                    WHERE 1=1
                  `;
                  const calendarEventParams: any[] = [];

                  if (start_date) {
                    calendarEventQuery += ' AND DATE(start_at) >= ?';
                    calendarEventParams.push(start_date);
                  }

                  if (end_date) {
                    calendarEventQuery += ' AND DATE(start_at) <= ?';
                    calendarEventParams.push(end_date);
                  }

                  if (event_type && event_type !== 'event') {
                    // Skip calendar events if not requested
                  } else {
                    db.all(calendarEventQuery, calendarEventParams, (err, calendarEvents) => {
                      if (!err && calendarEvents) {
                        events.push(...calendarEvents.map((e: any) => ({
                          ...e,
                          id: e.id,
                          name: e.name || e.title,
                          title: e.name || e.title,
                          color: e.color || '#6366F1',
                          start: e.start,
                          end: e.end,
                          start_at: e.start,
                          end_at: e.end,
                          type: 'event',
                          description: e.description
                        })));
                      }

                      // Coaching Sessions
                      let coachingQuery = `
                        SELECT 
                          cs.id,
                          c.name || ' - جلسه کوچینگ' as name,
                          cs.session_date as start,
                          cs.session_date as end,
                          'coaching_session' as type,
                          cs.notes as description,
                          cs.status,
                          cs.color,
                          cs.customer_id
                        FROM coaching_sessions cs
                        JOIN customers c ON cs.customer_id = c.id
                        WHERE cs.session_date IS NOT NULL
                      `;
                      const coachingParams: any[] = [];

                      if (start_date) {
                        coachingQuery += ' AND DATE(cs.session_date) >= ?';
                        coachingParams.push(start_date);
                      }

                      if (end_date) {
                        coachingQuery += ' AND DATE(cs.session_date) <= ?';
                        coachingParams.push(end_date);
                      }

                      if (event_type && event_type !== 'coaching_session') {
                        // Skip coaching sessions if not requested
                        console.log(`Returning ${events.length} events for date range ${start_date} to ${end_date}`);
                        res.json(events);
                      } else {
                        db.all(coachingQuery, coachingParams, (err, coachingSessions) => {
                          if (!err && coachingSessions) {
                            events.push(...coachingSessions.map((s: any) => ({
                              ...s,
                              id: `coaching_${s.id}`,
                              title: s.name,
                              color: s.color || '#8B5CF6',
                              start: s.start,
                              end: s.end,
                              start_at: s.start,
                              end_at: s.end,
                              type: 'coaching_session',
                              description: s.description
                            })));
                          }

                          console.log(`Returning ${events.length} events for date range ${start_date} to ${end_date}`);
                          res.json(events);
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }
});

export default router;


