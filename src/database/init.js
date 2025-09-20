import { query, testConnection } from '../config/database.js';
import { USER_SCHEMA } from '../models/user_model.js';
import { VACCINES_SCHEMA } from '../models/vaccines_model.js';
import { USER_VACCINES_SCHEMA } from '../models/user_vaccines_model.js';
import { COUNTRIES_SCHEMA } from '../models/countries_model.js';
import { CITIES_SCHEMA } from '../models/cities_model.js';
import { VACCINE_SCHEDULE_SCHEMA } from '../models/vaccine_schedule_model.js';
import { VACCINE_REMINDERS_SCHEMA } from '../models/vaccine_reminders_model.js';
import { seedVaccinesData } from '../services/vaccines_service.js';
import { seedCountriesData } from '../services/countries_service.js';
import { seedCitiesData } from '../services/cities_service.js';
import { seedVaccineScheduleData } from '../services/vaccine_schedule_service.js';
import logger from '../config/logger.js';

export const initializeDatabase = async () => {
  try {
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    await query(USER_SCHEMA);
    await query(VACCINES_SCHEMA);
    await query(COUNTRIES_SCHEMA);
    await query(CITIES_SCHEMA);
    await query(VACCINE_SCHEDULE_SCHEMA);
    await query(USER_VACCINES_SCHEMA);
    await query(VACCINE_REMINDERS_SCHEMA);

    await seedVaccinesData();
    await seedCountriesData();
    await seedCitiesData();
    await seedVaccineScheduleData();
    
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
