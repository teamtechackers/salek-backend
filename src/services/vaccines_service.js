import { query } from '../config/database.js';
import { VACCINES_TABLE, VACCINES_FIELDS, VACCINES_DATA } from '../models/vaccines_model.js';
import logger from '../config/logger.js';

export const getAllVaccines = async () => {
  try {
    const sql = `
      SELECT * FROM ${VACCINES_TABLE} 
      WHERE ${VACCINES_FIELDS.IS_ACTIVE} = true 
      ORDER BY ${VACCINES_FIELDS.MIN_AGE_MONTHS}, ${VACCINES_FIELDS.NAME}
    `;
    const result = await query(sql);
    
    return {
      success: true,
      vaccines: result
    };
  } catch (error) {
    logger.error('Get vaccines error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getVaccinesByType = async (type) => {
  try {
    const sql = `
      SELECT * FROM ${VACCINES_TABLE} 
      WHERE ${VACCINES_FIELDS.TYPE} = ? AND ${VACCINES_FIELDS.IS_ACTIVE} = true 
      ORDER BY ${VACCINES_FIELDS.MIN_AGE_MONTHS}
    `;
    const result = await query(sql, [type]);
    
    return {
      success: true,
      vaccines: result
    };
  } catch (error) {
    logger.error('Get vaccines by type error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getVaccinesByAge = async (ageMonths) => {
  try {
    const sql = `
      SELECT * FROM ${VACCINES_TABLE} 
      WHERE ${VACCINES_FIELDS.MIN_AGE_MONTHS} <= ? 
      AND (${VACCINES_FIELDS.MAX_AGE_MONTHS} IS NULL OR ${VACCINES_FIELDS.MAX_AGE_MONTHS} >= ?)
      AND ${VACCINES_FIELDS.IS_ACTIVE} = true 
      ORDER BY ${VACCINES_FIELDS.TYPE}, ${VACCINES_FIELDS.MIN_AGE_MONTHS}
    `;
    const result = await query(sql, [ageMonths, ageMonths]);
    
    return {
      success: true,
      vaccines: result
    };
  } catch (error) {
    logger.error('Get vaccines by age error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const seedVaccinesData = async () => {
  try {
    const existingVaccines = await query(`SELECT COUNT(*) as count FROM ${VACCINES_TABLE}`);
    
    if (existingVaccines[0].count > 0) {
      logger.info('Vaccines already seeded, skipping...');
      return { success: true };
    }

    for (const vaccine of VACCINES_DATA) {
      const sql = `
        INSERT INTO ${VACCINES_TABLE} (
          ${VACCINES_FIELDS.VACCINE_ID},
          ${VACCINES_FIELDS.NAME},
          ${VACCINES_FIELDS.TYPE},
          ${VACCINES_FIELDS.CATEGORY},
          ${VACCINES_FIELDS.SUB_CATEGORY},
          ${VACCINES_FIELDS.MIN_AGE_MONTHS},
          ${VACCINES_FIELDS.MAX_AGE_MONTHS},
          ${VACCINES_FIELDS.TOTAL_DOSES},
          ${VACCINES_FIELDS.FREQUENCY},
          ${VACCINES_FIELDS.WHEN_TO_GIVE},
          ${VACCINES_FIELDS.DOSE},
          ${VACCINES_FIELDS.ROUTE},
          ${VACCINES_FIELDS.SITE},
          ${VACCINES_FIELDS.NOTES}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        vaccine.vaccine_id,
        vaccine.name,
        vaccine.type,
        vaccine.category,
        vaccine.sub_category,
        vaccine.min_age_months,
        vaccine.max_age_months,
        vaccine.total_doses,
        vaccine.frequency,
        vaccine.when_to_give || null,
        vaccine.dose || null,
        vaccine.route || null,
        vaccine.site || null,
        vaccine.notes || null
      ];

      await query(sql, params);
    }

    logger.info(`${VACCINES_DATA.length} vaccines seeded successfully`);
    return { success: true };
  } catch (error) {
    logger.error('Seed vaccines error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
