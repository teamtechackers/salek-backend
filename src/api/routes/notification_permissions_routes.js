import express from 'express';
import { 
  getNotificationPermissionsAPI,
  updateNotificationPermissionsAPI
} from '../controllers/notification_permissions_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/get-permissions', getNotificationPermissionsAPI);
router.put('/update-permissions', updateNotificationPermissionsAPI);

export default router;
