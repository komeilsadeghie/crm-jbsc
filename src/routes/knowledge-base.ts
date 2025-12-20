import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all categories
router.get('/categories', (req: AuthRequest, res: Response) => {
  db.all(`
    SELECT * FROM kb_categories
    ORDER BY position, name
  `, [], (err, categories) => {
    if (err) {
      console.error('Error fetching kb categories:', err);
      // If table doesn't exist, return empty array instead of error
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
        console.warn('kb_categories table does not exist yet, returning empty array');
        return res.json([]);
      }
      return res.status(500).json({ error: 'خطا در دریافت دسته‌بندی‌ها' });
    }
    res.json(Array.isArray(categories) ? categories : []);
  });
});

// Create category (admin only)
router.post('/categories', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم می‌تواند دسته‌بندی ایجاد کند' });
  }

  const { name, description, icon, color, position } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'نام دسته‌بندی الزامی است' });
  }

  db.run(
    `INSERT INTO kb_categories (name, description, icon, color, position) VALUES (?, ?, ?, ?, ?)`,
    [
      name.trim(),
      description || null,
      icon || null,
      color || '#3B82F6',
      position || 0
    ],
    function(err) {
      if (err) {
        console.error('Error creating kb category:', err);
        // If table doesn't exist, return helpful error
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          return res.status(500).json({ error: 'جدول دسته‌بندی‌ها وجود ندارد. لطفاً دیتابیس را migrate کنید.' });
        }
        if (err.message?.includes('UNIQUE constraint') || err.message?.includes('Duplicate entry')) {
          return res.status(400).json({ error: 'دسته‌بندی با این نام قبلاً وجود دارد' });
        }
        return res.status(500).json({ error: 'خطا در ثبت دسته‌بندی: ' + (err.message || 'خطای نامشخص') });
      }
      res.status(201).json({ id: this.lastID, message: 'دسته‌بندی با موفقیت ثبت شد' });
    }
  );
});

// Get articles
router.get('/articles', (req: AuthRequest, res: Response) => {
  const { category_id, search, published_only } = req.query;
  
  let query = `
    SELECT a.*, 
           c.name as category_name,
           u.username as author_username
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category_id) {
    query += ' AND a.category_id = ?';
    params.push(category_id);
  }

  if (published_only === 'true') {
    query += ' AND a.is_published = 1';
  }

  if (search) {
    query += ' AND (a.title LIKE ? OR a.content LIKE ? OR a.excerpt LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY a.created_at DESC';

  db.all(query, params, (err, articles) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت مقالات' });
    }
    res.json(articles);
  });
});

// Get single article
router.get('/articles/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT a.*, 
           c.name as category_name,
           u.username as author_username
    FROM kb_articles a
    LEFT JOIN kb_categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `, [id], (err, article) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت مقاله' });
    }
    if (!article) {
      return res.status(404).json({ error: 'مقاله یافت نشد' });
    }

    // Increment views
    db.run('UPDATE kb_articles SET views = views + 1 WHERE id = ?', [id]);

    res.json(article);
  });
});

// Create article (requires auth - admin only for editing)
router.post('/articles', authenticate, (req: AuthRequest, res: Response) => {
  // Only admin can create/edit articles
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم می‌تواند مقاله ایجاد کند' });
  }

  const article = req.body;
  const slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  db.run(
    `INSERT INTO kb_articles (
      category_id, title, slug, content, excerpt, is_published, attachments, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      article.category_id || null,
      article.title,
      slug,
      article.content,
      article.excerpt || null,
      article.is_published ? 1 : 0,
      article.attachments ? JSON.stringify(article.attachments) : null,
      req.user?.id
    ],
    function(err) {
      if (err) {
        console.error('Error creating kb article:', err);
        // If table doesn't exist, return helpful error
        if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes("doesn't exist")) {
          return res.status(500).json({ error: 'جدول مقالات وجود ندارد. لطفاً دیتابیس را migrate کنید.' });
        }
        return res.status(500).json({ error: 'خطا در ثبت مقاله: ' + (err.message || 'خطای نامشخص') });
      }
      res.status(201).json({ id: this.lastID, message: 'مقاله با موفقیت ثبت شد' });
    }
  );
});

// Update article (admin only)
router.put('/articles/:id', authenticate, (req: AuthRequest, res: Response) => {
  // Only admin can edit articles
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم می‌تواند مقاله ویرایش کند' });
  }

  const { id } = req.params;
  const article = req.body;

  db.run(
    `UPDATE kb_articles SET 
      category_id = ?, title = ?, slug = ?, content = ?, excerpt = ?,
      is_published = ?, attachments = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      article.category_id || null,
      article.title,
      article.slug,
      article.content,
      article.excerpt || null,
      article.is_published ? 1 : 0,
      article.attachments ? JSON.stringify(article.attachments) : null,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی مقاله' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'مقاله یافت نشد' });
      }
      res.json({ message: 'مقاله با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete article (admin only)
router.delete('/articles/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم می‌تواند مقاله حذف کند' });
  }

  const { id } = req.params;

  db.run('DELETE FROM kb_articles WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف مقاله' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'مقاله یافت نشد' });
    }
    res.json({ message: 'مقاله با موفقیت حذف شد' });
  });
});

// Mark article helpful
router.post('/articles/:id/helpful', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { helpful } = req.body; // true or false

  const field = helpful ? 'helpful_yes' : 'helpful_no';
  db.run(
    `UPDATE kb_articles SET ${field} = ${field} + 1 WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت نظر' });
      }
      res.json({ message: 'نظر شما ثبت شد' });
    }
  );
});

// ========== SOP Routes ==========

// Get all SOPs
router.get('/sops', (req: AuthRequest, res: Response) => {
  const { department, unit, person_id, search } = req.query;

  let query = `
    SELECT s.*, 
           u.username as creator_username,
           p.username as person_username,
           p.full_name as person_name
    FROM kb_sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users p ON s.person_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (department) {
    query += ' AND s.department = ?';
    params.push(department);
  }

  if (unit) {
    query += ' AND s.unit = ?';
    params.push(unit);
  }

  if (person_id) {
    query += ' AND s.person_id = ?';
    params.push(person_id);
  }

  if (search) {
    query += ' AND (s.title LIKE ? OR s.description LIKE ? OR s.content LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY s.created_at DESC';

  db.all(query, params, (err, sops) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت SOPها' });
    }
    // Parse attachments if they exist
    const parsedSops = (sops || []).map((sop: any) => {
      if (sop.attachments) {
        try {
          sop.attachments = JSON.parse(sop.attachments);
        } catch {
          sop.attachments = [];
        }
      }
      return sop;
    });
    res.json(parsedSops);
  });
});

// Get single SOP
router.get('/sops/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT s.*, 
           u.username as creator_username,
           p.username as person_username,
           p.full_name as person_name
    FROM kb_sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users p ON s.person_id = p.id
    WHERE s.id = ?
  `, [id], (err, sop: any) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت SOP' });
    }
    if (!sop) {
      return res.status(404).json({ error: 'SOP یافت نشد' });
    }

    // Parse attachments
    if (sop.attachments) {
      try {
        sop.attachments = JSON.parse(sop.attachments);
      } catch {
        sop.attachments = [];
      }
    }

    res.json(sop);
  });
});

// Create SOP (admin only)
router.post('/sops', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم می‌تواند SOP ایجاد کند' });
  }

  const sop = req.body;

  db.run(
    `INSERT INTO kb_sops (
      title, description, department, unit, person_id, content, attachments, tags, version, is_published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sop.title,
      sop.description || null,
      sop.department || null,
      sop.unit || null,
      sop.person_id || null,
      sop.content,
      sop.attachments ? JSON.stringify(sop.attachments) : null,
      sop.tags || null,
      sop.version || 1,
      sop.is_published ? 1 : 0,
      req.user?.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت SOP' });
      }
      res.status(201).json({ id: this.lastID, message: 'SOP با موفقیت ثبت شد' });
    }
  );
});

// Update SOP (admin only)
router.put('/sops/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم می‌تواند SOP ویرایش کند' });
  }

  const { id } = req.params;
  const sop = req.body;

  db.run(
    `UPDATE kb_sops SET 
      title = ?, description = ?, department = ?, unit = ?, person_id = ?,
      content = ?, attachments = ?, tags = ?, version = ?, is_published = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      sop.title,
      sop.description || null,
      sop.department || null,
      sop.unit || null,
      sop.person_id || null,
      sop.content,
      sop.attachments ? JSON.stringify(sop.attachments) : null,
      sop.tags || null,
      sop.version || 1,
      sop.is_published ? 1 : 0,
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در به‌روزرسانی SOP' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'SOP یافت نشد' });
      }
      res.json({ message: 'SOP با موفقیت به‌روزرسانی شد' });
    }
  );
});

// Delete SOP (admin only)
router.delete('/sops/:id', authenticate, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم می‌تواند SOP حذف کند' });
  }

  const { id } = req.params;

  db.run('DELETE FROM kb_sops WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطا در حذف SOP' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'SOP یافت نشد' });
    }
    res.json({ message: 'SOP با موفقیت حذف شد' });
  });
});

export default router;

