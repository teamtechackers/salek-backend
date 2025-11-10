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
  getVaccineDoseSummaryAPI,
  addRecord,
  addRecordDependent,
  getRecord,
  getRecordDependent,
  getCountriesAPI,
  getCitiesAPI,
  getHospitalsAPI,
  getVaccineCategoriesAPI,
  getVaccineSubCategoriesAPI,
  addVaccineAPI,
  getDependentVaccinesAPI,
  addDependentVaccineRecordAPI,
  getDependentVaccineRecordsAPI,
  markDependentVaccinesAsTaken
} from '../controllers/vaccines_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';
import { uploadVaccineImage } from '../../middleware/upload_middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/get-vaccines', getVaccinesList);
router.post('/add-vaccine', addVaccineAPI);
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
router.post('/add-record', uploadVaccineImage, addRecord);
router.post('/add-record-dependent', uploadVaccineImage, addRecordDependent);
router.get('/get-record', getRecord);
router.get('/get-record-dependent', getRecordDependent);

// Meta under vaccines
router.get('/countries', getCountriesAPI);
router.get('/cities', getCitiesAPI);
router.get('/hospitals', getHospitalsAPI);
router.get('/categories', getVaccineCategoriesAPI);
router.get('/sub-categories', getVaccineSubCategoriesAPI);

// Dependent vaccine routes
router.get('/get-dependent-vaccines', getDependentVaccinesAPI);
router.post('/add-dependent-record', uploadVaccineImage, addDependentVaccineRecordAPI);
router.get('/get-dependent-records', getDependentVaccineRecordsAPI);
router.put('/mark-vaccines-taken-dependent', markDependentVaccinesAsTaken);

export default router;
