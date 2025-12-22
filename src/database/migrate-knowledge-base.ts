import { dbRun, convertSQLiteToMySQL } from './db';

export const migrateKnowledgeBaseTables = async (): Promise<void> => {
  try {
    // Create kb_categories table
    const createCategoriesSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS kb_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(100),
        color VARCHAR(50) DEFAULT '#3B82F6',
        position INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kb_categories_name (name),
        INDEX idx_kb_categories_position (position)
      )
    `);

    await dbRun(createCategoriesSQL, []);
    console.log('✅ Created kb_categories table');

    // Create kb_articles table
    const createArticlesSQL = convertSQLiteToMySQL(`
      CREATE TABLE IF NOT EXISTS kb_articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        content TEXT NOT NULL,
        excerpt TEXT,
        is_published TINYINT(1) DEFAULT 0,
        views INT DEFAULT 0,
        attachments TEXT,
        tags TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES kb_categories(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_kb_articles_category_id (category_id),
        INDEX idx_kb_articles_slug (slug),
        INDEX idx_kb_articles_is_published (is_published),
        INDEX idx_kb_articles_created_at (created_at)
      )
    `);

    await dbRun(createArticlesSQL, []);
    console.log('✅ Created kb_articles table');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message?.includes('already exists')) {
      console.log('ℹ️  Knowledge base tables already exist');
    } else {
      console.error('Error creating knowledge base tables:', error);
      throw error;
    }
  }
};

