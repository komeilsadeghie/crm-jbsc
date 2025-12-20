import { dbRun, getTableInfo, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to add new columns to users table and create permissions tables
export const migrateUsersTable = async (): Promise<void> => {
  try {
    // Get table info using helper function (works with both SQLite and MySQL)
    const info = await getTableInfo('users');
    
    if (!info || info.length === 0) {
      console.log('⚠️  Users table not found, will be created by initDatabase');
      await createPermissionsTables();
      return;
    }

    const columnNames = info.map((col: any) => col.name);
    const columnsToAdd = [
      { name: 'first_name', type: 'TEXT' },
      { name: 'last_name', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'hourly_rate', type: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'facebook', type: 'TEXT' },
      { name: 'linkedin', type: 'TEXT' },
      { name: 'skype', type: 'TEXT' },
      { name: 'email_signature', type: 'TEXT' },
      { name: 'default_language', type: 'VARCHAR(10)' },
      { name: 'direction', type: 'VARCHAR(10)' },
      { name: 'is_admin', type: 'INTEGER DEFAULT 0' },
      { name: 'is_staff', type: 'INTEGER DEFAULT 1' },
      { name: 'avatar_url', type: 'TEXT' },
    ];

    const missingColumns = columnsToAdd.filter(col => !columnNames.includes(col.name));
    
    if (missingColumns.length === 0) {
      console.log('✓ All user columns exist');
    } else {
      // Add missing columns sequentially
      for (const column of missingColumns) {
        try {
          await dbRun(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ Added column: ${column.name}`);
          
          // Set default values for default_language and direction after adding column
          if (column.name === 'default_language') {
            try {
              await dbRun(`UPDATE users SET default_language = 'fa' WHERE default_language IS NULL`);
            } catch (updateErr: any) {
              // Ignore update errors
            }
          } else if (column.name === 'direction') {
            try {
              await dbRun(`UPDATE users SET direction = 'rtl' WHERE direction IS NULL`);
            } catch (updateErr: any) {
              // Ignore update errors
            }
          }
        } catch (alterErr: any) {
          console.log(`⚠️  Could not add column ${column.name}:`, alterErr.message);
        }
      }
    }

    await createPermissionsTables();
  } catch (error: any) {
    console.error('❌ Error in migrateUsersTable:', error);
    throw error;
  }
};

async function createPermissionsTables(): Promise<void> {
  try {
    // Permissions table
    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          module VARCHAR(100) NOT NULL,
          capability VARCHAR(100) NOT NULL,
          description TEXT,
          UNIQUE(module, capability)
        )
      `);
      console.log('✅ Permissions table ready');
    } catch (err: any) {
      console.log('⚠️  Permissions table error:', err.message);
    }

    // User Permissions table
    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS user_permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          permission_id INT NOT NULL,
          granted INT DEFAULT 1,
          UNIQUE(user_id, permission_id)
        )
      `);
      console.log('✅ User permissions table ready');
    } catch (err: any) {
      console.log('⚠️  User permissions table error:', err.message);
    }

    // User Departments table
    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS user_departments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          department_id INT NOT NULL,
          UNIQUE(user_id, department_id)
        )
      `);
      console.log('✅ User departments table ready');
    } catch (err: any) {
      console.log('⚠️  User departments table error:', err.message);
    }

    await insertDefaultPermissions();
  } catch (error: any) {
    console.error('❌ Error in createPermissionsTables:', error);
    throw error;
  }
}

async function insertDefaultPermissions(): Promise<void> {
  const defaultPermissions = [
    // Contracts
    { module: 'contracts', capability: 'view_own', description: 'مشاهده قراردادهای خود' },
    { module: 'contracts', capability: 'view_global', description: 'مشاهده همه قراردادها' },
    { module: 'contracts', capability: 'create', description: 'ایجاد قرارداد' },
    { module: 'contracts', capability: 'edit', description: 'ویرایش قرارداد' },
    { module: 'contracts', capability: 'delete', description: 'حذف قرارداد' },
    // Customers
    { module: 'customers', capability: 'view_own', description: 'مشاهده مشتریان خود' },
    { module: 'customers', capability: 'view_global', description: 'مشاهده همه مشتریان' },
    { module: 'customers', capability: 'create', description: 'ایجاد مشتری' },
    { module: 'customers', capability: 'edit', description: 'ویرایش مشتری' },
    { module: 'customers', capability: 'delete', description: 'حذف مشتری' },
    // Estimates
    { module: 'estimates', capability: 'view_own', description: 'مشاهده پیش‌فاکتورهای خود' },
    { module: 'estimates', capability: 'view_global', description: 'مشاهده همه پیش‌فاکتورها' },
    { module: 'estimates', capability: 'create', description: 'ایجاد پیش‌فاکتور' },
    { module: 'estimates', capability: 'edit', description: 'ویرایش پیش‌فاکتور' },
    { module: 'estimates', capability: 'delete', description: 'حذف پیش‌فاکتور' },
    // Tasks
    { module: 'tasks', capability: 'view_own', description: 'مشاهده وظایف خود' },
    { module: 'tasks', capability: 'view_global', description: 'مشاهده همه وظایف' },
    { module: 'tasks', capability: 'create', description: 'ایجاد وظیفه' },
    { module: 'tasks', capability: 'edit', description: 'ویرایش وظیفه' },
    { module: 'tasks', capability: 'delete', description: 'حذف وظیفه' },
    // Projects
    { module: 'projects', capability: 'view_own', description: 'مشاهده پروژه‌های خود' },
    { module: 'projects', capability: 'view_global', description: 'مشاهده همه پروژه‌ها' },
    { module: 'projects', capability: 'create', description: 'ایجاد پروژه' },
    { module: 'projects', capability: 'edit', description: 'ویرایش پروژه' },
    { module: 'projects', capability: 'delete', description: 'حذف پروژه' },
    // Tickets
    { module: 'tickets', capability: 'view_own', description: 'مشاهده تیکت‌های خود' },
    { module: 'tickets', capability: 'view_global', description: 'مشاهده همه تیکت‌ها' },
    { module: 'tickets', capability: 'create', description: 'ایجاد تیکت' },
    { module: 'tickets', capability: 'edit', description: 'ویرایش تیکت' },
    { module: 'tickets', capability: 'delete', description: 'حذف تیکت' },
    // Leads
    { module: 'leads', capability: 'view_global', description: 'مشاهده همه سرنخ‌ها' },
    { module: 'leads', capability: 'create', description: 'ایجاد سرنخ' },
    { module: 'leads', capability: 'edit', description: 'ویرایش سرنخ' },
    { module: 'leads', capability: 'delete', description: 'حذف سرنخ' },
    // Expenses
    { module: 'expenses', capability: 'view_own', description: 'مشاهده هزینه‌های خود' },
    { module: 'expenses', capability: 'view_global', description: 'مشاهده همه هزینه‌ها' },
    { module: 'expenses', capability: 'create', description: 'ایجاد هزینه' },
    { module: 'expenses', capability: 'edit', description: 'ویرایش هزینه' },
    { module: 'expenses', capability: 'delete', description: 'حذف هزینه' },
    // Reports
    { module: 'reports', capability: 'view_global', description: 'مشاهده گزارش‌ها' },
    // Settings
    { module: 'settings', capability: 'view_global', description: 'مشاهده تنظیمات' },
    { module: 'settings', capability: 'edit', description: 'ویرایش تنظیمات' },
    // Staff
    { module: 'staff', capability: 'view_global', description: 'مشاهده کاربران' },
    { module: 'staff', capability: 'create', description: 'ایجاد کاربر' },
    { module: 'staff', capability: 'edit', description: 'ویرایش کاربر' },
    { module: 'staff', capability: 'delete', description: 'حذف کاربر' },
  ];

  if (defaultPermissions.length === 0) {
    return;
  }

  // Insert permissions sequentially
  for (const perm of defaultPermissions) {
    try {
      await dbRun(
        `INSERT OR IGNORE INTO permissions (module, capability, description) VALUES (?, ?, ?)`,
        [perm.module, perm.capability, perm.description]
      );
    } catch (err: any) {
      console.log(`⚠️  Could not insert permission ${perm.module}.${perm.capability}:`, err.message);
    }
  }

  console.log('✅ Default permissions inserted');
}

