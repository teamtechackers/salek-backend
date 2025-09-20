import { query } from '../config/database.js';
import { VACCINE_SCHEDULE_TABLE, VACCINE_SCHEDULE_FIELDS, VACCINE_SCHEDULE_DATA } from '../models/vaccine_schedule_model.js';
import logger from '../config/logger.js';

export const seedVaccineScheduleData = async () => {
  try {
    const checkSql = `SELECT COUNT(*) as count FROM ${VACCINE_SCHEDULE_TABLE}`;
    const existingSchedules = await query(checkSql);

    if (existingSchedules[0].count > 0) {
      logger.info('Vaccine schedules already seeded, skipping...');
      return { success: true };
    }

    for (const schedule of VACCINE_SCHEDULE_DATA) {
      const sql = `
        INSERT INTO ${VACCINE_SCHEDULE_TABLE} (
          ${VACCINE_SCHEDULE_FIELDS.SCHEDULE_ID},
          ${VACCINE_SCHEDULE_FIELDS.VACCINE_ID},
          ${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS},
          ${VACCINE_SCHEDULE_FIELDS.MAX_AGE_DAYS},
          ${VACCINE_SCHEDULE_FIELDS.INTERVAL_DAYS},
          ${VACCINE_SCHEDULE_FIELDS.IS_MANDATORY},
          ${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID},
          ${VACCINE_SCHEDULE_FIELDS.NOTES}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await query(sql, [
        schedule.schedule_id,
        schedule.vaccine_id,
        schedule.min_age_days,
        schedule.max_age_days,
        schedule.interval_days,
        schedule.is_mandatory,
        schedule.country_id,
        schedule.notes
      ]);
    }

    logger.info(`${VACCINE_SCHEDULE_DATA.length} vaccine schedules seeded successfully`);
    return { success: true };
  } catch (error) {
    logger.error('Seed vaccine schedule error:', error);
    return { success: false, error: error.message };
  }
};

export const getVaccineScheduleByAge = async (ageDays, countryId = 1) => {
  try {
    const sql = `
      SELECT 
        vs.*,
        v.name as vaccine_name,
        v.type as vaccine_type,
        c.country_name
      FROM ${VACCINE_SCHEDULE_TABLE} vs
      JOIN vaccines v ON vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID} = v.vaccine_id
      JOIN countries c ON vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = c.country_id
      WHERE vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS} <= ?
      AND (vs.${VACCINE_SCHEDULE_FIELDS.MAX_AGE_DAYS} IS NULL OR vs.${VACCINE_SCHEDULE_FIELDS.MAX_AGE_DAYS} >= ?)
      AND (vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = ? OR vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = 1)
      AND vs.${VACCINE_SCHEDULE_FIELDS.IS_ACTIVE} = true
      ORDER BY vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS}, vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID}
    `;
    
    const schedules = await query(sql, [ageDays, ageDays, countryId]);
    return { success: true, schedules };
  } catch (error) {
    logger.error('Error getting vaccine schedule by age:', error);
    return { success: false, error: error.message };
  }
};

export const getVaccineScheduleForDateRange = async (birthDate, countryId = 1) => {
  try {
    const today = new Date();
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    
    const birthDateTime = new Date(birthDate).getTime();
    const todayTime = today.getTime();
    const twoYearsTime = twoYearsFromNow.getTime();
    
    const currentAgeDays = Math.floor((todayTime - birthDateTime) / (1000 * 60 * 60 * 24));
    const maxAgeDays = Math.floor((twoYearsTime - birthDateTime) / (1000 * 60 * 60 * 24));
    
    const sql = `
      SELECT 
        vs.*,
        v.name as vaccine_name,
        v.type as vaccine_type,
        v.dose,
        v.route,
        v.site,
        c.country_name
      FROM ${VACCINE_SCHEDULE_TABLE} vs
      JOIN vaccines v ON vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID} = v.vaccine_id
      JOIN countries c ON vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = c.country_id
      WHERE vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS} <= ?
      AND (vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = ? OR vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = 1)
      AND vs.${VACCINE_SCHEDULE_FIELDS.IS_ACTIVE} = true
      ORDER BY vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS}, vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID}
    `;
    
    const schedules = await query(sql, [maxAgeDays, countryId]);
    return { 
      success: true, 
      schedules,
      currentAgeDays,
      maxAgeDays,
      birthDate,
      dateRange: {
        from: birthDate,
        to: twoYearsFromNow.toISOString().split('T')[0]
      }
    };
  } catch (error) {
    logger.error('Error getting vaccine schedule for date range:', error);
    return { success: false, error: error.message };
  }
};
