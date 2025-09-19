import { getUserProfile } from '../../services/user_service.js';
import { encryptUserId } from '../../services/encryption_service.js';
import { DASHBOARD_MESSAGES } from '../../config/constants.js';
import logger from '../../config/logger.js';

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await getUserProfile(userId);

    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.user;

    const dashboardData = {
      user: {
        id: encryptUserId(user.id),
        fullName: user.full_name,
        phoneNumber: user.phone_number,
        profileCompleted: user.profile_completed
      },
      stats: {
        profileCompletion: user.profile_completed ? 100 : 0,
        joinedDate: user.created_at
      },
      quickActions: [
        {
          title: 'Update Profile',
          description: 'Complete your profile information',
          action: 'profile_update',
          completed: user.profile_completed
        }
      ]
    };

    logger.info(`Dashboard accessed by user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: DASHBOARD_MESSAGES.DATA_FETCH_SUCCESS,
      data: {
        ...dashboardData,
        encryptedUserId: encryptUserId(userId)
      }
    });

  } catch (error) {
    logger.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
