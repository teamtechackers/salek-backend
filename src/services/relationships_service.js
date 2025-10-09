import { query } from '../config/database.js';
import { RELATIONSHIPS_TABLE, RELATIONSHIPS_FIELDS, DEFAULT_RELATIONSHIPS } from '../models/relationships_model.js';
import logger from '../config/logger.js';

export const getAllRelationships = async () => {
  try {
    const sql = `
      SELECT 
        ${RELATIONSHIPS_FIELDS.ID},
        ${RELATIONSHIPS_FIELDS.RELATION_TYPE}
      FROM ${RELATIONSHIPS_TABLE}
      WHERE ${RELATIONSHIPS_FIELDS.IS_ACTIVE} = true
      ORDER BY 
        CASE 
          WHEN ${RELATIONSHIPS_FIELDS.RELATION_TYPE} = 'Other' THEN 2
          ELSE 1
        END,
        ${RELATIONSHIPS_FIELDS.RELATION_TYPE} ASC
    `;
    
    const relationships = await query(sql);
    
    return { success: true, relationships };
  } catch (error) {
    logger.error('Get all relationships error:', error);
    return { success: false, error: error.message };
  }
};

export const getRelationshipById = async (id) => {
  try {
    const sql = `
      SELECT 
        ${RELATIONSHIPS_FIELDS.ID},
        ${RELATIONSHIPS_FIELDS.RELATION_TYPE}
      FROM ${RELATIONSHIPS_TABLE}
      WHERE ${RELATIONSHIPS_FIELDS.ID} = ? 
      AND ${RELATIONSHIPS_FIELDS.IS_ACTIVE} = true
    `;
    
    const result = await query(sql, [id]);
    
    if (result.length === 0) {
      return { success: false, error: 'Relationship not found' };
    }
    
    return { success: true, relationship: result[0] };
  } catch (error) {
    logger.error('Get relationship by ID error:', error);
    return { success: false, error: error.message };
  }
};

export const addRelationship = async (relationType) => {
  try {
    // Check if relationship already exists
    const checkSql = `
      SELECT ${RELATIONSHIPS_FIELDS.ID}
      FROM ${RELATIONSHIPS_TABLE}
      WHERE ${RELATIONSHIPS_FIELDS.RELATION_TYPE} = ?
      AND ${RELATIONSHIPS_FIELDS.IS_ACTIVE} = true
    `;
    
    const existing = await query(checkSql, [relationType]);
    
    if (existing.length > 0) {
      return { 
        success: false, 
        error: 'Relationship type already exists' 
      };
    }
    
    const sql = `
      INSERT INTO ${RELATIONSHIPS_TABLE} (${RELATIONSHIPS_FIELDS.RELATION_TYPE})
      VALUES (?)
    `;
    
    const result = await query(sql, [relationType]);
    
    return { 
      success: true, 
      id: result.insertId,
      message: 'Relationship added successfully' 
    };
  } catch (error) {
    logger.error('Add relationship error:', error);
    return { success: false, error: error.message };
  }
};

export const updateRelationship = async (id, relationType) => {
  try {
    // Check if new relation type already exists (excluding current record)
    const checkSql = `
      SELECT ${RELATIONSHIPS_FIELDS.ID}
      FROM ${RELATIONSHIPS_TABLE}
      WHERE ${RELATIONSHIPS_FIELDS.RELATION_TYPE} = ?
      AND ${RELATIONSHIPS_FIELDS.ID} != ?
      AND ${RELATIONSHIPS_FIELDS.IS_ACTIVE} = true
    `;
    
    const existing = await query(checkSql, [relationType, id]);
    
    if (existing.length > 0) {
      return { 
        success: false, 
        error: 'Relationship type already exists' 
      };
    }
    
    const sql = `
      UPDATE ${RELATIONSHIPS_TABLE}
      SET ${RELATIONSHIPS_FIELDS.RELATION_TYPE} = ?,
          ${RELATIONSHIPS_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${RELATIONSHIPS_FIELDS.ID} = ?
      AND ${RELATIONSHIPS_FIELDS.IS_ACTIVE} = true
    `;
    
    const result = await query(sql, [relationType, id]);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'Relationship not found' };
    }
    
    return { success: true, message: 'Relationship updated successfully' };
  } catch (error) {
    logger.error('Update relationship error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteRelationship = async (id) => {
  try {
    const sql = `
      UPDATE ${RELATIONSHIPS_TABLE}
      SET ${RELATIONSHIPS_FIELDS.IS_ACTIVE} = false,
          ${RELATIONSHIPS_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${RELATIONSHIPS_FIELDS.ID} = ?
    `;
    
    const result = await query(sql, [id]);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'Relationship not found' };
    }
    
    return { success: true, message: 'Relationship deleted successfully' };
  } catch (error) {
    logger.error('Delete relationship error:', error);
    return { success: false, error: error.message };
  }
};

export const seedRelationshipsData = async () => {
  try {
    // Check if relationships already seeded
    const checkSql = `SELECT COUNT(*) as count FROM ${RELATIONSHIPS_TABLE}`;
    const result = await query(checkSql);
    
    if (result[0].count > 0) {
      logger.info('Relationships already seeded, skipping...');
      return { success: true, message: 'Relationships already exist' };
    }
    
    // Insert default relationships
    for (const relationship of DEFAULT_RELATIONSHIPS) {
      const sql = `
        INSERT INTO ${RELATIONSHIPS_TABLE} (${RELATIONSHIPS_FIELDS.RELATION_TYPE})
        VALUES (?)
      `;
      await query(sql, [relationship.relation_type]);
    }
    
    logger.info(`${DEFAULT_RELATIONSHIPS.length} relationships seeded successfully`);
    return { success: true, message: 'Relationships seeded successfully' };
  } catch (error) {
    logger.error('Seed relationships error:', error);
    return { success: false, error: error.message };
  }
};

