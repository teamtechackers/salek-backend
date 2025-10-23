import { query } from '../config/database.js';
import { USER_VACCINES_TABLE, USER_VACCINES_FIELDS, VACCINE_STATUS } from '../models/user_vaccines_model.js';
import { VACCINES_TABLE, VACCINES_FIELDS } from '../models/vaccines_model.js';
import { VACCINE_SCHEDULE_TABLE, VACCINE_SCHEDULE_FIELDS } from '../models/vaccine_schedule_model.js';
import { CITIES_TABLE, CITIES_FIELDS } from '../models/cities_model.js';
import { USER_TABLE, USER_FIELDS } from '../models/user_model.js';
import logger from '../config/logger.js';

// Document-based vaccine schedule generator
const generateDocumentBasedSchedule = (userDob, countryId = 1) => {
  const birthDate = new Date(userDob);
  const today = new Date();
  const currentAgeDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const schedules = [];
  
  // Define age groups based on documents
  const ageGroups = {
    PRENATAL: { min: -270, max: 0 }, // 9 months before birth
    BIRTH_TO_1_YEAR: { min: 0, max: 365 },
    AGE_1_TO_5: { min: 366, max: 1825 },
    AGE_6_TO_18: { min: 1826, max: 6570 },
    AGE_18_TO_60: { min: 6571, max: 21900 },
    AGE_60_PLUS: { min: 21901, max: 36500 }
  };
  
  // Determine current age group
  let currentAgeGroup = null;
  for (const [groupName, range] of Object.entries(ageGroups)) {
    if (currentAgeDays >= range.min && currentAgeDays <= range.max) {
      currentAgeGroup = groupName;
      break;
    }
  }
  
  // If user is not born yet (prenatal), only show prenatal vaccines
  if (currentAgeDays < 0) {
    currentAgeGroup = 'PRENATAL';
  }
  
  // If user is over 60, show elderly vaccines
  if (currentAgeDays > 21900) {
    currentAgeGroup = 'AGE_60_PLUS';
  }
  
  return { currentAgeDays, currentAgeGroup, ageGroups };
};

// Parse vaccine frequency based on document schedules
const parseVaccineFrequency = (vaccine, userDob) => {
  const doses = [];
  const { vaccine_id, total_doses, when_to_give, min_age_months, name, category } = vaccine;
  
  // Convert months to days (more accurate than *30)
  const minAgeDays = Math.round((min_age_months || 0) * 30.44); // 30.44 days per month average
  
  // Calculate current age in days for filtering
  let dobString = userDob;
  if (userDob instanceof Date) {
    dobString = userDob.toISOString().split('T')[0];
  }
  const [year, month, day] = dobString.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day); // Use local timezone
  const today = new Date();
  const currentAgeDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (total_doses === 1) {
    doses.push({
      vaccine_id,
      dose_number: 1,
      min_age_days: minAgeDays,
      category
    });
  } else if (total_doses > 1) {
    if (when_to_give) {
      let doseCount = 0;
      
      // Handle birth doses
      if (when_to_give.toLowerCase().includes('birth')) {
        doses.push({
          vaccine_id,
          dose_number: ++doseCount,
          min_age_days: 0,
          category
        });
      }
      
      // Handle week-based schedules (6, 10, 14 weeks)
      const weekMatches = when_to_give.match(/\d+/g);
      if (weekMatches && when_to_give.toLowerCase().includes('week')) {
        weekMatches.forEach(match => {
          const weekNum = parseInt(match);
          if (weekNum && !doses.some(d => d.min_age_days === weekNum * 7)) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: weekNum * 7,
              category
            });
          }
        });
      }
      
      // Handle month-based schedules
      const monthMatches = when_to_give.match(/(\d+)(?:-\d+)?\s*months?/gi);
      if (monthMatches) {
        monthMatches.forEach(match => {
          const monthNum = parseInt(match.match(/\d+/)[0]);
          if (monthNum && !doses.some(d => d.min_age_days === Math.round(monthNum * 30.44))) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: Math.round(monthNum * 30.44),
              category
            });
          }
        });
      }
      
      // Handle year-based schedules
      const yearMatches = when_to_give.match(/(\d+)\s*years?/gi);
      if (yearMatches) {
        yearMatches.forEach(match => {
          const yearNum = parseInt(match.match(/\d+/)[0]);
          if (yearNum && !doses.some(d => d.min_age_days === Math.round(yearNum * 365.25))) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: Math.round(yearNum * 365.25),
              category
            });
          }
        });
      }
      
      // Handle booster schedules
      if (when_to_give.toLowerCase().includes('booster')) {
        // Add booster doses based on age group
        if (category === 'Child') {
          doses.push({
            vaccine_id,
            dose_number: ++doseCount,
            min_age_days: 486, // 16 months
            category
          });
        } else if (category === 'Adult') {
          doses.push({
            vaccine_id,
            dose_number: ++doseCount,
            min_age_days: 6571, // 18 years
            category
          });
        }
      }
      
      // Handle annual schedules
      if (when_to_give.toLowerCase().includes('annually') || when_to_give.toLowerCase().includes('annual')) {
        const startAge = minAgeDays;
        const endAge = 36500; // 100 years
        const interval = 365; // 1 year
        
        for (let age = startAge; age <= endAge; age += interval) {
          if (age >= currentAgeDays) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: age,
              category
            });
          }
        }
      }
      
      // Handle every 10 years schedules
      if (when_to_give.toLowerCase().includes('every 10 years')) {
        const startAge = minAgeDays;
        const endAge = 36500; // 100 years
        const interval = 3650; // 10 years
        
        for (let age = startAge; age <= endAge; age += interval) {
          if (age >= currentAgeDays) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: age,
              category
            });
          }
        }
      }
      
      // Handle every 3 years schedules
      if (when_to_give.toLowerCase().includes('every 3 years')) {
        const startAge = minAgeDays;
        const endAge = 36500; // 100 years
        const interval = 1095; // 3 years
        
        for (let age = startAge; age <= endAge; age += interval) {
          if (age >= currentAgeDays) {
            doses.push({
              vaccine_id,
              dose_number: ++doseCount,
              min_age_days: age,
              category
            });
          }
        }
      }
      
      // Handle Hepatitis A specific schedule (12-23 months, 2 doses, 6 months apart)
      if (name && name.toLowerCase().includes('hepatitis a') && when_to_give.includes('12–23 months')) {
        // First dose at 12 months
        doses.push({
          vaccine_id,
          dose_number: ++doseCount,
          min_age_days: 365, // 12 months
          category
        });
        // Second dose 6 months later (18 months)
        doses.push({
          vaccine_id,
          dose_number: ++doseCount,
          min_age_days: 548, // 18 months (12 + 6)
          category
        });
      }
      
      // Handle Tdap/Td specific schedule (10 years & 16 years, 2 doses)
      if (name && name.toLowerCase().includes('tdap') && when_to_give.includes('10 years & 16 years')) {
        // First dose at 10 years
        doses.push({
          vaccine_id,
          dose_number: ++doseCount,
          min_age_days: 3650, // 10 years
          category
        });
        // Second dose at 16 years
        doses.push({
          vaccine_id,
          dose_number: ++doseCount,
          min_age_days: 5840, // 16 years
          category
        });
      }
    }
  }
  
  // If no doses were generated, create a default one
  if (doses.length === 0) {
    doses.push({
      vaccine_id,
      dose_number: 1,
      min_age_days: minAgeDays,
      category
    });
  }
  
  return doses;
};

export const generateUserVaccines = async (userId, dependentId = null, yearsAhead = 2) => {
  try {
    let userResult, userDob, userCountry;
    
    if (dependentId) {
      // Generate vaccines for dependent
      const { DEPENDENTS_TABLE, DEPENDENTS_FIELDS } = await import('../models/dependents_model.js');
      userResult = await query(`SELECT DATE_FORMAT(${DEPENDENTS_FIELDS.DOB}, '%Y-%m-%d') as dob, ${DEPENDENTS_FIELDS.COUNTRY} FROM ${DEPENDENTS_TABLE} WHERE ${DEPENDENTS_FIELDS.DEPENDENT_ID} = ?`, [dependentId]);
      if (userResult.length === 0) {
        return { success: false, error: 'Dependent not found' };
      }
    } else {
      // Generate vaccines for user
      userResult = await query(`SELECT DATE_FORMAT(${USER_FIELDS.DOB}, '%Y-%m-%d') as dob, ${USER_FIELDS.COUNTRY} FROM ${USER_TABLE} WHERE ${USER_FIELDS.ID} = ?`, [userId]);
      if (userResult.length === 0) {
        return { success: false, error: 'User not found' };
      }
    }
    
    const user = userResult[0];
    userDob = user.dob;
    userCountry = user.country;

    if (!userDob) {
      return { success: false, error: 'Date of Birth is required to generate vaccine schedule' };
    }

    const birthDate = new Date(userDob);
    const { currentAgeDays, currentAgeGroup } = generateDocumentBasedSchedule(userDob, userCountry);

    // Get ALL vaccines for complete schedule (birth to 60+ years)
    let vaccinesSql;
    let vaccines;
    
    // Get ALL vaccines regardless of age - complete schedule from birth to 60+ years
    // Exclude deleted vaccines (is_active = 0)
    vaccinesSql = `
      SELECT * FROM ${VACCINES_TABLE}
      WHERE ${VACCINES_FIELDS.IS_ACTIVE} = true 
        AND (${VACCINES_FIELDS.NOTES} IS NULL OR ${VACCINES_FIELDS.NOTES} NOT LIKE '%[DELETED]%')
      ORDER BY ${VACCINES_FIELDS.MIN_AGE_MONTHS} ASC
    `;
    vaccines = await query(vaccinesSql);

    // Delete existing vaccines for user or dependent
    if (dependentId) {
      await query(`DELETE FROM ${USER_VACCINES_TABLE} WHERE ${USER_VACCINES_FIELDS.DEPENDENT_ID} = ?`, [dependentId]);
    } else {
      // Delete ALL vaccines for the user (both user and dependent vaccines)
      await query(`DELETE FROM ${USER_VACCINES_TABLE} WHERE ${USER_VACCINES_FIELDS.USER_ID} = ?`, [userId]);
    }

    let addedCount = 0;
    
    for (const vaccine of vaccines) {
      const dosesSchedule = parseVaccineFrequency(vaccine, userDob);
      
      for (const dose of dosesSchedule) {
        // Simple approach: just add days to user DOB string
        let dobString = userDob;
        if (userDob instanceof Date) {
          dobString = userDob.toISOString().split('T')[0];
        }
        
        // Ultra simple approach - for birth vaccines, use original DOB
        let dateString;
        let scheduledDate;
        
        if (dose.min_age_days === 0) {
          // Birth vaccine - add 1 day to DOB to avoid timezone conversion issues
          const [year, month, day] = dobString.split('-').map(Number);
          const dobDate = new Date(year, month - 1, day + 1); // Add 1 day
          dateString = `${dobDate.getFullYear()}-${String(dobDate.getMonth() + 1).padStart(2, '0')}-${String(dobDate.getDate()).padStart(2, '0')}`;
          scheduledDate = dobDate;
        } else {
          // Other vaccines - add days using proper date calculation
          const [year, month, day] = dobString.split('-').map(Number);
          scheduledDate = new Date(year, month - 1, day + dose.min_age_days);
          dateString = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
        }
        
        // Validate the scheduled date
        if (isNaN(scheduledDate.getTime())) {
          console.log(`Invalid scheduled date for ${vaccine.name} dose ${dose.dose_number}: ${scheduledDate}`);
          continue;
        }
        
        // Calculate status based on current date
        const today = new Date();
        const daysUntilDue = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let status = 'upcoming';
        if (daysUntilDue < 0) {
          status = 'overdue'; // Past dates
        } else if (daysUntilDue <= 30) {
          status = 'due_soon'; // Within 30 days
        } else {
          status = 'upcoming'; // All future vaccines (30+ days)
        }
        
        // Generate ALL vaccines from birth to 60+ years regardless of yearsAhead
        // yearsAhead is only used for display filtering, not generation
        // Always generate all vaccines for complete schedule
        try {
            const insertSql = `
              INSERT INTO ${USER_VACCINES_TABLE} (
                ${USER_VACCINES_FIELDS.USER_ID},
                ${USER_VACCINES_FIELDS.VACCINE_ID},
                ${USER_VACCINES_FIELDS.SCHEDULED_DATE},
                ${USER_VACCINES_FIELDS.STATUS},
                ${USER_VACCINES_FIELDS.DOSE_NUMBER},
                ${USER_VACCINES_FIELDS.DEPENDENT_ID}
              ) VALUES (?, ?, ?, ?, ?, ?)
            `;
            // For birth vaccines, use a different approach to avoid timezone issues
            let finalDateString;
            if (dose.min_age_days === 0) {
              // For birth vaccines, use the calculated dateString (with 1 day added)
              finalDateString = dateString; // Use the calculated date with 1 day added
            } else {
              finalDateString = dateString;
            }
            
            // Debug logging for birth vaccines
            if (dose.min_age_days === 0) {
              console.log(`Birth vaccine ${vaccine.name}: userDob=${userDob}, dobString=${dobString}, dateString=${dateString}, finalDateString=${finalDateString}`);
            }
            
            await query(insertSql, [
              userId,
              dose.vaccine_id,
              finalDateString,
              status,
              dose.dose_number,
              dependentId
            ]);
            addedCount++;
          } catch (error) {
            console.log(`Error inserting vaccine ${vaccine.name} dose ${dose.dose_number}:`, error.message);
            continue;
          }
      }
    }

    const logMessage = dependentId ? 
      `Generated ${addedCount} vaccine doses for dependent ${dependentId}` :
      `Generated ${addedCount} vaccine doses for user ${userId}`;
    logger.info(logMessage);
    
    if (addedCount > 0) {
      await updateAllVaccineStatuses(userId, dependentId);
    }
    
    return { success: true, addedCount, currentAgeGroup, currentAgeDays };
  } catch (error) {
    logger.error('Generate user vaccines error:', error);
    return { success: false, error: error.message };
  }
};

export const updateAllVaccineStatuses = async (userId, dependentId = null) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let whereClause;
    let params;
    
    if (dependentId) {
      whereClause = `${USER_VACCINES_FIELDS.DEPENDENT_ID} = ?`;
      params = [dependentId];
    } else {
      whereClause = `${USER_VACCINES_FIELDS.USER_ID} = ? AND ${USER_VACCINES_FIELDS.DEPENDENT_ID} IS NULL`;
      params = [userId];
    }
    
    // Update overdue vaccines (more than 30 days past due)
    const overdueSql = `
      UPDATE ${USER_VACCINES_TABLE} 
      SET ${USER_VACCINES_FIELDS.STATUS} = 'overdue'
      WHERE ${whereClause} 
      AND ${USER_VACCINES_FIELDS.STATUS} = 'pending'
      AND ${USER_VACCINES_FIELDS.SCHEDULED_DATE} < DATE_SUB(?, INTERVAL 30 DAY)
    `;
    await query(overdueSql, [...params, todayStr]);
    
    // Update due soon vaccines (within 7 days)
    const dueSoonSql = `
      UPDATE ${USER_VACCINES_TABLE} 
      SET ${USER_VACCINES_FIELDS.STATUS} = 'due_soon'
      WHERE ${whereClause} 
      AND ${USER_VACCINES_FIELDS.STATUS} = 'pending'
      AND ${USER_VACCINES_FIELDS.SCHEDULED_DATE} BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND ?
    `;
    await query(dueSoonSql, [...params, todayStr, todayStr]);
    
    // Update upcoming vaccines (within 30 days)
    const upcomingSql = `
      UPDATE ${USER_VACCINES_TABLE} 
      SET ${USER_VACCINES_FIELDS.STATUS} = 'upcoming'
      WHERE ${whereClause} 
      AND ${USER_VACCINES_FIELDS.STATUS} = 'pending'
      AND ${USER_VACCINES_FIELDS.SCHEDULED_DATE} BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)
    `;
    await query(upcomingSql, [...params, todayStr, todayStr]);
    
    logger.info(`Updated vaccine statuses for ${dependentId ? 'dependent' : 'user'} ${dependentId || userId}`);
    return { success: true };
  } catch (error) {
    logger.error('Update vaccine statuses error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserVaccines = async (userId, dependentId = null, status = null) => {
  try {
    let whereClause = dependentId ? 
      `${USER_VACCINES_FIELDS.DEPENDENT_ID} = ?` : 
      `${USER_VACCINES_FIELDS.USER_ID} = ? AND ${USER_VACCINES_FIELDS.DEPENDENT_ID} IS NULL`;
    
    let params = [dependentId || userId];
    
    if (status) {
      whereClause += ` AND ${USER_VACCINES_FIELDS.STATUS} = ?`;
      params.push(status);
    }
    
    const sql = `
      SELECT 
        uv.*,
        v.name as vaccine_name,
        v.type as vaccine_type,
        v.category as vaccine_category,
        v.dose,
        v.route,
        v.site,
        v.notes as vaccine_notes,
        c.city_name
      FROM ${USER_VACCINES_TABLE} uv
      JOIN ${VACCINES_TABLE} v ON uv.${USER_VACCINES_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      LEFT JOIN ${CITIES_TABLE} c ON uv.${USER_VACCINES_FIELDS.CITY_ID} = c.${CITIES_FIELDS.CITY_ID}
      WHERE ${whereClause}
      AND uv.${USER_VACCINES_FIELDS.IS_ACTIVE} = true
      ORDER BY uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE} ASC
    `;
    
    const result = await query(sql, params);
    
    return {
      success: true,
      vaccines: result
    };
  } catch (error) {
    logger.error('Get user vaccines error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const updateVaccineStatus = async (userVaccineId, status, completedDate = null, cityId = null, imageUrl = null, notes = null) => {
  try {
    const updateFields = [`${USER_VACCINES_FIELDS.STATUS} = ?`];
    const params = [status];
    
    // Set default completed date to current date if status is completed and no date provided
    const finalCompletedDate = (status === 'completed' && !completedDate) ? 
      new Date().toISOString().split('T')[0] : completedDate;
    
    if (finalCompletedDate) {
      updateFields.push(`${USER_VACCINES_FIELDS.COMPLETED_DATE} = ?`);
      params.push(finalCompletedDate);
    }
    
    if (cityId) {
      updateFields.push(`${USER_VACCINES_FIELDS.CITY_ID} = ?`);
      params.push(cityId);
    }
    
    if (imageUrl) {
      updateFields.push(`${USER_VACCINES_FIELDS.IMAGE_URL} = ?`);
      params.push(imageUrl);
    }
    
    if (notes) {
      updateFields.push(`${USER_VACCINES_FIELDS.NOTES} = ?`);
      params.push(notes);
    }
    
    params.push(userVaccineId);
    
    const sql = `
      UPDATE ${USER_VACCINES_TABLE} 
      SET ${updateFields.join(', ')}
      WHERE ${USER_VACCINES_FIELDS.USER_VACCINE_ID} = ?
    `;
    
    await query(sql, params);
    
    logger.info(`Updated vaccine status to ${status} for user vaccine ${userVaccineId}`);
    return { success: true };
  } catch (error) {
    logger.error('Update vaccine status error:', error);
    return { success: false, error: error.message };
  }
};

export const getVaccineScheduleByAge = async (ageDays, countryId = 1) => {
  try {
    const sql = `
      SELECT 
        vs.*,
        v.name as vaccine_name,
        v.type as vaccine_type,
        v.dose,
        v.route,
        v.site,
        c.country_name
      FROM ${VACCINE_SCHEDULE_TABLE} vs
      JOIN ${VACCINES_TABLE} v ON vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      JOIN countries c ON vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = c.country_id
      WHERE vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS} <= ?
      AND (vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = ? OR vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = 1)
      AND vs.${VACCINE_SCHEDULE_FIELDS.IS_ACTIVE} = true
      ORDER BY vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS}, vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID}
    `;
    
    const schedules = await query(sql, [ageDays, countryId]);
    return { 
      success: true, 
      schedules,
      ageDays,
      countryId
    };
  } catch (error) {
    logger.error('Error getting vaccine schedule by age:', error);
    return { success: false, error: error.message };
  }
};

export const getVaccineScheduleForDateRange = async (birthDate, countryId = 1) => {
  try {
    const today = new Date();
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    
    const birthDateTime = new Date(birthDate).getTime();
    const todayTime = today.getTime();
    const twoYearsTime = twoYearsFromNow.getTime();
    
    const currentAgeDays = Math.floor((todayTime - birthDateTime) / (1000 * 60 * 60 * 24));
    const maxAgeDays = Math.floor((twoYearsTime - birthDateTime) / (1000 * 60 * 60 * 24));
    
    const sql = `
      SELECT 
        vs.*,
        v.name as vaccine_name,
        v.type as vaccine_type,
        v.dose,
        v.route,
        v.site,
        c.country_name
      FROM ${VACCINE_SCHEDULE_TABLE} vs
      JOIN ${VACCINES_TABLE} v ON vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      JOIN countries c ON vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = c.country_id
      WHERE vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS} <= ?
      AND (vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = ? OR vs.${VACCINE_SCHEDULE_FIELDS.COUNTRY_ID} = 1)
      AND vs.${VACCINE_SCHEDULE_FIELDS.IS_ACTIVE} = true
      ORDER BY vs.${VACCINE_SCHEDULE_FIELDS.MIN_AGE_DAYS}, vs.${VACCINE_SCHEDULE_FIELDS.VACCINE_ID}
    `;
    
    const schedules = await query(sql, [maxAgeDays, countryId]);
    return { 
      success: true, 
      schedules,
      currentAgeDays,
      maxAgeDays,
      birthDate,
      dateRange: {
        from: birthDate,
        to: twoYearsFromNow.toISOString().split('T')[0]
      }
    };
  } catch (error) {
    logger.error('Error getting vaccine schedule for date range:', error);
    return { success: false, error: error.message };
  }
};

// Missing functions that are imported in vaccines_controller.js
export const getUserVaccinesByStatus = async (userId, status, dependentId = null) => {
  try {
    return await getUserVaccines(userId, dependentId, status);
  } catch (error) {
    logger.error('Get user vaccines by status error:', error);
    return { success: false, error: error.message };
  }
};

export const addVaccineRecord = async (userVaccineId, doseNumber, completedDate, completedTime = null, cityId = null, hospitalId = null, imageUrl = null, notes = null) => {
  try {
    // Combine date and time into a single datetime value
    let completedDateTime = completedDate;
    if (completedTime) {
      // If time is provided, combine it with the date
      const dateTimeString = `${completedDate} ${completedTime}`;
      completedDateTime = new Date(dateTimeString);
    } else {
      // If no time provided, use the date as-is
      completedDateTime = new Date(completedDate);
    }

    const sql = `
      UPDATE ${USER_VACCINES_TABLE} 
      SET 
        ${USER_VACCINES_FIELDS.STATUS} = 'completed',
        ${USER_VACCINES_FIELDS.COMPLETED_DATE} = ?,
        ${USER_VACCINES_FIELDS.CITY_ID} = ?,
        ${USER_VACCINES_FIELDS.HOSPITAL_ID} = ?,
        ${USER_VACCINES_FIELDS.IMAGE_URL} = ?,
        ${USER_VACCINES_FIELDS.NOTES} = ?
      WHERE ${USER_VACCINES_FIELDS.USER_VACCINE_ID} = ?
    `;
    
    await query(sql, [completedDateTime, cityId, hospitalId, imageUrl, notes, userVaccineId]);
    
    logger.info(`Vaccine record added for user vaccine ${userVaccineId} at ${completedDateTime}`);
    return { success: true, message: 'Vaccine record added successfully' };
  } catch (error) {
    logger.error('Add vaccine record error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserVaccineRecords = async (userId, dependentId = null) => {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    let whereClause = dependentId ? 
      `uv.${USER_VACCINES_FIELDS.USER_ID} = ? AND uv.${USER_VACCINES_FIELDS.DEPENDENT_ID} = ?` : 
      `uv.${USER_VACCINES_FIELDS.USER_ID} = ? AND uv.${USER_VACCINES_FIELDS.DEPENDENT_ID} IS NULL`;
    
    // First param will be used to build absolute image URL in SELECT
    let params = [baseUrl, userId];
    if (dependentId) {
      params.push(dependentId);
    }
    
    // Return minimal fields with hospital details and vaccine notes
    const sql = `
      SELECT 
        uv.${USER_VACCINES_FIELDS.USER_VACCINE_ID} as user_vaccine_id,
        uv.${USER_VACCINES_FIELDS.DOSE_NUMBER} as dose_number,
        DATE_FORMAT(uv.${USER_VACCINES_FIELDS.COMPLETED_DATE}, '%Y-%m-%d') as completed_date,
        CASE 
          WHEN TIME(uv.${USER_VACCINES_FIELDS.COMPLETED_DATE}) = '00:00:00' THEN '12:00:00'
          ELSE TIME(uv.${USER_VACCINES_FIELDS.COMPLETED_DATE})
        END as completed_time,
        uv.${USER_VACCINES_FIELDS.CITY_ID} as city_id,
        uv.${USER_VACCINES_FIELDS.HOSPITAL_ID} as hospital_id,
        CASE 
          WHEN uv.${USER_VACCINES_FIELDS.IMAGE_URL} IS NOT NULL AND uv.${USER_VACCINES_FIELDS.IMAGE_URL} != ''
            THEN CONCAT(?, '/uploads/vaccines/', uv.${USER_VACCINES_FIELDS.IMAGE_URL})
          ELSE NULL
        END as image_url,
        v.${VACCINES_FIELDS.NOTES} as notes,
        uv.${USER_VACCINES_FIELDS.CREATED_AT} as created_at,
        c.city_name as city_name,
        h.name as hospital_name,
        h.address as hospital_address,
        h.phone as hospital_phone
      FROM ${USER_VACCINES_TABLE} uv
      LEFT JOIN ${VACCINES_TABLE} v ON uv.${USER_VACCINES_FIELDS.VACCINE_ID} = v.${VACCINES_FIELDS.VACCINE_ID}
      LEFT JOIN cities c ON uv.${USER_VACCINES_FIELDS.CITY_ID} = c.city_id
      LEFT JOIN hospitals h ON uv.${USER_VACCINES_FIELDS.HOSPITAL_ID} = h.hospital_id
      WHERE ${whereClause}
      AND uv.${USER_VACCINES_FIELDS.IS_ACTIVE} = true
      AND uv.${USER_VACCINES_FIELDS.STATUS} = 'completed'
      ORDER BY uv.${USER_VACCINES_FIELDS.COMPLETED_DATE} DESC
    `;
    
    console.log('SQL Query:', sql);
    console.log('SQL Params:', params);
    
    const records = await query(sql, params);
    
    console.log('Query Results:', records);
    
    return {
      success: true,
      records
    };
  } catch (error) {
    logger.error('Get user vaccine records error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserVaccinesGroupedByType = async (userId, excludeCompleted = false, type = null, dependentId = null, yearsAhead = 2) => {
  console.log(`=== getUserVaccinesGroupedByType called with: userId=${userId}, dependentId=${dependentId}, yearsAhead=${yearsAhead} ===`);
  try {
    // Get user's DOB for date filtering
    let userDob;
    if (dependentId) {
      const { DEPENDENTS_TABLE, DEPENDENTS_FIELDS } = await import('../models/dependents_model.js');
      const dependentResult = await query(`SELECT ${DEPENDENTS_FIELDS.DOB} FROM ${DEPENDENTS_TABLE} WHERE ${DEPENDENTS_FIELDS.DEPENDENT_ID} = ?`, [dependentId]);
      if (dependentResult.length === 0) {
        return { success: false, error: 'Dependent not found' };
      }
      userDob = dependentResult[0].dob;
    } else {
      const userResult = await query(`SELECT ${USER_FIELDS.DOB} FROM ${USER_TABLE} WHERE ${USER_FIELDS.ID} = ?`, [userId]);
      if (userResult.length === 0) {
        return { success: false, error: 'User not found' };
      }
      userDob = userResult[0].dob;
    }

    if (!userDob) {
      return { success: false, error: 'Date of Birth is required' };
    }

    // Calculate date range: from DOB to current date + yearsAhead
    const currentDate = new Date();
    const endDate = new Date(currentDate.getFullYear() + yearsAhead, currentDate.getMonth(), currentDate.getDate());
    const endDateStr = endDate.toISOString().split('T')[0];

    // Use actual DOB for date filtering (not adjusted)
    const dobDate = new Date(userDob);
    const dobStr = dobDate.toISOString().split('T')[0];

    // Debug logging
    console.log(`Date filtering: userDob=${userDob}, currentDate=${currentDate.toISOString().split('T')[0]}, endDate=${endDateStr}, yearsAhead=${yearsAhead}, dobStr=${dobStr}`);

    let whereClause = dependentId ? 
      `uv.${USER_VACCINES_FIELDS.USER_ID} = ? AND uv.${USER_VACCINES_FIELDS.DEPENDENT_ID} = ?` : 
      `uv.${USER_VACCINES_FIELDS.USER_ID} = ? AND uv.${USER_VACCINES_FIELDS.DEPENDENT_ID} IS NULL`;
    
    // Add date filtering: show vaccines from DOB to current date + yearsAhead
    whereClause += ` AND uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE} >= ? AND uv.${USER_VACCINES_FIELDS.SCHEDULED_DATE} <= ?`;
    
    let params = dependentId ? 
      [userId, dependentId, dobStr, endDateStr] : 
      [userId, dobStr, endDateStr];
    
    if (excludeCompleted) {
      whereClause += ` AND uv.${USER_VACCINES_FIELDS.STATUS} != 'completed'`;
    }
    
    if (type) {
      whereClause += ` AND v.${VACCINES_FIELDS.TYPE} = ?`;
      params.push(type);
    }
    
    const sql = `
      SELECT 
        uv.user_vaccine_id,
        uv.vaccine_id,
        v.name as vaccine_name,
        v.type as vaccine_type,
        v.category,
        uv.dose_number,
        DATE_FORMAT(uv.scheduled_date, '%Y-%m-%d') as scheduled_date,
        uv.status,
        DATE_FORMAT(uv.completed_date, '%Y-%m-%d') as completed_date,
        uv.image_url,
        uv.notes,
        v.dose,
        v.route,
        v.site,
        CASE
          WHEN uv.status = 'completed' THEN 0
          WHEN uv.status = 'overdue' THEN DATEDIFF(CURDATE(), uv.scheduled_date)
          ELSE DATEDIFF(uv.scheduled_date, CURDATE())
        END as days_remaining,
        CASE
          WHEN uv.status = 'completed' THEN 'Completed'
          WHEN uv.status = 'overdue' THEN CONCAT(
            'Overdue by ',
            DATEDIFF(CURDATE(), uv.scheduled_date),
            ' days (',
            TIMESTAMPDIFF(MONTH, uv.scheduled_date, CURDATE()),
            ' months, ',
            TIMESTAMPDIFF(YEAR, uv.scheduled_date, CURDATE()),
            ' years ago)'
          )
          WHEN uv.status = 'due_soon' THEN CONCAT(
            'Due in ',
            DATEDIFF(uv.scheduled_date, CURDATE()),
            ' days'
          )
          WHEN uv.status = 'upcoming' THEN CONCAT(
            'Due in ',
            DATEDIFF(uv.scheduled_date, CURDATE()),
            ' days (',
            TIMESTAMPDIFF(MONTH, CURDATE(), uv.scheduled_date),
            ' months)'
          )
          ELSE 'Pending'
        END as time_description,
        CASE
                 -- Birth vaccines (0 months)
                 WHEN v.min_age_months = 0 AND v.max_age_months = 0 THEN 'At birth'
                 WHEN v.min_age_months = 0 AND v.max_age_months = 1 AND v.name = 'OPV-0' THEN 'Within 15 days of birth'
                 WHEN v.min_age_months = 0 AND v.max_age_months = 1 THEN 'Within 24 hours of birth'
                 WHEN v.min_age_months = 0 AND v.max_age_months = 6 THEN 'Within 24 hours of birth'
                 WHEN v.min_age_months = 0 AND v.max_age_months = 12 THEN 'At birth or up to 1 year'
          WHEN v.min_age_months = 0 AND v.max_age_months = 60 THEN 'Birth to 5 years'
          WHEN v.min_age_months = 0 AND v.max_age_months = 1200 THEN 'Birth onwards (as needed)'
          
          -- 6 weeks vaccines (6 months = 6 weeks)
          WHEN v.min_age_months = 6 AND v.max_age_months = 9 THEN '6–9 months'
          WHEN v.min_age_months = 6 AND v.max_age_months = 12 AND v.name = 'OPV-1,2,3' THEN '6, 10, 14 weeks'
          WHEN v.min_age_months = 6 AND v.max_age_months = 12 AND v.name = 'Pentavalent (DPT+HepB+Hib)' THEN '6, 10, and 14 weeks'
          WHEN v.min_age_months = 6 AND v.max_age_months = 12 AND v.name = 'Rotavirus' THEN '6, 10, and 14 weeks'
          WHEN v.min_age_months = 6 AND v.max_age_months = 12 AND v.name = 'PCV (Pneumococcal)' THEN '6 and 14 weeks'
          WHEN v.min_age_months = 6 AND v.max_age_months = 12 THEN '6 and 14 weeks'
          WHEN v.min_age_months = 6 AND v.max_age_months = 14 THEN '6 and 14 weeks'
          WHEN v.min_age_months = 6 AND v.max_age_months = 1200 THEN 'From 6 months onwards'
          
                 -- 9 months vaccines
                 WHEN v.min_age_months = 9 AND v.max_age_months = 12 AND v.name = 'Vitamin A (1st Dose)' THEN '9 months with MR'
                 WHEN v.min_age_months = 9 AND v.max_age_months = 12 THEN '9–12 months'
                 WHEN v.min_age_months = 9 AND v.max_age_months = 24 THEN '9–12 months'
                 WHEN v.min_age_months = 9 AND v.max_age_months = 60 THEN 'Every 6 months up to 5 years'
                 WHEN v.min_age_months = 9 AND v.max_age_months = 1200 THEN '≥10 days before travel'
          
          -- 12 months vaccines
          WHEN v.min_age_months = 12 AND v.max_age_months = 23 THEN '12–23 months'
          WHEN v.min_age_months = 12 AND v.max_age_months = 24 THEN '12–24 months'
          WHEN v.min_age_months = 12 AND v.max_age_months = 1200 THEN 'From 12 months onwards'
          
          -- 15 months vaccines
          WHEN v.min_age_months = 15 AND v.max_age_months = 18 THEN '15–18 months'
          WHEN v.min_age_months = 15 AND v.max_age_months = 60 THEN '15 months & 5 years'
          WHEN v.min_age_months = 15 AND v.max_age_months = 72 THEN '15 months & 4–6 years'
          
          -- 16-24 months vaccines
          WHEN v.min_age_months = 16 AND v.max_age_months = 24 THEN '16–24 months'
          WHEN v.min_age_months = 16 AND v.max_age_months = 72 THEN '16–24 months'
          
          -- 5-6 years vaccines
          WHEN v.min_age_months = 60 AND v.max_age_months = 72 THEN '5–6 years'
          
          -- 9-14 years vaccines
          WHEN v.min_age_months = 108 AND v.max_age_months = 168 THEN '9–14 years'
          WHEN v.min_age_months = 108 AND v.max_age_months = 540 THEN 'Up to 26 years (males), 45 years (females)'
          
          -- 10-16 years vaccines
          WHEN v.min_age_months = 120 AND v.max_age_months = 192 THEN '10 years & 16 years'
          
          -- 18+ years vaccines
          WHEN v.min_age_months = 216 AND v.max_age_months = 540 THEN 'Up to 26 years (males), 45 years (females)'
          WHEN v.min_age_months = 216 AND v.max_age_months = 1200 AND v.name = 'MMR' THEN 'If no immunity'
          WHEN v.min_age_months = 216 AND v.max_age_months = 1200 AND v.name = 'Varicella' THEN 'If no prior infection'
          WHEN v.min_age_months = 216 AND v.max_age_months = 1200 THEN '19–64 years (high-risk)'
          
          -- 60+ years vaccines
          WHEN v.min_age_months = 600 AND v.max_age_months = 1200 AND v.name = 'Herpes Zoster (Shingles)' THEN '>50 years (once)'
          WHEN v.min_age_months = 720 AND v.max_age_months = 1200 THEN '60+ years'
          WHEN v.min_age_months = 228 AND v.max_age_months = 780 AND v.name = 'Pneumococcal (PCV13/15 + PPSV23)' THEN 'Once at >65; booster if needed'
          WHEN v.min_age_months = 780 AND v.max_age_months = 1200 THEN 'Once at >65; booster if needed'
          
          -- General cases
          WHEN v.min_age_months > 0 AND v.max_age_months = 0 THEN CONCAT(
            'From ',
            v.min_age_months,
            ' months (',
            ROUND(v.min_age_months/12, 1),
            ' years) onwards'
          )
          WHEN v.min_age_months = v.max_age_months THEN CONCAT(
            'At ',
            v.min_age_months,
            ' months (',
            ROUND(v.min_age_months/12, 1),
            ' years)'
          )
          WHEN v.max_age_months - v.min_age_months <= 12 THEN CONCAT(
            v.min_age_months,
            ' to ',
            v.max_age_months,
            ' months'
          )
          ELSE CONCAT(
            v.min_age_months,
            ' to ',
            v.max_age_months,
            ' months (',
            ROUND(v.min_age_months/12, 1),
            ' to ',
            ROUND(v.max_age_months/12, 1),
            ' years)'
          )
        END as age_range
      FROM user_vaccines uv
      JOIN vaccines v ON uv.vaccine_id = v.vaccine_id
      WHERE ${whereClause}
        AND (v.notes IS NULL OR v.notes NOT LIKE '%[DELETED]%')
        AND uv.is_active = true
      ORDER BY uv.scheduled_date ASC, v.name ASC
    `;
    
    console.log(`About to execute SQL query for ${dependentId ? 'dependent' : 'user'} ${dependentId || userId}`);
    console.log(`SQL Query: ${sql}`);
    console.log(`SQL Params: ${JSON.stringify(params)}`);
    
    let groups;
    try {
      groups = await query(sql, params);
      console.log(`SQL Query returned ${groups.length} results for ${dependentId ? 'dependent' : 'user'} ${dependentId || userId}`);
    } catch (error) {
      console.log(`SQL Query error: ${error.message}`);
      throw error;
    }
    
    // Group vaccines by type directly from the results
    const groupsByType = {};
    
    groups.forEach(vaccine => {
      const type = vaccine.vaccine_type;
      
      if (!groupsByType[type]) {
        groupsByType[type] = [];
      }
      
      groupsByType[type].push({
        user_vaccine_id: vaccine.user_vaccine_id,
        vaccine_id: vaccine.vaccine_id,
        vaccine_name: vaccine.vaccine_name,
        type: vaccine.vaccine_type,
        category: vaccine.category,
        dose_number: vaccine.dose_number,
        scheduled_date: vaccine.scheduled_date,
        status: vaccine.status,
        completed_date: vaccine.completed_date,
        image_url: vaccine.image_url,
        notes: vaccine.notes,
        dose: vaccine.dose,
        route: vaccine.route,
        site: vaccine.site,
        days_remaining: vaccine.days_remaining,
        time_description: vaccine.time_description,
        age_range: vaccine.age_range
      });
    });
    
    // If a specific type is requested, only return that type group
    if (type) {
      const filteredGroups = {};
      if (groupsByType[type]) {
        filteredGroups[type] = groupsByType[type];
      }
      return {
        success: true,
        groups: filteredGroups
      };
    }
    
    return {
      success: true,
      groups: groupsByType
    };
  } catch (error) {
    logger.error('Get user vaccines grouped by type error:', error);
    return { success: false, error: error.message };
  }
};