import express from 'express';
import { 
  getVaccinePlanner,
  generatePlanner,
  updatePlannerRecord,
  updateReminder
} from '../controllers/vaccine_planner_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/get-vaccine-planner', getVaccinePlanner);
router.post('/generate-planner', generatePlanner);
router.put('/update-planner', updatePlannerRecord);
router.put('/update-reminder', updateReminder);

export default router;
