import { query } from '../config/database.js';
import { COUNTRIES_TABLE, COUNTRIES_FIELDS, COUNTRIES_DATA } from '../models/countries_model.js';
import logger from '../config/logger.js';

export const seedCountriesData = async () => {
  try {
    const checkSql = `SELECT COUNT(*) as count FROM ${COUNTRIES_TABLE}`;
    const existingCountries = await query(checkSql);

    if (existingCountries[0].count > 0) {
      logger.info('Countries already seeded, skipping...');
      return { success: true };
    }

    for (const country of COUNTRIES_DATA) {
      const sql = `
        INSERT INTO ${COUNTRIES_TABLE} (
          ${COUNTRIES_FIELDS.COUNTRY_ID},
          ${COUNTRIES_FIELDS.COUNTRY_NAME},
          ${COUNTRIES_FIELDS.COUNTRY_CODE}
        ) VALUES (?, ?, ?)
      `;

      await query(sql, [
        country.country_id,
        country.country_name,
        country.country_code
      ]);
    }

    logger.info(`${COUNTRIES_DATA.length} countries seeded successfully`);
    return { success: true };
  } catch (error) {
    logger.error('Seed countries error:', error);
    return { success: false, error: error.message };
  }
};

export const getAllCountries = async () => {
  try {
    const sql = `SELECT * FROM ${COUNTRIES_TABLE} WHERE ${COUNTRIES_FIELDS.IS_ACTIVE} = true ORDER BY ${COUNTRIES_FIELDS.COUNTRY_NAME}`;
    const countries = await query(sql);
    return { success: true, countries };
  } catch (error) {
    logger.error('Error getting countries:', error);
    return { success: false, error: error.message };
  }
};

export const getCountryById = async (countryId) => {
  try {
    const sql = `SELECT * FROM ${COUNTRIES_TABLE} WHERE ${COUNTRIES_FIELDS.COUNTRY_ID} = ? AND ${COUNTRIES_FIELDS.IS_ACTIVE} = true`;
    const result = await query(sql, [countryId]);
    if (result.length === 0) {
      return { success: false, error: 'Country not found' };
    }
    return { success: true, country: result[0] };
  } catch (error) {
    logger.error('Error getting country by ID:', error);
    return { success: false, error: error.message };
  }
};
