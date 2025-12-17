import { db } from '../database/db';
import { Request } from 'express';
import { generatePersianDescription, getPersianActionLabel, getPersianEntityLabel } from './activityLoggerPersian';

export interface ActivityLogData {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  entityTitle?: string;
}

/**
 * Log activity to database with automatic Persian description generation
 */
export const logActivity = (data: ActivityLogData): Promise<void> => {
  return new Promise((resolve, reject) => {
    const {
      userId,
      action,
      entityType,
      entityId,
      description,
      ipAddress,
      userAgent,
      metadata,
      entityTitle
    } = data;

    // Generate Persian description if not provided
    let persianDescription = description;
    if (!persianDescription) {
      const additionalInfo: any = {};
      if (metadata) {
        if (metadata.status) additionalInfo.status = metadata.status;
        if (metadata.amount) additionalInfo.amount = metadata.amount;
        if (metadata.assignedTo || metadata.assigned_user_id) {
          additionalInfo.assignedTo = metadata.assignedTo || metadata.assigned_user_id;
        }
        if (metadata.priority) additionalInfo.priority = metadata.priority;
      }
      persianDescription = generatePersianDescription(action, entityType, entityTitle, Object.keys(additionalInfo).length > 0 ? additionalInfo : undefined);
    }

    db.run(
      `INSERT INTO activity_log (
        user_id, action, entity_type, entity_id, description,
        ip_address, user_agent, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId || null,
        persianDescription || null,
        ipAddress || null,
        userAgent || null,
        metadata ? JSON.stringify(metadata) : null
      ],
      (err) => {
        if (err) {
          console.error('Error logging activity:', err);
          // Don't reject - logging should not break the main flow
          resolve();
        } else {
          resolve();
        }
      }
    );
  });
};

/**
 * Get client info from request
 */
export const getClientInfo = (req: Request): { ipAddress?: string; userAgent?: string } => {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined
  };
};

/**
 * Middleware helper to log activity
 */
export const createActivityLogger = (
  action: string,
  entityType: string,
  getEntityId?: (req: any) => number | undefined,
  getDescription?: (req: any, result?: any) => string
) => {
  return async (req: any, res: any, next?: any) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      // Log after response is ready
      const clientInfo = getClientInfo(req);
      const entityId = getEntityId ? getEntityId(req) : undefined;
      const description = getDescription ? getDescription(req, data) : undefined;
      
      if (req.user?.id) {
        logActivity({
          userId: req.user.id,
          action,
          entityType,
          entityId,
          description,
          ...clientInfo
        }).catch(() => {
          // Silent fail
        });
      }
      
      return originalJson(data);
    };
    
    if (next) {
      next();
    }
  };
};

