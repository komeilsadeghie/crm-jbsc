import { db } from './db';

export const migrateCustomerExcelFields = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check existing columns in customers table
      db.all(`PRAGMA table_info(customers)`, [], (err: any, columns: any[]) => {
        if (err) {
          console.error('Error checking customers table:', err);
          reject(err);
          return;
        }

        const columnNames = columns.map((col: any) => col.name);
        
        // Add new fields from Excel columns
        const newFields = [
          { name: 'gender', type: 'TEXT' }, // جنسیت
          { name: 'site_languages_count', type: 'INTEGER' }, // تعداد زبان های سایت ها
          { name: 'service_type', type: 'TEXT' }, // نوع خدمات
          { name: 'delivery_deadline', type: 'DATE' }, // ددلاین تحویل
          { name: 'site_costs', type: 'DECIMAL(10, 2)' }, // هزینه ها برای سایت ها
          { name: 'initial_delivery_date', type: 'DATE' }, // تاریخ اتمام و تحویل اولیه سایت
          { name: 'languages_added_date', type: 'DATE' }, // تاریخ اضافه کردن زبان های سایت
        ];

        const missingFields = newFields.filter(field => !columnNames.includes(field.name));

        if (missingFields.length === 0) {
          console.log('✓ All customer Excel fields already exist');
          checkProjectsFields();
          return;
        }

        let completed = 0;
        const total = missingFields.length;

        missingFields.forEach((field) => {
          db.run(`ALTER TABLE customers ADD COLUMN ${field.name} ${field.type}`, (err: any) => {
            if (err) {
              console.error(`Error adding column ${field.name}:`, err);
            } else {
              console.log(`✓ Added column ${field.name} to customers table`);
            }
            completed++;
            if (completed === total) {
              console.log('✓ Customer Excel fields migration completed');
              checkProjectsFields();
            }
          });
        });
      });

      const checkProjectsFields = () => {
        // Check projects table for settlement fields
        db.all(`PRAGMA table_info(projects)`, [], (err: any, projectColumns: any[]) => {
          if (err) {
            console.error('Error checking projects table:', err);
            reject(err);
            return;
          }

          const projectColumnNames = projectColumns.map((col: any) => col.name);
          
          // Add settlement fields if they don't exist
          const settlementFields = [
            { name: 'settlement_kamil', type: 'TEXT' }, // تسویه کمیل
            { name: 'settlement_asdan', type: 'TEXT' }, // تسویه اسدان
            { name: 'settlement_soleimani', type: 'TEXT' }, // تسویه سلیمانی (already exists as settlements JSON)
          ];

          const missingSettlements = settlementFields.filter(field => !projectColumnNames.includes(field.name));

          if (missingSettlements.length === 0) {
            console.log('✓ All project settlement fields already exist');
            resolve();
            return;
          }

          let completed = 0;
          const total = missingSettlements.length;

          missingSettlements.forEach((field) => {
            db.run(`ALTER TABLE projects ADD COLUMN ${field.name} ${field.type}`, (err: any) => {
              if (err) {
                console.error(`Error adding column ${field.name}:`, err);
              } else {
                console.log(`✓ Added column ${field.name} to projects table`);
              }
              completed++;
              if (completed === total) {
                console.log('✓ Project settlement fields migration completed');
                resolve();
              }
            });
          });
        });
      };
    });
  });
};

