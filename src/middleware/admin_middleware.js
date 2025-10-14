import logger from '../config/logger.js';

// Super admin guard using env var ADMIN_USER_ID or ADMIN_PHONE
export const requireSuperAdmin = (req, res, next) => {
  try {
    const adminUserIdEnv = process.env.ADMIN_USER_ID && parseInt(process.env.ADMIN_USER_ID, 10);
    const adminPhoneEnv = process.env.ADMIN_PHONE;

    const userFromToken = req.user; // set by authenticateToken

    const isById = adminUserIdEnv && userFromToken && userFromToken.userId === adminUserIdEnv;
    const isByPhone = adminPhoneEnv && userFromToken && userFromToken.phoneNumber === adminPhoneEnv;

    if (!isById && !isByPhone) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    return next();
  } catch (error) {
    logger.error('requireSuperAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


