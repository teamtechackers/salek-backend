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
        switch (type) {
            case 'country':
                table = 'countries';
                field = 'country_id';
                break;
            case 'state':
                table = 'states';
                field = 'state_id';
                break;
            case 'city':
                table = 'cities';
                field = 'city_id';
                break;
        }

        const sql = `UPDATE ${table} SET is_active = ? WHERE ${field} = ?`;
        const result = await query(sql, [is_active, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `${type} not found` });
        }

        logger.info(`Admin toggled ${type} status: ID ${id}, Status ${is_active}`);

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
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
        }

        // Search in countries, states, and cities
        const sql = `
            (SELECT 'country' as type, country_id as id, country_name as name, is_active FROM countries WHERE country_name LIKE ?)
            UNION
            (SELECT 'state' as type, state_id as id, state_name as name, is_active FROM states WHERE state_name LIKE ?)
            UNION
            (SELECT 'city' as type, city_id as id, city_name as name, is_active FROM cities WHERE city_name LIKE ?)
            LIMIT 50
        `;
        const searchTerm = `%${q}%`;
        const results = await query(sql, [searchTerm, searchTerm, searchTerm]);

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
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 100;
        const pageNum = Math.max(page, 0);
        const pageSize = Math.max(limit, 1);
        const offset = pageNum * pageSize;

        const countSql = `SELECT COUNT(*) as total FROM countries`;
        const [{ total }] = await query(countSql);

        const sql = `SELECT * FROM countries ORDER BY country_name ASC LIMIT ? OFFSET ?`;
        const results = await query(sql, [pageSize, offset]);

        return res.status(200).json({
            success: true,
            data: results,
            pagination: {
                page: pageNum,
                limit: pageSize,
                total,
                pages: Math.ceil(total / pageSize),
                range: {
                    start_index: offset,
                    end_index: Math.min(offset + pageSize - 1, Math.max(total - 1, 0))
                }
            }
        });
    } catch (error) {
        logger.error('Get all countries admin error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getStatesByCountryAdmin = async (req, res) => {
    try {
        const { countryId } = req.params;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 100;
        const pageNum = Math.max(page, 0);
        const pageSize = Math.max(limit, 1);
        const offset = pageNum * pageSize;

        const countSql = `SELECT COUNT(*) as total FROM states WHERE country_id = ?`;
        const [{ total }] = await query(countSql, [countryId]);

        const sql = `SELECT * FROM states WHERE country_id = ? ORDER BY state_name ASC LIMIT ? OFFSET ?`;
        const results = await query(sql, [countryId, pageSize, offset]);

        return res.status(200).json({
            success: true,
            data: results,
            pagination: {
                page: pageNum,
                limit: pageSize,
                total,
                pages: Math.ceil(total / pageSize),
                range: {
                    start_index: offset,
                    end_index: Math.min(offset + pageSize - 1, Math.max(total - 1, 0))
                }
            }
        });
    } catch (error) {
        logger.error('Get states admin error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getCitiesByStateAdmin = async (req, res) => {
    try {
        const { stateId } = req.params;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 100;
        const pageNum = Math.max(page, 0);
        const pageSize = Math.max(limit, 1);
        const offset = pageNum * pageSize;

        const countSql = `SELECT COUNT(*) as total FROM cities WHERE state_id = ?`;
        const [{ total }] = await query(countSql, [stateId]);

        const sql = `SELECT * FROM cities WHERE state_id = ? ORDER BY city_name ASC LIMIT ? OFFSET ?`;
        const results = await query(sql, [stateId, pageSize, offset]);

        return res.status(200).json({
            success: true,
            data: results,
            pagination: {
                page: pageNum,
                limit: pageSize,
                total,
                pages: Math.ceil(total / pageSize),
                range: {
                    start_index: offset,
                    end_index: Math.min(offset + pageSize - 1, Math.max(total - 1, 0))
                }
            }
        });
    } catch (error) {
        logger.error('Get cities admin error:', error);
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
