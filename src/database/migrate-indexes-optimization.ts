import { db, isMySQL, convertSQLiteToMySQL } from './db';

// Migration script to create performance indexes for tasks and customers
export const migrateIndexesOptimization = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const indexes = [
      // Tasks indexes
      { name: 'idx_tasks_account_id', sql: 'CREATE INDEX idx_tasks_account_id ON tasks(account_id)' },
      { name: 'idx_tasks_deal_id', sql: 'CREATE INDEX idx_tasks_deal_id ON tasks(deal_id)' },
      { name: 'idx_tasks_assigned_to', sql: 'CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to)' },
      { name: 'idx_tasks_status', sql: 'CREATE INDEX idx_tasks_status ON tasks(status)' },
      { name: 'idx_tasks_priority', sql: 'CREATE INDEX idx_tasks_priority ON tasks(priority)' },
      { name: 'idx_tasks_due_date', sql: 'CREATE INDEX idx_tasks_due_date ON tasks(due_date)' },
      { name: 'idx_tasks_created_at', sql: 'CREATE INDEX idx_tasks_created_at ON tasks(created_at)' },
      
      // Customers indexes
      { name: 'idx_customers_type', sql: 'CREATE INDEX idx_customers_type ON customers(type)' },
      { name: 'idx_customers_status', sql: 'CREATE INDEX idx_customers_status ON customers(status)' },
      { name: 'idx_customers_created_by', sql: 'CREATE INDEX idx_customers_created_by ON customers(created_by)' },
      { name: 'idx_customers_created_at', sql: 'CREATE INDEX idx_customers_created_at ON customers(created_at)' },
      { name: 'idx_customers_journey_stage', sql: 'CREATE INDEX idx_customers_journey_stage ON customers(journey_stage)' },
      { name: 'idx_customers_coach_id', sql: 'CREATE INDEX idx_customers_coach_id ON customers(coach_id)' },
      
      // Entity tags indexes
      { name: 'idx_entity_tags_customer_id', sql: 'CREATE INDEX idx_entity_tags_customer_id ON entity_tags(customer_id)' },
      { name: 'idx_entity_tags_tag_id', sql: 'CREATE INDEX idx_entity_tags_tag_id ON entity_tags(tag_id)' },
    ];

    let indexIndex = 0;
    const createNextIndex = () => {
      if (indexIndex >= indexes.length) {
        console.log('✅ All performance indexes created');
        resolve();
        return;
      }

      const index = indexes[indexIndex];
      const sql = isMySQL ? convertSQLiteToMySQL(index.sql) : index.sql;

      db.run(sql, (err: any) => {
        if (err) {
          // Ignore "duplicate key" errors (index already exists)
          if (err.code !== 'ER_DUP_KEYNAME' && !err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
            console.warn(`⚠️ Could not create index ${index.name}:`, err.message);
          }
        } else {
          console.log(`✅ Created index ${index.name}`);
        }
        indexIndex++;
        createNextIndex();
      });
    };

    createNextIndex();
  });
};

