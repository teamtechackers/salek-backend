import { query } from '../config/database.js';
import { USER_TABLE, USER_FIELDS } from '../models/user_model.js';
import { BASE_URL } from '../config/constants.js';
import logger from '../config/logger.js';

export const createUser = async (phoneNumber) => {
  try {
    const sql = `
      INSERT INTO ${USER_TABLE} (${USER_FIELDS.PHONE_NUMBER})
      VALUES (?)
    `;
    const result = await query(sql, [phoneNumber]);

    const newUserId = result.insertId;

    // Auto-generate user vaccines based on age and schedule
    try {
      const { generateUserVaccines } = await import('./user_vaccines_service.js');
      await generateUserVaccines(newUserId);
      logger.info(`User vaccines auto-generated for new user: ${newUserId}`);
    } catch (vaccineError) {
      logger.warn(`Failed to generate vaccines for user ${newUserId}:`, vaccineError.message);
    }

    return {
      success: true,
      userId: newUserId
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // Check by phone number
      const existingUser = await getUserByPhoneNumber(phoneNumber, true);
      if (existingUser.success) {
        return {
          success: true,
          userId: existingUser.user.id,
          user: existingUser.user,
          isExisting: true
        };
      }
    }
    logger.error('Create user error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};


export const getUserByPhoneNumber = async (phoneNumber, includeInactive = false) => {
  try {
    const sql = `
      SELECT * FROM ${USER_TABLE} 
      WHERE ${USER_FIELDS.PHONE_NUMBER} = ?${includeInactive ? '' : ` AND ${USER_FIELDS.IS_ACTIVE} = true`}
    `;
    const result = await query(sql, [phoneNumber]);

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

export const getUserById = async (userId, includeInactive = false) => {
  try {
    const sql = `
      SELECT * FROM ${USER_TABLE} 
      WHERE ${USER_FIELDS.ID} = ?${includeInactive ? '' : ` AND ${USER_FIELDS.IS_ACTIVE} = true`}
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
      SET ${USER_FIELDS.IS_ACTIVE} = TRUE,
          ${USER_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP 
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

export const updateUserProfile = async (userId, profileData, yearsAhead = 2) => {
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
      pregnancyDetail,
      countryId,
      stateId,
      cityId,
      image
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
        ${USER_FIELDS.COUNTRY_ID} = ?,
        ${USER_FIELDS.STATE_ID} = ?,
        ${USER_FIELDS.CITY_ID} = ?,
        ${USER_FIELDS.IMAGE} = ?,
        ${USER_FIELDS.PROFILE_COMPLETED} = TRUE,
        ${USER_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${USER_FIELDS.ID} = ?
    `;

    const params = [
      fullName !== undefined ? fullName : null,
      dob !== undefined ? dob : null,
      gender !== undefined ? gender : null,
      country !== undefined ? country : null,
      address !== undefined ? address : null,
      contactNo !== undefined ? contactNo : null,
      materialStatus !== undefined ? materialStatus : null,
      doYouHaveChildren !== undefined ? doYouHaveChildren : 0,
      howManyChildren !== undefined ? howManyChildren : 0,
      areYouPregnant !== undefined ? areYouPregnant : 0,
      pregnancyDetail !== undefined ? pregnancyDetail : null,
      countryId !== undefined ? countryId : null,
      stateId !== undefined ? stateId : null,
      cityId !== undefined ? cityId : null,
      image !== undefined ? image : null,
      userId
    ];

    const result = await query(sql, params);

    // If DOB is provided, auto-generate user vaccines
    if (dob) {
      try {
        const { generateUserVaccines } = await import('./user_vaccines_service.js');
        await generateUserVaccines(userId, null, yearsAhead);
        logger.info(`User vaccines auto-generated after profile update for user: ${userId}`);
      } catch (vaccineError) {
        logger.warn(`Failed to generate vaccines for user ${userId}:`, vaccineError.message);
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
        DATE_FORMAT(${USER_FIELDS.DOB}, '%Y-%m-%d') as ${USER_FIELDS.DOB},
        ${USER_FIELDS.GENDER},
        ${USER_FIELDS.COUNTRY},
        ${USER_FIELDS.ADDRESS},
        ${USER_FIELDS.CONTACT_NO},
        ${USER_FIELDS.MATERIAL_STATUS},
        ${USER_FIELDS.DO_YOU_HAVE_CHILDREN},
        ${USER_FIELDS.HOW_MANY_CHILDREN},
        ${USER_FIELDS.ARE_YOU_PREGNANT},
        ${USER_FIELDS.PREGNANCY_DETAIL},
        ${USER_FIELDS.COUNTRY_ID},
        ${USER_FIELDS.STATE_ID},
        ${USER_FIELDS.CITY_ID},
        ${USER_FIELDS.PROFILE_COMPLETED},
        ${USER_FIELDS.IMAGE},
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

    const user = result[0];

    // Add complete image URL if image exists
    if (user.image) {
      user.image = `${BASE_URL}${user.image}`;
    }

    return {
      success: true,
      user: user
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
