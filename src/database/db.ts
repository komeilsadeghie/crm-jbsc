import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

// Database type detection
// Check for MySQL/MariaDB connection string
const getDatabaseUrl = (): string | undefined => {
  return process.env.DATABASE_URL || process.env.MYSQL_URL;
};

const databaseUrl = getDatabaseUrl();
export const isMySQL = !!databaseUrl && (
  databaseUrl.startsWith('mysql://') || 
  databaseUrl.startsWith('mariadb://') ||
  databaseUrl.startsWith('mysql2://')
);
export const isSQLite = !isMySQL;

// MySQL Connection Pool (if using MySQL)
let mysqlPool: mysql.Pool | null = null;

// Export function to check if database is ready
export const isDatabaseReady = (): boolean => {
  if (isMySQL) {
    return mysqlPool !== null;
  } else if (isSQLite) {
    return sqliteDb !== null;
  }
  return false;
};

if (isMySQL && databaseUrl) {
  try {
    // Parse MySQL URL: mysql://user:password@host:port/database
    const url = new URL(databaseUrl);
    
    // Extract database name from pathname (remove leading '/')
    const databaseName = url.pathname.slice(1);
    
    // Build connection config
    const connectionConfig: mysql.PoolOptions = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password || ''),
      database: databaseName || undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // MySQL-specific options
      timezone: '+00:00', // Use UTC
      charset: 'utf8mb4',
    };

    mysqlPool = mysql.createPool(connectionConfig);
    
    // Test the connection
    mysqlPool.getConnection()
      .then((connection) => {
        console.log('✅ Connected to MySQL database');
        console.log(`   Host: ${connection.config.host}`);
        console.log(`   Database: ${connection.config.database || 'default'}`);
        connection.release();
      })
      .catch((err) => {
        console.error('❌ Error testing MySQL connection:', err);
      });
  } catch (error: any) {
    console.error('❌ Error creating MySQL connection pool:', error);
    console.error('   DATABASE_URL:', databaseUrl ? '***' : 'not set');
    // Don't throw in production - allow app to start and retry later
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
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
export const convertSQLiteToMySQL = (query: string): string => {
  if (!isMySQL) return query;
  
  let converted = query;
  
  // Replace SQLite-specific syntax with MySQL equivalents
  converted = converted
    // Primary key with auto increment
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'INT AUTO_INCREMENT PRIMARY KEY')
    .replace(/INTEGER PRIMARY KEY/gi, 'INT PRIMARY KEY')
    // PRAGMA statements
    .replace(/PRAGMA\s+foreign_keys\s*=\s*ON/gi, 'SET FOREIGN_KEY_CHECKS = 1')
    .replace(/PRAGMA\s+foreign_keys\s*=\s*OFF/gi, 'SET FOREIGN_KEY_CHECKS = 0')
    // INSERT statements
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT OR REPLACE INTO/gi, 'REPLACE INTO')
    // Data types
    .replace(/\bINTEGER(?!\s+PRIMARY)(?!\s+AUTO)/gi, 'INT')
    .replace(/\bREAL\b/gi, 'DOUBLE')
    .replace(/\bBLOB\b/gi, 'LONGBLOB')
    // Boolean handling (SQLite uses INTEGER, MySQL uses TINYINT or BOOLEAN)
    .replace(/\bBOOLEAN\b/gi, 'TINYINT(1)')
    // Date functions
    .replace(/\bdatetime\('now'\)/gi, 'NOW()')
    .replace(/\bCURRENT_TIMESTAMP\b/gi, 'CURRENT_TIMESTAMP')
    // String concatenation (SQLite uses ||, MySQL uses CONCAT)
    // Note: This is a simple replacement, may need more complex handling for edge cases
    .replace(/\|\|/g, 'CONCAT')
    // LIMIT and OFFSET syntax (mostly compatible, but ensure proper format)
    // MySQL supports: LIMIT offset, count or LIMIT count OFFSET offset
    // SQLite supports both formats, so no change needed
    // CHECK constraints - MySQL supports them (MySQL 8.0+)
    // FOREIGN KEY syntax is mostly compatible
  
  // Handle TEXT with UNIQUE constraints - MySQL requires VARCHAR for UNIQUE
  converted = converted.replace(/\bTEXT\s+UNIQUE/gi, 'VARCHAR(255) UNIQUE');
  
  // Handle IF NOT EXISTS in CREATE TABLE (MySQL supports it)
  // No change needed
  
  // Handle backticks for identifiers (MySQL uses backticks, SQLite uses double quotes)
  // Both are supported in MySQL, so no change needed
  
  return converted;
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
  get: (query: string, paramsOrCallback?: any[] | ((err: any, row: any) => void), callback?: (err: any, row: any) => void) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    // Handle overloaded signatures: get(query, callback) or get(query, params, callback)
    let params: any[] = [];
    let cb: (err: any, row: any) => void;
    
    if (typeof paramsOrCallback === 'function') {
      cb = paramsOrCallback;
      params = [];
    } else {
      params = paramsOrCallback || [];
      cb = callback || (() => {});
    }
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([rows]: any) => {
          cb(null, Array.isArray(rows) ? rows[0] : null);
        })
        .catch((err) => {
          cb(err, null);
        });
    } else if (isSQLite && sqliteDb) {
      sqliteDb.get(convertedQuery, params, cb);
    } else {
      cb(new Error('Database not initialized'), null);
    }
  },

  // Get all rows
  all: (query: string, paramsOrCallback?: any[] | ((err: any, rows: any[]) => void), callback?: (err: any, rows: any[]) => void) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    // Handle overloaded signatures: all(query, callback) or all(query, params, callback)
    let params: any[] = [];
    let cb: (err: any, rows: any[]) => void;
    
    if (typeof paramsOrCallback === 'function') {
      cb = paramsOrCallback;
      params = [];
    } else {
      params = paramsOrCallback || [];
      cb = callback || (() => {});
    }
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([rows]: any) => {
          cb(null, Array.isArray(rows) ? rows : []);
        })
        .catch((err) => {
          cb(err, []);
        });
    } else if (isSQLite && sqliteDb) {
      sqliteDb.all(convertedQuery, params, cb);
    } else {
      cb(new Error('Database not initialized'), []);
    }
  },

  // Run query (INSERT, UPDATE, DELETE)
  run: (query: string, paramsOrCallback?: any[] | ((err: any) => void), callback?: (err: any) => void) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    // Handle overloaded signatures: run(query, callback) or run(query, params, callback)
    let params: any[] = [];
    let cb: ((err: any) => void) | undefined;
    
    if (typeof paramsOrCallback === 'function') {
      cb = paramsOrCallback;
      params = [];
    } else {
      params = paramsOrCallback || [];
      cb = callback;
    }
    
    if (isMySQL && mysqlPool) {
      mysqlPool.query(convertedQuery, params)
        .then(([result]: any) => {
          if (cb) cb(null);
          return result;
        })
        .catch((err) => {
          if (cb) cb(err);
          throw err;
        });
    } else if (isSQLite && sqliteDb) {
      sqliteDb.run(convertedQuery, params, cb);
    } else {
      const err = new Error('Database not initialized');
      if (cb) cb(err);
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

  // Prepare statement (for SQLite - returns a wrapper for MySQL)
  prepare: (query: string) => {
    const convertedQuery = convertSQLiteToMySQL(query);
    
    if (isMySQL && mysqlPool) {
      // For MySQL, return a wrapper that mimics SQLite's prepared statement interface
      return {
        run: (params: any[] = []) => {
          return mysqlPool!.query(convertedQuery, params)
            .then(([result]: any) => {
              return {
                lastID: result.insertId,
                changes: result.affectedRows || 0,
              };
            })
            .catch((err) => {
              throw err;
            });
        },
        finalize: () => {
          // No-op for MySQL - prepared statements are automatically finalized
        },
      };
    } else if (isSQLite && sqliteDb) {
      return sqliteDb.prepare(convertedQuery);
    } else {
      throw new Error('Database not initialized');
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

// Helper function to get table info (works with both SQLite and MySQL)
export const getTableInfo = async (tableName: string): Promise<any[]> => {
  if (isMySQL && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT COLUMN_NAME as name, DATA_TYPE as type, COLUMN_DEFAULT as dflt_value, IS_NULLABLE as notnull 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    return rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      dflt_value: row.dflt_value,
      notnull: row.notnull === 'NO' ? 1 : 0,
    }));
  } else if (isSQLite && sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb!.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
  return [];
};

// Helper function to check if table exists (works with both SQLite and MySQL)
export const tableExists = async (tableName: string): Promise<boolean> => {
  if (isMySQL && mysqlPool) {
    const [rows]: any = await mysqlPool.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    return rows[0].count > 0;
  } else if (isSQLite && sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb!.all(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName],
        (err, rows) => {
          if (err) reject(err);
          else resolve((rows || []).length > 0);
        }
      );
    });
  }
  return false;
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
      if (!mysqlPool) {
        console.error('❌ MySQL connection pool not initialized. Retrying in 2 seconds...');
        // Retry after 2 seconds
        setTimeout(() => {
          if (!mysqlPool) {
            reject(new Error('MySQL connection pool not initialized after retry'));
          } else {
            mysqlPool.query('SET FOREIGN_KEY_CHECKS = 1')
              .then(() => runNext(0))
              .catch(reject);
          }
        }, 2000);
        return;
      }
      mysqlPool.query('SET FOREIGN_KEY_CHECKS = 1')
        .then(() => runNext(0))
        .catch((err) => {
          console.error('❌ Error setting FOREIGN_KEY_CHECKS:', err);
          // Don't reject - try to continue anyway
          runNext(0);
        });
    } else if (isSQLite) {
      if (!sqliteDb) {
        reject(new Error('SQLite database not initialized'));
        return;
      }
      sqliteDb.serialize(() => {
        // Enable foreign keys for SQLite
        sqliteDb!.run('PRAGMA foreign_keys = ON', [], (err) => {
          if (err) {
            console.error('❌ Error enabling foreign keys:', err);
          }
        });
        runNext(0);
      });
    } else {
      reject(new Error('No database connection available'));
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
