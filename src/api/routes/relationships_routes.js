import express from 'express';
import { 
  getRelationshipsAPI, 
  getRelationshipByIdAPI, 
  addRelationshipAPI, 
  updateRelationshipAPI, 
  deleteRelationshipAPI 
} from '../controllers/relationships_controller.js';
import { authenticateToken } from '../../middleware/auth_middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all relationships
router.get('/get-relationships', getRelationshipsAPI);

// Get relationship by ID
router.get('/get-relationship/:id', getRelationshipByIdAPI);

// Add new relationship
router.post('/add-relationship', addRelationshipAPI);

// Update relationship
router.put('/update-relationship/:id', updateRelationshipAPI);

// Delete relationship
router.delete('/delete-relationship/:id', deleteRelationshipAPI);

export default router;

