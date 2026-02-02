import { getAllCountries } from '../../services/countries_service.js';
import { getStatesByCountry } from '../../services/states_service.js';
import { getCitiesByState } from '../../services/cities_service.js';
import logger from '../../config/logger.js';

export const getCountries = async (req, res) => {
    try {
        const result = await getAllCountries();
        if (!result.success) {
            return res.status(500).json({ success: false, message: result.error });
        }
        return res.status(200).json({
            success: true,
            data: result.countries
        });
    } catch (error) {
        logger.error('Get countries controller error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getStates = async (req, res) => {
    try {
        const { countryId } = req.params;
        if (!countryId) {
            return res.status(400).json({ success: false, message: 'Country ID is required' });
        }
        const result = await getStatesByCountry(countryId);
        if (!result.success) {
            return res.status(500).json({ success: false, message: result.error });
        }
        return res.status(200).json({
            success: true,
            data: result.states
        });
    } catch (error) {
        logger.error('Get states controller error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getCities = async (req, res) => {
    try {
        const { stateId } = req.params;
        if (!stateId) {
            return res.status(400).json({ success: false, message: 'State ID is required' });
        }
        const result = await getCitiesByState(stateId);
        if (!result.success) {
            return res.status(500).json({ success: false, message: result.error });
        }
        return res.status(200).json({
            success: true,
            data: result.cities
        });
    } catch (error) {
        logger.error('Get cities controller error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
