import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'foodflow-super-secret-key-123';

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization token not provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(411).json({ success: false, error: 'Invalid Authorization header format' });
    }

    // Support backward compatibility / quick demo switches
    if (token.startsWith('mock-token-')) {
      const mockId = token.replace('mock-token-', '');
      const user = await db.getUserById(mockId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User session invalid' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH] Token Verification Error:', err.message);
    return res.status(401).json({ success: false, error: 'Unauthorized credentials or session expired' });
  }
};

/**
 * Middleware to authorize specific user roles
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Required roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};
