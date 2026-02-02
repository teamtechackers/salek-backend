import { query } from '../../config/database.js';
import logger from '../../config/logger.js';
import { seedGlobalLocations } from '../../services/master_seeding_service.js';

export const toggleLocationStatus = async (req, res) => {
    try {
        const { type, id, is_active } = req.body; // type: 'country', 'state', 'city'

        if (!['country', 'state', 'city'].includes(type) || !id) {
            return res.status(400).json({ success: false, message: 'Invalid request parameters' });
        }

        let table, field;
        if (type === 'country') { table = 'countries'; field = 'country_id'; }
        else if (type === 'state') { table = 'states'; field = 'state_id'; }
        else { table = 'cities'; field = 'city_id'; }

        const sql = `UPDATE ${table} SET is_active = ? WHERE ${field} = ?`;
        await query(sql, [is_active ? 1 : 0, id]);

        return res.status(200).json({
            success: true,
            message: `${type} status updated successfully`
        });
    } catch (error) {
        logger.error('Toggle location status error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const searchLocations = async (req, res) => {
    try {
        const { type, q } = req.query;
        if (!['country', 'state', 'city'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid location type' });
        }

        let table, nameField;
        if (type === 'country') { table = 'countries'; nameField = 'country_name'; }
        else if (type === 'state') { table = 'states'; nameField = 'state_name'; }
        else { table = 'cities'; nameField = 'city_name'; }

        const sql = `SELECT * FROM ${table} WHERE ${nameField} LIKE ? LIMIT 50`;
        const results = await query(sql, [`%${q || ''}%`]);

        return res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        logger.error('Search locations error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getAllCountries = async (req, res) => {
    try {
        const sql = `SELECT * FROM countries ORDER BY country_name ASC`;
        const results = await query(sql);
        return res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        logger.error('Get all countries admin error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const triggerGlobalSeed = async (req, res) => {
    try {
        // This is a heavy operation, so we run it asynchronously in the background
        // but return an immediate response to the client
        seedGlobalLocations().catch(err => logger.error('Background Seeding Error:', err));

        return res.status(202).json({
            success: true,
            message: 'Global seeding started in the background. This may take several minutes to complete.'
        });
    } catch (error) {
        logger.error('Trigger global seed error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
