import { query, testConnection } from '../config/database.js';
import { USER_SCHEMA, USER_TABLE, USER_FIELDS } from '../models/user_model.js';
import { VACCINES_SCHEMA } from '../models/vaccines_model.js';
import { USER_VACCINES_SCHEMA } from '../models/user_vaccines_model.js';
import { COUNTRIES_SCHEMA } from '../models/countries_model.js';
import { CITIES_SCHEMA } from '../models/cities_model.js';
import { VACCINE_SCHEDULE_SCHEMA } from '../models/vaccine_schedule_model.js';
import { VACCINE_REMINDERS_SCHEMA } from '../models/vaccine_reminders_model.js';
import { RELATIONSHIPS_SCHEMA } from '../models/relationships_model.js';
import { seedVaccinesData } from '../services/vaccines_service.js';
import { seedCountriesData } from '../services/countries_service.js';
import { seedCitiesData } from '../services/cities_service.js';
import { seedVaccineScheduleData } from '../services/vaccine_schedule_service.js';
import { seedRelationshipsData } from '../services/relationships_service.js';
import logger from '../config/logger.js';

const ensureUsersTableColumns = async () => {
  try {
    const columnCheckSql = `
      SELECT COUNT(*) AS column_exists
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `;
    const [columnRow] = await query(columnCheckSql, [USER_TABLE, USER_FIELDS.DELETED_AT]);
    if (!columnRow || columnRow.column_exists === 0) {
      const alterSql = `
        ALTER TABLE ${USER_TABLE}
        ADD COLUMN ${USER_FIELDS.DELETED_AT} TIMESTAMP NULL DEFAULT NULL
        AFTER ${USER_FIELDS.UPDATED_AT}
      `;
      await query(alterSql);
      logger.info('Added deleted_at column to users table');
    }
  } catch (error) {
    logger.error('Failed to ensure deleted_at column on users table:', error);
    throw error;
  }
};

export const initializeDatabase = async () => {
  try {
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    await query(USER_SCHEMA);
    await ensureUsersTableColumns();
    await query(VACCINES_SCHEMA);
    await query(COUNTRIES_SCHEMA);
    await query(CITIES_SCHEMA);
    await query(VACCINE_SCHEDULE_SCHEMA);
    await query(USER_VACCINES_SCHEMA);
    await query(VACCINE_REMINDERS_SCHEMA);
    await query(RELATIONSHIPS_SCHEMA);

    await seedVaccinesData();
    await seedCountriesData();
    await seedCitiesData();
    await seedVaccineScheduleData();
    await seedRelationshipsData();
    
    logger.info('Database tables initialized successfully');
    
    return { success: true };
  } catch (error) {
    logger.error('Database initialization failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const runMigrations = async () => {
  try {
    await initializeDatabase();
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};
