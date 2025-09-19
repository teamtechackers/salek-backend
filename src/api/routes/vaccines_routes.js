import express from 'express';
import { 
  getVaccinesList,
  getSpecificUserVaccineRecords,
  addSpecificUserVaccine,
  updateUserVaccineRecord
} from '../controllers/vaccines_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/get-vaccines', getVaccinesList);
router.post('/add-user-vaccine', addSpecificUserVaccine);
router.get('/get-user-vaccines', getSpecificUserVaccineRecords);
router.put('/update-user-vaccine', updateUserVaccineRecord);

export default router;
