import { query } from '../config/database.js';
import logger from '../config/logger.js';

export const logoutUser = async (userId) => {
  try {
    // Update last logout time
    const sql = `
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await query(sql, [userId]);
    
    logger.info(`User logged out successfully: ${userId}`);
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    logger.error('Logout error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
