import { getUserById } from '../../services/user_service.js';
import { encryptUserId, decryptUserId } from '../../services/encryption_service.js';
import logger from '../../config/logger.js';

export const getDashboardData = async (req, res) => {
  try {
    const { user_id } = req.query;

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

    const userResult = await getUserById(actualUserId);

    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.user;

    logger.info(`Dashboard data fetched for user: ${actualUserId}`);

    return res.status(200).json({
      success: true,
      message: 'Dashboard data fetched successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        name: user.full_name || 'Not provided',
        address: user.address || 'Not provided'
      }
    });

  } catch (error) {
    logger.error('Get dashboard data error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};