import { logoutUser } from '../../services/logout_service.js';
import { decryptUserId } from '../../services/encryption_service.js';
import { getUserById } from '../../services/user_service.js';
import logger from '../../config/logger.js';

export const logout = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId || actualUserId === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not valid'
      });
    }

    const result = await logoutUser(actualUserId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to logout user'
      });
    }

    logger.info(`User logged out successfully: ${actualUserId}`);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
