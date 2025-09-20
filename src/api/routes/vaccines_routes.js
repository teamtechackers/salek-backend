import express from 'express';
import { 
  getVaccinesList,
  getSpecificUserVaccineRecords,
  addSpecificUserVaccine,
  updateUserVaccineRecord,
  addReminderAPI,
  updateReminderAPI,
  getRemindersAPI,
  deleteReminderAPI,
  markVaccinesAsTaken,
  updateVaccineStatusesAPI,
  getVaccineDoseSummaryAPI
} from '../controllers/vaccines_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/get-vaccines', getVaccinesList);
router.post('/add-user-vaccine', addSpecificUserVaccine);
router.get('/get-user-vaccines', getSpecificUserVaccineRecords);
router.put('/update-user-vaccine', updateUserVaccineRecord);
router.post('/add-reminder', addReminderAPI);
router.put('/update-reminder', updateReminderAPI);
router.get('/get-reminders', getRemindersAPI);
router.delete('/delete-reminder', deleteReminderAPI);
router.put('/mark-vaccines-taken', markVaccinesAsTaken);
router.post('/update-vaccine-statuses', updateVaccineStatusesAPI);
router.get('/get-dose-summary', getVaccineDoseSummaryAPI);

export default router;
