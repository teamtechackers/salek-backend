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
      pregnancy_detail,
      years_ahead
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

    const yearsAhead = parseInt(years_ahead) || 2; // Default 2 years
    const result = await updateUserProfile(actualUserId, profileData, yearsAhead);

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

export const updateProfileBasic = async (req, res) => {
  try {
    const {
      user_id,
      full_name,
      gender,
      country,
      address,
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

    // Build update query with allowed fields only (excluding DOB and phone_number)
    const updateFields = [];
    const params = [];

    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      params.push(full_name);
    }
    if (gender !== undefined) {
      updateFields.push('gender = ?');
      params.push(gender);
    }
    if (country !== undefined) {
      updateFields.push('country = ?');
      params.push(country);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      params.push(address);
    }
    // contact_no is excluded (cannot be edited)
    if (material_status !== undefined) {
      updateFields.push('material_status = ?');
      params.push(material_status);
    }
    if (do_you_have_children !== undefined) {
      updateFields.push('do_you_have_children = ?');
      params.push(do_you_have_children ? 1 : 0);
    }
    if (how_many_children !== undefined) {
      updateFields.push('how_many_children = ?');
      params.push(how_many_children);
    }
    if (are_you_pregnant !== undefined) {
      updateFields.push('are_you_pregnant = ?');
      params.push(are_you_pregnant ? 1 : 0);
    }
    if (pregnancy_detail !== undefined) {
      updateFields.push('pregnancy_detail = ?');
      params.push(pregnancy_detail);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add updated_at and user_id
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(actualUserId);

    // Import query function
    const { query } = await import('../../config/database.js');
    
    const updateSql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await query(updateSql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no changes made'
      });
    }

    logger.info(`User updated basic profile: ${actualUserId}`);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        updated_fields: updateFields.filter(field => !field.includes('updated_at'))
      }
    });

  } catch (error) {
    logger.error('Basic profile update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
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
