export const USER_VACCINES_TABLE = 'user_vaccines';

export const USER_VACCINES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${USER_VACCINES_TABLE} (
    user_vaccine_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vaccine_id INT NOT NULL,
    schedule_id INT NOT NULL,
        status ENUM('pending', 'completed', 'missed', 'scheduled', 'overdue', 'due_soon', 'upcoming') DEFAULT 'pending',
    scheduled_date DATE NULL,
    completed_date DATE NULL,
    dose_number INT DEFAULT 1,
    city_id INT NULL,
    image_url VARCHAR(500) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(vaccine_id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES vaccine_schedule(schedule_id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(city_id) ON DELETE SET NULL,
    
    INDEX idx_user_vaccine (user_id, vaccine_id),
    INDEX idx_reminder_date (reminder_date, is_reminder),
    INDEX idx_status (status),
    INDEX idx_schedule (schedule_id)
  )
`;

export const USER_VACCINES_FIELDS = {
  USER_VACCINE_ID: 'user_vaccine_id',
  USER_ID: 'user_id',
  VACCINE_ID: 'vaccine_id',
  SCHEDULE_ID: 'schedule_id',
  STATUS: 'status',
  SCHEDULED_DATE: 'scheduled_date',
  COMPLETED_DATE: 'completed_date',
  DOSE_NUMBER: 'dose_number',
  CITY_ID: 'city_id',
  IMAGE_URL: 'image_url',
  NOTES: 'notes',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_ACTIVE: 'is_active'
};

export const VACCINE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  MISSED: 'missed',
  SCHEDULED: 'scheduled',
  OVERDUE: 'overdue',
  DUE_SOON: 'due_soon',
  UPCOMING: 'upcoming'
};
