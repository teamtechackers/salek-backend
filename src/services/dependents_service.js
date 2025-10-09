import { query } from '../config/database.js';
import { DEPENDENTS_TABLE, DEPENDENTS_FIELDS, DEPENDENTS_MESSAGES } from '../models/dependents_model.js';
import logger from '../config/logger.js';

// Add a new dependent
export const addDependent = async (dependentData) => {
  try {
    const sql = `
      INSERT INTO ${DEPENDENTS_TABLE} (
        ${DEPENDENTS_FIELDS.USER_ID},
        ${DEPENDENTS_FIELDS.RELATION_ID},
        ${DEPENDENTS_FIELDS.PHONE_NUMBER},
        ${DEPENDENTS_FIELDS.FULL_NAME},
        ${DEPENDENTS_FIELDS.DOB},
        ${DEPENDENTS_FIELDS.GENDER},
        ${DEPENDENTS_FIELDS.COUNTRY},
        ${DEPENDENTS_FIELDS.ADDRESS},
        ${DEPENDENTS_FIELDS.CONTACT_NO},
        ${DEPENDENTS_FIELDS.MATERIAL_STATUS},
        ${DEPENDENTS_FIELDS.DO_YOU_HAVE_CHILDREN},
        ${DEPENDENTS_FIELDS.HOW_MANY_CHILDREN},
        ${DEPENDENTS_FIELDS.ARE_YOU_PREGNANT},
        ${DEPENDENTS_FIELDS.PREGNANCY_DETAIL},
        ${DEPENDENTS_FIELDS.PROFILE_COMPLETED}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      dependentData.userId,
      dependentData.relationId || null,
      dependentData.phoneNumber || null,
      dependentData.fullName || null,
      dependentData.dob || null,
      dependentData.gender || null,
      dependentData.country || null,
      dependentData.address || null,
      dependentData.contactNo || null,
      dependentData.materialStatus || null,
      dependentData.doYouHaveChildren !== undefined ? dependentData.doYouHaveChildren : 0,
      dependentData.howManyChildren !== undefined ? dependentData.howManyChildren : 0,
      dependentData.areYouPregnant !== undefined ? dependentData.areYouPregnant : 0,
      dependentData.pregnancyDetail || null,
      dependentData.profileCompleted !== undefined ? dependentData.profileCompleted : 0
    ];

    const result = await query(sql, params);
    logger.info(`Dependent added successfully: ID ${result.insertId}, User ID: ${dependentData.userId}`);
    
    return {
      success: true,
      dependentId: result.insertId,
      message: DEPENDENTS_MESSAGES.DEPENDENT_ADDED
    };
  } catch (error) {
    logger.error('Add dependent error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all dependents for a user
export const getDependentsByUserId = async (userId) => {
  try {
    const sql = `
      SELECT 
        d.*,
        r.relation_type
      FROM ${DEPENDENTS_TABLE} d
      LEFT JOIN relationships r ON d.${DEPENDENTS_FIELDS.RELATION_ID} = r.id
      WHERE d.${DEPENDENTS_FIELDS.USER_ID} = ? 
      AND d.${DEPENDENTS_FIELDS.IS_ACTIVE} = 1
      ORDER BY d.${DEPENDENTS_FIELDS.CREATED_AT} DESC
    `;
    
    const result = await query(sql, [userId]);
    logger.info(`Fetched ${result.length} dependents for user: ${userId}`);
    
    return {
      success: true,
      dependents: result
    };
  } catch (error) {
    logger.error('Get dependents error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get a specific dependent by ID
export const getDependentById = async (dependentId) => {
  try {
    const sql = `
      SELECT 
        d.*,
        r.relation_type
      FROM ${DEPENDENTS_TABLE} d
      LEFT JOIN relationships r ON d.${DEPENDENTS_FIELDS.RELATION_ID} = r.id
      WHERE d.${DEPENDENTS_FIELDS.DEPENDENT_ID} = ? 
      AND d.${DEPENDENTS_FIELDS.IS_ACTIVE} = 1
    `;
    
    const result = await query(sql, [dependentId]);
    
    if (result.length === 0) {
      return {
        success: false,
        error: DEPENDENTS_MESSAGES.DEPENDENT_NOT_FOUND
      };
    }
    
    return {
      success: true,
      dependent: result[0]
    };
  } catch (error) {
    logger.error('Get dependent by ID error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update dependent profile
export const updateDependentProfile = async (dependentId, profileData) => {
  try {
    const updateFields = [];
    const params = [];
    
    // Build dynamic update query
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(profileData[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return {
        success: false,
        error: 'No fields to update'
      };
    }
    
    params.push(dependentId);
    
    const sql = `
      UPDATE ${DEPENDENTS_TABLE} 
      SET ${updateFields.join(', ')}, ${DEPENDENTS_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${DEPENDENTS_FIELDS.DEPENDENT_ID} = ? AND ${DEPENDENTS_FIELDS.IS_ACTIVE} = 1
    `;
    
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      return {
        success: false,
        error: DEPENDENTS_MESSAGES.DEPENDENT_NOT_FOUND
      };
    }
    
    logger.info(`Dependent profile updated: ID ${dependentId}`);
    
    return {
      success: true,
      message: DEPENDENTS_MESSAGES.DEPENDENT_UPDATED
    };
  } catch (error) {
    logger.error('Update dependent profile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete dependent (soft delete)
export const deleteDependent = async (dependentId) => {
  try {
    const sql = `
      UPDATE ${DEPENDENTS_TABLE} 
      SET ${DEPENDENTS_FIELDS.IS_ACTIVE} = 0, ${DEPENDENTS_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${DEPENDENTS_FIELDS.DEPENDENT_ID} = ? AND ${DEPENDENTS_FIELDS.IS_ACTIVE} = 1
    `;
    
    const result = await query(sql, [dependentId]);
    
    if (result.affectedRows === 0) {
      return {
        success: false,
        error: DEPENDENTS_MESSAGES.DEPENDENT_NOT_FOUND
      };
    }
    
    logger.info(`Dependent deleted: ID ${dependentId}`);
    
    return {
      success: true,
      message: DEPENDENTS_MESSAGES.DEPENDENT_DELETED
    };
  } catch (error) {
    logger.error('Delete dependent error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
