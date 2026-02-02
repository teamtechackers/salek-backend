import express from 'express';
import { toggleLocationStatus, searchLocations, triggerGlobalSeed, getAllCountries, getStatesByCountryAdmin, getCitiesByStateAdmin } from '../controllers/admin_location_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';
import { requireSuperAdmin } from '../../middleware/admin_middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/search', searchLocations);
router.get('/countries', getAllCountries);
router.get('/states/:countryId', getStatesByCountryAdmin);
router.get('/cities/:stateId', getCitiesByStateAdmin);
router.patch('/toggle-status', toggleLocationStatus);
router.post('/seed-global', triggerGlobalSeed);

export default router;
