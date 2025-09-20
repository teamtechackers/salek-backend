export const VACCINE_SCHEDULE_TABLE = 'vaccine_schedule';

export const VACCINE_SCHEDULE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${VACCINE_SCHEDULE_TABLE} (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    vaccine_id INT NOT NULL,
    min_age_days INT NOT NULL,
    max_age_days INT NULL,
    interval_days INT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    country_id INT NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(vaccine_id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES countries(country_id) ON DELETE CASCADE,
    INDEX idx_vaccine_country (vaccine_id, country_id),
    INDEX idx_age_range (min_age_days, max_age_days),
    INDEX idx_mandatory (is_mandatory)
  )
`;

export const VACCINE_SCHEDULE_FIELDS = {
  SCHEDULE_ID: 'schedule_id',
  VACCINE_ID: 'vaccine_id',
  MIN_AGE_DAYS: 'min_age_days',
  MAX_AGE_DAYS: 'max_age_days',
  INTERVAL_DAYS: 'interval_days',
  IS_MANDATORY: 'is_mandatory',
  COUNTRY_ID: 'country_id',
  NOTES: 'notes',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_ACTIVE: 'is_active'
};

export const VACCINE_SCHEDULE_DATA = [
  {
    schedule_id: 1,
    vaccine_id: 1, // BCG
    min_age_days: 0,
    max_age_days: 365,
    interval_days: null,
    is_mandatory: true,
    country_id: 1, // All
    notes: 'Birth dose, once in life'
  },
  {
    schedule_id: 2,
    vaccine_id: 2, // Hepatitis B
    min_age_days: 42,
    max_age_days: 49,
    interval_days: null,
    is_mandatory: true,
    country_id: 1, // All
    notes: 'First dose at 6 weeks'
  },
  {
    schedule_id: 3,
    vaccine_id: 2, // Hepatitis B
    min_age_days: 480,
    max_age_days: 720,
    interval_days: null,
    is_mandatory: true,
    country_id: 1, // All
    notes: 'Booster 16–24 months'
  },
  {
    schedule_id: 4,
    vaccine_id: 12, // Influenza
    min_age_days: 180,
    max_age_days: 36500,
    interval_days: 365,
    is_mandatory: true,
    country_id: 1, // All
    notes: 'Annual flu shot after 6 months'
  },
  {
    schedule_id: 5,
    vaccine_id: 24, // Tetanus
    min_age_days: 3650,
    max_age_days: 36500,
    interval_days: 3650,
    is_mandatory: true,
    country_id: 1, // All
    notes: 'Booster every 10 years'
  }
];
