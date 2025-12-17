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
import { migrateProjectPayments } from './database/migrate-project-payments';
import { migrateCustomerExcelFields } from './database/migrate-customer-excel-fields';
import { migrateCoachingEnhanced } from './database/migrate-coaching-enhanced';
import { migrateKnowledgeBaseEnhanced } from './database/migrate-knowledge-base-enhanced';
import { migrateCustomerJourney } from './database/migrate-customer-journey';
import { migrateGoalsEnhanced } from './database/migrate-goals-enhanced';
import { migrateProjectLabels } from './database/migrate-project-labels';
import { migrateUsersVoipExtension } from './database/migrate-users-voip';
import { fixUniqueIdColumn } from './database/fix-unique-id';

// Load ENV
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
// Increase body parser limit to 50MB for Excel file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Initialize SQLite Database ---
(async () => {
  try {
    console.log("🛠 Initializing database tables...");
    await initDatabase();
    
    // Migrate estimates table to add new columns
    console.log("🔄 Migrating estimates table...");
    await migrateEstimatesTable();
    
    // Migrate contacts table for portal
    console.log("🔄 Migrating contacts table...");
    await migrateContactsPortal();
    
    // Migrate tasks table for new columns
    console.log("🔄 Migrating tasks table...");
    await migrateTasksTable();
    
    // Migrate contracts table for new columns
    console.log("🔄 Migrating contracts table...");
    await migrateContractsTable();
    
    // Migrate users table for new columns and permissions
    console.log("🔄 Migrating users table...");
    await migrateUsersTable();
    
    // Migrate invoices table for items and recurring invoices
    console.log("🔄 Migrating invoices table...");
    await migrateInvoicesTable();
    
    // Migrate expenses table for recurring expenses
    console.log("🔄 Migrating expenses table...");
    await migrateRecurringExpensesTable();
    
    // Migrate proposals table
    console.log("🔄 Migrating proposals table...");
    await migrateProposalsTable();
    
    // Migrate tasks enhanced features
    console.log("🔄 Migrating tasks enhanced features...");
    await migrateTasksEnhancedTable();
    
    // Migrate payment gateways
    console.log("🔄 Migrating payment gateways...");
    await migratePaymentGatewaysTable();
    
    // Migrate surveys
    console.log("🔄 Migrating surveys...");
    await migrateSurveysTable();
    
    // Migrate media import fields (code, designer, settlements)
    console.log("🔄 Migrating media import fields...");
    try {
      await migrateMediaImportFields();
    } catch (migrationError: any) {
      console.error("⚠️ Error in migrateMediaImportFields:", migrationError);
      // Try to fix unique_id column manually
      console.log("🔄 Attempting to fix unique_id column...");
      try {
        await fixUniqueIdColumn();
      } catch (fixError: any) {
        console.error("❌ Could not fix unique_id column:", fixError);
      }
    }
    // Optional migrations (files may not exist in some deployments)
try {
  if (process.env.RUN_MIGRATIONS === "true") {
    console.log("🔄 Running optional migrations...");

    await (await import("./database/migrate-knowledge-base-enhanced")).migrateKnowledgeBaseEnhanced();
    await (await import("./database/migrate-customer-journey")).migrateCustomerJourney();
    await (await import("./database/migrate-goals-enhanced")).migrateGoalsEnhanced();
    await (await import("./database/migrate-project-labels")).migrateProjectLabels();
    await (await import("./database/migrate-users-voip")).migrateUsersVoipExtension();
  } else {
    console.log("ℹ️ Optional migrations skipped (set RUN_MIGRATIONS=true to run).");
  }
} catch (e) {
  console.warn("⚠️ Optional migrations not available or failed; continuing without them.", e);
}

    console.log("✅ Database initialized successfully!");
  } catch (err) {
    console.error("❌ Database initialization error:", err);
  }
})();

// --- ROUTES ---
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

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CRM API is running' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ ERROR:", err);
  res.status(500).json({ error: 'خطای سرور' });
});

// Function to start server on a port, trying next port if current is busy
const startServer = (port: number, maxAttempts: number = 5): void => {
  let attempts = 0;
  
  const tryStart = (currentPort: number) => {
    attempts++;
    
    const server = app.listen(currentPort, () => {
      console.log(`🚀 CRM Server running on port ${currentPort}`);
      console.log(`📊 API available at http://localhost:${currentPort}/api`);
      if (currentPort !== PORT) {
        console.log(`⚠️  Note: Port ${PORT} was busy, using port ${currentPort} instead`);
        console.log(`💡 Update vite.config.ts proxy target to http://localhost:${currentPort} if needed`);
      }
    });
    
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        if (attempts < maxAttempts) {
          console.log(`⚠️  Port ${currentPort} is busy, trying port ${currentPort + 1}...`);
          tryStart(currentPort + 1);
        } else {
          console.error(`❌ Failed to find available port after ${maxAttempts} attempts`);
          console.log(`💡 Please kill processes using ports ${PORT}-${currentPort} and try again`);
          console.log(`💡 Or use: netstat -ano | findstr :${PORT}`);
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  };
  
  tryStart(port);
};

// Start server
startServer(PORT);
