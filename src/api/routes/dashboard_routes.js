import express from 'express';
import { getDashboardData } from '../controllers/dashboard_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.get('/dashboard', authenticateToken, getDashboardData);

export default router;
