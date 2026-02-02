export const CITIES_TABLE = 'cities';

export const CITIES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${CITIES_TABLE} (
    city_id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    state_id INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (state_id) REFERENCES states(state_id) ON DELETE CASCADE,
    INDEX idx_state_city (state_id, city_name),
    INDEX idx_active (is_active)
  )
`;

export const CITIES_FIELDS = {
  CITY_ID: 'city_id',
  CITY_NAME: 'city_name',
  STATE_ID: 'state_id',
  IS_ACTIVE: 'is_active',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at'
};

export const CITIES_DATA = [
  { city_id: 1, city_name: 'Karachi', state_id: 1, is_active: true },
  { city_id: 2, city_name: 'Lahore', state_id: 2, is_active: true },
  { city_id: 3, city_name: 'Islamabad', state_id: 3, is_active: true },
  { city_id: 4, city_name: 'Mumbai', state_id: 4, is_active: true },
  { city_id: 5, city_name: 'Delhi', state_id: 5, is_active: true },
  { city_id: 6, city_name: 'New York City', state_id: 6, is_active: true },
  { city_id: 7, city_name: 'London', state_id: 7, is_active: true }
];
