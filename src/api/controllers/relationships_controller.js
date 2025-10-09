import { 
  getAllRelationships, 
  getRelationshipById, 
  addRelationship, 
  updateRelationship, 
  deleteRelationship 
} from '../../services/relationships_service.js';
import logger from '../../config/logger.js';

export const getRelationshipsAPI = async (req, res) => {
  try {
    const result = await getAllRelationships();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch relationships'
      });
    }
    
    logger.info(`Relationships fetched: ${result.relationships.length} records`);
    
    return res.status(200).json({
      success: true,
      message: 'Relationships fetched successfully',
      data: {
        relationships: result.relationships,
        count: result.relationships.length
      }
    });
  } catch (error) {
    logger.error('Get relationships API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getRelationshipByIdAPI = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Relationship ID is required'
      });
    }
    
    const result = await getRelationshipById(parseInt(id));
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || 'Relationship not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Relationship fetched successfully',
      data: result.relationship
    });
  } catch (error) {
    logger.error('Get relationship by ID API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addRelationshipAPI = async (req, res) => {
  try {
    const { relation_type } = req.body;
    
    if (!relation_type || !relation_type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Relation type is required'
      });
    }
    
    const result = await addRelationship(relation_type.trim());
    
    if (!result.success) {
      const isDuplicate = result.error && result.error.includes('already exists');
      return res.status(isDuplicate ? 409 : 500).json({
        success: false,
        message: result.error || 'Failed to add relationship'
      });
    }
    
    logger.info(`Relationship added: ${relation_type} (ID: ${result.id})`);
    
    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        id: result.id,
        relation_type: relation_type.trim()
      }
    });
  } catch (error) {
    logger.error('Add relationship API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateRelationshipAPI = async (req, res) => {
  try {
    const { id } = req.params;
    const { relation_type } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Relationship ID is required'
      });
    }
    
    if (!relation_type || !relation_type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Relation type is required'
      });
    }
    
    const result = await updateRelationship(parseInt(id), relation_type.trim());
    
    if (!result.success) {
      const isDuplicate = result.error && result.error.includes('already exists');
      const statusCode = isDuplicate ? 409 : (result.error.includes('not found') ? 404 : 500);
      
      return res.status(statusCode).json({
        success: false,
        message: result.error || 'Failed to update relationship'
      });
    }
    
    logger.info(`Relationship updated: ID ${id} to ${relation_type}`);
    
    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        id: parseInt(id),
        relation_type: relation_type.trim()
      }
    });
  } catch (error) {
    logger.error('Update relationship API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteRelationshipAPI = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Relationship ID is required'
      });
    }
    
    const result = await deleteRelationship(parseInt(id));
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || 'Relationship not found'
      });
    }
    
    logger.info(`Relationship deleted: ID ${id}`);
    
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Delete relationship API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

