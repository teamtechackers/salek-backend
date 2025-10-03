import express from 'express';
import { authenticateToken } from '../../middleware/auth_middleware.js';
import {
  addDependentAPI,
  getDependentsAPI,
  getDependentAPI,
  updateDependentAPI,
  deleteDependentAPI,
  generateDependentVaccinesAPI
} from '../controllers/dependents_controller.js';

const router = express.Router();

// Add a new dependent
router.post('/add-dependent', authenticateToken, addDependentAPI);

// Get all dependents for a user
router.get('/get-dependents', authenticateToken, getDependentsAPI);

// Get a specific dependent by ID
router.get('/get-dependent/:dependent_id', authenticateToken, getDependentAPI);

// Update dependent profile
router.put('/update-dependent/:dependent_id', authenticateToken, updateDependentAPI);

// Delete dependent
router.delete('/delete-dependent/:dependent_id', authenticateToken, deleteDependentAPI);

// Generate vaccines for dependent
router.post('/generate-vaccines/:dependent_id', authenticateToken, generateDependentVaccinesAPI);

export default router;
