import { getAllCountries } from '../../services/countries_service.js';
import { getCities, getCitiesByCountry } from '../../services/cities_service.js';
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

export const getCitiesAPI = async (req, res) => {
  try {
    const { country_id } = req.query;
    let result;
    if (country_id) {
      result = await getCitiesByCountry(country_id);
    } else {
      result = await getCities();
    }
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
