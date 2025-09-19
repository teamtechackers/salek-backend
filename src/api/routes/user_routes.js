import express from 'express';
import { updateProfile, getProfile } from '../controllers/profile_controller.js';
import { getDashboard } from '../controllers/dashboard_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/get-profile', getProfile);
router.put('/update-profile', updateProfile);
router.get('/dashboard', getDashboard);

export default router;
