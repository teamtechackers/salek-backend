import { query } from '../config/database.js';
import { STATES_TABLE, STATES_FIELDS, STATES_DATA } from '../models/states_model.js';
import logger from '../config/logger.js';

export const seedStatesData = async () => {
    try {
        const checkSql = `SELECT COUNT(*) as count FROM ${STATES_TABLE}`;
        const existingStates = await query(checkSql);

        if (existingStates[0].count > 0) {
            logger.info('States already seeded, skipping...');
            return { success: true };
        }

        for (const state of STATES_DATA) {
            const sql = `
        INSERT INTO ${STATES_TABLE} (
          ${STATES_FIELDS.STATE_ID},
          ${STATES_FIELDS.STATE_NAME},
          ${STATES_FIELDS.COUNTRY_ID},
          ${STATES_FIELDS.IS_ACTIVE}
        ) VALUES (?, ?, ?, ?)
      `;

            await query(sql, [
                state.state_id,
                state.state_name,
                state.country_id,
                state.is_active || false
            ]);
        }

        logger.info(`${STATES_DATA.length} states seeded successfully`);
        return { success: true };
    } catch (error) {
        logger.error('Seed states error:', error);
        return { success: false, error: error.message };
    }
};

export const getStatesByCountry = async (countryId) => {
    try {
        const sql = `
      SELECT * FROM ${STATES_TABLE} 
      WHERE ${STATES_FIELDS.COUNTRY_ID} = ? AND ${STATES_FIELDS.IS_ACTIVE} = true 
      ORDER BY ${STATES_FIELDS.STATE_NAME}
    `;
        const states = await query(sql, [countryId]);
        return { success: true, states };
    } catch (error) {
        logger.error('Error getting states by country:', error);
        return { success: false, error: error.message };
    }
};

export const getStateById = async (stateId) => {
    try {
        const sql = `SELECT * FROM ${STATES_TABLE} WHERE ${STATES_FIELDS.STATE_ID} = ? AND ${STATES_FIELDS.IS_ACTIVE} = true`;
        const result = await query(sql, [stateId]);
        if (result.length === 0) {
            return { success: false, error: 'State not found' };
        }
        return { success: true, state: result[0] };
    } catch (error) {
        logger.error('Error getting state by ID:', error);
        return { success: false, error: error.message };
    }
};
