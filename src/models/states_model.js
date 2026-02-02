export const STATES_TABLE = 'states';

export const STATES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${STATES_TABLE} (
    state_id INT AUTO_INCREMENT PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    country_id INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(country_id) ON DELETE CASCADE,
    INDEX idx_country_state (country_id, state_name),
    INDEX idx_state_code (state_code),
    INDEX idx_active (is_active)
  )
`;

export const STATES_FIELDS = {
  STATE_ID: 'state_id',
  STATE_NAME: 'state_name',
  STATE_CODE: 'state_code',
  COUNTRY_ID: 'country_id',
  IS_ACTIVE: 'is_active',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at'
};

export const STATES_DATA = [
  { state_id: 1, state_name: 'Sindh', country_id: 2, is_active: true },
  { state_id: 2, state_name: 'Punjab', country_id: 2, is_active: true },
  { state_id: 3, state_name: 'Islamabad Capital Territory', country_id: 2, is_active: true },
  { state_id: 4, state_name: 'Maharashtra', country_id: 3, is_active: true },
  { state_id: 5, state_name: 'Delhi', country_id: 3, is_active: true },
  { state_id: 6, state_name: 'New York', country_id: 4, is_active: true },
  { state_id: 7, state_name: 'Greater London', country_id: 5, is_active: true }
];
