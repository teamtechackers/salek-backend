export const CITIES_TABLE = 'cities';

export const CITIES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${CITIES_TABLE} (
    city_id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    country_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(country_id) ON DELETE CASCADE,
    INDEX idx_country_city (country_id, city_name),
    INDEX idx_active (is_active)
  )
`;

export const CITIES_FIELDS = {
  CITY_ID: 'city_id',
  CITY_NAME: 'city_name',
  COUNTRY_ID: 'country_id',
  IS_ACTIVE: 'is_active',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at'
};

export const CITIES_DATA = [
  { city_id: 1, city_name: 'Karachi', country_id: 2 },
  { city_id: 2, city_name: 'Lahore', country_id: 2 },
  { city_id: 3, city_name: 'Islamabad', country_id: 2 },
  { city_id: 4, city_name: 'Mumbai', country_id: 3 },
  { city_id: 5, city_name: 'Delhi', country_id: 3 },
  { city_id: 6, city_name: 'New York', country_id: 4 },
  { city_id: 7, city_name: 'London', country_id: 5 }
];
