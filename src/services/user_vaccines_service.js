import { query } from '../config/database.js';
import { USER_VACCINES_TABLE, USER_VACCINES_FIELDS, VACCINE_STATUS } from '../models/user_vaccines_model.js';
import { VACCINES_TABLE, VACCINES_FIELDS } from '../models/vaccines_model.js';
import { VACCINE_SCHEDULE_TABLE, VACCINE_SCHEDULE_FIELDS } from '../models/vaccine_schedule_model.js';
import { CITIES_TABLE, CITIES_FIELDS } from '../models/cities_model.js';
import { USER_TABLE, USER_FIELDS } from '../models/user_model.js';
import logger from '../config/logger.js';

const parseVaccineFrequency = (vaccine) => {
  const doses = [];
  const { vaccine_id, total_doses, when_to_give, min_age_months, name } = vaccine;
  const minAgeDays = (min_age_months || 0) * 30;
  
  if (total_doses === 1) {
    doses.push({
      vaccine_id,
      dose_number: 1,
      min_age_days: minAgeDays
    });
  } else if (total_doses > 1) {
    if (when_to_give) {
      let doseCount = 0;
      
      if (when_to_give.toLowerCase().includes('birth')) {
        doses.push({
          vaccine_id,
          dose_number: ++doseCount,
          min_age_days: 0
        });
      }
      
      const weekMatches = when_to_give.match(/(\d+)\s*(?:,|\sand)?\s*weeks?/gi);
      if (weekMatches) {
        weekMatches.forEach(match => {
          const weekNum = parseInt(match.match(/\d+/)[0]);
          if (weekNum && !doses.some(d => d.min_age_days === weekNum * 7)) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: weekNum * 7
            });
          }
        });
      }
      
      const monthMatches = when_to_give.match(/(\d+)(?:-\d+)?\s*months?/gi);
      if (monthMatches) {
        monthMatches.forEach(match => {
          const monthNum = parseInt(match.match(/\d+/)[0]);
          if (monthNum && !doses.some(d => d.min_age_days === monthNum * 30)) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: monthNum * 30
            });
          }
        });
      }
      
      const yearMatches = when_to_give.match(/(\d+)\s*years?/gi);
      if (yearMatches) {
        yearMatches.forEach(match => {
          const yearNum = parseInt(match.match(/\d+/)[0]);
          if (yearNum && !doses.some(d => d.min_age_days === yearNum * 365)) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: yearNum * 365
            });
          }
        });
      }
    }
    
    while (doses.length < total_doses) {
      const doseNumber = doses.length + 1;
      let estimatedDays;
      
      if (doseNumber === 1) {
        estimatedDays = minAgeDays;
      } else {
        const lastDose = doses[doses.length - 1];
        if (lastDose.min_age_days < 365) {
          estimatedDays = lastDose.min_age_days + 42;
        } else {
          estimatedDays = lastDose.min_age_days + 365;
        }
      }
      
      doses.push({
        vaccine_id,
        dose_number: doseNumber,
        min_age_days: estimatedDays
      });
    }
    
    doses.sort((a, b) => a.min_age_days - b.min_age_days);
    doses.forEach((dose, index) => {
      dose.dose_number = index + 1;
    });
  }
  
  return doses;
};

export const generateUserVaccines = async (userId) => {
  try {
    const userResult = await query(`SELECT ${USER_FIELDS.DOB}, ${USER_FIELDS.COUNTRY} FROM ${USER_TABLE} WHERE ${USER_FIELDS.ID} = ?`, [userId]);
    if (userResult.length === 0) {
      return { success: false, error: 'User not found' };
    }
    const user = userResult[0];
    const userDob = user.dob;

    if (!userDob) {
      return { success: false, error: 'User Date of Birth is required to generate vaccine schedule' };
    }

    const birthDate = new Date(userDob);
    const hundredYearsFromBirth = new Date(birthDate);
    hundredYearsFromBirth.setFullYear(birthDate.getFullYear() + 100);
    const maxAgeDays = Math.ceil((hundredYearsFromBirth.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));

    const vaccinesSql = `
      SELECT * FROM ${VACCINES_TABLE}
      WHERE ${VACCINES_FIELDS.IS_ACTIVE} = true 
      AND ${VACCINES_FIELDS.MIN_AGE_MONTHS} * 30 <= ?
      ORDER BY ${VACCINES_FIELDS.MIN_AGE_MONTHS} ASC
    `;
    const vaccines = await query(vaccinesSql, [maxAgeDays]);

    await query(`DELETE FROM ${USER_VACCINES_TABLE} WHERE ${USER_VACCINES_FIELDS.USER_ID} = ?`, [userId]);

    let addedCount = 0;
    
    for (const vaccine of vaccines) {
      const dosesSchedule = parseVaccineFrequency(vaccine);
      
      for (const dose of dosesSchedule) {
        const scheduledDate = new Date(userDob);
        scheduledDate.setDate(scheduledDate.getDate() + dose.min_age_days);
        
        if (scheduledDate <= hundredYearsFromBirth) {
          const insertSql = `
            INSERT INTO ${USER_VACCINES_TABLE} (
              ${USER_VACCINES_FIELDS.USER_ID},
              ${USER_VACCINES_FIELDS.VACCINE_ID},
              ${USER_VACCINES_FIELDS.SCHEDULED_DATE},
              ${USER_VACCINES_FIELDS.STATUS},
              ${USER_VACCINES_FIELDS.DOSE_NUMBER}
            ) VALUES (?, ?, ?, ?, ?)
          `;
          await query(insertSql, [
            userId,
            dose.vaccine_id,
            scheduledDate.toISOString().split('T')[0],
            'pending',
            dose.dose_number
          ]);
          addedCount++;
        }
      }
    }

    logger.info(`Generated ${addedCount} vaccine doses for user ${userId}`);
    
    if (addedCount > 0) {
      await updateAllVaccineStatuses(userId);
    }
    
    return { success: true, addedCount };
  } catch (error) {
    logger.error('Generate user vaccines error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserVaccines = async (userId) => {
  try {
    await updateAllVaccineStatuses(userId);
    
    const currentDate = new Date();
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(currentDate.getFullYear() + 2);
    const maxDate = twoYearsFromNow.toISOString().split('T')[0];
    
    const sql = `
      SELECT 
        uv.${USER_VACCINES_FIELDS.USER_VACCINE_ID},
        uv.${USER_VACCINES_FIELDS.VACCINE_ID},
        uv.${USER_VACCINES_FIELDS.STATUS},
        uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE},
        uv.${USER_VACCINES_FIELDS.COMPLETED_DATE},
        uv.${USER_VACCINES_FIELDS.DOSE_NUMBER},
        uv.${USER_VACCINES_FIELDS.CITY_ID},
        uv.${USER_VACCINES_FIELDS.IMAGE_URL},
        uv.${USER_VACCINES_FIELDS.NOTES},
        c.${CITIES_FIELDS.CITY_NAME}
      FROM ${USER_VACCINES_TABLE} uv
      LEFT JOIN ${CITIES_TABLE} c ON uv.${USER_VACCINES_FIELDS.CITY_ID} = c.${CITIES_FIELDS.CITY_ID}
      WHERE uv.${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND uv.${USER_VACCINES_FIELDS.IS_ACTIVE} = true
      AND uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE} <= ?
      ORDER BY uv.${USER_VACCINES_FIELDS.VACCINE_ID}, uv.${USER_VACCINES_FIELDS.DOSE_NUMBER} ASC
    `;
    
    const vaccines = await query(sql, [userId, maxDate]);
    const formattedVaccines = [];
    
    for (const vaccine of vaccines) {
      const remindersSql = `
        SELECT 
          reminder_id,
          title,
          message,
          reminder_date,
          reminder_time,
          frequency,
          status
        FROM vaccine_reminders 
        WHERE user_vaccine_id = ? 
        AND is_active = true 
        AND status = 'active'
        ORDER BY reminder_date ASC
      `;
      
      const reminders = await query(remindersSql, [vaccine.user_vaccine_id]);
      
      const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toISOString().split('T')[0];
      };

      const formattedReminders = reminders.map(reminder => ({
        reminder_id: reminder.reminder_id,
        title: reminder.title,
        message: reminder.message,
        date: formatDate(reminder.reminder_date),
        time: reminder.reminder_time?.substring(0, 5) || '09:00',
        frequency: reminder.frequency,
        status: reminder.status
      }));

      formattedVaccines.push({
        user_vaccine_id: vaccine.user_vaccine_id,
        vaccine_id: vaccine.vaccine_id,
        status: vaccine.status,
        scheduled_date: formatDate(vaccine.scheduled_date),
        completed_date: formatDate(vaccine.completed_date),
        dose_number: vaccine.dose_number,
        city_id: vaccine.city_id,
        city_name: vaccine.city_name,
        image_url: vaccine.image_url,
        notes: vaccine.notes,
        reminders: formattedReminders
      });
    }
    
    return { success: true, vaccines: formattedVaccines };
  } catch (error) {
    logger.error('Get user vaccines error:', error);
    return { success: false, error: error.message };
  }
};

export const calculateVaccineStatus = (scheduledDate, currentDate) => {
  const scheduled = new Date(scheduledDate);
  const current = new Date(currentDate);
  const diffTime = scheduled.getTime() - current.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays <= 30) {
    return 'due_soon';
  } else {
    return 'upcoming';
  }
};

export const updateAllVaccineStatuses = async (userId) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const sql = `
      SELECT ${USER_VACCINES_FIELDS.USER_VACCINE_ID}, ${USER_VACCINES_FIELDS.SCHEDULED_DATE}, ${USER_VACCINES_FIELDS.STATUS}
      FROM ${USER_VACCINES_TABLE}
      WHERE ${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND ${USER_VACCINES_FIELDS.STATUS} != 'completed'
      AND ${USER_VACCINES_FIELDS.IS_ACTIVE} = true
    `;
    
    const vaccines = await query(sql, [userId]);
    let updatedCount = 0;
    
    for (const vaccine of vaccines) {
      const calculatedStatus = calculateVaccineStatus(vaccine.scheduled_date, currentDate);
      
      if (calculatedStatus !== vaccine.status) {
        try {
          const updateSql = `
            UPDATE ${USER_VACCINES_TABLE}
            SET ${USER_VACCINES_FIELDS.STATUS} = ?, ${USER_VACCINES_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
            WHERE ${USER_VACCINES_FIELDS.USER_VACCINE_ID} = ?
          `;
          
          await query(updateSql, [calculatedStatus, vaccine.user_vaccine_id]);
          updatedCount++;
          logger.info(`Updated vaccine ${vaccine.user_vaccine_id} status from ${vaccine.status} to ${calculatedStatus}`);
        } catch (updateError) {
          logger.warn(`Failed to update vaccine ${vaccine.user_vaccine_id} status: ${updateError.message}`);
        }
      }
    }
    
    logger.info(`Updated vaccine statuses for user ${userId}: ${updatedCount}/${vaccines.length} vaccines processed`);
    return { success: true, updated_count: updatedCount };
  } catch (error) {
    logger.error('Update all vaccine statuses error:', error);
    return { success: false, error: error.message };
  }
};

export const updateVaccineStatus = async (userVaccineId, status, completedDate = null, cityId = null, imageUrl = null, notes = null) => {
  try {
    const sql = `
      UPDATE ${USER_VACCINES_TABLE}
      SET 
        ${USER_VACCINES_FIELDS.STATUS} = ?,
        ${USER_VACCINES_FIELDS.COMPLETED_DATE} = ?,
        ${USER_VACCINES_FIELDS.CITY_ID} = ?,
        ${USER_VACCINES_FIELDS.IMAGE_URL} = ?,
        ${USER_VACCINES_FIELDS.NOTES} = ?,
        ${USER_VACCINES_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${USER_VACCINES_FIELDS.USER_VACCINE_ID} = ?
      AND ${USER_VACCINES_FIELDS.IS_ACTIVE} = true
    `;
    
    const finalCompletedDate = status === VACCINE_STATUS.COMPLETED ? 
      (completedDate || new Date().toISOString().split('T')[0]) : null;
    
    const result = await query(sql, [status, finalCompletedDate, cityId, imageUrl, notes, userVaccineId]);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'User vaccine record not found' };
    }
    
    // Get user_id for this vaccine to update other statuses
    const getUserSql = `SELECT ${USER_VACCINES_FIELDS.USER_ID} FROM ${USER_VACCINES_TABLE} WHERE ${USER_VACCINES_FIELDS.USER_VACCINE_ID} = ?`;
    const userResult = await query(getUserSql, [userVaccineId]);
    
    if (userResult.length > 0) {
      // Update all other vaccine statuses after marking one as completed
      await updateAllVaccineStatuses(userResult[0].user_id);
    }
    
    return { success: true, message: 'Vaccine status updated successfully' };
  } catch (error) {
    logger.error('Update vaccine status error:', error);
    return { success: false, error: error.message };
  }
};

export const updateVaccineReminder = async (userVaccineId, reminderData) => {
  try {
    const { is_reminder, title, message, date, time, frequency } = reminderData;
    
    const sql = `
      UPDATE ${USER_VACCINES_TABLE}
      SET 
        ${USER_VACCINES_FIELDS.IS_REMINDER} = ?,
        ${USER_VACCINES_FIELDS.REMINDER_TITLE} = ?,
        ${USER_VACCINES_FIELDS.REMINDER_MESSAGE} = ?,
        ${USER_VACCINES_FIELDS.REMINDER_DATE} = ?,
        ${USER_VACCINES_FIELDS.REMINDER_TIME} = ?,
        ${USER_VACCINES_FIELDS.REMINDER_FREQUENCY} = ?,
        ${USER_VACCINES_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${USER_VACCINES_FIELDS.USER_VACCINE_ID} = ?
      AND ${USER_VACCINES_FIELDS.IS_ACTIVE} = true
    `;
    
    const params = [
      is_reminder ? 1 : 0,
      title || null,
      message || null,
      date || null,
      time || '09:00:00',
      frequency || 'once',
      userVaccineId
    ];
    
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'User vaccine record not found' };
    }
    
    return { success: true, message: 'Vaccine reminder updated successfully' };
  } catch (error) {
    logger.error('Update vaccine reminder error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserVaccinesByStatus = async (userId, status) => {
  try {
    // This will automatically use the 2-year limit from getUserVaccines
    const result = await getUserVaccines(userId);
    if (!result.success) {
      return result;
    }
    
    const filteredVaccines = result.vaccines.filter(vaccine => vaccine.status === status);
    return { success: true, vaccines: filteredVaccines };
  } catch (error) {
    logger.error('Get user vaccines by status error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserReminders = async (userId) => {
  try {
    const sql = `
      SELECT 
        uv.${USER_VACCINES_FIELDS.USER_VACCINE_ID},
        uv.${USER_VACCINES_FIELDS.VACCINE_ID},
        uv.${USER_VACCINES_FIELDS.STATUS},
        uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE},
        uv.${USER_VACCINES_FIELDS.IS_REMINDER},
        uv.${USER_VACCINES_FIELDS.REMINDER_TITLE},
        uv.${USER_VACCINES_FIELDS.REMINDER_MESSAGE},
        uv.${USER_VACCINES_FIELDS.REMINDER_DATE},
        uv.${USER_VACCINES_FIELDS.REMINDER_TIME},
        uv.${USER_VACCINES_FIELDS.REMINDER_FREQUENCY},
        uv.${USER_VACCINES_FIELDS.REMINDER_STATUS}
      FROM ${USER_VACCINES_TABLE} uv
      WHERE uv.${USER_VACCINES_FIELDS.USER_ID} = ? 
      AND uv.${USER_VACCINES_FIELDS.IS_REMINDER} = true
      AND uv.${USER_VACCINES_FIELDS.IS_ACTIVE} = true
      ORDER BY uv.${USER_VACCINES_FIELDS.REMINDER_DATE} ASC
    `;
    
    const reminders = await query(sql, [userId]);
    
    const formattedReminders = reminders.map(reminder => ({
      user_vaccine_id: reminder.user_vaccine_id,
      vaccine_id: reminder.vaccine_id,
      status: reminder.status,
      scheduled_date: reminder.scheduled_date,
      reminder: {
        title: reminder.reminder_title,
        message: reminder.reminder_message,
        date: reminder.reminder_date,
        time: reminder.reminder_time?.substring(0, 5) || '09:00',
        frequency: reminder.reminder_frequency,
        status: reminder.reminder_status
      }
    }));
    
    return { success: true, reminders: formattedReminders };
  } catch (error) {
    logger.error('Get user reminders error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteVaccineReminder = async (userVaccineId) => {
  try {
    const sql = `
      UPDATE ${USER_VACCINES_TABLE}
      SET 
        ${USER_VACCINES_FIELDS.IS_REMINDER} = false,
        ${USER_VACCINES_FIELDS.REMINDER_TITLE} = NULL,
        ${USER_VACCINES_FIELDS.REMINDER_MESSAGE} = NULL,
        ${USER_VACCINES_FIELDS.REMINDER_DATE} = NULL,
        ${USER_VACCINES_FIELDS.REMINDER_TIME} = '09:00:00',
        ${USER_VACCINES_FIELDS.REMINDER_FREQUENCY} = 'once',
        ${USER_VACCINES_FIELDS.REMINDER_STATUS} = 'cancelled',
        ${USER_VACCINES_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${USER_VACCINES_FIELDS.USER_VACCINE_ID} = ?
      AND ${USER_VACCINES_FIELDS.IS_ACTIVE} = true
    `;
    
    const result = await query(sql, [userVaccineId]);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'User vaccine record not found' };
    }
    
    return { success: true, message: 'Vaccine reminder deleted successfully' };
  } catch (error) {
    logger.error('Delete vaccine reminder error:', error);
    return { success: false, error: error.message };
  }
};