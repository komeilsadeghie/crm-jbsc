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
      return res.status(500).json({ error: 'خطا در دریافت دسته‌بندی‌ها' });
    }
    res.json(categories);
  });
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

// Create article (requires auth)
router.post('/articles', authenticate, (req: AuthRequest, res: Response) => {
  const article = req.body;
  const slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  db.run(
    `INSERT INTO kb_articles (
      category_id, title, slug, content, excerpt, is_published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      article.category_id || null,
      article.title,
      slug,
      article.content,
      article.excerpt || null,
      article.is_published ? 1 : 0,
      req.user?.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت مقاله' });
      }
      res.status(201).json({ id: this.lastID, message: 'مقاله با موفقیت ثبت شد' });
    }
  );
});

// Update article
router.put('/articles/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const article = req.body;

  db.run(
    `UPDATE kb_articles SET 
      category_id = ?, title = ?, slug = ?, content = ?, excerpt = ?,
      is_published = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      article.category_id || null,
      article.title,
      article.slug,
      article.content,
      article.excerpt || null,
      article.is_published ? 1 : 0,
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

export default router;

