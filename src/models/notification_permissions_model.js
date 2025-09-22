export const NOTIFICATION_PERMISSIONS_TABLE = 'notification_permissions';

export const NOTIFICATION_PERMISSIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${NOTIFICATION_PERMISSIONS_TABLE} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification BOOLEAN DEFAULT FALSE,
    calendar BOOLEAN DEFAULT FALSE,
    email BOOLEAN DEFAULT FALSE,
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
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at'
};
