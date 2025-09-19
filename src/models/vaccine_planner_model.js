export const VACCINE_PLANNER_TABLE = 'vaccine_planner';

export const VACCINE_PLANNER_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${VACCINE_PLANNER_TABLE} (
    planner_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vaccine_id INT NOT NULL,
    scheduled_date DATE NOT NULL,
    status ENUM('upcoming', 'overdue', 'completed', 'skipped') DEFAULT 'upcoming',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    completed_date DATE NULL,
    given_at VARCHAR(100) NULL,
    notes TEXT NULL,
    reminder_title VARCHAR(200) NULL,
    reminder_message TEXT NULL,
    reminder_date DATE NULL,
    reminder_time TIME DEFAULT '09:00:00',
    is_reminder BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(vaccine_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vaccine_schedule (user_id, vaccine_id, scheduled_date),
    INDEX idx_user_scheduled (user_id, scheduled_date),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_reminder_date (reminder_date)
  )
`;

export const VACCINE_PLANNER_FIELDS = {
  PLANNER_ID: 'planner_id',
  USER_ID: 'user_id',
  VACCINE_ID: 'vaccine_id',
  SCHEDULED_DATE: 'scheduled_date',
  STATUS: 'status',
  PRIORITY: 'priority',
  COMPLETED_DATE: 'completed_date',
  GIVEN_AT: 'given_at',
  NOTES: 'notes',
  REMINDER_TITLE: 'reminder_title',
  REMINDER_MESSAGE: 'reminder_message',
  REMINDER_DATE: 'reminder_date',
  REMINDER_TIME: 'reminder_time',
  IS_REMINDER: 'is_reminder',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_ACTIVE: 'is_active'
};

export const PLANNER_STATUS = {
  UPCOMING: 'upcoming',
  OVERDUE: 'overdue',
  COMPLETED: 'completed',
  SKIPPED: 'skipped'
};

export const PLANNER_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};
