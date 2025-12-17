import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Get the correct database path
const getDbPath = () => {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  
  // In development (ts-node), __dirname points to src/database
  // In production (compiled), __dirname points to dist/database
  const isProduction = __dirname.includes('dist');
  
  if (isProduction) {
    // Production: go up from dist/database to root, then to database/
    return path.join(__dirname, '../../database/crm.db');
  } else {
    // Development: go up from src/database to root, then to database/
    return path.join(__dirname, '../../database/crm.db');
  }
};

const DB_PATH = getDbPath();
const DB_DIR = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`📁 Created database directory: ${DB_DIR}`);
}

// Ensure database file exists (SQLite will create it, but let's be explicit)
if (!fs.existsSync(DB_PATH)) {
  // Create empty file to ensure it exists
  fs.writeFileSync(DB_PATH, '');
  console.log(`📄 Created database file: ${DB_PATH}`);
}

console.log(`🗄️  Database path: ${DB_PATH}`);

export const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    console.error('   Database path:', DB_PATH);
    console.error('   Database directory exists:', fs.existsSync(DB_DIR));
    console.error('   Database file exists:', fs.existsSync(DB_PATH));
  } else {
    console.log('✅ Connected to SQLite database');
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('❌ Error enabling foreign keys:', err);
      }
    });
  }
});

export const initDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          full_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Customers table (مشتریان)
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('company', 'individual', 'export', 'import', 'coaching')),
          email TEXT,
          phone TEXT,
          company_name TEXT,
          address TEXT,
          website TEXT,
          score INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'lead', 'customer', 'partner')),
          category TEXT,
          notes TEXT,
          customer_model INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Interactions table (تعاملات)
      db.run(`
        CREATE TABLE IF NOT EXISTS interactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('call', 'email', 'meeting', 'whatsapp', 'sms', 'deposit', 'service')),
          subject TEXT,
          description TEXT,
          amount DECIMAL(10, 2),
          deposit_date DATE,
          deposit_stage TEXT,
          website_model TEXT,
          website_designer TEXT,
          services TEXT,
          additional_notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Coaching sessions table (جلسات کوچینگ)
      db.run(`
        CREATE TABLE IF NOT EXISTS coaching_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          coach_id INTEGER NOT NULL,
          session_date DATE NOT NULL,
          duration INTEGER,
          notes TEXT,
          status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (coach_id) REFERENCES users(id)
        )
      `);

      // Goals table (اهداف)
      db.run(`
        CREATE TABLE IF NOT EXISTS goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK(type IN ('kpi', 'okr')),
          target_value DECIMAL(10, 2),
          current_value DECIMAL(10, 2) DEFAULT 0,
          unit TEXT,
          deadline DATE,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled', 'on_hold')),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Exercises table (تمرین‌ها)
      db.run(`
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          goal_id INTEGER,
          customer_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          instructions TEXT,
          due_date DATE,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'overdue')),
          completion_date DATE,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Growth reports table (گزارش رشد)
      db.run(`
        CREATE TABLE IF NOT EXISTS growth_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          report_date DATE NOT NULL,
          metrics JSON,
          achievements TEXT,
          challenges TEXT,
          next_steps TEXT,
          overall_score DECIMAL(5, 2),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Message automation table (اتوماسیون پیام)
      db.run(`
        CREATE TABLE IF NOT EXISTS message_automations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          trigger_type TEXT NOT NULL CHECK(trigger_type IN ('schedule', 'event', 'condition')),
          channel TEXT NOT NULL CHECK(channel IN ('email', 'sms', 'whatsapp')),
          template TEXT NOT NULL,
          conditions JSON,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Message logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS message_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          automation_id INTEGER,
          channel TEXT NOT NULL,
          recipient TEXT NOT NULL,
          subject TEXT,
          content TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'delivered')),
          sent_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
          FOREIGN KEY (automation_id) REFERENCES message_automations(id) ON DELETE SET NULL
        )
      `);

      // Dashboard KPIs cache
      db.run(`
        CREATE TABLE IF NOT EXISTS dashboard_kpis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          period TEXT,
          metrics JSON,
          calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // ========== CRM Core Entities ==========
      
      // Leads table (سرنخ‌ها) - Enhanced with Kanban
      db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT,
          email TEXT,
          phone TEXT,
          whatsapp TEXT,
          company_name TEXT,
          source TEXT,
          tags TEXT,
          lead_score INTEGER DEFAULT 0,
          status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'disqualified', 'converted')),
          kanban_stage TEXT DEFAULT 'new',
          position INTEGER DEFAULT 0,
          industry TEXT,
          budget_range TEXT,
          decision_maker_role TEXT,
          notes TEXT,
          assigned_to INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_to) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Lead Stages (Customizable Kanban stages)
      db.run(`
        CREATE TABLE IF NOT EXISTS lead_stages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          position INTEGER DEFAULT 0,
          color TEXT DEFAULT '#00A3FF',
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Web-to-Lead Forms
      db.run(`
        CREATE TABLE IF NOT EXISTS web_to_lead_forms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          form_key TEXT UNIQUE NOT NULL,
          fields JSON,
          success_message TEXT,
          redirect_url TEXT,
          assigned_to INTEGER,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_to) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Accounts table (شرکت‌ها)
      db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          industry TEXT,
          size TEXT,
          country TEXT,
          website TEXT,
          site_model TEXT,
          designer_id INTEGER,
          service_package TEXT,
          acquisition_channel TEXT,
          lead_id INTEGER,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (designer_id) REFERENCES users(id),
          FOREIGN KEY (lead_id) REFERENCES leads(id)
        )
      `);

      // Contacts table (اشخاص)
      db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          first_name TEXT NOT NULL,
          last_name TEXT,
          email TEXT,
          phone TEXT,
          whatsapp TEXT,
          role TEXT,
          opt_in INTEGER DEFAULT 1,
          communication_preference TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        )
      `);

      // Deals/Projects table (پروژه‌های طراحی سایت)
      db.run(`
        CREATE TABLE IF NOT EXISTS deals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          contact_id INTEGER,
          title TEXT NOT NULL,
          stage TEXT DEFAULT 'discovery' CHECK(stage IN ('discovery', 'proposal', 'contract', 'design', 'development', 'qa', 'delivery', 'support')),
          budget DECIMAL(10, 2),
          probability INTEGER DEFAULT 0,
          services TEXT,
          site_model TEXT,
          designer_id INTEGER,
          start_date DATE,
          expected_delivery_date DATE,
          actual_delivery_date DATE,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id),
          FOREIGN KEY (designer_id) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Invoices table (فاکتورها)
      db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          deal_id INTEGER,
          account_id INTEGER,
          invoice_number TEXT UNIQUE,
          amount DECIMAL(10, 2) NOT NULL,
          currency TEXT DEFAULT 'IRR',
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'paid', 'partial', 'due', 'overdue', 'cancelled')),
          due_date DATE,
          paid_amount DECIMAL(10, 2) DEFAULT 0,
          payment_stage TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        )
      `);

      // Estimates table (پیش‌فاکتورها) - Enhanced with contract/site fields
      db.run(`
        CREATE TABLE IF NOT EXISTS estimates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          deal_id INTEGER,
          account_id INTEGER,
          estimate_number TEXT UNIQUE,
          amount DECIMAL(10, 2) NOT NULL,
          currency TEXT DEFAULT 'IRR',
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled')),
          valid_until DATE,
          notes TEXT,
          -- Contract/Site fields
          contract_type TEXT CHECK(contract_type IN ('website', 'hosting', 'domain', 'ssl', 'maintenance', 'seo', 'other')),
          domain_name TEXT,
          hosting_type TEXT,
          hosting_duration INTEGER,
          ssl_included INTEGER DEFAULT 0,
          maintenance_months INTEGER,
          seo_package TEXT,
          site_pages INTEGER,
          site_languages TEXT,
          payment_terms TEXT,
          delivery_days INTEGER,
          warranty_months INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        )
      `);

      // Estimate Items table (آیتم‌های پیش‌فاکتور)
      db.run(`
        CREATE TABLE IF NOT EXISTS estimate_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          estimate_id INTEGER NOT NULL,
          item_name TEXT NOT NULL,
          description TEXT,
          quantity DECIMAL(10, 2) DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL,
          tax_rate DECIMAL(5, 2) DEFAULT 0,
          total_amount DECIMAL(10, 2) NOT NULL,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
        )
      `);

      // Payments table (پرداخت‌ها)
      db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER,
          deal_id INTEGER,
          amount DECIMAL(10, 2) NOT NULL,
          currency TEXT DEFAULT 'IRR',
          payment_method TEXT,
          paid_at DATETIME,
          reference_number TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
        )
      `);

      // ========== Coaching Enhanced ==========
      
      // Coaching Programs table
      db.run(`
        CREATE TABLE IF NOT EXISTS coaching_programs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          contact_id INTEGER,
          program_type TEXT CHECK(program_type IN ('individual', 'corporate')),
          duration_months INTEGER,
          price DECIMAL(10, 2),
          start_date DATE,
          end_date DATE,
          overall_goals TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled', 'on_hold')),
          coach_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id),
          FOREIGN KEY (coach_id) REFERENCES users(id)
        )
      `);

      // Update coaching_sessions to link to program
      db.run(`
        CREATE TABLE IF NOT EXISTS coaching_sessions_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id INTEGER,
          account_id INTEGER,
          contact_id INTEGER,
          coach_id INTEGER NOT NULL,
          scheduled_at DATETIME NOT NULL,
          duration_min INTEGER,
          session_type TEXT CHECK(session_type IN ('online', 'in_person')),
          meeting_link TEXT,
          notes TEXT,
          files TEXT,
          exercise_checklist TEXT,
          status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES coaching_programs(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id),
          FOREIGN KEY (coach_id) REFERENCES users(id)
        )
      `);

      // OKRs table (Objectives and Key Results)
      db.run(`
        CREATE TABLE IF NOT EXISTS okrs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id INTEGER,
          account_id INTEGER,
          objective TEXT NOT NULL,
          period TEXT,
          owner_id INTEGER,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES coaching_programs(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `);

      // Key Results table
      db.run(`
        CREATE TABLE IF NOT EXISTS key_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          okr_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          target_value DECIMAL(10, 2),
          current_value DECIMAL(10, 2) DEFAULT 0,
          unit TEXT,
          deadline DATE,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE
        )
      `);

      // KPIs definition table
      db.run(`
        CREATE TABLE IF NOT EXISTS kpi_definitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id INTEGER,
          name TEXT NOT NULL,
          description TEXT,
          period TEXT,
          unit TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES coaching_programs(id) ON DELETE CASCADE
        )
      `);

      // KPI Entries table
      db.run(`
        CREATE TABLE IF NOT EXISTS kpi_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kpi_id INTEGER NOT NULL,
          period_start DATE,
          period_end DATE,
          value DECIMAL(10, 2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (kpi_id) REFERENCES kpi_definitions(id) ON DELETE CASCADE
        )
      `);

      // ========== Media Module ==========
      
      // Content Briefs table
      db.run(`
        CREATE TABLE IF NOT EXISTS content_briefs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          deal_id INTEGER,
          account_id INTEGER,
          objective TEXT,
          message TEXT,
          persona TEXT,
          keywords TEXT,
          cta TEXT,
          platform TEXT,
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'approved', 'in_production', 'completed')),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Content Items table
      db.run(`
        CREATE TABLE IF NOT EXISTS content_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brief_id INTEGER,
          deal_id INTEGER,
          content_type TEXT CHECK(content_type IN ('post', 'video', 'reels', 'blog', 'page')),
          title TEXT,
          status TEXT DEFAULT 'briefed' CHECK(status IN ('briefed', 'producing', 'review', 'scheduled', 'published', 'archived')),
          platform TEXT,
          publish_date DATE,
          links TEXT,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (brief_id) REFERENCES content_briefs(id) ON DELETE SET NULL,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Content Calendar table
      db.run(`
        CREATE TABLE IF NOT EXISTS content_calendar (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_item_id INTEGER,
          publish_date DATE NOT NULL,
          publish_time TIME,
          owner_id INTEGER,
          campaign_tag TEXT,
          status TEXT DEFAULT 'scheduled',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `);

      // Assets table
      db.run(`
        CREATE TABLE IF NOT EXISTS assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          deal_id INTEGER,
          brief_id INTEGER,
          asset_type TEXT CHECK(asset_type IN ('logo', 'raw_video', 'edited_video', 'image', 'document', 'other')),
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          version INTEGER DEFAULT 1,
          approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected', 'revision_requested')),
          approved_by INTEGER,
          approved_at DATETIME,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (brief_id) REFERENCES content_briefs(id) ON DELETE SET NULL,
          FOREIGN KEY (approved_by) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // ========== Enhanced Activities ==========
      
      // Activities table (enhanced)
      db.run(`
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          contact_id INTEGER,
          deal_id INTEGER,
          lead_id INTEGER,
          activity_type TEXT NOT NULL CHECK(activity_type IN ('call', 'email', 'whatsapp', 'sms', 'meeting', 'note', 'task')),
          subject TEXT,
          body TEXT,
          channel TEXT,
          occurred_at DATETIME,
          duration_min INTEGER,
          attachments TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // ========== Automation & Sequences ==========
      
      // Campaigns/Sequences table
      db.run(`
        CREATE TABLE IF NOT EXISTS campaigns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT CHECK(type IN ('nurture', 'payment', 'onboarding', 'coaching', 'custom')),
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'completed')),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Sequence Steps table
      db.run(`
        CREATE TABLE IF NOT EXISTS sequence_steps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          campaign_id INTEGER NOT NULL,
          step_order INTEGER NOT NULL,
          delay_days INTEGER DEFAULT 0,
          delay_hours INTEGER DEFAULT 0,
          channel TEXT NOT NULL CHECK(channel IN ('email', 'sms', 'whatsapp')),
          subject TEXT,
          template TEXT NOT NULL,
          conditions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        )
      `);

      // Campaign Enrollments table
      db.run(`
        CREATE TABLE IF NOT EXISTS campaign_enrollments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          campaign_id INTEGER NOT NULL,
          account_id INTEGER,
          contact_id INTEGER,
          lead_id INTEGER,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused', 'unsubscribed')),
          enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          current_step INTEGER DEFAULT 0,
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
        )
      `);

      // ========== Scoring & RFM ==========
      
      // Lead Scoring Events table
      db.run(`
        CREATE TABLE IF NOT EXISTS lead_scoring_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          points INTEGER NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )
      `);

      // RFM Scores table
      db.run(`
        CREATE TABLE IF NOT EXISTS rfm_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          recency_score INTEGER,
          frequency_score INTEGER,
          monetary_score INTEGER,
          segment TEXT,
          calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        )
      `);

      // ========== Tasks & Projects ==========
      
      // Tasks table (Enhanced)
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          deal_id INTEGER,
          account_id INTEGER,
          project_id INTEGER,
          parent_task_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done', 'cancelled')),
          priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
          due_date DATE,
          start_date DATE,
          estimated_hours DECIMAL(10, 2),
          position INTEGER DEFAULT 0,
          kanban_column TEXT DEFAULT 'todo',
          assigned_to INTEGER,
          created_by INTEGER,
          completed_at DATETIME,
          recurrence_pattern TEXT,
          recurrence_end_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
          FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_to) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Task Checklists
      db.run(`
        CREATE TABLE IF NOT EXISTS task_checklists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          item TEXT NOT NULL,
          is_completed INTEGER DEFAULT 0,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
      `);

      // Task Dependencies
      db.run(`
        CREATE TABLE IF NOT EXISTS task_dependencies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          depends_on_task_id INTEGER NOT NULL,
          dependency_type TEXT DEFAULT 'finish_to_start' CHECK(dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          UNIQUE(task_id, depends_on_task_id)
        )
      `);

      // Time Tracking
      db.run(`
        CREATE TABLE IF NOT EXISTS time_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          start_time DATETIME,
          end_time DATETIME,
          duration_minutes INTEGER,
          description TEXT,
          billable INTEGER DEFAULT 0,
          hourly_rate DECIMAL(10, 2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Projects table
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          deal_id INTEGER,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
          start_date DATE,
          end_date DATE,
          budget DECIMAL(10, 2),
          manager_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
          FOREIGN KEY (manager_id) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Project Milestones
      db.run(`
        CREATE TABLE IF NOT EXISTS project_milestones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          target_date DATE,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `);

      // Project Discussions
      db.run(`
        CREATE TABLE IF NOT EXISTS project_discussions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Project Files
      db.run(`
        CREATE TABLE IF NOT EXISTS project_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          uploaded_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (uploaded_by) REFERENCES users(id)
        )
      `);

      // ========== Expenses ==========
      
      // Expenses table
      db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER,
          project_id INTEGER,
          category TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          currency TEXT DEFAULT 'IRR',
          expense_date DATE NOT NULL,
          description TEXT,
          receipt_file_path TEXT,
          billable INTEGER DEFAULT 0,
          invoice_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Expense Categories
      db.run(`
        CREATE TABLE IF NOT EXISTS expense_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          color TEXT DEFAULT '#00A3FF',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ========== Contracts ==========
      
      // Contracts table
      db.run(`
        CREATE TABLE IF NOT EXISTS contracts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          contract_number TEXT UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          contract_type TEXT CHECK(contract_type IN ('service', 'maintenance', 'support', 'license', 'other')),
          start_date DATE NOT NULL,
          end_date DATE,
          value DECIMAL(10, 2),
          currency TEXT DEFAULT 'IRR',
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'expired', 'cancelled', 'renewed')),
          auto_renew INTEGER DEFAULT 0,
          renewal_notice_days INTEGER DEFAULT 30,
          signed_date DATE,
          signed_by TEXT,
          file_path TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // ========== Support Tickets ==========
      
      // Ticket Departments
      db.run(`
        CREATE TABLE IF NOT EXISTS ticket_departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          email TEXT,
          description TEXT,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tickets table
      db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_number TEXT UNIQUE NOT NULL,
          account_id INTEGER,
          contact_id INTEGER,
          department_id INTEGER,
          subject TEXT NOT NULL,
          priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
          status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
          assigned_to INTEGER,
          sla_deadline DATETIME,
          first_response_at DATETIME,
          resolved_at DATETIME,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
          FOREIGN KEY (department_id) REFERENCES ticket_departments(id),
          FOREIGN KEY (assigned_to) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Ticket Replies
      db.run(`
        CREATE TABLE IF NOT EXISTS ticket_replies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_id INTEGER NOT NULL,
          user_id INTEGER,
          contact_id INTEGER,
          message TEXT NOT NULL,
          is_internal INTEGER DEFAULT 0,
          attachments TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        )
      `);

      // Canned Replies
      db.run(`
        CREATE TABLE IF NOT EXISTS canned_replies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          department_id INTEGER,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (department_id) REFERENCES ticket_departments(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // ========== Knowledge Base ==========
      
      // KB Categories
      db.run(`
        CREATE TABLE IF NOT EXISTS kb_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          parent_id INTEGER,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES kb_categories(id) ON DELETE SET NULL
        )
      `);

      // KB Articles
      db.run(`
        CREATE TABLE IF NOT EXISTS kb_articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER,
          title TEXT NOT NULL,
          slug TEXT UNIQUE,
          content TEXT NOT NULL,
          excerpt TEXT,
          views INTEGER DEFAULT 0,
          helpful_yes INTEGER DEFAULT 0,
          helpful_no INTEGER DEFAULT 0,
          is_published INTEGER DEFAULT 0,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES kb_categories(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // ========== Email/SMS Templates ==========
      
      // Email Templates
      db.run(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          template_type TEXT CHECK(template_type IN ('invoice', 'estimate', 'ticket', 'contract', 'custom')),
          merge_fields TEXT,
          is_active INTEGER DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // SMS Templates
      db.run(`
        CREATE TABLE IF NOT EXISTS sms_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          template_type TEXT CHECK(template_type IN ('invoice', 'estimate', 'ticket', 'reminder', 'custom')),
          merge_fields TEXT,
          is_active INTEGER DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // ========== Custom Fields ==========
      
      // Custom Field Definitions
      db.run(`
        CREATE TABLE IF NOT EXISTS custom_fields (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL CHECK(entity_type IN ('customer', 'deal', 'invoice', 'estimate', 'project', 'ticket')),
          field_name TEXT NOT NULL,
          field_type TEXT NOT NULL CHECK(field_type IN ('text', 'number', 'date', 'select', 'textarea', 'checkbox')),
          field_options TEXT,
          is_required INTEGER DEFAULT 0,
          position INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Custom Field Values
      db.run(`
        CREATE TABLE IF NOT EXISTS custom_field_values (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          field_id INTEGER NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER NOT NULL,
          field_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE,
          UNIQUE(field_id, entity_type, entity_id)
        )
      `);

      // ========== Contact Permissions ==========
      
      // Contact Module Permissions
      db.run(`
        CREATE TABLE IF NOT EXISTS contact_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contact_id INTEGER NOT NULL,
          module TEXT NOT NULL CHECK(module IN ('invoices', 'estimates', 'contracts', 'tickets', 'projects', 'files')),
          can_view INTEGER DEFAULT 0,
          can_edit INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
          UNIQUE(contact_id, module)
        )
      `);

      // ========== Goals/KPI Sales ==========
      
      // Sales Goals
      db.run(`
        CREATE TABLE IF NOT EXISTS sales_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          period_type TEXT NOT NULL CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          target_amount DECIMAL(10, 2) NOT NULL,
          current_amount DECIMAL(10, 2) DEFAULT 0,
          currency TEXT DEFAULT 'IRR',
          goal_type TEXT CHECK(goal_type IN ('revenue', 'deals', 'leads', 'custom')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // ========== Tags System ==========
      
      // Tags table
      db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          color TEXT DEFAULT '#00A3FF',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Entity Tags (Many-to-Many relationship)
      db.run(`
        CREATE TABLE IF NOT EXISTS entity_tags (
          id TEXT PRIMARY KEY,
          tag_id TEXT NOT NULL,
          entity_type TEXT NOT NULL CHECK(entity_type IN ('CUSTOMER', 'DEAL', 'COACHING_PROGRAM', 'CONTENT_ITEM')),
          customer_id INTEGER,
          deal_id INTEGER,
          program_id INTEGER,
          content_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
          FOREIGN KEY (program_id) REFERENCES coaching_programs(id) ON DELETE CASCADE,
          FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE
        )
      `);

      // Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert default settings if they don't exist
      db.run(`
        INSERT OR IGNORE INTO settings (key, value) VALUES
        ('company_name', 'CRM هوشمند'),
        ('company_domain', 'https://crm.local'),
        ('rtl_admin_area', '1'),
        ('rtl_customers_area', '1'),
        ('allowed_file_types', '.png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt'),
        ('logo_main', ''),
        ('logo_text', ''),
        ('logo_favicon', '')
      `);

      // Calendar Events table
      db.run(`
        CREATE TABLE IF NOT EXISTS calendar_events (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          start_at DATETIME NOT NULL,
          end_at DATETIME,
          relation_type TEXT CHECK(relation_type IN ('CUSTOMER', 'DEAL', 'COACHING_PROGRAM', 'CONTENT_ITEM')),
          relation_id TEXT,
          customer_id INTEGER,
          deal_id INTEGER,
          program_id INTEGER,
          content_id INTEGER,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
          FOREIGN KEY (program_id) REFERENCES coaching_programs(id) ON DELETE CASCADE,
          FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Activity Log table
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER,
          description TEXT,
          ip_address TEXT,
          user_agent TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('task_assigned', 'task_created', 'announcement', 'activity', 'system')),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Announcements table
      db.run(`
        CREATE TABLE IF NOT EXISTS announcements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          start_date DATE,
          end_date DATE,
          is_active INTEGER DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error initializing database tables:', err);
          reject(err);
        } else {
          console.log('✅ All database tables initialized successfully');
          resolve();
        }
      });
    });
  });
};

export const closeDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
};


