import express from 'express';
import { authenticateToken } from '../../middleware/auth_middleware.js';
import { requireSuperAdmin } from '../../middleware/admin_middleware.js';
import { uploadProfileImage } from '../../middleware/upload_middleware.js';
import { getDashboardStats, getAdminUsersList, getAdminUserDetails, getAdminAllVaccines, addAdminVaccine, updateAdminVaccine, deleteAdminVaccine, updateAdminUser, deleteAdminUser, getAdminDependentDetails, updateAdminDependent, deleteAdminDependent, deleteAdminUserVaccine, deleteAdminDependentUserVaccine } from '../controllers/admin_controller.js';
import { adminLogin } from '../controllers/admin_auth_controller.js';

const router = express.Router();

router.post('/login', adminLogin);

router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getAdminUsersList);
router.get('/user', getAdminUserDetails);
router.get('/dependent', getAdminDependentDetails);
router.put('/dependent-edit', uploadProfileImage, updateAdminDependent);
router.delete('/dependent-delete', deleteAdminDependent);
router.put('/user-edit', updateAdminUser);
router.delete('/user-delete', deleteAdminUser);
router.get('/vaccines', getAdminAllVaccines);
router.post('/vaccine-add', addAdminVaccine);
router.put('/vaccine-edit', updateAdminVaccine);
router.delete('/vaccine-delete', deleteAdminVaccine);
router.delete('/user-vaccine-delete', deleteAdminUserVaccine);
router.delete('/dependent-user-vaccine-delete', deleteAdminDependentUserVaccine);

export default router;


