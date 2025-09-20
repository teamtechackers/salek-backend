import { query } from '../config/database.js';
import { CITIES_TABLE, CITIES_FIELDS, CITIES_DATA } from '../models/cities_model.js';
import logger from '../config/logger.js';

export const seedCitiesData = async () => {
  try {
    const checkSql = `SELECT COUNT(*) as count FROM ${CITIES_TABLE}`;
    const existingCities = await query(checkSql);

    if (existingCities[0].count > 0) {
      logger.info('Cities already seeded, skipping...');
      return { success: true };
    }

    for (const city of CITIES_DATA) {
      const sql = `
        INSERT INTO ${CITIES_TABLE} (
          ${CITIES_FIELDS.CITY_ID},
          ${CITIES_FIELDS.CITY_NAME},
          ${CITIES_FIELDS.COUNTRY_ID}
        ) VALUES (?, ?, ?)
      `;

      await query(sql, [
        city.city_id,
        city.city_name,
        city.country_id
      ]);
    }

    logger.info(`${CITIES_DATA.length} cities seeded successfully`);
    return { success: true };
  } catch (error) {
    logger.error('Seed cities error:', error);
    return { success: false, error: error.message };
  }
};

export const getAllCities = async () => {
  try {
    const sql = `
      SELECT 
        c.${CITIES_FIELDS.CITY_ID},
        c.${CITIES_FIELDS.CITY_NAME},
        c.${CITIES_FIELDS.COUNTRY_ID},
        co.country_name
      FROM ${CITIES_TABLE} c
      JOIN countries co ON c.${CITIES_FIELDS.COUNTRY_ID} = co.country_id
      WHERE c.${CITIES_FIELDS.IS_ACTIVE} = true
      ORDER BY co.country_name, c.${CITIES_FIELDS.CITY_NAME}
    `;
    const cities = await query(sql);
    return { success: true, cities };
  } catch (error) {
    logger.error('Error getting cities:', error);
    return { success: false, error: error.message };
  }
};

export const getCitiesByCountry = async (countryId) => {
  try {
    const sql = `
      SELECT * FROM ${CITIES_TABLE} 
      WHERE ${CITIES_FIELDS.COUNTRY_ID} = ? AND ${CITIES_FIELDS.IS_ACTIVE} = true 
      ORDER BY ${CITIES_FIELDS.CITY_NAME}
    `;
    const cities = await query(sql, [countryId]);
    return { success: true, cities };
  } catch (error) {
    logger.error('Error getting cities by country:', error);
    return { success: false, error: error.message };
  }
};

export const getCityById = async (cityId) => {
  try {
    const sql = `
      SELECT 
        c.*,
        co.country_name
      FROM ${CITIES_TABLE} c
      JOIN countries co ON c.${CITIES_FIELDS.COUNTRY_ID} = co.country_id
      WHERE c.${CITIES_FIELDS.CITY_ID} = ? AND c.${CITIES_FIELDS.IS_ACTIVE} = true
    `;
    const result = await query(sql, [cityId]);
    if (result.length === 0) {
      return { success: false, error: 'City not found' };
    }
    return { success: true, city: result[0] };
  } catch (error) {
    logger.error('Error getting city by ID:', error);
    return { success: false, error: error.message };
  }
};
