export const VACCINE_REMINDERS_TABLE = 'vaccine_reminders';

export const VACCINE_REMINDERS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${VACCINE_REMINDERS_TABLE} (
    reminder_id INT AUTO_INCREMENT PRIMARY KEY,
    user_vaccine_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NULL,
    reminder_date DATE NOT NULL,
    reminder_time TIME DEFAULT '09:00:00',
    frequency ENUM('once', 'daily', 'weekly', 'monthly') DEFAULT 'once',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_vaccine_id) REFERENCES user_vaccines(user_vaccine_id) ON DELETE CASCADE,
    
    INDEX idx_user_vaccine_reminder (user_vaccine_id, status),
    INDEX idx_reminder_date (reminder_date, status),
    INDEX idx_status (status)
  )
`;

export const VACCINE_REMINDERS_FIELDS = {
  REMINDER_ID: 'reminder_id',
  USER_VACCINE_ID: 'user_vaccine_id',
  TITLE: 'title',
  MESSAGE: 'message',
  REMINDER_DATE: 'reminder_date',
  REMINDER_TIME: 'reminder_time',
  FREQUENCY: 'frequency',
  STATUS: 'status',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_ACTIVE: 'is_active'
};

export const REMINDER_FREQUENCY = {
  ONCE: 'once',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

export const REMINDER_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};
