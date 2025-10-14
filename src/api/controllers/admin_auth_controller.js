import dotenv from 'dotenv';
import { generateToken } from '../../services/jwt_service.js';
import { encryptUserId } from '../../services/encryption_service.js';
import logger from '../../config/logger.js';

dotenv.config();

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const ADMIN_USER_ID = process.env.ADMIN_USER_ID ? parseInt(process.env.ADMIN_USER_ID, 10) : 1;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(500).json({ success: false, message: 'Admin credentials not configured' });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required' });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT compatible with existing middleware
    const token = generateToken({ userId: ADMIN_USER_ID, phoneNumber: `admin:${username}` });

    logger.info(`Admin logged in: ${username}`);

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        userId: encryptUserId(ADMIN_USER_ID),
        token,
        username
      }
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


