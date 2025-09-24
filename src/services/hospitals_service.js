import { query } from '../config/database.js';
import logger from '../config/logger.js';

const HOSPITALS_TABLE = 'hospitals';
const CITIES_TABLE = 'cities';

export const HOSPITALS_FIELDS = {
  HOSPITAL_ID: 'hospital_id',
  NAME: 'name',
  CITY_ID: 'city_id',
  ADDRESS: 'address',
  PHONE: 'phone',
  EMAIL: 'email',
  IS_ACTIVE: 'is_active'
};

export const getAllHospitalsByCity = async (cityId) => {
  try {
    const sql = `
      SELECT 
        h.${HOSPITALS_FIELDS.HOSPITAL_ID},
        h.${HOSPITALS_FIELDS.NAME},
        h.${HOSPITALS_FIELDS.CITY_ID},
        h.${HOSPITALS_FIELDS.ADDRESS},
        h.${HOSPITALS_FIELDS.PHONE},
        h.${HOSPITALS_FIELDS.EMAIL}
      FROM ${HOSPITALS_TABLE} h
      WHERE h.${HOSPITALS_FIELDS.CITY_ID} = ? AND h.${HOSPITALS_FIELDS.IS_ACTIVE} = true
      ORDER BY h.${HOSPITALS_FIELDS.NAME}
    `;
    
    const hospitals = await query(sql, [cityId]);
    
    logger.info(`Fetched ${hospitals.length} hospitals for city: ${cityId}`);
    return { success: true, hospitals };
  } catch (error) {
    logger.error('Get hospitals by city error:', error);
    return { success: false, error: error.message };
  }
};

export const getAllHospitals = async () => {
  try {
    const sql = `
      SELECT 
        h.${HOSPITALS_FIELDS.HOSPITAL_ID},
        h.${HOSPITALS_FIELDS.NAME},
        h.${HOSPITALS_FIELDS.CITY_ID},
        h.${HOSPITALS_FIELDS.ADDRESS},
        h.${HOSPITALS_FIELDS.PHONE},
        h.${HOSPITALS_FIELDS.EMAIL}
      FROM ${HOSPITALS_TABLE} h
      WHERE h.${HOSPITALS_FIELDS.IS_ACTIVE} = true
      ORDER BY h.${HOSPITALS_FIELDS.NAME}
    `;
    
    const hospitals = await query(sql, []);
    
    logger.info(`Fetched ${hospitals.length} hospitals`);
    return { success: true, hospitals };
  } catch (error) {
    logger.error('Get all hospitals error:', error);
    return { success: false, error: error.message };
  }
};
