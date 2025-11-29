import { db } from '../../database/db';

// Helper function to promisify db.get
const dbGet = (query: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper function to promisify db.all
const dbAll = (query: string, params: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Helper function to promisify db.run
const dbRun = (query: string, params: any[]): Promise<{ lastID?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const getUserProfile = async (id: string) => {
  const user = await dbGet(
    'SELECT id, username, email, full_name, phone, role, created_at FROM users WHERE id = ?',
    [id]
  );

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name || null,
    phone: user.phone || null,
    avatarUrl: null,
    role: (user.role || 'user').toLowerCase(),
    createdAt: user.created_at,
    updatedAt: user.created_at,
  };
};

interface UpdateProfilePayload {
  fullName?: string | null;
  phone?: string | null;
}

export const updateUserProfile = async (id: string, payload: UpdateProfilePayload) => {
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.fullName !== undefined) {
    updates.push('full_name = ?');
    params.push(payload.fullName);
  }

  if (payload.phone !== undefined) {
    updates.push('phone = ?');
    params.push(payload.phone);
  }

  if (updates.length === 0) {
    return getUserProfile(id);
  }

  params.push(id);

  await dbRun(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return getUserProfile(id);
};

export const listUsersByRole = async (role?: string) => {
  let query = 'SELECT id, username, email, full_name, phone, role, created_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role.toLowerCase());
  }

  query += ' ORDER BY created_at DESC';

  const users = await dbAll(query, params);

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name || null,
    phone: user.phone || null,
    avatarUrl: null,
    role: (user.role || 'user').toLowerCase(),
    createdAt: user.created_at,
    updatedAt: user.created_at,
  }));
};
