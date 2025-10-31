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
          email: result.permissions.email,
          upcoming_vaccine: result.permissions.upcoming_vaccine,
          missing_due_alert: result.permissions.missing_due_alert,
          complete_vaccine: result.permissions.complete_vaccine
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
    const { user_id, notification, calendar, email, upcoming_vaccine, missing_due_alert, complete_vaccine } = req.body;

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

    // Build permissions object - only include fields that are provided
    const permissionsData = {};
    
    if (notification !== undefined) {
      permissionsData.notification = notification === true || notification === 'true' || notification === 1;
    }
    if (calendar !== undefined) {
      permissionsData.calendar = calendar === true || calendar === 'true' || calendar === 1;
    }
    if (email !== undefined) {
      permissionsData.email = email === true || email === 'true' || email === 1;
    }
    if (upcoming_vaccine !== undefined) {
      permissionsData.upcoming_vaccine = upcoming_vaccine === true || upcoming_vaccine === 'true' || upcoming_vaccine === 1;
    }
    if (missing_due_alert !== undefined) {
      permissionsData.missing_due_alert = missing_due_alert === true || missing_due_alert === 'true' || missing_due_alert === 1;
    }
    if (complete_vaccine !== undefined) {
      permissionsData.complete_vaccine = complete_vaccine === true || complete_vaccine === 'true' || complete_vaccine === 1;
    }

    if (Object.keys(permissionsData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one permission field is required'
      });
    }

    const result = await updateNotificationPermissions(actualUserId, permissionsData);

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
          email: result.permissions.email,
          upcoming_vaccine: result.permissions.upcoming_vaccine,
          missing_due_alert: result.permissions.missing_due_alert,
          complete_vaccine: result.permissions.complete_vaccine
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
