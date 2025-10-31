export const NOTIFICATION_PERMISSIONS_TABLE = 'notification_permissions';

export const NOTIFICATION_PERMISSIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${NOTIFICATION_PERMISSIONS_TABLE} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification BOOLEAN DEFAULT FALSE,
    calendar BOOLEAN DEFAULT FALSE,
    email BOOLEAN DEFAULT FALSE,
    upcoming_vaccine BOOLEAN DEFAULT FALSE,
    missing_due_alert BOOLEAN DEFAULT FALSE,
    complete_vaccine BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_permissions (user_id)
  )
`;

export const NOTIFICATION_PERMISSIONS_FIELDS = {
  ID: 'id',
  USER_ID: 'user_id',
  NOTIFICATION: 'notification',
  CALENDAR: 'calendar',
  EMAIL: 'email',
  UPCOMING_VACCINE: 'upcoming_vaccine',
  MISSING_DUE_ALERT: 'missing_due_alert',
  COMPLETE_VACCINE: 'complete_vaccine',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at'
};
