import { query } from '../config/database.js';
import { NOTIFICATION_PERMISSIONS_TABLE, NOTIFICATION_PERMISSIONS_FIELDS } from '../models/notification_permissions_model.js';
import logger from '../config/logger.js';

export const createNotificationPermissions = async (userId) => {
  try {
    const sql = `
      INSERT INTO ${NOTIFICATION_PERMISSIONS_TABLE} (${NOTIFICATION_PERMISSIONS_FIELDS.USER_ID})
      VALUES (?)
    `;
    const result = await query(sql, [userId]);
    
    return {
      success: true,
      id: result.insertId
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return {
        success: true,
        message: 'Notification permissions already exist for this user'
      };
    }
    return {
      success: false,
      error: error.message
    };
  }
};

export const getNotificationPermissions = async (userId) => {
  try {
    const sql = `
      SELECT * FROM ${NOTIFICATION_PERMISSIONS_TABLE}
      WHERE ${NOTIFICATION_PERMISSIONS_FIELDS.USER_ID} = ?
    `;
    const result = await query(sql, [userId]);
    
    if (result.length === 0) {
      // Create default permissions if not exist
      const createResult = await createNotificationPermissions(userId);
      if (createResult.success) {
        const newResult = await query(sql, [userId]);
        return {
          success: true,
          permissions: newResult[0]
        };
      }
    }
    
    return {
      success: true,
      permissions: result[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateNotificationPermissions = async (userId, notification, calendar, email) => {
  try {
    // Check if permissions exist
    const existingPermissions = await getNotificationPermissions(userId);
    
    if (!existingPermissions.success) {
      return {
        success: false,
        error: 'Failed to get existing permissions'
      };
    }
    
    const sql = `
      UPDATE ${NOTIFICATION_PERMISSIONS_TABLE}
      SET 
        ${NOTIFICATION_PERMISSIONS_FIELDS.NOTIFICATION} = ?,
        ${NOTIFICATION_PERMISSIONS_FIELDS.CALENDAR} = ?,
        ${NOTIFICATION_PERMISSIONS_FIELDS.EMAIL} = ?,
        ${NOTIFICATION_PERMISSIONS_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${NOTIFICATION_PERMISSIONS_FIELDS.USER_ID} = ?
    `;
    
    const result = await query(sql, [notification, calendar, email, userId]);
    
    if (result.affectedRows === 0) {
      return {
        success: false,
        error: 'No permissions found for this user'
      };
    }
    
    // Get updated permissions
    const updatedPermissions = await getNotificationPermissions(userId);
    
    return {
      success: true,
      message: 'Notification permissions updated successfully',
      permissions: updatedPermissions.permissions
    };
  } catch (error) {
    logger.error('Update notification permissions error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const deleteNotificationPermissions = async (userId) => {
  try {
    const sql = `
      DELETE FROM ${NOTIFICATION_PERMISSIONS_TABLE}
      WHERE ${NOTIFICATION_PERMISSIONS_FIELDS.USER_ID} = ?
    `;
    
    const result = await query(sql, [userId]);
    
    return {
      success: true,
      message: 'Notification permissions deleted successfully'
    };
  } catch (error) {
    logger.error('Delete notification permissions error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fast check: return 1 if any of the three permissions is enabled, else 0
export const hasAnyNotificationPermission = async (userId) => {
  try {
    const sql = `
      SELECT (
        CASE WHEN 
          COALESCE(${NOTIFICATION_PERMISSIONS_FIELDS.NOTIFICATION}, 0) +
          COALESCE(${NOTIFICATION_PERMISSIONS_FIELDS.CALENDAR}, 0) +
          COALESCE(${NOTIFICATION_PERMISSIONS_FIELDS.EMAIL}, 0)
        > 0 THEN 1 ELSE 0 END
      ) AS any_enabled
      FROM ${NOTIFICATION_PERMISSIONS_TABLE}
      WHERE ${NOTIFICATION_PERMISSIONS_FIELDS.USER_ID} = ?
      LIMIT 1
    `;
    const result = await query(sql, [userId]);
    if (result.length === 0) {
      return { success: true, anyEnabled: 0 };
    }
    const anyEnabled = Number(result[0].any_enabled) === 1 ? 1 : 0;
    return { success: true, anyEnabled };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
