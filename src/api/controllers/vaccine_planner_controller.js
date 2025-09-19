import { generateUserVaccinePlanner, getUserVaccinePlanner, updatePlannerStatus, updatePlannerReminder } from '../../services/vaccine_planner_service.js';
import { getUserById } from '../../services/user_service.js';
import { encryptUserId, decryptUserId } from '../../services/encryption_service.js';
import { PLANNER_STATUS } from '../../models/vaccine_planner_model.js';
import logger from '../../config/logger.js';

export const getVaccinePlanner = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user_id is encrypted or plain
    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate user exists
    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const result = await getUserVaccinePlanner(actualUserId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccine planner fetched for user: ${actualUserId}, Count: ${result.planner.length}`);

    return res.status(200).json({
      success: true,
      message: 'Vaccine planner fetched successfully',
      data: result.planner
    });

  } catch (error) {
    logger.error('Get vaccine planner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const generatePlanner = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user_id is encrypted or plain
    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate user exists
    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const generateResult = await generateUserVaccinePlanner(actualUserId);

    if (!generateResult.success) {
      return res.status(500).json({
        success: false,
        message: generateResult.error
      });
    }

    // Get the generated planner
    const plannerResult = await getUserVaccinePlanner(actualUserId);

    logger.info(`Vaccine planner generated for user: ${actualUserId}, Count: ${generateResult.plannedCount}`);

    return res.status(201).json({
      success: true,
      message: 'Vaccine planner generated successfully',
      data: {
        plannedCount: generateResult.plannedCount,
        encryptedUserId: encryptUserId(actualUserId),
        planner: plannerResult.success ? plannerResult.planner : []
      }
    });

  } catch (error) {
    logger.error('Generate vaccine planner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updatePlannerRecord = async (req, res) => {
  try {
    const { planner_id, status, completed_date, given_at, notes } = req.body;

    if (!planner_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Planner ID and status are required'
      });
    }

    const validStatuses = Object.values(PLANNER_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
      });
    }

    const result = await updatePlannerStatus(planner_id, status, completed_date, given_at, notes);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Planner status updated: Planner ${planner_id}, Status: ${status}`);

    return res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('Update planner record error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateReminder = async (req, res) => {
  try {
    const { user_id, planner_id, is_reminder, title, message, date, time } = req.body;

    if (!user_id || !planner_id || is_reminder === undefined) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Planner ID and is_reminder are required'
      });
    }

    // Decrypt user ID if needed
    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const reminderData = {
      is_reminder,
      title,
      message,
      date,
      time
    };

    const result = await updatePlannerReminder(actualUserId, planner_id, reminderData);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Reminder updated: User ${actualUserId}, Planner ${planner_id}, Reminder: ${is_reminder}`);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        is_reminder,
        title: title || null,
        message: message || null,
        date: date || null,
        time: time || '09:00'
      }
    });

  } catch (error) {
    logger.error('Update reminder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
