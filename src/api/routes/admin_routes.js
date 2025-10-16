import express from 'express';
import { authenticateToken } from '../../middleware/auth_middleware.js';
import { requireSuperAdmin } from '../../middleware/admin_middleware.js';
import { getDashboardStats, getAdminUsersList, getAdminUserDetails, getAdminAllVaccines, updateAdminVaccine, deleteAdminVaccine } from '../controllers/admin_controller.js';
import { adminLogin } from '../controllers/admin_auth_controller.js';

const router = express.Router();

router.post('/login', adminLogin);

router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getAdminUsersList);
router.get('/user', getAdminUserDetails);
router.get('/vaccines', getAdminAllVaccines);
router.put('/vaccines', updateAdminVaccine);
router.delete('/vaccines', deleteAdminVaccine);

export default router;


