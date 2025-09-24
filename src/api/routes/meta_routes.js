import express from 'express';
import { getCountriesAPI, getCitiesAPI, getHospitalsAPI } from '../controllers/meta_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/countries', getCountriesAPI);
router.get('/cities', getCitiesAPI);
router.get('/hospitals', getHospitalsAPI);

export default router;
