import { query } from '../config/database.js';
import { VACCINE_REMINDERS_TABLE, VACCINE_REMINDERS_FIELDS, REMINDER_STATUS } from '../models/vaccine_reminders_model.js';
import { USER_VACCINES_TABLE, USER_VACCINES_FIELDS } from '../models/user_vaccines_model.js';
import { VACCINES_TABLE, VACCINES_FIELDS } from '../models/vaccines_model.js';
import logger from '../config/logger.js';

const normalizeReminderTime = (value) => {
  if (!value) {
    return '09:00:00';
  }
  // Accept both HH:mm and HH:mm:ss formats
  if (value.length === 5) {
    return `${value}:00`;
  }
  return value;
};

export const addVaccineReminder = async (userVaccineId, reminderData) => {
  try {
    const { title, message, date, time, frequency } = reminderData;
    
    // Check for duplicate reminder (same date and time for ANY vaccine)
    const checkDuplicateSql = `
      SELECT ${VACCINE_REMINDERS_FIELDS.REMINDER_ID}
      FROM ${VACCINE_REMINDERS_TABLE}
      WHERE ${VACCINE_REMINDERS_FIELDS.REMINDER_DATE} = ?
      AND ${VACCINE_REMINDERS_FIELDS.REMINDER_TIME} = ?
      AND ${VACCINE_REMINDERS_FIELDS.IS_ACTIVE} = true
      AND ${VACCINE_REMINDERS_FIELDS.STATUS} = 'active'
      AND ${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID} = ?
    `;
    
    const normalizedTime = normalizeReminderTime(time);
    const existingReminders = await query(checkDuplicateSql, [
      date,
      normalizedTime,
      userVaccineId
    ]);
    
    if (existingReminders.length > 0) {
      return { 
        success: false, 
        error: 'A reminder with the same date and time already exists' 
      };
    }
    
    const sql = `
      INSERT INTO ${VACCINE_REMINDERS_TABLE} (
        ${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID},
        ${VACCINE_REMINDERS_FIELDS.TITLE},
        ${VACCINE_REMINDERS_FIELDS.MESSAGE},
        ${VACCINE_REMINDERS_FIELDS.REMINDER_DATE},
        ${VACCINE_REMINDERS_FIELDS.REMINDER_TIME},
        ${VACCINE_REMINDERS_FIELDS.FREQUENCY}
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      userVaccineId,
      title,
      message || null,
      date,
      normalizedTime,
      frequency || 'once'
    ]);
    
    return { 
      success: true, 
      reminder_id: result.insertId,
      message: 'Vaccine reminder added successfully' 
    };
  } catch (error) {
    logger.error('Add vaccine reminder error:', error);
    return { success: false, error: error.message };
  }
};

export const getVaccineReminders = async (userVaccineId) => {
  try {
    const sql = `
      SELECT 
        vr.${VACCINE_REMINDERS_FIELDS.REMINDER_ID},
        vr.${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID},
        vr.${VACCINE_REMINDERS_FIELDS.TITLE},
        vr.${VACCINE_REMINDERS_FIELDS.MESSAGE},
        vr.${VACCINE_REMINDERS_FIELDS.REMINDER_DATE},
        vr.${VACCINE_REMINDERS_FIELDS.REMINDER_TIME},
        vr.${VACCINE_REMINDERS_FIELDS.FREQUENCY},
        vr.${VACCINE_REMINDERS_FIELDS.STATUS},
        vr.${VACCINE_REMINDERS_FIELDS.CREATED_AT}
      FROM ${VACCINE_REMINDERS_TABLE} vr
      WHERE vr.${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID} = ?
      AND vr.${VACCINE_REMINDERS_FIELDS.IS_ACTIVE} = true
      ORDER BY vr.${VACCINE_REMINDERS_FIELDS.REMINDER_DATE} ASC
    `;
    
    const reminders = await query(sql, [userVaccineId]);
    
    const formattedReminders = reminders.map(reminder => ({
      reminder_id: reminder.reminder_id,
      title: reminder.title,
      message: reminder.message,
      date: reminder.reminder_date,
      time: reminder.reminder_time?.substring(0, 5) || '09:00',
      frequency: reminder.frequency,
      status: reminder.status,
      created_at: reminder.created_at
    }));
    
    return { success: true, reminders: formattedReminders };
  } catch (error) {
    logger.error('Get vaccine reminders error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserAllReminders = async (userId) => {
  try {
    const sql = `
      SELECT 
        vr.${VACCINE_REMINDERS_FIELDS.REMINDER_ID},
        vr.${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID},
        vr.${VACCINE_REMINDERS_FIELDS.TITLE},
        vr.${VACCINE_REMINDERS_FIELDS.MESSAGE},
        vr.${VACCINE_REMINDERS_FIELDS.REMINDER_DATE},
        vr.${VACCINE_REMINDERS_FIELDS.REMINDER_TIME},
        vr.${VACCINE_REMINDERS_FIELDS.FREQUENCY},
        vr.${VACCINE_REMINDERS_FIELDS.STATUS},
        uv.${USER_VACCINES_FIELDS.VACCINE_ID},
        uv.${USER_VACCINES_FIELDS.STATUS} as vaccine_status,
        uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE},
        v.${VACCINES_FIELDS.NAME} as vaccine_name
      FROM ${VACCINE_REMINDERS_TABLE} vr
      JOIN ${USER_VACCINES_TABLE} uv ON vr.${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID} = uv.${USER_VACCINES_FIELDS.USER_VACCINE_ID}
      JOIN ${VACCINES_TABLE} v ON uv.${USER_VACCINES_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      WHERE uv.${USER_VACCINES_FIELDS.USER_ID} = ?
      AND vr.${VACCINE_REMINDERS_FIELDS.IS_ACTIVE} = true
      AND vr.${VACCINE_REMINDERS_FIELDS.STATUS} = 'active'
      ORDER BY vr.${VACCINE_REMINDERS_FIELDS.REMINDER_DATE} ASC
    `;
    
    const reminders = await query(sql, [userId]);
    
    const formattedReminders = reminders.map(reminder => ({
      reminder_id: reminder.reminder_id,
      user_vaccine_id: reminder.user_vaccine_id,
      vaccine_id: reminder.vaccine_id,
      vaccine_name: reminder.vaccine_name,
      vaccine_status: reminder.vaccine_status,
      scheduled_date: reminder.scheduled_date,
      reminder: {
        title: reminder.title,
        message: reminder.message,
        date: reminder.reminder_date,
        time: reminder.reminder_time?.substring(0, 5) || '09:00',
        frequency: reminder.frequency,
        status: reminder.status
      }
    }));
    
    return { success: true, reminders: formattedReminders };
  } catch (error) {
    logger.error('Get user all reminders error:', error);
    return { success: false, error: error.message };
  }
};

export const updateVaccineReminder = async (reminderId, reminderData) => {
  try {
    const { title, message, date, time, frequency, status } = reminderData;
    
    // First, get the current reminder to check for user_vaccine_id
    const getCurrentReminderSql = `
      SELECT ${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID}
      FROM ${VACCINE_REMINDERS_TABLE}
      WHERE ${VACCINE_REMINDERS_FIELDS.REMINDER_ID} = ?
      AND ${VACCINE_REMINDERS_FIELDS.IS_ACTIVE} = true
    `;
    
    const currentReminder = await query(getCurrentReminderSql, [reminderId]);
    
    if (currentReminder.length === 0) {
      return { success: false, error: 'Reminder not found' };
    }
    
    const userVaccineId = currentReminder[0].user_vaccine_id;
    
    // Check for duplicate reminder (same date and time for ANY vaccine) but exclude current reminder
    const checkDuplicateSql = `
      SELECT ${VACCINE_REMINDERS_FIELDS.REMINDER_ID}
      FROM ${VACCINE_REMINDERS_TABLE}
      WHERE ${VACCINE_REMINDERS_FIELDS.REMINDER_DATE} = ?
      AND ${VACCINE_REMINDERS_FIELDS.REMINDER_TIME} = ?
      AND ${VACCINE_REMINDERS_FIELDS.IS_ACTIVE} = true
      AND ${VACCINE_REMINDERS_FIELDS.STATUS} = 'active'
      AND ${VACCINE_REMINDERS_FIELDS.USER_VACCINE_ID} = ?
      AND ${VACCINE_REMINDERS_FIELDS.REMINDER_ID} != ?
    `;
    
    const normalizedTime = normalizeReminderTime(time);
    const existingReminders = await query(checkDuplicateSql, [
      date,
      normalizedTime,
      userVaccineId,
      reminderId
    ]);
    
    if (existingReminders.length > 0) {
      return { 
        success: false, 
        error: 'A reminder with the same date and time already exists' 
      };
    }
    
    const sql = `
      UPDATE ${VACCINE_REMINDERS_TABLE}
      SET 
        ${VACCINE_REMINDERS_FIELDS.TITLE} = ?,
        ${VACCINE_REMINDERS_FIELDS.MESSAGE} = ?,
        ${VACCINE_REMINDERS_FIELDS.REMINDER_DATE} = ?,
        ${VACCINE_REMINDERS_FIELDS.REMINDER_TIME} = ?,
        ${VACCINE_REMINDERS_FIELDS.FREQUENCY} = ?,
        ${VACCINE_REMINDERS_FIELDS.STATUS} = ?,
        ${VACCINE_REMINDERS_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${VACCINE_REMINDERS_FIELDS.REMINDER_ID} = ?
      AND ${VACCINE_REMINDERS_FIELDS.IS_ACTIVE} = true
    `;
    
    const result = await query(sql, [
      title,
      message || null,
      date,
      normalizedTime,
      frequency || 'once',
      status || 'active',
      reminderId
    ]);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'Reminder not found' };
    }
    
    return { success: true, message: 'Reminder updated successfully' };
  } catch (error) {
    logger.error('Update vaccine reminder error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteVaccineReminder = async (reminderId) => {
  try {
    const sql = `
      UPDATE ${VACCINE_REMINDERS_TABLE}
      SET 
        ${VACCINE_REMINDERS_FIELDS.STATUS} = 'cancelled',
        ${VACCINE_REMINDERS_FIELDS.IS_ACTIVE} = false,
        ${VACCINE_REMINDERS_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${VACCINE_REMINDERS_FIELDS.REMINDER_ID} = ?
    `;
    
    const result = await query(sql, [reminderId]);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'Reminder not found' };
    }
    
    return { success: true, message: 'Reminder deleted successfully' };
  } catch (error) {
    logger.error('Delete vaccine reminder error:', error);
    return { success: false, error: error.message };
  }
};
