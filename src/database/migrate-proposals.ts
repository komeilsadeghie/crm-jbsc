import { db, getTableInfoCallback, isMySQL, convertSQLiteToMySQL } from './db';

export const migrateProposalsTable = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    getTableInfoCallback('proposals', (err: any, info: any[]) => {
      if (err || !info || info.length === 0) {
        // Create proposals table
        const createProposalsSQL = convertSQLiteToMySQL(`
          CREATE TABLE IF NOT EXISTS proposals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            account_id INT NOT NULL,
            contact_id INT,
            deal_id INT,
            proposal_number VARCHAR(255) UNIQUE NOT NULL,
            subject TEXT NOT NULL,
            content TEXT NOT NULL,
            amount DECIMAL(10, 2),
            currency VARCHAR(10) DEFAULT 'IRR',
            status VARCHAR(50) DEFAULT 'draft',
            valid_until DATE,
            accepted_at DATETIME,
            declined_at DATETIME,
            accepted_by INT,
            declined_by INT,
            decline_reason TEXT,
            sent_at DATETIME,
            viewed_at DATETIME,
            view_count INT DEFAULT 0,
            email_template_id INT,
            created_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        db.run(createProposalsSQL, (err) => {
          if (err) {
            console.error('Error creating proposals table:', err);
            reject(err);
            return;
          }
          console.log('✅ Created proposals table');
          createProposalItems(resolve, reject);
        });
      } else {
        console.log('✅ proposals table already exists');
        resolve();
      }
    });
  });
};

const createProposalItems = (resolve: () => void, reject: (err: any) => void) => {
  // Create proposal items table
  const createProposalItemsSQL = convertSQLiteToMySQL(`
    CREATE TABLE IF NOT EXISTS proposal_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proposal_id INT NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      description TEXT,
      quantity DECIMAL(10, 2) DEFAULT 1,
      unit_price DECIMAL(10, 2) NOT NULL,
      tax_rate DECIMAL(5, 2) DEFAULT 0,
      tax_amount DECIMAL(10, 2) DEFAULT 0,
      total_amount DECIMAL(10, 2) NOT NULL,
      position INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(createProposalItemsSQL, (err) => {
    if (err) {
      console.error('Error creating proposal_items table:', err);
      reject(err);
      return;
    }
    console.log('✅ Created proposal_items table');
    createProposalAttachments(resolve, reject);
  });
};

const createProposalAttachments = (resolve: () => void, reject: (err: any) => void) => {
  // Create proposal attachments table
  const createProposalAttachmentsSQL = convertSQLiteToMySQL(`
    CREATE TABLE IF NOT EXISTS proposal_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proposal_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_size INT,
      mime_type VARCHAR(100),
      uploaded_by INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(createProposalAttachmentsSQL, (err) => {
    if (err) {
      console.error('Error creating proposal_attachments table:', err);
      reject(err);
      return;
    }
    console.log('✅ Created proposal_attachments table');
    
    // Create indexes
    const index1SQL = convertSQLiteToMySQL(`CREATE INDEX IF NOT EXISTS idx_proposals_account_id ON proposals(account_id)`);
    const index2SQL = convertSQLiteToMySQL(`CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)`);
    const index3SQL = convertSQLiteToMySQL(`CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at)`);
    
    db.run(index1SQL, () => {});
    db.run(index2SQL, () => {});
    db.run(index3SQL, () => {
      resolve();
    });
  });
};
