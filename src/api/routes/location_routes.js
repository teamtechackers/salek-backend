import express from 'express';
import { getCountries, getStates, getCities } from '../controllers/location_controller.js';

const router = express.Router();

router.get('/countries', getCountries);
router.get('/states/:countryId', getStates);
router.get('/cities/:stateId', getCities);

export default router;
