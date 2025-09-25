import { updateUserProfile, getUserProfile } from '../../services/user_service.js';
import { encryptUserId, decryptUserId } from '../../services/encryption_service.js';
import { PROFILE_MESSAGES, GENDER_OPTIONS, MATERIAL_STATUS_OPTIONS } from '../../config/constants.js';
import logger from '../../config/logger.js';

export const updateProfile = async (req, res) => {
  try {
    const {
      user_id,
      full_name,
      dob,
      gender,
      country,
      address,
      contact_no,
      material_status,
      do_you_have_children,
      how_many_children,
      are_you_pregnant,
      pregnancy_detail
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

    if (material_status && !MATERIAL_STATUS_OPTIONS.includes(material_status)) {
      return res.status(400).json({
        success: false,
        message: PROFILE_MESSAGES.INVALID_DATA
      });
    }

    const profileData = {
      fullName: full_name,
      dob,
      gender,
      country,
      address,
      contactNo: contact_no,
      materialStatus: material_status,
      doYouHaveChildren: do_you_have_children ? 1 : 0,
      howManyChildren: how_many_children,
      areYouPregnant: are_you_pregnant ? 1 : 0,
      pregnancyDetail: pregnancy_detail
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
