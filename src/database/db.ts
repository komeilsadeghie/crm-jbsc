import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

// Database type detection
const isMySQL = !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql');
const isSQLite = !isMySQL;

// MySQL Connection Pool (if using MySQL)
let mysqlPool: mysql.Pool | null = null;

if (isMySQL && process.env.DATABASE_URL) {
  try {
    // Parse MySQL URL: mysql://user:password@host:port/database
    const url = new URL(process.env.DATABASE_URL);
    mysqlPool = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    console.log('✅ Connected to MySQL database');
  } catch (error: any) {
    console.error('❌ Error connecting to MySQL:', error);
    throw error;
  }
}

// SQLite Database (if using SQLite)
let sqliteDb: sqlite3.Database | null = null;

if (isSQLite) {
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

  sqliteDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    console.error('   Database path:', DB_PATH);
    console.error('   Database directory exists:', fs.existsSync(DB_DIR));
    console.error('   Database file exists:', fs.existsSync(DB_PATH));
  } else {
    console.log('✅ Connected to SQLite database');
      sqliteDb!.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('❌ Error enabling foreign keys:', err);
      }
    });
  }
});
}

// Helper function to convert SQLite syntax to MySQL
const convertSQLiteToMySQL = (query: string): string => {
  if (!isMySQL) return query;
  
  // Replace SQLite-specific syntax with MySQL equivalents
  return query
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'INT AUTO_INCREMENT PRIMARY KEY')
    .replace(/PRAGMA foreign_keys = ON/gi, 'SET FOREIGN_KEY_CHECKS = 1')
    .replace(/CREATE TABLE IF NOT EXISTS/gi, 'CREATE TABLE IF NOT EXISTS')
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT OR REPLACE INTO/gi, 'REPLACE INTO')
    .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
    .replace(/TEXT/gi, 'TEXT')
    .replace(/INTEGER/gi, 'INT')
    .replace(/REAL/gi, 'DOUBLE');
};

// Unified database interface
interface DatabaseResult {
  lastID?: number;
  insertId?: number;
  changes?: number;
  affectedRows?: number;
}

// Export unified db object that works with both SQLite and MySQL
export const db = {
  // Get single row
  get: (query: string, params: any[] = [], callback: (err: any, row: any) => void) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([rows]: any) => {
          callback(null, Array.isArray(rows) ? rows[0] : null);
        })
        .catch(callback);
    } else if (isSQLite && sqliteDb) {
      sqliteDb.get(convertedQuery, params, callback);
    } else {
      callback(new Error('Database not initialized'), null);
    }
  },

  // Get all rows
  all: (query: string, params: any[] = [], callback: (err: any, rows: any[]) => void) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([rows]: any) => {
          callback(null, Array.isArray(rows) ? rows : []);
        })
        .catch(callback);
    } else if (isSQLite && sqliteDb) {
      sqliteDb.all(convertedQuery, params, callback);
    } else {
      callback(new Error('Database not initialized'), []);
    }
  },

  // Run query (INSERT, UPDATE, DELETE)
  run: (query: string, params: any[] = [], callback?: (err: any) => void) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([result]: any) => {
          if (callback) callback(null);
          return result;
        })
        .catch((err) => {
          if (callback) callback(err);
          throw err;
        });
    } else if (isSQLite && sqliteDb) {
      sqliteDb.run(convertedQuery, params, callback);
    } else {
      const err = new Error('Database not initialized');
      if (callback) callback(err);
      throw err;
    }
  },

  // Serialize (for SQLite - no-op for MySQL)
  serialize: (callback: () => void) => {
    if (isSQLite && sqliteDb) {
      sqliteDb.serialize(callback);
    } else {
      callback();
    }
  },

  // Close connection
  close: (callback?: (err: any) => void) => {
    if (isMySQL && mysqlPool) {
      mysqlPool.end()
        .then(() => {
          if (callback) callback(null);
        })
        .catch((err) => {
          if (callback) callback(err);
        });
    } else if (isSQLite && sqliteDb) {
      sqliteDb.close(callback);
    } else {
      if (callback) callback(null);
    }
  },
};

// Helper functions for Promise-based operations (used throughout the codebase)
export const dbGet = (query: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([rows]: any) => {
          resolve(Array.isArray(rows) ? rows[0] : null);
        })
        .catch(reject);
    } else if (isSQLite && sqliteDb) {
      sqliteDb.get(convertedQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    } else {
      reject(new Error('Database not initialized'));
    }
  });
};

export const dbAll = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([rows]: any) => {
          resolve(Array.isArray(rows) ? rows : []);
        })
        .catch(reject);
    } else if (isSQLite && sqliteDb) {
      sqliteDb.all(convertedQuery, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    } else {
      reject(new Error('Database not initialized'));
    }
  });
};

export const dbRun = (query: string, params: any[] = []): Promise<{ lastID?: number; insertId?: number; changes: number; affectedRows?: number }> => {
  return new Promise((resolve, reject) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([result]: any) => {
          resolve({
            insertId: result.insertId,
            lastID: result.insertId,
            affectedRows: result.affectedRows,
            changes: result.affectedRows || 0,
          });
        })
        .catch(reject);
    } else if (isSQLite && sqliteDb) {
      sqliteDb.run(convertedQuery, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    } else {
      reject(new Error('Database not initialized'));
    }
  });
};

export const initDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    // Convert SQLite CREATE TABLE statements to MySQL
    const createTableStatements: string[] = [];
    
    // Helper to add CREATE TABLE statement
    const addTable = (sql: string) => {
      createTableStatements.push(convertSQLiteToMySQL(sql));
    };

    // Users table
    addTable(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        full_name VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table (مشتریان)
    addTable(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company_name VARCHAR(255),
        address TEXT,
        website VARCHAR(255),
        score INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        category VARCHAR(255),
          notes TEXT,
        customer_model INT,
        created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Run all CREATE TABLE statements
    const runNext = (index: number) => {
      if (index >= createTableStatements.length) {
        console.log('✅ All database tables initialized successfully');
        resolve();
        return;
      }

      const query = createTableStatements[index];
      
      if (isMySQL && mysqlPool) {
        mysqlPool.query(query)
          .then(() => runNext(index + 1))
          .catch((err) => {
            // Ignore "table already exists" errors
            if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.message.includes('already exists')) {
              runNext(index + 1);
            } else {
              console.error(`Error creating table ${index}:`, err);
              reject(err);
            }
          });
      } else if (isSQLite && sqliteDb) {
        sqliteDb.run(query, [], (err) => {
        if (err) {
            console.error(`Error creating table ${index}:`, err);
          reject(err);
        } else {
            runNext(index + 1);
          }
        });
      }
    };

    if (isMySQL) {
      // Enable foreign keys for MySQL
      mysqlPool!.query('SET FOREIGN_KEY_CHECKS = 1')
        .then(() => runNext(0))
        .catch(reject);
    } else if (isSQLite) {
      sqliteDb!.serialize(() => {
        // Enable foreign keys for SQLite
        sqliteDb!.run('PRAGMA foreign_keys = ON', [], (err) => {
          if (err) {
            console.error('❌ Error enabling foreign keys:', err);
          }
        });
        runNext(0);
      });
    }
  });
};

export const closeDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    if (isMySQL && mysqlPool) {
      mysqlPool.end()
        .then(() => {
          console.log('Database connection closed');
          resolve();
        })
        .catch(reject);
    } else if (isSQLite && sqliteDb) {
      sqliteDb.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
    } else {
      resolve();
    }
  });
};
