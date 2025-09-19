import { query } from '../config/database.js';
import { USER_VACCINES_TABLE, USER_VACCINES_FIELDS, VACCINE_STATUS } from '../models/user_vaccines_model.js';
import { VACCINES_TABLE, VACCINES_FIELDS } from '../models/vaccines_model.js';
import { USER_TABLE, USER_FIELDS } from '../models/user_model.js';
import logger from '../config/logger.js';

export const addUserVaccine = async (userId, vaccineId, status = VACCINE_STATUS.COMPLETED, givenDate = null, notes = null) => {
  try {
    // First check if vaccine already exists for this user
    const checkSql = `
      SELECT ${USER_VACCINES_FIELDS.ID}, ${USER_VACCINES_FIELDS.STATUS} 
      FROM ${USER_VACCINES_TABLE} 
      WHERE ${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND ${USER_VACCINES_FIELDS.VACCINE_ID} = ? 
      AND ${USER_VACCINES_FIELDS.IS_ACTIVE} = true
    `;
    
    const existingRecord = await query(checkSql, [userId, vaccineId]);
    
    if (existingRecord.length > 0) {
      return {
        success: false,
        error: 'Vaccine already exists for this user',
        isExisting: true,
        existingStatus: existingRecord[0].status
      };
    }

    const sql = `
      INSERT INTO ${USER_VACCINES_TABLE} (
        ${USER_VACCINES_FIELDS.USER_ID},
        ${USER_VACCINES_FIELDS.VACCINE_ID},
        ${USER_VACCINES_FIELDS.STATUS},
        ${USER_VACCINES_FIELDS.GIVEN_DATE},
        ${USER_VACCINES_FIELDS.NOTES}
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const finalGivenDate = givenDate || new Date().toISOString().split('T')[0];
    
    const result = await query(sql, [userId, vaccineId, status, finalGivenDate, notes]);
    
    return {
      success: true,
      id: result.insertId,
      message: 'User vaccine record added successfully'
    };
  } catch (error) {
    logger.error('Add user vaccine error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserVaccines = async (userId) => {
  try {
    const sql = `
      SELECT 
        uv.${USER_VACCINES_FIELDS.ID},
        uv.${USER_VACCINES_FIELDS.USER_ID},
        uv.${USER_VACCINES_FIELDS.VACCINE_ID},
        uv.${USER_VACCINES_FIELDS.STATUS},
        uv.${USER_VACCINES_FIELDS.GIVEN_DATE},
        uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE},
        uv.${USER_VACCINES_FIELDS.NOTES},
        uv.${USER_VACCINES_FIELDS.CREATED_AT},
        v.${VACCINES_FIELDS.NAME} as vaccine_name,
        v.${VACCINES_FIELDS.TYPE} as vaccine_type,
        v.${VACCINES_FIELDS.MIN_AGE_MONTHS},
        v.${VACCINES_FIELDS.MAX_AGE_MONTHS},
        v.${VACCINES_FIELDS.TOTAL_DOSES},
        v.${VACCINES_FIELDS.FREQUENCY}
      FROM ${USER_VACCINES_TABLE} uv
      JOIN ${VACCINES_TABLE} v ON uv.${USER_VACCINES_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      WHERE uv.${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND uv.${USER_VACCINES_FIELDS.IS_ACTIVE} = true
      ORDER BY uv.${USER_VACCINES_FIELDS.GIVEN_DATE} DESC, v.${VACCINES_FIELDS.MIN_AGE_MONTHS}
    `;
    
    const result = await query(sql, [userId]);
    
    return {
      success: true,
      vaccines: result
    };
  } catch (error) {
    logger.error('Get user vaccines error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserVaccinesByStatus = async (userId, status) => {
  try {
    const sql = `
      SELECT 
        uv.${USER_VACCINES_FIELDS.ID},
        uv.${USER_VACCINES_FIELDS.USER_ID},
        uv.${USER_VACCINES_FIELDS.VACCINE_ID},
        uv.${USER_VACCINES_FIELDS.STATUS},
        uv.${USER_VACCINES_FIELDS.GIVEN_DATE},
        uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE},
        uv.${USER_VACCINES_FIELDS.NOTES},
        v.${VACCINES_FIELDS.NAME} as vaccine_name,
        v.${VACCINES_FIELDS.TYPE} as vaccine_type
      FROM ${USER_VACCINES_TABLE} uv
      JOIN ${VACCINES_TABLE} v ON uv.${USER_VACCINES_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      WHERE uv.${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND uv.${USER_VACCINES_FIELDS.STATUS} = ?
      AND uv.${USER_VACCINES_FIELDS.IS_ACTIVE} = true
      ORDER BY uv.${USER_VACCINES_FIELDS.GIVEN_DATE} DESC
    `;
    
    const result = await query(sql, [userId, status]);
    
    return {
      success: true,
      vaccines: result
    };
  } catch (error) {
    logger.error('Get user vaccines by status error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateUserVaccineStatus = async (userId, vaccineId, status, givenDate = null, notes = null) => {
  try {
    const sql = `
      UPDATE ${USER_VACCINES_TABLE}
      SET 
        ${USER_VACCINES_FIELDS.STATUS} = ?,
        ${USER_VACCINES_FIELDS.GIVEN_DATE} = COALESCE(?, ${USER_VACCINES_FIELDS.GIVEN_DATE}),
        ${USER_VACCINES_FIELDS.NOTES} = COALESCE(?, ${USER_VACCINES_FIELDS.NOTES}),
        ${USER_VACCINES_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND ${USER_VACCINES_FIELDS.VACCINE_ID} = ?
      AND ${USER_VACCINES_FIELDS.IS_ACTIVE} = true
    `;
    
    const result = await query(sql, [status, givenDate, notes, userId, vaccineId]);
    
    if (result.affectedRows === 0) {
      return {
        success: false,
        error: 'User vaccine record not found'
      };
    }
    
    return {
      success: true,
      message: 'User vaccine status updated successfully'
    };
  } catch (error) {
    logger.error('Update user vaccine status error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const deleteUserVaccine = async (userId, vaccineId) => {
  try {
    const sql = `
      UPDATE ${USER_VACCINES_TABLE}
      SET ${USER_VACCINES_FIELDS.IS_ACTIVE} = false,
          ${USER_VACCINES_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND ${USER_VACCINES_FIELDS.VACCINE_ID} = ?
    `;
    
    const result = await query(sql, [userId, vaccineId]);
    
    if (result.affectedRows === 0) {
      return {
        success: false,
        error: 'User vaccine record not found'
      };
    }
    
    return {
      success: true,
      message: 'User vaccine record deleted successfully'
    };
  } catch (error) {
    logger.error('Delete user vaccine error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const addMultipleUserVaccines = async (userId, vaccines) => {
  try {
    const results = [];
    
    for (const vaccine of vaccines) {
      const result = await addUserVaccine(
        userId,
        vaccine.vaccine_id,
        vaccine.status || VACCINE_STATUS.COMPLETED,
        vaccine.given_date || null,
        vaccine.notes || null
      );
      results.push(result);
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return {
      success: failCount === 0,
      message: `${successCount} vaccines added successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results: results
    };
  } catch (error) {
    logger.error('Add multiple user vaccines error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
