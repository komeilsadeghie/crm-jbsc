import express, { Response } from 'express';
import { db, isMySQL } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity, getClientInfo } from '../utils/activityLogger';

const router = express.Router();

// ========== Surveys Management ==========

// Get all surveys
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { survey_type, is_active } = req.query;

  let query = `
    SELECT s.*, u.full_name as created_by_name,
           (SELECT COUNT(*) FROM survey_responses WHERE survey_id = s.id) as response_count
    FROM surveys s
    LEFT JOIN users u ON s.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (survey_type) {
    query += ' AND s.survey_type = ?';
    params.push(survey_type);
  }

  if (is_active !== undefined) {
    query += ' AND s.is_active = ?';
    params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
  }

  query += ' ORDER BY s.created_at DESC';

  db.all(query, params, (err, surveys) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت نظرسنجی‌ها' });
    }
    res.json(surveys);
  });
});

// Get single survey with questions
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM surveys WHERE id = ?', [id], (err, survey: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت نظرسنجی' });
    }
    if (!survey) {
      return res.status(404).json({ error: 'نظرسنجی یافت نشد' });
    }

    db.all('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY position', [id], (err, questions) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت سوالات' });
      }

      res.json({
        ...survey,
        questions: questions || []
      });
    });
  });
});

// Create survey
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const survey: any = req.body;
  const userId = req.user?.id;

  const {
    title,
    description,
    survey_type,
    is_active = true,
    is_anonymous = false,
    allow_multiple_responses = false,
    start_date,
    end_date,
    questions
  } = survey;

  if (!title || !survey_type) {
    return res.status(400).json({ error: 'عنوان و نوع نظرسنجی الزامی است' });
  }

  db.run(
    `INSERT INTO surveys (
      title, description, survey_type, is_active, is_anonymous,
      allow_multiple_responses, start_date, end_date, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description || null,
      survey_type,
      is_active ? 1 : 0,
      is_anonymous ? 1 : 0,
      allow_multiple_responses ? 1 : 0,
      start_date || null,
      end_date || null,
      userId ? parseInt(String(userId)) : null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت نظرسنجی' });
      }

      const surveyId = this.lastID;

      // Insert questions if provided
      if (questions && Array.isArray(questions) && questions.length > 0) {
        const questionStmt = db.prepare(`
          INSERT INTO survey_questions (
            survey_id, question_text, question_type, options, is_required, position
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        questions.forEach((question: any, index: number) => {
          questionStmt.run([
            surveyId,
            question.question_text,
            question.question_type,
            question.options ? JSON.stringify(question.options) : null,
            question.is_required ? 1 : 0,
            question.position || index
          ]);
        });

        questionStmt.finalize((err) => {
          if (err) {
            console.error('Error inserting survey questions:', err);
          }

          const clientInfo = getClientInfo(req);
          logActivity({
            userId: parseInt(String(userId!)),
            action: 'create',
            entityType: 'survey',
            entityId: surveyId,
            description: `Created survey: ${title}`,
            ...clientInfo
          });

          res.status(201).json({ id: surveyId, message: 'نظرسنجی با موفقیت ثبت شد' });
        });
      } else {
        const clientInfo = getClientInfo(req);
        logActivity({
          userId: parseInt(String(userId!)),
          action: 'create',
          entityType: 'survey',
          entityId: surveyId,
          description: `Created survey: ${title}`,
          ...clientInfo
        });

        res.status(201).json({ id: surveyId, message: 'نظرسنجی با موفقیت ثبت شد' });
      }
    }
  );
});

// Update survey
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const survey: any = req.body;
  const userId = req.user?.id;

  const {
    title,
    description,
    is_active,
    is_anonymous,
    allow_multiple_responses,
    start_date,
    end_date,
    questions
  } = survey;

  db.run(
    `UPDATE surveys SET 
      title = COALESCE(?, title),
      description = ?,
      is_active = COALESCE(?, is_active),
      is_anonymous = COALESCE(?, is_anonymous),
      allow_multiple_responses = COALESCE(?, allow_multiple_responses),
      start_date = ?,
      end_date = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title || null,
      description || null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      is_anonymous !== undefined ? (is_anonymous ? 1 : 0) : null,
      allow_multiple_responses !== undefined ? (allow_multiple_responses ? 1 : 0) : null,
      start_date || null,
      end_date || null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی نظرسنجی' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'نظرسنجی یافت نشد' });
      }

      // Update questions if provided
      if (questions && Array.isArray(questions)) {
        db.run('DELETE FROM survey_questions WHERE survey_id = ?', [id], () => {
          const questionStmt = db.prepare(`
            INSERT INTO survey_questions (
              survey_id, question_text, question_type, options, is_required, position
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);

          questions.forEach((question: any, index: number) => {
            questionStmt.run([
              parseInt(id),
              question.question_text,
              question.question_type,
              question.options ? JSON.stringify(question.options) : null,
              question.is_required ? 1 : 0,
              question.position || index
            ]);
          });

          questionStmt.finalize();
        });
      }

      const clientInfo = getClientInfo(req);
      logActivity({
        userId: parseInt(String(userId!)),
        action: 'update',
        entityType: 'survey',
        entityId: parseInt(id),
        description: `Updated survey ${id}`,
        ...clientInfo
      });

      res.json({ message: 'نظرسنجی با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete survey
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  db.run('DELETE FROM surveys WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف نظرسنجی' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'نظرسنجی یافت نشد' });
    }

    const clientInfo = getClientInfo(req);
    logActivity({
      userId: parseInt(String(userId!)),
      action: 'delete',
      entityType: 'survey',
      entityId: parseInt(id),
      description: `Deleted survey ${id}`,
      ...clientInfo
    });

    res.json({ message: 'نظرسنجی با موفقیت حذف شد' });
  });
});

// ========== Survey Questions ==========

// Get survey questions
router.get('/:id/questions', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.all('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY position', [id], (err, questions) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت سوالات' });
    }
    res.json(questions);
  });
});

// Add question to survey
router.post('/:id/questions', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const question: any = req.body;

  const {
    question_text,
    question_type,
    options,
    is_required = false
  } = question;

  if (!question_text || !question_type) {
    return res.status(400).json({ error: 'متن سوال و نوع سوال الزامی است' });
  }

  db.get('SELECT COUNT(*) as count FROM survey_questions WHERE survey_id = ?', [id], (err, result: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی سوالات' });
    }

    const position = result.count;

    db.run(
      `INSERT INTO survey_questions (
        survey_id, question_text, question_type, options, is_required, position
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        question_text,
        question_type,
        options ? JSON.stringify(options) : null,
        is_required ? 1 : 0,
        position
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'خطا در افزودن سوال' });
        }
        res.status(201).json({ id: this.lastID, message: 'سوال با موفقیت اضافه شد' });
      }
    );
  });
});

// Update question
router.put('/:id/questions/:questionId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, questionId } = req.params;
  const question: any = req.body;

  db.run(
    `UPDATE survey_questions SET 
      question_text = COALESCE(?, question_text),
      question_type = COALESCE(?, question_type),
      options = ?,
      is_required = COALESCE(?, is_required),
      position = COALESCE(?, position)
     WHERE id = ? AND survey_id = ?`,
    [
      question.question_text || null,
      question.question_type || null,
      question.options ? JSON.stringify(question.options) : null,
      question.is_required !== undefined ? (question.is_required ? 1 : 0) : null,
      question.position || null,
      questionId,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی سوال' });
      }
      res.json({ message: 'سوال با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete question
router.delete('/:id/questions/:questionId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, questionId } = req.params;

  db.run('DELETE FROM survey_questions WHERE id = ? AND survey_id = ?', [questionId, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف سوال' });
    }
    res.json({ message: 'سوال با موفقیت حذف شد' });
  });
});

// ========== Survey Responses ==========

// Get survey responses
router.get('/:id/responses', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Use CONCAT for MySQL, || for SQLite
  const contactNameExpr = isMySQL 
    ? "CONCAT(c.first_name, ' ', c.last_name)"
    : "c.first_name || ' ' || c.last_name";

  db.all(`
    SELECT sr.*, 
           u.full_name as user_name,
           ${contactNameExpr} as contact_name,
           a.name as account_name
    FROM survey_responses sr
    LEFT JOIN users u ON sr.user_id = u.id
    LEFT JOIN contacts c ON sr.contact_id = c.id
    LEFT JOIN accounts a ON sr.account_id = a.id
    WHERE sr.survey_id = ?
    ORDER BY sr.submitted_at DESC
  `, [id], (err, responses) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پاسخ‌ها' });
    }
    res.json(responses);
  });
});

// Submit survey response (public endpoint)
router.post('/:id/responses', (req: express.Request, res: Response) => {
  const { id } = req.params;
  const { response_data, user_id, contact_id, lead_id, account_id } = req.body;

  if (!response_data) {
    return res.status(400).json({ error: 'داده‌های پاسخ الزامی است' });
  }

  // Check if survey exists and is active
  db.get('SELECT * FROM surveys WHERE id = ? AND is_active = 1', [id], (err, survey: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در بررسی نظرسنجی' });
    }
    if (!survey) {
      return res.status(404).json({ error: 'نظرسنجی یافت نشد یا غیرفعال است' });
    }

    // Check date range
    const now = new Date();
    if (survey.start_date && new Date(survey.start_date) > now) {
      return res.status(400).json({ error: 'نظرسنجی هنوز شروع نشده است' });
    }
    if (survey.end_date && new Date(survey.end_date) < now) {
      return res.status(400).json({ error: 'نظرسنجی منقضی شده است' });
    }

    // Check if multiple responses allowed
    if (!survey.allow_multiple_responses) {
      const identifier = user_id || contact_id || lead_id || account_id;
      if (identifier) {
        db.get(
          `SELECT COUNT(*) as count FROM survey_responses 
           WHERE survey_id = ? AND (user_id = ? OR contact_id = ? OR lead_id = ? OR account_id = ?)`,
          [id, user_id || null, contact_id || null, lead_id || null, account_id || null],
          (err, result: any) => {
            if (result && result.count > 0) {
              return res.status(400).json({ error: 'شما قبلاً به این نظرسنجی پاسخ داده‌اید' });
            }
            submitResponse();
          }
        );
      } else {
        submitResponse();
      }
    } else {
      submitResponse();
    }

    function submitResponse() {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      db.run(
        `INSERT INTO survey_responses (
          survey_id, user_id, contact_id, lead_id, account_id,
          response_data, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          user_id || null,
          contact_id || null,
          lead_id || null,
          account_id || null,
          JSON.stringify(response_data),
          ipAddress || null,
          userAgent || null
        ],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'خطا در ثبت پاسخ' });
          }
          res.status(201).json({ id: this.lastID, message: 'پاسخ با موفقیت ثبت شد' });
        }
      );
    }
  });
});

// Get survey analytics
router.get('/:id/analytics', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT COUNT(*) as total_responses FROM survey_responses WHERE survey_id = ?', [id], (err, responseCount: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت آمار' });
    }

    db.all(`
      SELECT question_id, 
             COUNT(*) as response_count,
             response_data
      FROM survey_responses
      WHERE survey_id = ?
      GROUP BY question_id
    `, [id], (err, questionStats) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت آمار سوالات' });
      }

      res.json({
        total_responses: responseCount.total_responses || 0,
        question_statistics: questionStats || []
      });
    });
  });
});

export default router;

