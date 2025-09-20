import { updateUserProfile, getUserProfile } from '../../services/user_service.js';
import { encryptUserId, decryptUserId } from '../../services/encryption_service.js';
import { PROFILE_MESSAGES, GENDER_OPTIONS, MATERIAL_STATUS_OPTIONS } from '../../config/constants.js';
import logger from '../../config/logger.js';

export const updateProfile = async (req, res) => {
  try {
    const {
      user_id,
      fullName,
      dob,
      gender,
      country,
      address,
      contactNo,
      materialStatus,
      doYouHaveChildren,
      howManyChildren,
      areYouPregnant,
      pregnancyDetail
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
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

    if (gender && !GENDER_OPTIONS.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: PROFILE_MESSAGES.INVALID_DATA
      });
    }

    if (materialStatus && !MATERIAL_STATUS_OPTIONS.includes(materialStatus)) {
      return res.status(400).json({
        success: false,
        message: PROFILE_MESSAGES.INVALID_DATA
      });
    }

    const profileData = {
      fullName,
      dob,
      gender,
      country,
      address,
      contactNo,
      materialStatus,
      doYouHaveChildren: doYouHaveChildren ? 1 : 0,
      howManyChildren,
      areYouPregnant: areYouPregnant ? 1 : 0,
      pregnancyDetail
    };

    const result = await updateUserProfile(actualUserId, profileData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Profile updated for user: ${actualUserId}`);

    return res.status(200).json({
      success: true,
      message: PROFILE_MESSAGES.PROFILE_UPDATED,
      data: {
        encryptedUserId: encryptUserId(actualUserId)
      }
    });

  } catch (error) {
    logger.error('Profile update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
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

    const result = await getUserProfile(actualUserId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: PROFILE_MESSAGES.PROFILE_NOT_FOUND
      });
    }

    const user = result.user;
    user.id = encryptUserId(user.id);

    return res.status(200).json({
      success: true,
      message: PROFILE_MESSAGES.PROFILE_FETCH_SUCCESS,
      data: {
        ...user,
        encryptedUserId: encryptUserId(actualUserId)
      }
    });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
