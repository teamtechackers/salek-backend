import { verifyToken } from '../services/jwt_service.js';
import { encryptUserId, decryptUserId } from '../services/encryption_service.js';
import { AUTH_MESSAGES } from '../config/constants.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: AUTH_MESSAGES.TOKEN_REQUIRED
    });
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: AUTH_MESSAGES.INVALID_TOKEN
    });
  }

  req.user = decoded;
  next();
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
};
