import { 
  getNotificationPermissions, 
  updateNotificationPermissions 
} from '../../services/notification_permissions_service.js';
import { getUserById } from '../../services/user_service.js';
import { encryptUserId, decryptUserId } from '../../services/encryption_service.js';
import logger from '../../config/logger.js';

export const getNotificationPermissionsAPI = async (req, res) => {
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

    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const result = await getNotificationPermissions(actualUserId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch notification permissions'
      });
    }

    logger.info(`Notification permissions fetched for user: ${actualUserId}`);

    return res.status(200).json({
      success: true,
      message: 'Notification permissions fetched successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        permissions: {
          notification: result.permissions.notification,
          calendar: result.permissions.calendar,
          email: result.permissions.email
        }
      }
    });

  } catch (error) {
    logger.error('Get notification permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateNotificationPermissionsAPI = async (req, res) => {
  try {
    const { user_id, notification, calendar, email } = req.body;

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
        message: 'User not found'
      });
    }

    // Validate boolean values
    const notificationBool = notification === true || notification === 'true' || notification === 1;
    const calendarBool = calendar === true || calendar === 'true' || calendar === 1;
    const emailBool = email === true || email === 'true' || email === 1;

    const result = await updateNotificationPermissions(
      actualUserId, 
      notificationBool, 
      calendarBool, 
      emailBool
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to update notification permissions'
      });
    }

    logger.info(`Notification permissions updated for user: ${actualUserId}`);

    return res.status(200).json({
      success: true,
      message: 'Notification permissions updated successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        permissions: {
          notification: result.permissions.notification,
          calendar: result.permissions.calendar,
          email: result.permissions.email
        }
      }
    });

  } catch (error) {
    logger.error('Update notification permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
