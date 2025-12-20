import dayjs from 'dayjs';
import jalaliday from 'jalaliday';
import { db, isMySQL, tableExists } from '../../database/db';
import { CustomerFilters, CustomerPayload } from './customer.types';

dayjs.extend(jalaliday);

const CUSTOMER_MODEL_MIN = 1;
const CUSTOMER_MODEL_MAX = 9;

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

const validateCustomerModel = (customerModel?: number | null) => {
  if (
    customerModel !== undefined &&
    customerModel !== null &&
    (customerModel < CUSTOMER_MODEL_MIN || customerModel > CUSTOMER_MODEL_MAX)
  ) {
    throw new Error(`customerModel must be between ${CUSTOMER_MODEL_MIN} and ${CUSTOMER_MODEL_MAX}`);
  }
};

export const listCustomers = async (filters: CustomerFilters) => {
  const { tagIds, customerModels, search, category, status, type, createdById, dateFrom, dateTo, journey_stage, coach_id } = filters;

  // Check if tags tables exist, if not, use simpler query
  let tagsTableExists = false;
  let entityTagsTableExists = false;
  try {
    tagsTableExists = await tableExists('tags');
    entityTagsTableExists = await tableExists('entity_tags');
  } catch (err) {
    console.warn('Could not check tags tables existence, using simpler query');
  }
  const useTags = tagsTableExists && entityTagsTableExists;

  // Use CONCAT for MySQL, || for SQLite
  const concatExpr = isMySQL 
    ? "CONCAT(t.id, ':', t.name, ':', t.color)"
    : "t.id || ':' || t.name || ':' || t.color";

  // Use SEPARATOR for MySQL GROUP_CONCAT
  const groupConcatExpr = isMySQL
    ? `GROUP_CONCAT(DISTINCT ${concatExpr} SEPARATOR ',')`
    : `GROUP_CONCAT(DISTINCT ${concatExpr})`;

  let query = useTags
    ? `
      SELECT DISTINCT c.*,
             ${groupConcatExpr} as tags_data
      FROM customers c
      LEFT JOIN entity_tags et ON et.customer_id = c.id
      LEFT JOIN tags t ON et.tag_id = t.id
      WHERE 1=1
    `
    : `
      SELECT c.*,
             NULL as tags_data
      FROM customers c
      WHERE 1=1
    `;
  const params: any[] = [];

  if (type) {
    query += ' AND c.type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }

  if (category) {
    query += ' AND LOWER(c.category) LIKE ?';
    params.push(`%${category.toLowerCase()}%`);
  }

  if (createdById) {
    query += ' AND c.created_by = ?';
    params.push(createdById);
  }

  if (dateFrom) {
    query += ' AND DATE(c.created_at) >= ?';
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ' AND DATE(c.created_at) <= ?';
    params.push(dateTo);
  }

  if (journey_stage) {
    query += ' AND c.journey_stage = ?';
    params.push(journey_stage);
  }

  if (coach_id) {
    query += ' AND c.coach_id = ?';
    params.push(coach_id);
  }

  if (search) {
    query += ' AND (LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(c.company_name) LIKE ?)';
    const searchTerm = `%${search.toLowerCase()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (customerModels && customerModels.length > 0) {
    query += ` AND c.customer_model IN (${customerModels.map(() => '?').join(',')})`;
    params.push(...customerModels);
  }

  if (useTags) {
    query += ' GROUP BY c.id';

    if (tagIds && tagIds.length > 0) {
      query += ' HAVING COUNT(CASE WHEN et.tag_id IN (' + tagIds.map(() => '?').join(',') + ') THEN 1 END) = ?';
      params.push(...tagIds, tagIds.length);
    }
  }

  query += ' ORDER BY c.created_at DESC';

  try {
    const customers = await dbAll(query, params);

    // Parse tags data
    return customers.map((customer: any) => {
      let tags = [];
      if (customer.tags_data && customer.tags_data !== null && customer.tags_data !== '') {
        try {
          const tagStrings = String(customer.tags_data).split(',');
          tags = tagStrings.map((tagStr: string) => {
            const trimmed = tagStr.trim();
            if (!trimmed) return null;
            const parts = trimmed.split(':');
            if (parts.length >= 3) {
              const [id, name, color] = parts;
              return { id: id.trim(), name: name.trim(), color: color.trim(), tag: { id: id.trim(), name: name.trim(), color: color.trim() } };
            }
            return null;
          }).filter(Boolean);
        } catch (err) {
          console.error('Error parsing tags_data:', err, 'tags_data:', customer.tags_data);
          tags = [];
        }
      }

      return {
        ...customer,
        tags,
      };
    });
  } catch (error: any) {
    console.error('Error in listCustomers:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    // If table doesn't exist, return empty array instead of throwing
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes("doesn't exist")) {
      console.warn('Customers or related tables do not exist yet, returning empty array');
      return [];
    }
    throw error;
  }
};

export const getCustomerById = async (id: string) => {
  const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);

  if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

  // Get tags (only if tables exist)
  let tags: any[] = [];
  try {
    const { tableExists } = await import('../../database/db');
    const tagsTableExists = await tableExists('tags').catch(() => false);
    const entityTagsTableExists = await tableExists('entity_tags').catch(() => false);
    
    if (tagsTableExists && entityTagsTableExists) {
      tags = await dbAll(
        `SELECT t.*, et.id as assignment_id
         FROM entity_tags et
         JOIN tags t ON et.tag_id = t.id
         WHERE et.customer_id = ? AND et.entity_type = 'CUSTOMER'`,
        [id]
      );
    }
  } catch (err) {
    console.warn('Could not fetch tags for customer, continuing without tags:', err);
  }

  // Get deals (only if table exists)
  let deals: any[] = [];
  try {
    const { tableExists } = await import('../../database/db');
    const dealsTableExists = await tableExists('deals').catch(() => false);
    if (dealsTableExists) {
      deals = await dbAll('SELECT * FROM deals WHERE customer_id = ?', [id]);
    }
  } catch (err) {
    console.warn('Could not fetch deals for customer, continuing without deals:', err);
  }

  // Get coaching programs (only if table exists)
  let programs: any[] = [];
  try {
    const { tableExists } = await import('../../database/db');
    const programsTableExists = await tableExists('coaching_programs').catch(() => false);
    if (programsTableExists) {
      programs = await dbAll('SELECT * FROM coaching_programs WHERE customer_id = ?', [id]);
    }
  } catch (err) {
    console.warn('Could not fetch coaching programs for customer, continuing without programs:', err);
  }

  // Get calendar events (only if table exists)
  let events: any[] = [];
  try {
    const { tableExists } = await import('../../database/db');
    const eventsTableExists = await tableExists('calendar_events').catch(() => false);
    if (eventsTableExists) {
      events = await dbAll('SELECT * FROM calendar_events WHERE customer_id = ?', [id]);
    }
  } catch (err) {
    console.warn('Could not fetch calendar events for customer, continuing without events:', err);
  }

  return {
    ...customer,
    tags: tags.map((tag: any) => ({
      ...tag,
      tag: { id: tag.id, name: tag.name, color: tag.color },
    })),
    deals,
    coachingPrograms: programs,
    calendarEvents: events,
  };
};

export const createCustomer = async (payload: CustomerPayload, createdById?: string) => {
  validateCustomerModel(payload.customerModel ?? null);

  const { tagIds = [], ...data } = payload;

  const result = await dbRun(
    `INSERT INTO customers (name, type, email, phone, company_name, address, website, score, status, category, notes, customer_model, gender, site_languages_count, service_type, delivery_deadline, site_costs, initial_delivery_date, languages_added_date, code, designer, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.type,
      data.email || null,
      data.phone || null,
      data.companyName || null,
      data.address || null,
      data.website || null,
      data.score || 0,
      data.status || 'active',
      data.category || null,
      data.notes || null,
      data.customerModel || null,
      (data as any).gender || null,
      (data as any).site_languages_count || null,
      (data as any).service_type || null,
      (data as any).delivery_deadline || null,
      (data as any).site_costs || null,
      (data as any).initial_delivery_date || null,
      (data as any).languages_added_date || null,
      (data as any).code || null,
      (data as any).designer || null,
      createdById || null,
    ]
  );

  const customerId = result.lastID;

  // Assign tags
  if (tagIds.length > 0 && customerId) {
    for (const tagId of tagIds) {
      await dbRun(
        `INSERT INTO entity_tags (id, tag_id, entity_type, customer_id)
         VALUES (?, ?, 'CUSTOMER', ?)`,
        [`${customerId}_${tagId}`, tagId, customerId]
      );
    }
  }

  return getCustomerById(customerId!.toString());
};

export const updateCustomer = async (id: string, payload: CustomerPayload) => {
  validateCustomerModel(payload.customerModel ?? null);

  const { tagIds, ...data } = payload;

  const existing = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
  if (!existing) throw new Error('CUSTOMER_NOT_FOUND');

  await dbRun(
    `UPDATE customers 
     SET name = ?, type = ?, email = ?, phone = ?, company_name = ?, address = ?, website = ?, 
         score = ?, status = ?, category = ?, notes = ?, customer_model = ?,
         gender = ?, site_languages_count = ?, service_type = ?, delivery_deadline = ?,
         site_costs = ?, initial_delivery_date = ?, languages_added_date = ?,
         code = ?, designer = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.name,
      data.type,
      data.email || null,
      data.phone || null,
      data.companyName || null,
      data.address || null,
      data.website || null,
      data.score ?? existing.score,
      data.status ?? existing.status,
      data.category || null,
      data.notes || null,
      data.customerModel || null,
      (data as any).gender ?? (existing.gender || null),
      (data as any).site_languages_count ?? (existing.site_languages_count || null),
      (data as any).service_type ?? (existing.service_type || null),
      (data as any).delivery_deadline ?? (existing.delivery_deadline || null),
      (data as any).site_costs ?? (existing.site_costs || null),
      (data as any).initial_delivery_date ?? (existing.initial_delivery_date || null),
      (data as any).languages_added_date ?? (existing.languages_added_date || null),
      (data as any).code ?? (existing.code || null),
      (data as any).designer ?? (existing.designer || null),
      id,
    ]
  );

  // Update tags if provided
  if (tagIds !== undefined) {
    // Delete existing tags
    await dbRun('DELETE FROM entity_tags WHERE customer_id = ? AND entity_type = "CUSTOMER"', [id]);

    // Add new tags
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await dbRun(
          `INSERT INTO entity_tags (id, tag_id, entity_type, customer_id)
           VALUES (?, ?, 'CUSTOMER', ?)`,
          [`${id}_${tagId}`, tagId, id]
        );
      }
    }
  }

  return getCustomerById(id);
};

export const deleteCustomer = async (id: string) => {
  // Get customer info to find related accounts
  const customer = await dbGet('SELECT name, company_name FROM customers WHERE id = ?', [id]);
  
  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  // Find related accounts by name or company_name
  const accountName = customer.company_name || customer.name;
  const accounts = await dbAll('SELECT id FROM accounts WHERE name = ?', [accountName]);
  const accountIds = accounts ? accounts.map((a: any) => a.id) : [];

  // Delete related data in cascade order
  if (accountIds.length > 0) {
    const accountPlaceholders = accountIds.map(() => '?').join(',');
    
    // Get invoice IDs first
    const invoices = await dbAll(`SELECT id FROM invoices WHERE account_id IN (${accountPlaceholders})`, accountIds);
    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((inv: any) => inv.id);
      const invoicePlaceholders = invoiceIds.map(() => '?').join(',');
      
      // Delete invoice items
      await dbRun(`DELETE FROM invoice_items WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
      // Delete payments
      await dbRun(`DELETE FROM payments WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
    }

    // Delete invoices
    await dbRun(`DELETE FROM invoices WHERE account_id IN (${accountPlaceholders})`, accountIds);
    
    // Delete estimates
    await dbRun(`DELETE FROM estimates WHERE account_id IN (${accountPlaceholders})`, accountIds);
    
    // Delete proposals
    await dbRun(`DELETE FROM proposals WHERE account_id IN (${accountPlaceholders})`, accountIds);
    
    // Delete contracts
    await dbRun(`DELETE FROM contracts WHERE account_id IN (${accountPlaceholders})`, accountIds);
    
    // Delete deals
    await dbRun(`DELETE FROM deals WHERE account_id IN (${accountPlaceholders})`, accountIds);
    
    // Delete projects (and related data)
    const projects = await dbAll(`SELECT id FROM projects WHERE account_id IN (${accountPlaceholders})`, accountIds);
    if (projects && projects.length > 0) {
      const projectIds = projects.map((p: any) => p.id);
      const projectPlaceholders = projectIds.map(() => '?').join(',');
      
      // Delete project discussions
      await dbRun(`DELETE FROM project_discussions WHERE project_id IN (${projectPlaceholders})`, projectIds);
    }
    
    await dbRun(`DELETE FROM projects WHERE account_id IN (${accountPlaceholders})`, accountIds);
    
    // Delete accounts
    await dbRun(`DELETE FROM accounts WHERE id IN (${accountPlaceholders})`, accountIds);
  }

  // Delete interactions
  await dbRun('DELETE FROM interactions WHERE customer_id = ?', [id]);

  // Delete leads that might be related (by name or company)
  const leadNameExpr = isMySQL 
    ? 'CONCAT(first_name, " ", last_name)'
    : 'first_name || " " || last_name';
  await dbRun(`DELETE FROM leads WHERE ${leadNameExpr} = ? OR company_name = ?`, 
    [customer.name, accountName]);

  // Delete tags
  await dbRun('DELETE FROM entity_tags WHERE customer_id = ? AND entity_type = "CUSTOMER"', [id]);

  // Delete customer
  await dbRun('DELETE FROM customers WHERE id = ?', [id]);
};

export const bulkDeleteCustomers = async (ids: string[]): Promise<number> => {
  if (!ids || ids.length === 0) {
    throw new Error('لیست شناسه‌ها الزامی است');
  }

  // Get all customers to find related accounts
  const placeholders = ids.map(() => '?').join(',');
  const customers = await dbAll(`SELECT id, name, company_name FROM customers WHERE id IN (${placeholders})`, ids);

  if (!customers || customers.length === 0) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }

  // Collect all account names
  const accountNames: string[] = [];
  customers.forEach((customer: any) => {
    const accountName = customer.company_name || customer.name;
    if (accountName && !accountNames.includes(accountName)) {
      accountNames.push(accountName);
    }
  });

  if (accountNames.length > 0) {
    const accountPlaceholders = accountNames.map(() => '?').join(',');
    const accounts = await dbAll(`SELECT id FROM accounts WHERE name IN (${accountPlaceholders})`, accountNames);

    if (accounts && accounts.length > 0) {
      const accountIds = accounts.map((a: any) => a.id);
      const accountIdsPlaceholders = accountIds.map(() => '?').join(',');

      // Delete related data
      // Get invoice IDs first
      const invoices = await dbAll(`SELECT id FROM invoices WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((inv: any) => inv.id);
        const invoicePlaceholders = invoiceIds.map(() => '?').join(',');
        
        // Delete invoice items
        await dbRun(`DELETE FROM invoice_items WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
        // Delete payments
        await dbRun(`DELETE FROM payments WHERE invoice_id IN (${invoicePlaceholders})`, invoiceIds);
      }

      // Delete invoices
      await dbRun(`DELETE FROM invoices WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      
      // Delete estimates
      await dbRun(`DELETE FROM estimates WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      
      // Delete proposals
      await dbRun(`DELETE FROM proposals WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      
      // Delete contracts
      await dbRun(`DELETE FROM contracts WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      
      // Delete deals
      await dbRun(`DELETE FROM deals WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      
      // Delete projects
      const projects = await dbAll(`SELECT id FROM projects WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p: any) => p.id);
        const projectPlaceholders = projectIds.map(() => '?').join(',');
        
        // Delete project discussions
        await dbRun(`DELETE FROM project_discussions WHERE project_id IN (${projectPlaceholders})`, projectIds);
      }
      
      await dbRun(`DELETE FROM projects WHERE account_id IN (${accountIdsPlaceholders})`, accountIds);
      
      // Delete accounts
      await dbRun(`DELETE FROM accounts WHERE id IN (${accountIdsPlaceholders})`, accountIds);
    }
  }

  // Delete interactions
  await dbRun(`DELETE FROM interactions WHERE customer_id IN (${placeholders})`, ids);

  // Delete related leads
  const leadNameExpr = isMySQL 
    ? 'CONCAT(first_name, " ", last_name)'
    : 'first_name || " " || last_name';
  for (const customer of customers) {
    const accountName = customer.company_name || customer.name;
    await dbRun(`DELETE FROM leads WHERE ${leadNameExpr} = ? OR company_name = ?`, 
      [customer.name, accountName]);
  }

  // Delete tags
  await dbRun(`DELETE FROM entity_tags WHERE customer_id IN (${placeholders}) AND entity_type = "CUSTOMER"`, ids);

  // Finally, delete customers
  const result = await dbRun(`DELETE FROM customers WHERE id IN (${placeholders})`, ids);
  
  return result.changes || 0;
};

export const updateCustomerScore = async (id: string, score: number) => {
  await dbRun('UPDATE customers SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [score, id]);
  return dbGet('SELECT * FROM customers WHERE id = ?', [id]);
};

export const getCustomerSegments = async () => {
  const segments = await dbAll(
    `SELECT customer_model as model, COUNT(*) as count
     FROM customers
     WHERE customer_model IS NOT NULL
     GROUP BY customer_model`,
    []
  );

  return {
    breakdown: segments,
    updatedAt: dayjs().calendar('jalali').format('YYYY-MM-DD'),
  };
};
