import express from 'express';
import { updateProfile, getProfile, updateProfileBasic } from '../controllers/profile_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/get-profile', getProfile);
router.put('/update-profile', updateProfile);
router.put('/update-profile-basic', updateProfileBasic);

export default router;
