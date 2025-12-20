import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all projects
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { account_id, status } = req.query;
  
  let query = `
    SELECT p.*, 
           a.name as account_name,
           u.full_name as manager_name
    FROM projects p
    LEFT JOIN accounts a ON p.account_id = a.id
    LEFT JOIN users u ON p.manager_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (account_id) {
    query += ' AND p.account_id = ?';
    params.push(account_id);
  }

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  query += ' ORDER BY p.created_at DESC';

  db.all(query, params, (err, projects) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پروژه‌ها' });
    }
    
    // Fetch labels for each project
    if (!projects || projects.length === 0) {
      return res.json([]);
    }
    
    const projectIds = projects.map((p: any) => p.id);
    const placeholders = projectIds.map(() => '?').join(',');
    
    db.all(
      `SELECT * FROM project_labels WHERE project_id IN (${placeholders})`,
      projectIds,
      (labelErr, labels) => {
        if (labelErr) {
          console.error('Error fetching labels:', labelErr);
          return res.json(projects);
        }
        
        // Group labels by project_id
        const labelsByProject: Record<number, any[]> = {};
        (labels || []).forEach((label: any) => {
          if (!labelsByProject[label.project_id]) {
            labelsByProject[label.project_id] = [];
          }
          labelsByProject[label.project_id].push(label);
        });
        
        // Add labels to projects
        const projectsWithLabels = projects.map((project: any) => ({
          ...project,
          labels: labelsByProject[project.id] || []
        }));
        
        res.json(projectsWithLabels);
      }
    );
  });
});

// Get single project with details
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT p.*, 
           a.name as account_name,
           u.full_name as manager_name
    FROM projects p
    LEFT JOIN accounts a ON p.account_id = a.id
    LEFT JOIN users u ON p.manager_id = u.id
    WHERE p.id = ?
  `, [id], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت پروژه' });
    }
    if (!project) {
      return res.status(404).json({ error: 'پروژه یافت نشد' });
    }

    // Get milestones
    db.all('SELECT * FROM project_milestones WHERE project_id = ? ORDER BY target_date', [id], (err, milestones) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت milestones' });
      }

      // Get discussions
      db.all(`
        SELECT pd.*, u.username, u.full_name, u.role as user_role
        FROM project_discussions pd
        LEFT JOIN users u ON pd.user_id = u.id
        WHERE pd.project_id = ?
        ORDER BY pd.created_at DESC
      `, [id], (err, discussions) => {
        if (err) {
          return res.status(500).json({ error: 'خطا در دریافت discussions' });
        }

        // Get files
        db.all('SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC', [id], (err, files) => {
          if (err) {
            return res.status(500).json({ error: 'خطا در دریافت فایل‌ها' });
          }

          // Get tasks
          db.all('SELECT * FROM tasks WHERE project_id = ?', [id], (err, tasks) => {
            if (err) {
              return res.status(500).json({ error: 'خطا در دریافت وظایف' });
            }

            // Get time logs for each task
            if (tasks && tasks.length > 0) {
              const taskIds = tasks.map((t: any) => t.id);
              const placeholders = taskIds.map(() => '?').join(',');
              
              db.all(`SELECT * FROM time_logs WHERE task_id IN (${placeholders})`, taskIds, (err, timeLogs) => {
                if (err) {
                  return res.status(500).json({ error: 'خطا در دریافت لاگ‌های زمان' });
                }

                // Group time logs by task_id
                const logsByTask: Record<number, any[]> = {};
                (timeLogs || []).forEach((log: any) => {
                  if (!logsByTask[log.task_id]) {
                    logsByTask[log.task_id] = [];
                  }
                  logsByTask[log.task_id].push(log);
                });

                // Attach time logs to tasks
                const tasksWithLogs = tasks.map((task: any) => ({
                  ...task,
                  time_logs: logsByTask[task.id] || []
                }));

                // Get expenses
                db.all('SELECT * FROM expenses WHERE project_id = ?', [id], (err, expenses) => {
                  if (err) {
                    return res.status(500).json({ error: 'خطا در دریافت هزینه‌ها' });
                  }

                  res.json({
                    ...(project as any),
                    milestones: milestones || [],
                    discussions: discussions || [],
                    files: files || [],
                    tasks: tasksWithLogs || [],
                    expenses: expenses || []
                  });
                });
              });
            } else {
              // No tasks, just get expenses
              db.all('SELECT * FROM expenses WHERE project_id = ?', [id], (err, expenses) => {
                if (err) {
                  return res.status(500).json({ error: 'خطا در دریافت هزینه‌ها' });
                }

                res.json({
                  ...(project as any),
                  milestones: milestones || [],
                  discussions: discussions || [],
                  files: files || [],
                  tasks: [],
                  expenses: expenses || []
                });
              });
            }
          });
        });
      });
    });
  });
});

// Helper function to convert settlement values from 'true'/'false' to number or null
const convertSettlementValue = (value: any): number | null => {
  if (!value || value === '' || value === 'false') {
    return null;
  }
  if (value === 'true' || value === true) {
    return null; // Settlement fields are DECIMAL, so we use null for boolean true
  }
  // If it's a number, parse and return it
  const num = parseFloat(String(value));
  return isNaN(num) ? null : num;
};

// Create project
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const project = req.body;

  // Validation
  if (!project.name || project.name.trim() === '') {
    return res.status(400).json({ error: 'نام پروژه الزامی است' });
  }

  // Parse numeric values
  const accountId = project.account_id ? parseInt(project.account_id) : null;
  const budget = project.budget ? parseFloat(project.budget) : null;
  const managerId = project.manager_id ? parseInt(project.manager_id) : null;
  // Convert user id to integer, or use null if not available
  const createdBy = req.user?.id ? parseInt(String(req.user.id)) : null;

  // Validate foreign keys exist before inserting
  const validateForeignKeys = (callback: (err: Error | null, finalCreatedBy: number | null) => void) => {
    let finalCreatedBy = createdBy;
    
    // Check created_by first
    if (createdBy) {
      db.get('SELECT id FROM users WHERE id = ?', [createdBy], (err, user) => {
        if (err) {
          return callback(err, null);
        }
        if (!user) {
          console.warn(`User ${createdBy} not found in database, setting created_by to null`);
          finalCreatedBy = null; // Set to null if user doesn't exist
        }
        
        // Check account_id if provided
        if (accountId) {
          // First check if accounts table exists
          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'", [], async (tableErr, tableRow) => {
            if (tableErr || !tableRow) {
              // Table doesn't exist or error, allow null account_id
              console.warn('Accounts table may not exist, allowing null account_id');
              if (managerId) {
                db.get('SELECT id FROM users WHERE id = ?', [managerId], (err, manager) => {
                  if (err) return callback(err, null);
                  if (!manager) return callback(new Error('مدیر انتخاب شده یافت نشد'), null);
                  callback(null, finalCreatedBy);
                });
              } else {
                callback(null, finalCreatedBy);
              }
              return;
            }
            
            db.get('SELECT id FROM accounts WHERE id = ?', [accountId], (err, account) => {
              if (err) {
                console.error('Error checking account:', err);
                // If table doesn't exist error, allow null account_id
                if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
                  console.warn('Accounts table does not exist, allowing null account_id');
                  if (managerId) {
                    db.get('SELECT id FROM users WHERE id = ?', [managerId], (err, manager) => {
                      if (err) return callback(err, null);
                      if (!manager) return callback(new Error('مدیر انتخاب شده یافت نشد'), null);
                      callback(null, finalCreatedBy);
                    });
                  } else {
                    callback(null, finalCreatedBy);
                  }
                  return;
                }
                return callback(err, null);
              }
              if (!account) {
                return callback(new Error('مشتری انتخاب شده یافت نشد'), null);
              }
              
              // Check manager_id if provided
              if (managerId) {
                db.get('SELECT id FROM users WHERE id = ?', [managerId], (err, manager) => {
                  if (err) {
                    return callback(err, null);
                  }
                  if (!manager) {
                    return callback(new Error('مدیر انتخاب شده یافت نشد'), null);
                  }
                  callback(null, finalCreatedBy);
                });
              } else {
                callback(null, finalCreatedBy);
              }
            });
          });
        } else {
          // No account_id, just check manager_id if provided
          if (managerId) {
            db.get('SELECT id FROM users WHERE id = ?', [managerId], (err, manager) => {
              if (err) {
                return callback(err, null);
              }
              if (!manager) {
                return callback(new Error('مدیر انتخاب شده یافت نشد'), null);
              }
              callback(null, finalCreatedBy);
            });
          } else {
            callback(null, finalCreatedBy);
          }
        }
      });
    } else {
      // No created_by, check other foreign keys
      if (accountId) {
        db.get('SELECT id FROM accounts WHERE id = ?', [accountId], (err, account) => {
          if (err) {
            return callback(err, null);
          }
          if (!account) {
            return callback(new Error('مشتری انتخاب شده یافت نشد'), null);
          }
          
          if (managerId) {
            db.get('SELECT id FROM users WHERE id = ?', [managerId], (err, manager) => {
              if (err) {
                return callback(err, null);
              }
              if (!manager) {
                return callback(new Error('مدیر انتخاب شده یافت نشد'), null);
              }
              callback(null, finalCreatedBy);
            });
          } else {
            callback(null, finalCreatedBy);
          }
        });
      } else {
        if (managerId) {
          db.get('SELECT id FROM users WHERE id = ?', [managerId], (err, manager) => {
            if (err) {
              return callback(err, null);
            }
            if (!manager) {
              return callback(new Error('مدیر انتخاب شده یافت نشد'), null);
            }
            callback(null, finalCreatedBy);
          });
        } else {
          callback(null, finalCreatedBy);
        }
      }
    }
  };

  validateForeignKeys((validationErr, finalCreatedBy) => {
    if (validationErr) {
      console.error('Foreign key validation error:', validationErr);
      return res.status(400).json({ error: validationErr.message });
    }

    db.run(
      `INSERT INTO projects (
        account_id, deal_id, name, description, status,
        start_date, end_date, budget, manager_id, settlements,
        payment_stage_1, payment_stage_1_date,
        payment_stage_2, payment_stage_2_date,
        payment_stage_3, payment_stage_3_date,
        payment_stage_4, payment_stage_4_date,
        settlement_kamil, settlement_asdan, settlement_soleimani,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        project.deal_id || null,
        project.name.trim(),
        project.description ? project.description.trim() : null,
        project.status || 'planning',
        project.start_date || null,
        project.end_date || null,
        budget,
        managerId,
        project.settlements ? JSON.stringify(project.settlements) : null,
        project.payment_stage_1 || null,
        project.payment_stage_1_date || null,
        project.payment_stage_2 || null,
        project.payment_stage_2_date || null,
        project.payment_stage_3 || null,
        project.payment_stage_3_date || null,
        project.payment_stage_4 || null,
        project.payment_stage_4_date || null,
        convertSettlementValue(project.settlement_kamil),
        convertSettlementValue(project.settlement_asdan),
        convertSettlementValue(project.settlement_soleimani),
        finalCreatedBy
      ],
      function(err) {
        if (err) {
          console.error('Error creating project:', err);
          // Check if it's a foreign key constraint error
          if (err.message.includes('FOREIGN KEY')) {
            return res.status(400).json({ 
              error: 'خطا در ثبت پروژه: یکی از مقادیر انتخاب شده معتبر نیست. لطفاً مشتری یا مدیر را دوباره انتخاب کنید.' 
            });
          }
          return res.status(500).json({ error: 'خطا در ثبت پروژه: ' + err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'پروژه با موفقیت ثبت شد' });
      }
    );
  });
});

// Update project
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const project = req.body;

  db.run(
    `UPDATE projects SET 
      account_id = ?, deal_id = ?, name = ?, description = ?, status = ?,
      start_date = ?, end_date = ?, budget = ?, manager_id = ?, settlements = ?,
      payment_stage_1 = ?, payment_stage_1_date = ?,
      payment_stage_2 = ?, payment_stage_2_date = ?,
      payment_stage_3 = ?, payment_stage_3_date = ?,
      payment_stage_4 = ?, payment_stage_4_date = ?,
      settlement_kamil = ?, settlement_asdan = ?, settlement_soleimani = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      project.account_id || null,
      project.deal_id || null,
      project.name,
      project.description || null,
      project.status,
      project.start_date || null,
      project.end_date || null,
      project.budget || null,
      project.manager_id || null,
      project.settlements ? JSON.stringify(project.settlements) : null,
      project.payment_stage_1 || null,
      project.payment_stage_1_date || null,
      project.payment_stage_2 || null,
      project.payment_stage_2_date || null,
      project.payment_stage_3 || null,
      project.payment_stage_3_date || null,
      project.payment_stage_4 || null,
      project.payment_stage_4_date || null,
      convertSettlementValue(project.settlement_kamil),
      convertSettlementValue(project.settlement_asdan),
      convertSettlementValue(project.settlement_soleimani),
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی پروژه' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'پروژه یافت نشد' });
      }
      res.json({ message: 'پروژه با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Add milestone
router.post('/:id/milestones', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const milestone = req.body;

  db.run(
    `INSERT INTO project_milestones (project_id, name, description, target_date, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      milestone.name,
      milestone.description || null,
      milestone.target_date || null,
      milestone.status || 'pending'
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت milestone' });
      }
      res.status(201).json({ id: this.lastID, message: 'Milestone با موفقیت ثبت شد' });
    }
  );
});

// Add discussion
router.post('/:id/discussions', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { message } = req.body;

  db.run(
    `INSERT INTO project_discussions (project_id, user_id, message)
     VALUES (?, ?, ?)`,
    [id, req.user?.id, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت discussion' });
      }
      res.status(201).json({ id: this.lastID, message: 'Discussion با موفقیت ثبت شد' });
    }
  );
});

// Get project labels
router.get('/:id/labels', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  db.all(
    'SELECT * FROM project_labels WHERE project_id = ? ORDER BY created_at DESC',
    [id],
    (err, labels) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت لیبل‌ها' });
      }
      res.json(labels || []);
    }
  );
});

// Add label to project
router.post('/:id/labels', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { label_name, label_color } = req.body;
  
  if (!label_name || label_name.trim() === '') {
    return res.status(400).json({ error: 'نام لیبل الزامی است' });
  }
  
  db.run(
    'INSERT INTO project_labels (project_id, label_name, label_color) VALUES (?, ?, ?)',
    [id, label_name.trim(), label_color || '#3B82F6'],
    function(err) {
      if (err) {
        console.error('Error adding label:', err);
        return res.status(500).json({ error: 'خطا در اضافه کردن لیبل' });
      }
      res.status(201).json({ id: this.lastID, message: 'لیبل با موفقیت اضافه شد' });
    }
  );
});

// Delete label from project
router.delete('/:id/labels/:labelId', authenticate, (req: AuthRequest, res: Response) => {
  const { id, labelId } = req.params;
  
  db.run(
    'DELETE FROM project_labels WHERE id = ? AND project_id = ?',
    [labelId, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در حذف لیبل' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'لیبل یافت نشد' });
      }
      res.json({ message: 'لیبل با موفقیت حذف شد' });
    }
  );
});

// Get available labels (all unique labels used in projects)
router.get('/labels/available', authenticate, (req: AuthRequest, res: Response) => {
  db.all(
    'SELECT DISTINCT label_name, label_color FROM project_labels ORDER BY label_name',
    [],
    (err, labels) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در دریافت لیبل‌ها' });
      }
      res.json(labels || []);
    }
  );
});

// Delete project
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف پروژه' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'پروژه یافت نشد' });
    }
    res.json({ message: 'پروژه با موفقیت حذف شد' });
  });
});

// Bulk delete projects
router.post('/bulk-delete', authenticate, (req: AuthRequest, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM projects WHERE id IN (${placeholders})`;

  db.run(query, ids, function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف گروهی پروژه‌ها' });
    }
    res.json({ 
      message: `${this.changes} پروژه با موفقیت حذف شد`,
      deletedCount: this.changes 
    });
  });
});

export default router;

