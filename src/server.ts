import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { initDatabase } from './database/db';
import { migrateEstimatesTable } from './database/migrate-estimates';
import { migrateContactsPortal } from './database/migrate-contacts-portal';
import { migrateTasksTable } from './database/migrate-tasks';
import { migrateContractsTable } from './database/migrate-contracts';
import { migrateUsersTable } from './database/migrate-users';
import { migrateInvoicesTable } from './database/migrate-invoices';
import { migrateRecurringExpensesTable } from './database/migrate-recurring-expenses';
import { migrateProposalsTable } from './database/migrate-proposals';
import { migrateTasksEnhancedTable } from './database/migrate-tasks-enhanced';
import { migratePaymentGatewaysTable } from './database/migrate-payment-gateways';
import { migrateSurveysTable } from './database/migrate-surveys';
import { migrateMediaImportFields } from './database/migrate-media-import';
import { fixUniqueIdColumn } from './database/fix-unique-id';

// Load ENV
dotenv.config();

const app = express();

// IMPORTANT: On PaaS you MUST listen on process.env.PORT
const PORT = Number(process.env.PORT) || 3000;

// If behind proxy (common in PaaS), helps with secure cookies / IPs
app.set('trust proxy', 1);

// -------------------- Middleware --------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// In dev allow localhost(s), in prod only allow ALLOWED_ORIGINS
const devFallbackOrigins = ['http://localhost:3000', 'http://localhost:3001'];

// CORS middleware - only apply to API routes, not static files
app.use((req, res, next) => {
  // Skip CORS for static assets
  if (req.path.startsWith('/assets/') || 
      req.path.match(/\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|html)$/i)) {
    return next();
  }
  
  // Apply CORS to API routes
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Dev mode: allow everything
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // Production: allow explicitly listed origins
      // If ALLOWED_ORIGINS is set, use it; otherwise allow all origins (for Railway/cloud deployments)
      if (allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      }

      // If ALLOWED_ORIGINS is not set, allow all origins (useful for Railway/cloud deployments)
      // You can set ALLOWED_ORIGINS environment variable to restrict origins
      return callback(null, true);
    },
    credentials: true,
  })(req, res, next);
});

// Increase body parser limit to 50MB for Excel file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------------------- Initialize Database --------------------
(async () => {
  try {
    // Wait a bit for database connection to be established (especially for MySQL)
    if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
      console.log('⏳ Waiting for database connection...');
      // Wait up to 10 seconds for MySQL to be ready
      for (let i = 0; i < 10; i++) {
        const { isDatabaseReady } = await import('./database/db');
        if (isDatabaseReady()) {
          console.log('✅ Database connection ready');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (i === 9) {
          console.warn('⚠️ Database connection not ready after 10 seconds, continuing anyway...');
        }
      }
    }
    
    console.log('🛠 Initializing database tables...');
    await initDatabase();

    console.log('🔄 Migrating estimates table...');
    try {
      await migrateEstimatesTable();
    } catch (e: any) {
      console.warn('⚠️ migrateEstimatesTable failed:', e.message);
    }

    console.log('🔄 Migrating contacts table...');
    try {
      await migrateContactsPortal();
    } catch (e: any) {
      console.warn('⚠️ migrateContactsPortal failed:', e.message);
    }

    console.log('🔄 Migrating tasks table...');
    try {
      await migrateTasksTable();
    } catch (e: any) {
      console.warn('⚠️ migrateTasksTable failed:', e.message);
    }

    console.log('🔄 Migrating contracts table...');
    try {
      await migrateContractsTable();
    } catch (e: any) {
      console.warn('⚠️ migrateContractsTable failed:', e.message);
    }

    console.log('🔄 Migrating users table...');
    try {
      await migrateUsersTable();
    } catch (e: any) {
      console.warn('⚠️ migrateUsersTable failed:', e.message);
    }

    console.log('🔄 Migrating invoices table...');
    try {
      await migrateInvoicesTable();
    } catch (e: any) {
      console.warn('⚠️ migrateInvoicesTable failed:', e.message);
    }

    console.log('🔄 Migrating expenses table...');
    try {
      await migrateRecurringExpensesTable();
    } catch (e: any) {
      console.warn('⚠️ migrateRecurringExpensesTable failed:', e.message);
    }

    console.log('🔄 Migrating proposals table...');
    try {
      await migrateProposalsTable();
    } catch (e: any) {
      console.warn('⚠️ migrateProposalsTable failed:', e.message);
    }

    console.log('🔄 Migrating tasks enhanced features...');
    try {
      await migrateTasksEnhancedTable();
    } catch (e: any) {
      console.warn('⚠️ migrateTasksEnhancedTable failed:', e.message);
    }

    console.log('🔄 Migrating payment gateways...');
    try {
      await migratePaymentGatewaysTable();
    } catch (e: any) {
      console.warn('⚠️ migratePaymentGatewaysTable failed:', e.message);
    }

    console.log('🔄 Migrating surveys...');
    try {
      await migrateSurveysTable();
    } catch (e: any) {
      console.warn('⚠️ migrateSurveysTable failed:', e.message);
    }

    console.log('🔄 Migrating media import fields (code, designer, settlements)...');
    try {
      await migrateMediaImportFields();
    } catch (migrationError: any) {
      console.error('⚠️ Error in migrateMediaImportFields:', migrationError);

      console.log('🔄 Attempting to fix unique_id column...');
      try {
        await fixUniqueIdColumn();
      } catch (fixError: any) {
        console.error('❌ Could not fix unique_id column:', fixError);
      }
    }

    console.log('🔄 Migrating customer Excel fields (gender, site_languages_count, etc.)...');
    try {
      const { migrateCustomerExcelFields } = await import('./database/migrate-customer-excel-fields');
      await migrateCustomerExcelFields();
    } catch (migrationError: any) {
      console.error('⚠️ Error in migrateCustomerExcelFields:', migrationError);
    }

    console.log('🔄 Migrating leads foreign keys (ON DELETE SET NULL)...');
    try {
      const { migrateLeadsForeignKeys } = await import('./database/migrate-leads-foreign-keys');
      await migrateLeadsForeignKeys();
    } catch (migrationError: any) {
      console.error('⚠️ Error in migrateLeadsForeignKeys:', migrationError);
    }

    console.log('🔄 Migrating customers foreign keys (ON DELETE SET NULL)...');
    try {
      const { migrateCustomersForeignKeys } = await import('./database/migrate-customers-foreign-keys');
      await migrateCustomersForeignKeys();
    } catch (migrationError: any) {
      console.error('⚠️ Error in migrateCustomersForeignKeys:', migrationError);
    }

    // Essential migrations (always run, not optional)
    console.log('🔄 Migrating coaching enhanced features...');
    try {
      await (await import('./database/migrate-coaching-enhanced')).migrateCoachingEnhanced();
    } catch (e) {
      console.warn('⚠️ migrateCoachingEnhanced failed:', e);
    }

    console.log('🔄 Migrating customer journey...');
    try {
      await (await import('./database/migrate-customer-journey')).migrateCustomerJourney();
    } catch (e) {
      console.warn('⚠️ migrateCustomerJourney failed:', e);
    }

    console.log('🔄 Migrating users VoIP extension...');
    try {
      await (await import('./database/migrate-users-voip')).migrateUsersVoipExtension();
    } catch (e) {
      console.warn('⚠️ migrateUsersVoipExtension failed:', e);
    }

    console.log('🔄 Migrating task Kanban columns...');
    try {
      await (await import('./database/migrate-task-kanban-columns')).migrateTaskKanbanColumnsTable();
    } catch (e) {
      console.warn('⚠️ migrateTaskKanbanColumnsTable failed:', e);
    }

    console.log('🔄 Migrating PDF templates...');
    try {
      await (await import('./database/migrate-pdf-templates')).migratePdfTemplatesTable();
    } catch (e) {
      console.warn('⚠️ migratePdfTemplatesTable failed:', e);
    }

    // Optional migrations (only if RUN_MIGRATIONS=true)
    try {
      if (process.env.RUN_MIGRATIONS === 'true') {
        console.log('🔄 Running optional migrations...');

        await (await import('./database/migrate-knowledge-base-enhanced')).migrateKnowledgeBaseEnhanced();
        await (await import('./database/migrate-goals-enhanced')).migrateGoalsEnhanced();
        await (await import('./database/migrate-project-labels')).migrateProjectLabels();
      } else {
        console.log('ℹ️ Optional migrations skipped (set RUN_MIGRATIONS=true to run).');
      }
    } catch (e) {
      console.warn('⚠️ Optional migrations not available or failed; continuing without them.', e);
    }

    // Create default admin user if it doesn't exist
    try {
      const { dbGet, dbRun, isMySQL } = await import('./database/db');
      const bcrypt = await import('bcryptjs');
      
      const existingAdmin = await dbGet(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        ['admin', 'admin@crm.com']
      );
      
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.default.hash('admin123', 10);
        const insertQuery = isMySQL
          ? `INSERT IGNORE INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)`
          : `INSERT OR IGNORE INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)`;
        
        await dbRun(insertQuery, [
          'admin',
          'admin@crm.com',
          hashedPassword,
          'admin',
          'مدیر سیستم'
        ]);
        
        console.log('✅ Default admin user created: admin / admin123');
      } else {
        console.log('ℹ️  Admin user already exists');
      }
    } catch (adminError: any) {
      console.warn('⚠️  Could not create admin user:', adminError.message);
      // Don't fail the server startup if admin user creation fails
    }

    console.log('✅ Database initialized successfully!');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    console.error('⚠️  Server will continue to run, but some features may not work until database is available.');
    // Don't crash the server - allow it to start and retry later
  }
})();

// -------------------- ROUTES --------------------
import authRoutes from './routes/auth';
import customerRoutes from './modules/customers/customer.router';
import interactionRoutes from './routes/interactions';
import coachingRoutes from './routes/coaching';
import dashboardRoutes from './routes/dashboard';
import automationRoutes from './routes/automation';
import leadsRoutes from './routes/leads';
import dealsRoutes from './routes/deals';
import accountsRoutes from './routes/accounts';
import contactsRoutes from './routes/contacts';
import invoicesRoutes from './routes/invoices';
import estimatesRoutes from './routes/estimates';
import mediaRoutes from './routes/media';
import tasksRoutes from './routes/tasks';
import scoringRoutes from './routes/scoring';
import tagRoutes from './modules/tags/tag.router';
import calendarRoutes from './modules/calendar/calendar.router';
import profileRoutes from './modules/users/profile.router';
import importExportRoutes from './modules/import-export/importExport.router';
import googleSheetsRoutes from './modules/google/googleSheets.router';
import voipRoutes from './modules/voip/voip.router';
import projectsRoutes from './routes/projects';
import expensesRoutes from './routes/expenses';
import contractsRoutes from './routes/contracts';
import ticketsRoutes from './routes/tickets';
import knowledgeBaseRoutes from './routes/knowledge-base';
import emailTemplatesRoutes from './routes/email-templates';
import smsTemplatesRoutes from './routes/sms-templates';
import customFieldsRoutes from './routes/custom-fields';
import contactPermissionsRoutes from './routes/contact-permissions';
import salesGoalsRoutes from './routes/sales-goals';
import reportsRoutes from './routes/reports';
import unifiedCalendarRoutes from './routes/calendar';
import calendarEventsRoutes from './routes/calendar-events';
import clientPortalRoutes from './routes/client-portal';
import usersRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import permissionsRoutes from './routes/permissions';
import recurringInvoicesRoutes from './routes/recurring-invoices';
import proposalsRoutes from './routes/proposals';
import paymentGatewaysRoutes from './routes/payment-gateways';
import surveysRoutes from './routes/surveys';
import activityLogRoutes from './routes/activity-log';
import announcementsRoutes from './routes/announcements';
import notificationsRoutes from './routes/notifications';
import databaseBackupRoutes from './routes/database-backup';

// Database connection check middleware (optional - routes handle their own checks)
// This is a fallback for routes that don't check database status
app.use('/api', async (req, res, next) => {
  // Skip health check and static routes
  if (req.path === '/health' || req.path.startsWith('/uploads')) {
    return next();
  }
  
  // Let routes handle their own database checks for better error messages
  // This middleware is just a safety net
  next();
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/coaching', coachingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/estimates', estimatesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/google-sheets', googleSheetsRoutes);
app.use('/api/voip', voipRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/email-templates', emailTemplatesRoutes);
app.use('/api/sms-templates', smsTemplatesRoutes);
app.use('/api/custom-fields', customFieldsRoutes);
app.use('/api/contact-permissions', contactPermissionsRoutes);
app.use('/api/sales-goals', salesGoalsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/calendar/unified', unifiedCalendarRoutes);
app.use('/api/calendar/events', calendarEventsRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/recurring-invoices', recurringInvoicesRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/payment-gateways', paymentGatewaysRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/utilities/announcements', announcementsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/utilities/database-backup', databaseBackupRoutes);

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// -------------------- Health check (before client serving) --------------------
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const { isMySQL, isSQLite } = await import('./database/db');
    let dbStatus = 'unknown';
    
    if (isMySQL) {
      const { dbRun } = await import('./database/db');
      try {
        await dbRun('SELECT 1');
        dbStatus = 'connected';
      } catch (err) {
        dbStatus = 'disconnected';
      }
    } else if (isSQLite) {
      dbStatus = 'connected'; // SQLite is file-based, assume connected if initialized
    }
    
    res.json({ 
      status: 'ok', 
      message: 'CRM API is running',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({ 
      status: 'error', 
      message: 'CRM API is running but database check failed',
      error: err.message 
    });
  }
});

// -------------------- Serve client build in production --------------------
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');

  // Try multiple possible paths for client/dist
  const possiblePaths = [
    path.join(process.cwd(), 'client', 'dist'), // Standard path
    path.join(__dirname, '..', 'client', 'dist'), // Alternative path
  ];

  let clientDistPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      clientDistPath = testPath;
      break;
    }
  }

  if (clientDistPath) {
    console.log('✅ Serving client build from:', clientDistPath);
    
    // Serve static files from client/dist (must be before SPA fallback)
    // Use root path '/' to serve all static files directly
    app.use('/', express.static(clientDistPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
    }));

    // SPA fallback for HTML routes only (must be last, after static)
    // Only catch routes that don't match static files
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      
      // Skip static asset requests - express.static should handle these
      // If we reach here for assets, they don't exist - return 404
      if (req.path.startsWith('/assets/') || 
          req.path.match(/\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // For all other routes, serve index.html (SPA routing)
      const indexPath = path.join(clientDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(path.resolve(indexPath));
      }

      return res.status(404).json({ error: 'Client build not found' });
    });
  } else {
    console.warn('⚠️ Client dist directory not found. Searched paths:');
    possiblePaths.forEach(p => console.warn('  -', p));
    // In production, if dist is missing, provide a basic response
    app.get('/', (req, res) => {
      res.status(500).json({ error: 'Client build not found. Please run npm run build.' });
    });
  }
} else {
  // Development mode - simple health check
  app.get('/', (req, res) => {
    res.send('OK - Development Mode');
  });
}

// -------------------- Global error handler --------------------
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip error handling for static assets
  if (req.path.startsWith('/assets/') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    return next(err);
  }
  
  if (err?.message?.includes('CORS')) {
    return res.status(403).json({ error: 'CORS blocked' });
  }
  console.error('❌ ERROR:', err);
  res.status(500).json({ error: 'خطای سرور' });
});

// -------------------- Start server (PaaS friendly) --------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CRM Server running on port ${PORT}`);
});



