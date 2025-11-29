import express, { Response } from 'express';
import { db } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { MessageAutomation } from '../types';
import nodemailer from 'nodemailer';
// Note: WhatsApp and SMS integrations would require additional setup

const router = express.Router();

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all automations
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  db.all('SELECT * FROM message_automations ORDER BY created_at DESC', [], (err, automations) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت اتوماسیون‌ها' });
    }
    res.json(automations);
  });
});

// Create automation
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const automation: MessageAutomation = req.body;

  db.run(
    `INSERT INTO message_automations (name, trigger_type, channel, template, conditions, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      automation.name,
      automation.trigger_type,
      automation.channel,
      automation.template,
      automation.conditions ? JSON.stringify(automation.conditions) : null,
      automation.is_active ? 1 : 0
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطا در ثبت اتوماسیون' });
      }
      res.status(201).json({ id: this.lastID, message: 'اتوماسیون با موفقیت ثبت شد' });
    }
  );
});

// Send test message
router.post('/test', authenticate, (req: AuthRequest, res: Response) => {
  const { channel, recipient, subject, content } = req.body;

  if (channel === 'email') {
    emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: subject || 'Test Email',
      text: content
    }, (err, info) => {
      if (err) {
        return res.status(500).json({ error: 'خطا در ارسال ایمیل', details: err.message });
      }
      res.json({ message: 'ایمیل با موفقیت ارسال شد', info });
    });
  } else {
    res.status(400).json({ error: 'کانال انتخابی در حال حاضر پشتیبانی نمی‌شود' });
  }
});

// Get message logs
router.get('/logs', authenticate, (req: AuthRequest, res: Response) => {
  const { customer_id, channel, status, limit = '50' } = req.query;
  
  let query = 'SELECT * FROM message_logs WHERE 1=1';
  const params: any[] = [];

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  if (channel) {
    query += ' AND channel = ?';
    params.push(channel);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit as string));

  db.all(query, params, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'خطا در دریافت لاگ‌ها' });
    }
    res.json(logs);
  });
});

export default router;



