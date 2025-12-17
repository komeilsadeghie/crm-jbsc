import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type UserRoleKey = 'admin' | 'sales' | 'sales_manager' | 'coach' | 'media' | 'media_manager' | 'finance' | 'user' | 'designer';

interface TokenPayload {
  id: string;
  username: string;
  role: UserRoleKey;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
  contact?: any; // Contact object for client portal
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'دسترسی غیرمجاز - توکن ارائه نشده است' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'توکن نامعتبر است' });
  }
};

export const authorize = (...roles: UserRoleKey[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'دسترسی غیرمجاز' });
    }

    if (req.user.role !== 'admin' && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'شما دسترسی به این بخش را ندارید' });
    }

    next();
  };
};

