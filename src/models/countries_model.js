export const COUNTRIES_TABLE = 'countries';

export const COUNTRIES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${COUNTRIES_TABLE} (
    country_id INT AUTO_INCREMENT PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL UNIQUE,
    country_code VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_country_code (country_code),
    INDEX idx_active (is_active)
  )
`;

export const COUNTRIES_FIELDS = {
  COUNTRY_ID: 'country_id',
  COUNTRY_NAME: 'country_name',
  COUNTRY_CODE: 'country_code',
  IS_ACTIVE: 'is_active',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at'
};

export const COUNTRIES_DATA = [
  { country_id: 1, country_name: 'All', country_code: 'ALL' },
  { country_id: 2, country_name: 'Pakistan', country_code: 'PK' },
  { country_id: 3, country_name: 'India', country_code: 'IN' },
  { country_id: 4, country_name: 'USA', country_code: 'US' },
  { country_id: 5, country_name: 'UK', country_code: 'GB' }
];
