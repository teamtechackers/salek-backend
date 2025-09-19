import { getAllVaccines, getVaccinesByType, getVaccinesByAge } from '../../services/vaccines_service.js';
import { 
  addUserVaccine, 
  getUserVaccines, 
  getUserVaccinesByStatus, 
  updateUserVaccineStatus,
  addMultipleUserVaccines 
} from '../../services/user_vaccines_service.js';
import { getUserById } from '../../services/user_service.js';
import { encryptUserId, decryptUserId } from '../../services/encryption_service.js';
import { VACCINE_STATUS } from '../../models/user_vaccines_model.js';
import logger from '../../config/logger.js';

export const getVaccinesList = async (req, res) => {
  try {
    const { type, age } = req.query;
    let result;

    if (type) {
      result = await getVaccinesByType(type);
    } else if (age) {
      const ageMonths = parseInt(age);
      result = await getVaccinesByAge(ageMonths);
    } else {
      result = await getAllVaccines();
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccines list accessed by user: ${req.user.userId}`);

    return res.status(200).json({
      success: true,
      message: 'Vaccines list fetched successfully',
      data: {
        vaccines: result.vaccines,
        count: result.vaccines.length,
        encryptedUserId: encryptUserId(req.user.userId)
      }
    });

  } catch (error) {
    logger.error('Get vaccines list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


export const getSpecificUserVaccineRecords = async (req, res) => {
  try {
    const { user_id, status } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user_id is encrypted or plain
    let actualUserId;
    if (isNaN(user_id)) {
      // It's encrypted, decrypt it
      actualUserId = decryptUserId(user_id);
    } else {
      // It's plain number
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId || actualUserId === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate if user exists in database
    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not valid'
      });
    }

    let result;
    if (status) {
      const validStatuses = Object.values(VACCINE_STATUS);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
        });
      }
      result = await getUserVaccinesByStatus(actualUserId, status);
    } else {
      result = await getUserVaccines(actualUserId);
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Specific user vaccines fetched: User ${actualUserId}, Count: ${result.vaccines.length}`);

    return res.status(200).json({
      success: true,
      message: 'User vaccines fetched successfully',
      data: {
        userId: actualUserId,
        encryptedUserId: encryptUserId(actualUserId),
        user: {
          id: userExists.user.id,
          phoneNumber: userExists.user.phone_number,
          fullName: userExists.user.full_name,
          profileCompleted: userExists.user.profile_completed
        },
        vaccines: result.vaccines,
        count: result.vaccines.length
      }
    });

  } catch (error) {
    logger.error('Get specific user vaccines error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addSpecificUserVaccine = async (req, res) => {
  try {
    const { user_id, vaccine_id, status, given_date, notes } = req.body;

    if (!user_id || !vaccine_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Vaccine ID are required'
      });
    }

    // Check if user_id is encrypted or plain
    let actualUserId;
    if (isNaN(user_id)) {
      // It's encrypted, decrypt it
      actualUserId = decryptUserId(user_id);
    } else {
      // It's plain number
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId || actualUserId === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate if user exists in database
    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not valid'
      });
    }

    const validStatuses = Object.values(VACCINE_STATUS);
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
      });
    }

    const result = await addUserVaccine(
      actualUserId,
      vaccine_id,
      status || VACCINE_STATUS.COMPLETED,
      given_date,
      notes
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccine added for specific user: User ${actualUserId}, Vaccine ${vaccine_id}`);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        id: result.id,
        userId: actualUserId,
        encryptedUserId: encryptUserId(actualUserId),
        user: {
          id: userExists.user.id,
          phoneNumber: userExists.user.phone_number,
          fullName: userExists.user.full_name,
          profileCompleted: userExists.user.profile_completed
        }
      }
    });

  } catch (error) {
    logger.error('Add specific user vaccine error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateUserVaccineRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vaccine_id, status, given_date, notes } = req.body;

    if (!vaccine_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine ID and status are required'
      });
    }

    const validStatuses = Object.values(VACCINE_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
      });
    }

    const result = await updateUserVaccineStatus(userId, vaccine_id, status, given_date, notes);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`User vaccine updated: User ${userId}, Vaccine ${vaccine_id}`);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        encryptedUserId: encryptUserId(userId)
      }
    });

  } catch (error) {
    logger.error('Update user vaccine error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
