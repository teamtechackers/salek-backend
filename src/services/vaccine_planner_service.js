import { query } from '../config/database.js';
import { VACCINE_PLANNER_TABLE, VACCINE_PLANNER_FIELDS, PLANNER_STATUS, PLANNER_PRIORITY } from '../models/vaccine_planner_model.js';
import { VACCINES_TABLE, VACCINES_FIELDS } from '../models/vaccines_model.js';
import { USER_VACCINES_TABLE, USER_VACCINES_FIELDS } from '../models/user_vaccines_model.js';
import { getUserProfile } from './user_service.js';
import logger from '../config/logger.js';

const calculateAgeInMonths = (dateOfBirth) => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  const diffTime = today - birth;
  const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  return diffMonths;
};

const calculateDaysFromToday = (targetDate) => {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target - today;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const determinePriority = (status, daysFromToday, vaccineType) => {
  if (status === PLANNER_STATUS.OVERDUE) {
    return PLANNER_PRIORITY.URGENT;
  }
  
  if (status === PLANNER_STATUS.UPCOMING) {
    if (daysFromToday <= 30 && vaccineType === 'Mandatory') {
      return PLANNER_PRIORITY.HIGH;
    } else if (daysFromToday <= 90) {
      return PLANNER_PRIORITY.MEDIUM;
    } else {
      return PLANNER_PRIORITY.LOW;
    }
  }
  
  return PLANNER_PRIORITY.MEDIUM;
};

const generateReminderMessage = (vaccineName, status, daysFromToday) => {
  if (status === PLANNER_STATUS.OVERDUE) {
    return `URGENT: ${vaccineName} is ${Math.abs(daysFromToday)} days overdue`;
  } else if (status === PLANNER_STATUS.UPCOMING) {
    if (daysFromToday <= 7) {
      return `REMINDER: ${vaccineName} is due in ${daysFromToday} days`;
    } else if (daysFromToday <= 30) {
      return `${vaccineName} is due in ${daysFromToday} days`;
    } else {
      return `${vaccineName} is scheduled for ${daysFromToday} days from now`;
    }
  }
  return `${vaccineName} vaccination reminder`;
};

export const generateUserVaccinePlanner = async (userId) => {
  try {
    const userResult = await getUserProfile(userId);
    if (!userResult.success) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const user = userResult.user;
    if (!user.dob) {
      return {
        success: false,
        error: 'User date of birth is required for vaccine planning'
      };
    }

    const currentAgeMonths = calculateAgeInMonths(user.dob);
    const today = new Date();
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(today.getFullYear() + 2);

    // Get all age-appropriate vaccines
    const vaccinesSql = `
      SELECT * FROM ${VACCINES_TABLE}
      WHERE ${VACCINES_FIELDS.MIN_AGE_MONTHS} <= ?
      AND (${VACCINES_FIELDS.MAX_AGE_MONTHS} IS NULL OR ${VACCINES_FIELDS.MAX_AGE_MONTHS} >= ?)
      AND ${VACCINES_FIELDS.IS_ACTIVE} = true
      ORDER BY ${VACCINES_FIELDS.MIN_AGE_MONTHS}, ${VACCINES_FIELDS.TYPE}
    `;
    
    const availableVaccines = await query(vaccinesSql, [currentAgeMonths, currentAgeMonths]);

    // Get user's completed vaccines
    const completedVaccinesSql = `
      SELECT ${USER_VACCINES_FIELDS.VACCINE_ID}
      FROM ${USER_VACCINES_TABLE}
      WHERE ${USER_VACCINES_FIELDS.USER_ID} = ?
      AND ${USER_VACCINES_FIELDS.STATUS} = 'Completed'
      AND ${USER_VACCINES_FIELDS.IS_ACTIVE} = true
    `;
    
    const completedVaccines = await query(completedVaccinesSql, [userId]);
    const completedVaccineIds = completedVaccines.map(v => v.vaccine_id);

    // Clear existing planner data for this user
    await query(
      `DELETE FROM ${VACCINE_PLANNER_TABLE} WHERE ${VACCINE_PLANNER_FIELDS.USER_ID} = ?`,
      [userId]
    );

    const plannerData = [];
    let plannerId = 1;

    for (const vaccine of availableVaccines) {
      // Skip if already completed (except recurring vaccines)
      if (completedVaccineIds.includes(vaccine.vaccine_id) && 
          !vaccine.frequency.includes('Annual') && 
          !vaccine.frequency.includes('Every')) {
        continue;
      }

      let scheduledDate;
      let status;

      // Handle different vaccine types
      if (vaccine.frequency.includes('Annual')) {
        // Annual vaccines - schedule for current year and next year
        const currentYearDate = new Date(today.getFullYear(), 2, 15); // March 15
        const nextYearDate = new Date(today.getFullYear() + 1, 2, 15);
        
        // Add current year if not passed
        if (currentYearDate >= today) {
          scheduledDate = currentYearDate.toISOString().split('T')[0];
          status = PLANNER_STATUS.UPCOMING;
        } else {
          scheduledDate = currentYearDate.toISOString().split('T')[0];
          status = PLANNER_STATUS.OVERDUE;
        }

        const daysFromToday = calculateDaysFromToday(scheduledDate);
        const priority = determinePriority(status, daysFromToday, vaccine.type);
        const reminderMessage = generateReminderMessage(vaccine.name, status, daysFromToday);

        plannerData.push({
          plannerId: plannerId++,
          userId: userId,
          vaccineId: vaccine.vaccine_id,
          scheduledDate: scheduledDate,
          status: status,
          priority: priority,
          reminderMessage: reminderMessage,
          reminderDate: status === PLANNER_STATUS.OVERDUE ? today.toISOString().split('T')[0] : 
                       new Date(new Date(scheduledDate).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reminderTime: '09:00:00'
        });

        // Add next year
        const nextYearDays = calculateDaysFromToday(nextYearDate.toISOString().split('T')[0]);
        if (nextYearDays <= 730) { // Within 2 years
          plannerData.push({
            plannerId: plannerId++,
            userId: userId,
            vaccineId: vaccine.vaccine_id,
            scheduledDate: nextYearDate.toISOString().split('T')[0],
            status: PLANNER_STATUS.UPCOMING,
            priority: determinePriority(PLANNER_STATUS.UPCOMING, nextYearDays, vaccine.type),
            reminderMessage: generateReminderMessage(vaccine.name, PLANNER_STATUS.UPCOMING, nextYearDays),
            reminderDate: new Date(nextYearDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reminderTime: '09:00:00'
          });
        }

      } else if (vaccine.frequency.includes('Every 10 years')) {
        // 10-year boosters
        const lastBoosterYear = Math.floor(currentAgeMonths / 120) * 10;
        const nextBoosterDate = new Date(user.dob);
        nextBoosterDate.setFullYear(nextBoosterDate.getFullYear() + lastBoosterYear + 10);

        if (nextBoosterDate <= twoYearsFromNow) {
          scheduledDate = nextBoosterDate.toISOString().split('T')[0];
          status = nextBoosterDate <= today ? PLANNER_STATUS.OVERDUE : PLANNER_STATUS.UPCOMING;
          
          const daysFromToday = calculateDaysFromToday(scheduledDate);
          const priority = determinePriority(status, daysFromToday, vaccine.type);
          const reminderMessage = generateReminderMessage(vaccine.name, status, daysFromToday);

          plannerData.push({
            plannerId: plannerId++,
            userId: userId,
            vaccineId: vaccine.vaccine_id,
            scheduledDate: scheduledDate,
            status: status,
            priority: priority,
            reminderMessage: reminderMessage,
            reminderDate: status === PLANNER_STATUS.OVERDUE ? today.toISOString().split('T')[0] : 
                         new Date(new Date(scheduledDate).getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reminderTime: '10:00:00'
          });
        }

      } else {
        // One-time or specific age vaccines
        if (!completedVaccineIds.includes(vaccine.vaccine_id)) {
          // Schedule based on minimum age
          const scheduleDate = new Date(user.dob);
          scheduleDate.setMonth(scheduleDate.getMonth() + vaccine.min_age_months);

          if (scheduleDate <= twoYearsFromNow) {
            scheduledDate = scheduleDate.toISOString().split('T')[0];
            status = scheduleDate <= today ? PLANNER_STATUS.OVERDUE : PLANNER_STATUS.UPCOMING;
            
            const daysFromToday = calculateDaysFromToday(scheduledDate);
            const priority = determinePriority(status, daysFromToday, vaccine.type);
            const reminderMessage = generateReminderMessage(vaccine.name, status, daysFromToday);

            plannerData.push({
              plannerId: plannerId++,
              userId: userId,
              vaccineId: vaccine.vaccine_id,
              scheduledDate: scheduledDate,
              status: status,
              priority: priority,
              reminderMessage: reminderMessage,
              reminderDate: status === PLANNER_STATUS.OVERDUE ? today.toISOString().split('T')[0] : 
                           new Date(new Date(scheduledDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              reminderTime: '09:00:00'
            });
          }
        }
      }
    }

    // Insert planner data into database
    for (const plan of plannerData) {
      const insertSql = `
        INSERT INTO ${VACCINE_PLANNER_TABLE} (
          ${VACCINE_PLANNER_FIELDS.USER_ID},
          ${VACCINE_PLANNER_FIELDS.VACCINE_ID},
          ${VACCINE_PLANNER_FIELDS.SCHEDULED_DATE},
          ${VACCINE_PLANNER_FIELDS.STATUS},
          ${VACCINE_PLANNER_FIELDS.PRIORITY},
          ${VACCINE_PLANNER_FIELDS.NOTES},
          ${VACCINE_PLANNER_FIELDS.REMINDER_MESSAGE},
          ${VACCINE_PLANNER_FIELDS.REMINDER_DATE},
          ${VACCINE_PLANNER_FIELDS.REMINDER_TIME}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await query(insertSql, [
        plan.userId,
        plan.vaccineId,
        plan.scheduledDate,
        plan.status,
        plan.priority,
        null,
        plan.reminderMessage,
        plan.reminderDate,
        plan.reminderTime
      ]);
    }

    logger.info(`Vaccine planner generated for user ${userId}: ${plannerData.length} vaccines planned`);
    
    return {
      success: true,
      plannedCount: plannerData.length
    };
  } catch (error) {
    logger.error('Generate vaccine planner error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserVaccinePlanner = async (userId) => {
  try {
    const userResult = await getUserProfile(userId);
    if (!userResult.success) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const sql = `
      SELECT 
        vp.${VACCINE_PLANNER_FIELDS.PLANNER_ID},
        vp.${VACCINE_PLANNER_FIELDS.VACCINE_ID},
        vp.${VACCINE_PLANNER_FIELDS.SCHEDULED_DATE},
        vp.${VACCINE_PLANNER_FIELDS.STATUS},
        vp.${VACCINE_PLANNER_FIELDS.PRIORITY},
        vp.${VACCINE_PLANNER_FIELDS.COMPLETED_DATE},
        vp.${VACCINE_PLANNER_FIELDS.GIVEN_AT},
        vp.${VACCINE_PLANNER_FIELDS.NOTES},
        vp.${VACCINE_PLANNER_FIELDS.REMINDER_TITLE},
        vp.${VACCINE_PLANNER_FIELDS.REMINDER_MESSAGE},
        vp.${VACCINE_PLANNER_FIELDS.REMINDER_DATE},
        vp.${VACCINE_PLANNER_FIELDS.REMINDER_TIME},
        vp.${VACCINE_PLANNER_FIELDS.IS_REMINDER},
        v.${VACCINES_FIELDS.NAME} as vaccine_name,
        v.${VACCINES_FIELDS.CATEGORY},
        v.${VACCINES_FIELDS.SUB_CATEGORY},
        v.${VACCINES_FIELDS.DOSE},
        v.${VACCINES_FIELDS.ROUTE},
        v.${VACCINES_FIELDS.SITE},
        v.${VACCINES_FIELDS.NOTES} as vaccine_notes
      FROM ${VACCINE_PLANNER_TABLE} vp
      JOIN ${VACCINES_TABLE} v ON vp.${VACCINE_PLANNER_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      WHERE vp.${VACCINE_PLANNER_FIELDS.USER_ID} = ?
      AND vp.${VACCINE_PLANNER_FIELDS.IS_ACTIVE} = true
      ORDER BY 
        CASE 
          WHEN vp.${VACCINE_PLANNER_FIELDS.STATUS} = 'overdue' THEN 1
          WHEN vp.${VACCINE_PLANNER_FIELDS.STATUS} = 'upcoming' THEN 2
          WHEN vp.${VACCINE_PLANNER_FIELDS.STATUS} = 'completed' THEN 3
          ELSE 4
        END,
        vp.${VACCINE_PLANNER_FIELDS.SCHEDULED_DATE}
    `;

    const plannerResults = await query(sql, [userId]);

    const formattedPlanner = plannerResults.map(plan => {
      const daysFromToday = calculateDaysFromToday(plan.scheduled_date);
      
      return {
        plannerId: plan.planner_id,
        vaccineId: plan.vaccine_id,
        vaccineName: plan.vaccine_name,
        category: plan.category,
        subCategory: plan.sub_category,
        status: plan.status,
        scheduledDate: plan.scheduled_date,
        daysFromToday: daysFromToday,
        priority: plan.priority,
        dose: plan.dose,
        route: plan.route,
        site: plan.site,
        notes: plan.vaccine_notes || `${plan.vaccine_name} vaccination`,
        reminder: plan.is_reminder ? {
          title: plan.reminder_title || `${plan.vaccine_name} Reminder`,
          message: plan.reminder_message || `${plan.vaccine_name} vaccine is ${plan.status}`,
          reminderDate: plan.reminder_date,
          reminderTime: plan.reminder_time?.substring(0, 5) || '09:00'
        } : null
      };
    });

    return {
      success: true,
      planner: formattedPlanner
    };
  } catch (error) {
    logger.error('Get vaccine planner error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const updatePlannerStatus = async (plannerId, status, completedDate = null, givenAt = null, notes = null) => {
  try {
    const sql = `
      UPDATE ${VACCINE_PLANNER_TABLE}
      SET 
        ${VACCINE_PLANNER_FIELDS.STATUS} = ?,
        ${VACCINE_PLANNER_FIELDS.COMPLETED_DATE} = ?,
        ${VACCINE_PLANNER_FIELDS.GIVEN_AT} = ?,
        ${VACCINE_PLANNER_FIELDS.NOTES} = ?,
        ${VACCINE_PLANNER_FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE ${VACCINE_PLANNER_FIELDS.PLANNER_ID} = ?
      AND ${VACCINE_PLANNER_FIELDS.IS_ACTIVE} = true
    `;

    const result = await query(sql, [status, completedDate, givenAt, notes, plannerId]);

    if (result.affectedRows === 0) {
      return {
        success: false,
        error: 'Planner record not found'
      };
    }

    return {
      success: true,
      message: 'Planner status updated successfully'
    };
  } catch (error) {
    logger.error('Update planner status error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const updatePlannerReminder = async (userId, plannerId, reminderData) => {
  try {
    const { is_reminder, title, message, date, time } = reminderData;
    
    const sql = `
      UPDATE ${VACCINE_PLANNER_TABLE}
      SET 
        ${VACCINE_PLANNER_FIELDS.IS_REMINDER} = ?,
        ${VACCINE_PLANNER_FIELDS.REMINDER_TITLE} = ?,
        ${VACCINE_PLANNER_FIELDS.REMINDER_MESSAGE} = ?,
        ${VACCINE_PLANNER_FIELDS.REMINDER_DATE} = ?,
        ${VACCINE_PLANNER_FIELDS.REMINDER_TIME} = ?
      WHERE ${VACCINE_PLANNER_FIELDS.USER_ID} = ?
      AND ${VACCINE_PLANNER_FIELDS.PLANNER_ID} = ?
      AND ${VACCINE_PLANNER_FIELDS.IS_ACTIVE} = true
    `;
    
    const params = [
      is_reminder ? 1 : 0,
      title || null,
      message || null,
      date || null,
      time || '09:00:00',
      userId,
      plannerId
    ];
    
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      return { success: false, error: 'Planner entry not found' };
    }
    
    return { success: true, message: 'Reminder updated successfully' };
  } catch (error) {
    logger.error('Update planner reminder error:', error);
    return { success: false, error: error.message };
  }
};
