export const RELATIONSHIPS_TABLE = 'relationships';

export const RELATIONSHIPS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${RELATIONSHIPS_TABLE} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    relation_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_relation_type (relation_type),
    INDEX idx_is_active (is_active)
  )
`;

export const RELATIONSHIPS_FIELDS = {
  ID: 'id',
  RELATION_TYPE: 'relation_type',
  IS_ACTIVE: 'is_active',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at'
};

// Default relationship types (Only 5)
export const DEFAULT_RELATIONSHIPS = [
  { relation_type: 'Parent' },
  { relation_type: 'Child' },
  { relation_type: 'Sibling' },
  { relation_type: 'Spouse' },
  { relation_type: 'Other' }
];

