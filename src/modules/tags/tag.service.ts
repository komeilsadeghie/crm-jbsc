import { db } from '../../database/db';
import { AssignTagPayload, TagPayload, TagWithUsage } from './tag.types';

// Helper functions for database operations
const dbGet = (query: string, params: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (query: string, params: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const dbRun = (query: string, params: any[]): Promise<{ lastID?: number; changes?: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const listTags = async (): Promise<TagWithUsage[]> => {
  const tags = await dbAll(
    `SELECT t.*, COUNT(et.id) as usage_count
     FROM tags t
     LEFT JOIN entity_tags et ON et.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name ASC`,
    []
  );

  return tags.map((tag: any) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color || '#00A3FF',
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
    usageCount: tag.usage_count || 0,
  }));
};

export const createTag = async ({ name, color }: TagPayload) => {
  const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await dbRun(
    'INSERT INTO tags (id, name, color) VALUES (?, ?, ?)',
    [id, name, color || '#00A3FF']
  );

  const tag = await dbGet('SELECT * FROM tags WHERE id = ?', [id]);
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  };
};

export const updateTag = async (id: string, payload: TagPayload) => {
  await dbRun(
    'UPDATE tags SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [payload.name, payload.color || '#00A3FF', id]
  );

  const tag = await dbGet('SELECT * FROM tags WHERE id = ?', [id]);
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  };
};

export const deleteTag = async (id: string) => {
  // Delete assignments first (CASCADE should handle this, but let's be explicit)
  await dbRun('DELETE FROM entity_tags WHERE tag_id = ?', [id]);
  
  // Delete tag
  await dbRun('DELETE FROM tags WHERE id = ?', [id]);
};

const validateAssignableEntity = async (entityType: string, entityId: string) => {
  switch (entityType) {
    case 'CUSTOMER':
      return dbGet('SELECT * FROM customers WHERE id = ?', [entityId]);
    case 'DEAL':
      return dbGet('SELECT * FROM deals WHERE id = ?', [entityId]);
    case 'COACHING_PROGRAM':
      return dbGet('SELECT * FROM coaching_programs WHERE id = ?', [entityId]);
    case 'CONTENT_ITEM':
      return dbGet('SELECT * FROM content_items WHERE id = ?', [entityId]);
    default:
      throw new Error('UNSUPPORTED_ENTITY_TYPE');
  }
};

export const assignTagsToEntity = async ({ entityType, entityId, tagIds }: AssignTagPayload) => {
  const existingEntity = await validateAssignableEntity(entityType, entityId);

  if (!existingEntity) {
    throw new Error('ENTITY_NOT_FOUND');
  }

  // Delete existing tags for this entity
  let deleteQuery = 'DELETE FROM entity_tags WHERE entity_type = ?';
  const deleteParams: any[] = [entityType];

  if (entityType === 'CUSTOMER') {
    deleteQuery += ' AND customer_id = ?';
    deleteParams.push(entityId);
  } else if (entityType === 'DEAL') {
    deleteQuery += ' AND deal_id = ?';
    deleteParams.push(entityId);
  } else if (entityType === 'COACHING_PROGRAM') {
    deleteQuery += ' AND program_id = ?';
    deleteParams.push(entityId);
  } else if (entityType === 'CONTENT_ITEM') {
    deleteQuery += ' AND content_id = ?';
    deleteParams.push(entityId);
  }

  await dbRun(deleteQuery, deleteParams);

  // Insert new tags
  for (const tagId of tagIds) {
    const assignmentId = `${entityType}_${entityId}_${tagId}_${Date.now()}`;
    const insertParams: any[] = [assignmentId, tagId, entityType];

    if (entityType === 'CUSTOMER') {
      await dbRun(
        'INSERT INTO entity_tags (id, tag_id, entity_type, customer_id) VALUES (?, ?, ?, ?)',
        [...insertParams, entityId]
      );
    } else if (entityType === 'DEAL') {
      await dbRun(
        'INSERT INTO entity_tags (id, tag_id, entity_type, deal_id) VALUES (?, ?, ?, ?)',
        [...insertParams, entityId]
      );
    } else if (entityType === 'COACHING_PROGRAM') {
      await dbRun(
        'INSERT INTO entity_tags (id, tag_id, entity_type, program_id) VALUES (?, ?, ?, ?)',
        [...insertParams, entityId]
      );
    } else if (entityType === 'CONTENT_ITEM') {
      await dbRun(
        'INSERT INTO entity_tags (id, tag_id, entity_type, content_id) VALUES (?, ?, ?, ?)',
        [...insertParams, entityId]
      );
    }
  }

  // Return assigned tags
  const tags = await dbAll(
    'SELECT * FROM tags WHERE id IN (' + tagIds.map(() => '?').join(',') + ')',
    tagIds
  );

  return tags.map((tag: any) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  }));
};

export const removeTagAssignment = async (assignmentId: string) => {
  await dbRun('DELETE FROM entity_tags WHERE id = ?', [assignmentId]);
};
