export const USER_VACCINES_TABLE = 'user_vaccines';

export const USER_VACCINES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${USER_VACCINES_TABLE} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vaccine_id INT NOT NULL,
    status ENUM('Pending', 'Completed', 'Missed', 'Scheduled') DEFAULT 'Pending',
    given_date DATE DEFAULT (CURRENT_DATE),
    scheduled_date DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(vaccine_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vaccine (user_id, vaccine_id),
    INDEX idx_user_id (user_id),
    INDEX idx_vaccine_id (vaccine_id),
    INDEX idx_status (status),
    INDEX idx_given_date (given_date)
  )
`;

export const USER_VACCINES_FIELDS = {
  ID: 'id',
  USER_ID: 'user_id',
  VACCINE_ID: 'vaccine_id',
  STATUS: 'status',
  GIVEN_DATE: 'given_date',
  SCHEDULED_DATE: 'scheduled_date',
  NOTES: 'notes',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_ACTIVE: 'is_active'
};

export const VACCINE_STATUS = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  SCHEDULED: 'Scheduled'
};
