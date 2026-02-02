import { Country, State, City } from 'country-state-city';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const BATCH_SIZE = 1000;

export const seedGlobalLocations = async () => {
    try {
        logger.info('🚀 Starting global location seeding...');

        // 1. Seed Countries
        const allCountries = Country.getAllCountries();
        logger.info(`🌍 Seeding ${allCountries.length} countries...`);

        for (let i = 0; i < allCountries.length; i += BATCH_SIZE) {
            const batch = allCountries.slice(i, i + BATCH_SIZE);
            const values = batch.map(c => [c.name, c.isoCode, 0]); // is_active = 0

            const sql = `
        INSERT IGNORE INTO countries (country_name, country_code, is_active)
        VALUES ?
      `;
            await query(sql, [values]);
        }

        // 2. Seed States
        const allStates = State.getAllStates();
        logger.info(`🏘️ Seeding ${allStates.length} states...`);

        // Pre-fetch country mapping for performance (ISO to ID)
        const countriesFromDb = await query('SELECT country_id, country_code FROM countries');
        const countryMap = countriesFromDb.reduce((acc, c) => {
            acc[c.country_code] = c.country_id;
            return acc;
        }, {});

        for (let i = 0; i < allStates.length; i += BATCH_SIZE) {
            const batch = allStates.slice(i, i + BATCH_SIZE);
            const values = batch
                .filter(s => countryMap[s.countryCode])
                .map(s => [s.name, countryMap[s.countryCode], s.isoCode, 0]);

            if (values.length > 0) {
                const sql = `
          INSERT IGNORE INTO states (state_name, country_id, state_code, is_active)
          VALUES ?
        `;
                await query(sql, [values]);
            }
        }

        // 3. Seed Cities
        const allCities = City.getAllCities();
        logger.info(`🏙️ Seeding ${allCities.length} cities... (This might take a while: ~150k records)`);

        // Pre-fetch state mapping with country_code + state_code
        const statesFromDb = await query('SELECT s.state_id, s.state_code, c.country_code FROM states s JOIN countries c ON s.country_id = c.country_id');
        const stateMap = statesFromDb.reduce((acc, s) => {
            const key = `${s.country_code}_${s.state_code}`;
            acc[key] = s.state_id;
            return acc;
        }, {});

        for (let i = 0; i < allCities.length; i += BATCH_SIZE) {
            const batch = allCities.slice(i, i + BATCH_SIZE);
            const values = batch
                .map(c => {
                    const key = `${c.countryCode}_${c.stateCode}`;
                    const stateId = stateMap[key];
                    return stateId ? [c.name, stateId, 0] : null;
                })
                .filter(v => v !== null);

            if (values.length > 0) {
                const sql = `
          INSERT IGNORE INTO cities (city_name, state_id, is_active)
          VALUES ?
        `;
                await query(sql, [values]);
            }

            if (i % 10000 === 0 && i > 0) {
                logger.info(`...processed ${i} cities`);
            }
        }

        logger.info('✅ Global location seeding completed!');
        return { success: true };
    } catch (error) {
        logger.error('❌ Global seeding error:', error);
        return { success: false, error: error.message };
    }
};
