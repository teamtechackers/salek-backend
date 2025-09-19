import { query } from '../config/database.js';
import { USER_TABLE, USER_FIELDS } from '../models/user_model.js';
import logger from '../config/logger.js';

export const createUser = async (firebaseUid, phoneNumber) => {
  try {
    const sql = `
      INSERT INTO ${USER_TABLE} (${USER_FIELDS.FIREBASE_UID}, ${USER_FIELDS.PHONE_NUMBER})
      VALUES (?, ?)
    `;
    const result = await query(sql, [firebaseUid, phoneNumber]);
    
    const newUserId = result.insertId;
    
    // Auto-generate vaccine planner for new user
    try {
      const { generateUserVaccinePlanner } = await import('./vaccine_planner_service.js');
      await generateUserVaccinePlanner(newUserId);
      logger.info(`Vaccine planner auto-generated for new user: ${newUserId}`);
    } catch (plannerError) {
      logger.warn(`Failed to generate planner for user ${newUserId}:`, plannerError.message);
    }
    
    return {
      success: true,
      userId: newUserId
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const existingUser = await getUserByFirebaseUid(firebaseUid);
      if (existingUser.success) {
        return {
          success: true,
          userId: existingUser.user.id,
          user: existingUser.user,
          isExisting: true
        };
      }
    }
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserByFirebaseUid = async (firebaseUid) => {
  try {
    const sql = `
      SELECT * FROM ${USER_TABLE} 
      WHERE ${USER_FIELDS.FIREBASE_UID} = ? AND ${USER_FIELDS.IS_ACTIVE} = true
    `;
    const result = await query(sql, [firebaseUid]);
    
    if (result.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      user: result[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserById = async (userId) => {
  try {
    const sql = `
      SELECT * FROM ${USER_TABLE} 
      WHERE ${USER_FIELDS.ID} = ? AND ${USER_FIELDS.IS_ACTIVE} = true
    `;
    const result = await query(sql, [userId]);
    
    if (result.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      user: result[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateUserLastLogin = async (userId) => {
  try {
    const sql = `
      UPDATE ${USER_TABLE} 
      SET ${USER_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP 
      WHERE ${USER_FIELDS.ID} = ?
    `;
    await query(sql, [userId]);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    const {
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
    } = profileData;

    const sql = `
      UPDATE ${USER_TABLE}
      SET
        ${USER_FIELDS.FULL_NAME} = ?,
        ${USER_FIELDS.DOB} = ?,
        ${USER_FIELDS.GENDER} = ?,
        ${USER_FIELDS.COUNTRY} = ?,
        ${USER_FIELDS.ADDRESS} = ?,
        ${USER_FIELDS.CONTACT_NO} = ?,
        ${USER_FIELDS.MATERIAL_STATUS} = ?,
        ${USER_FIELDS.DO_YOU_HAVE_CHILDREN} = ?,
        ${USER_FIELDS.HOW_MANY_CHILDREN} = ?,
        ${USER_FIELDS.ARE_YOU_PREGNANT} = ?,
        ${USER_FIELDS.PREGNANCY_DETAIL} = ?,
        ${USER_FIELDS.PROFILE_COMPLETED} = TRUE,
        ${USER_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${USER_FIELDS.ID} = ?
    `;

    const params = [
      fullName || null,
      dob || null,
      gender || null,
      country || null,
      address || null,
      contactNo || null,
      materialStatus || null,
      doYouHaveChildren || 0,
      howManyChildren || 0,
      areYouPregnant || 0,
      pregnancyDetail || null,
      userId
    ];

    await query(sql, params);

    // If DOB is provided, auto-generate vaccine planner
    if (dob) {
      try {
        const { generateUserVaccinePlanner } = await import('./vaccine_planner_service.js');
        await generateUserVaccinePlanner(userId);
        logger.info(`Vaccine planner auto-generated after profile update for user: ${userId}`);
      } catch (plannerError) {
        logger.warn(`Failed to generate planner for user ${userId}:`, plannerError.message);
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const sql = `
      SELECT 
        ${USER_FIELDS.ID},
        ${USER_FIELDS.PHONE_NUMBER},
        ${USER_FIELDS.FULL_NAME},
        ${USER_FIELDS.DOB},
        ${USER_FIELDS.GENDER},
        ${USER_FIELDS.COUNTRY},
        ${USER_FIELDS.ADDRESS},
        ${USER_FIELDS.CONTACT_NO},
        ${USER_FIELDS.MATERIAL_STATUS},
        ${USER_FIELDS.DO_YOU_HAVE_CHILDREN},
        ${USER_FIELDS.HOW_MANY_CHILDREN},
        ${USER_FIELDS.ARE_YOU_PREGNANT},
        ${USER_FIELDS.PREGNANCY_DETAIL},
        ${USER_FIELDS.PROFILE_COMPLETED},
        ${USER_FIELDS.CREATED_AT}
      FROM ${USER_TABLE} 
      WHERE ${USER_FIELDS.ID} = ? AND ${USER_FIELDS.IS_ACTIVE} = true
    `;
    
    const result = await query(sql, [userId]);
    
    if (result.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      user: result[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
