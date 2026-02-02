import { getAllCountries } from '../../services/countries_service.js';
import { getStatesByCountry } from '../../services/states_service.js';
import { getCitiesByState } from '../../services/cities_service.js';
import logger from '../../config/logger.js';

export const getCountriesAPI = async (req, res) => {
  try {
    const result = await getAllCountries();
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to fetch countries' });
    }
    return res.status(200).json({ success: true, message: 'Countries fetched successfully', data: { countries: result.countries } });
  } catch (error) {
    logger.error('Get countries error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getStatesAPI = async (req, res) => {
  try {
    const { country_id } = req.query;
    if (!country_id) {
      return res.status(400).json({ success: false, message: 'country_id is required' });
    }
    const result = await getStatesByCountry(country_id);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to fetch states' });
    }
    return res.status(200).json({ success: true, message: 'States fetched successfully', data: { states: result.states } });
  } catch (error) {
    logger.error('Get states error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCitiesAPI = async (req, res) => {
  try {
    const { state_id } = req.query;
    if (!state_id) {
      return res.status(400).json({ success: false, message: 'state_id is required' });
    }
    const result = await getCitiesByState(state_id);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to fetch cities' });
    }
    return res.status(200).json({ success: true, message: 'Cities fetched successfully', data: { cities: result.cities } });
  } catch (error) {
    logger.error('Get cities error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getHospitalsAPI = async (req, res) => {
  try {
    // Placeholder until hospitals table/service exists
    return res.status(200).json({ success: true, message: 'Hospitals fetched successfully', data: { hospitals: [] } });
  } catch (error) {
    logger.error('Get hospitals error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
