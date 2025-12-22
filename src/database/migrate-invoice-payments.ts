import { dbRun, convertSQLiteToMySQL } from './db';

export const migrateInvoicePaymentsTable = async (): Promise<void> => {
  try {
    const createInvoicePaymentsSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(100),
        reference_number VARCHAR(255),
        notes TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_invoice_payments_invoice_id (invoice_id),
        INDEX idx_invoice_payments_payment_date (payment_date),
        INDEX idx_invoice_payments_created_at (created_at)
      )
    `);

    await dbRun(createInvoicePaymentsSQL, []);
    console.log('✅ Created invoice_payments table');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
      console.log('ℹ️  invoice_payments table already exists');
    } else {
      console.error('Error creating invoice_payments table:', error);
      throw error;
    }
  }
};

