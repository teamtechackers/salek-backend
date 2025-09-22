import express from 'express';
import { getDashboardData } from '../controllers/dashboard_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/dashboard', getDashboardData);

export default router;
