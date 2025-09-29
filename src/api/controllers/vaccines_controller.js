import { getAllVaccines, getVaccinesByType, getVaccinesByAge } from '../../services/vaccines_service.js';
import { 
  getUserVaccines, 
  getUserVaccinesByStatus, 
  updateVaccineStatus,
  addVaccineRecord,
  getUserVaccineRecords,
  getUserVaccinesGroupedByType
} from '../../services/user_vaccines_service.js';
import { 
  addVaccineReminder,
  getVaccineReminders,
  getUserAllReminders,
  updateVaccineReminder,
  deleteVaccineReminder
} from '../../services/vaccine_reminders_service.js';
import { getUserById } from '../../services/user_service.js';
import { encryptUserId, decryptUserId } from '../../services/encryption_service.js';
import { VACCINE_STATUS } from '../../models/user_vaccines_model.js';
import logger from '../../config/logger.js';
import { getAllCountries } from '../../services/countries_service.js';
import { getAllCities, getCitiesByCountry } from '../../services/cities_service.js';

export const getVaccinesList = async (req, res) => {
  try {
    const { type, age } = req.query;
    let result;

    if (type) {
      result = await getVaccinesByType(type);
    } else if (age) {
      const ageMonths = parseInt(age);
      result = await getVaccinesByAge(ageMonths);
    } else {
      result = await getAllVaccines();
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccines list accessed by user: ${req.user.userId}`);

    return res.status(200).json({
      success: true,
      message: 'Vaccines list fetched successfully',
      data: {
        vaccines: result.vaccines,
        count: result.vaccines.length,
        encryptedUserId: encryptUserId(req.user.userId)
      }
    });

  } catch (error) {
    logger.error('Get vaccines list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


export const getSpecificUserVaccineRecords = async (req, res) => {
  try {
    const { user_id, status, exclude_completed, type } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId || actualUserId === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not valid'
      });
    }

    // If a specific status is requested, keep legacy behavior to filter by status
    if (status) {
      const validStatuses = Object.values(VACCINE_STATUS);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
        });
      }
      const result = await getUserVaccinesByStatus(actualUserId, status);
      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error });
      }
      return res.status(200).json({
        success: true,
        message: 'User vaccines fetched successfully',
        data: {
          userId: actualUserId,
          encryptedUserId: encryptUserId(actualUserId),
          user: {
            id: userExists.user.id,
            phoneNumber: userExists.user.phone_number,
            fullName: userExists.user.full_name,
            profileCompleted: userExists.user.profile_completed
          },
          vaccines: result.vaccines,
          count: result.vaccines.length
        }
      });
    }

    // Default: always return grouped by type when no status is provided
    const excludeCompletedFlag = exclude_completed === 'true';
    const { getUserVaccinesGroupedByType } = await import('../../services/user_vaccines_service.js');
    const grouped = await getUserVaccinesGroupedByType(actualUserId, excludeCompletedFlag, type);

    if (!grouped.success) {
      return res.status(500).json({ success: false, message: grouped.error });
    }

    return res.status(200).json({
      success: true,
      message: 'User vaccines grouped by type fetched successfully',
      data: {
        userId: actualUserId,
        encryptedUserId: encryptUserId(actualUserId),
        groups: grouped.groups
      }
    });
  } catch (error) {
    logger.error('Get specific user vaccines error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addSpecificUserVaccine = async (req, res) => {
  try {
    const { user_id, vaccine_id, status, given_date, notes } = req.body;

    if (!user_id || !vaccine_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Vaccine ID are required'
      });
    }

    // Check if user_id is encrypted or plain
    let actualUserId;
    if (isNaN(user_id)) {
      // It's encrypted, decrypt it
      actualUserId = decryptUserId(user_id);
    } else {
      // It's plain number
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId || actualUserId === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate if user exists in database
    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not valid'
      });
    }

    const validStatuses = Object.values(VACCINE_STATUS);
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
      });
    }

    const result = await addVaccineRecord(
      actualUserId,
      vaccine_id,
      status || VACCINE_STATUS.COMPLETED,
      given_date,
      notes
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccine added for specific user: User ${actualUserId}, Vaccine ${vaccine_id}`);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        id: result.id,
        userId: actualUserId,
        encryptedUserId: encryptUserId(actualUserId),
        user: {
          id: userExists.user.id,
          phoneNumber: userExists.user.phone_number,
          fullName: userExists.user.full_name,
          profileCompleted: userExists.user.profile_completed
        }
      }
    });

  } catch (error) {
    logger.error('Add specific user vaccine error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateUserVaccineRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vaccine_id, status, given_date, notes } = req.body;

    if (!vaccine_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine ID and status are required'
      });
    }

    const validStatuses = Object.values(VACCINE_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid options: ${validStatuses.join(', ')}`
      });
    }

    const result = await updateVaccineStatus(userId, vaccine_id, status, given_date, notes);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`User vaccine updated: User ${userId}, Vaccine ${vaccine_id}`);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        encryptedUserId: encryptUserId(userId)
      }
    });

  } catch (error) {
    logger.error('Update user vaccine error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addReminderAPI = async (req, res) => {
  try {
    const { user_vaccine_id, title, message, date, time, frequency } = req.body;

    if (!user_vaccine_id || !title || !date) {
      return res.status(400).json({
        success: false,
        message: 'user_vaccine_id, title, and date are required'
      });
    }

    const reminderData = { title, message, date, time, frequency };
    const result = await addVaccineReminder(user_vaccine_id, reminderData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccine reminder added: user_vaccine_id ${user_vaccine_id}, reminder_id ${result.reminder_id}`);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        reminder_id: result.reminder_id,
        user_vaccine_id,
        title,
        message: message || null,
        date,
        time: time || '09:00',
        frequency: frequency || 'once'
      }
    });

  } catch (error) {
    logger.error('Add reminder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateReminderAPI = async (req, res) => {
  try {
    const { reminder_id, title, message, date, time, frequency, status } = req.body;

    if (!reminder_id) {
      return res.status(400).json({
        success: false,
        message: 'reminder_id is required'
      });
    }

    const reminderData = { title, message, date, time, frequency, status };
    const result = await updateVaccineReminder(reminder_id, reminderData);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccine reminder updated: reminder_id ${reminder_id}`);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        reminder_id,
        title: title || null,
        message: message || null,
        date: date || null,
        time: time || '09:00',
        frequency: frequency || 'once',
        status: status || 'active'
      }
    });

  } catch (error) {
    logger.error('Update reminder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getRemindersAPI = async (req, res) => {
  try {
    const { user_id, user_vaccine_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Decrypt user ID if needed
    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // If user_vaccine_id is provided, get reminders for specific vaccine
    if (user_vaccine_id) {
      const result = await getVaccineReminders(parseInt(user_vaccine_id));
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to fetch vaccine reminders'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Vaccine reminders fetched successfully',
        data: {
          userId: actualUserId,
          encryptedUserId: encryptUserId(actualUserId),
          user_vaccine_id: parseInt(user_vaccine_id),
          reminders: result.reminders,
          count: result.reminders.length
        }
      });
    }

    // Get all reminders for user
    const result = await getUserAllReminders(actualUserId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`User reminders fetched: User ${actualUserId}, Count: ${result.reminders.length}`);

    return res.status(200).json({
      success: true,
      message: 'User reminders fetched successfully',
      data: {
        userId: actualUserId,
        encryptedUserId: encryptUserId(actualUserId),
        reminders: result.reminders,
        count: result.reminders.length
      }
    });

  } catch (error) {
    logger.error('Get reminders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteReminderAPI = async (req, res) => {
  try {
    const { reminder_id } = req.body;

    if (!reminder_id) {
      return res.status(400).json({
        success: false,
        message: 'reminder_id is required'
      });
    }

    const result = await deleteVaccineReminder(reminder_id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccine reminder deleted: reminder_id ${reminder_id}`);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        reminder_id,
        status: 'cancelled'
      }
    });

  } catch (error) {
    logger.error('Delete reminder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const markVaccinesAsTaken = async (req, res) => {
  try {
    const { user_id, user_vaccine_ids, completed_date, city_id, image_url, notes } = req.body;

    if (!user_id || !user_vaccine_ids || !Array.isArray(user_vaccine_ids) || user_vaccine_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'user_id and user_vaccine_ids array are required'
      });
    }

    const actualUserId = decryptUserId(user_id);
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Verify user exists
    const userResult = await getUserById(actualUserId);
    if (!userResult.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedVaccines = [];
    const failedUpdates = [];

    // Update each vaccine status
    for (const userVaccineId of user_vaccine_ids) {
      try {
        const result = await updateVaccineStatus(
          userVaccineId, 
          VACCINE_STATUS.COMPLETED,
          completed_date || null,
          city_id || null,
          image_url || null,
          notes || null
        );

        if (result.success) {
          updatedVaccines.push({
            user_vaccine_id: userVaccineId,
            status: 'completed',
            completed_date: completed_date || new Date().toISOString().split('T')[0]
          });
        } else {
          failedUpdates.push({
            user_vaccine_id: userVaccineId,
            error: result.error
          });
        }
      } catch (error) {
        failedUpdates.push({
          user_vaccine_id: userVaccineId,
          error: error.message
        });
      }
    }

    logger.info(`Bulk vaccine status update: User ${actualUserId}, Updated: ${updatedVaccines.length}, Failed: ${failedUpdates.length}`);

    return res.status(200).json({
      success: true,
      message: `${updatedVaccines.length} vaccines marked as taken successfully`,
      data: {
        user_id: encryptUserId(actualUserId),
        updated_vaccines: updatedVaccines,
        failed_updates: failedUpdates,
        summary: {
          total_requested: user_vaccine_ids.length,
          successfully_updated: updatedVaccines.length,
          failed: failedUpdates.length
        }
      }
    });

  } catch (error) {
    logger.error('Mark vaccines as taken error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateVaccineStatusesAPI = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const actualUserId = decryptUserId(user_id);
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Import updateAllVaccineStatuses
    const { updateAllVaccineStatuses } = await import('../../services/user_vaccines_service.js');
    const result = await updateAllVaccineStatuses(actualUserId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    logger.info(`Vaccine statuses updated for user ${actualUserId}: ${result.updated_count} vaccines`);

    return res.status(200).json({
      success: true,
      message: 'Vaccine statuses updated successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        updated_count: result.updated_count
      }
    });

  } catch (error) {
    logger.error('Update vaccine statuses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getVaccineDoseSummaryAPI = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const actualUserId = decryptUserId(user_id);
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Get vaccine dose summary
    const summarySql = `
      SELECT 
        v.vaccine_id,
        v.name as vaccine_name,
        v.total_doses,
        v.frequency,
        COUNT(*) as total_scheduled_doses,
        COUNT(CASE WHEN uv.status = 'completed' THEN 1 END) as completed_doses,
        COUNT(CASE WHEN uv.status = 'overdue' THEN 1 END) as overdue_doses,
        COUNT(CASE WHEN uv.status = 'due_soon' THEN 1 END) as due_soon_doses,
        COUNT(CASE WHEN uv.status = 'upcoming' THEN 1 END) as upcoming_doses,
        MIN(CASE WHEN uv.status != 'completed' THEN uv.scheduled_date END) as next_dose_date,
        MIN(CASE WHEN uv.status != 'completed' THEN uv.user_vaccine_id END) as next_dose_id
      FROM vaccines v
      LEFT JOIN user_vaccines uv ON v.vaccine_id = uv.vaccine_id 
        AND uv.user_id = ? 
        AND uv.is_active = true
      WHERE uv.vaccine_id IS NOT NULL
      GROUP BY v.vaccine_id, v.name, v.total_doses, v.frequency
      ORDER BY v.vaccine_id
    `;

    const summary = await query(summarySql, [actualUserId]);

    const formattedSummary = summary.map(vaccine => ({
      vaccine_id: vaccine.vaccine_id,
      vaccine_name: vaccine.vaccine_name,
      total_doses_required: vaccine.total_doses,
      frequency: vaccine.frequency,
      dose_progress: {
        completed: vaccine.completed_doses,
        overdue: vaccine.overdue_doses,
        due_soon: vaccine.due_soon_doses,
        upcoming: vaccine.upcoming_doses,
        total_scheduled: vaccine.total_scheduled_doses
      },
      completion_status: {
        is_complete: vaccine.completed_doses >= (vaccine.total_doses || 1),
        completion_percentage: Math.round((vaccine.completed_doses / (vaccine.total_doses || 1)) * 100),
        remaining_doses: Math.max(0, (vaccine.total_doses || 1) - vaccine.completed_doses)
      },
      next_dose: vaccine.next_dose_date ? {
        user_vaccine_id: vaccine.next_dose_id,
        scheduled_date: vaccine.next_dose_date,
        dose_number: vaccine.completed_doses + 1
      } : null
    }));

    logger.info(`Vaccine dose summary fetched for user ${actualUserId}: ${summary.length} vaccines`);

    return res.status(200).json({
      success: true,
      message: 'Vaccine dose summary fetched successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        vaccine_summary: formattedSummary,
        total_vaccines: formattedSummary.length,
        overall_progress: {
          total_completed_doses: formattedSummary.reduce((sum, v) => sum + v.dose_progress.completed, 0),
          total_required_doses: formattedSummary.reduce((sum, v) => sum + (v.total_doses_required || 1), 0),
          total_overdue_doses: formattedSummary.reduce((sum, v) => sum + v.dose_progress.overdue, 0)
        }
      }
    });

  } catch (error) {
    logger.error('Get vaccine dose summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const addRecord = async (req, res) => {
  try {
    const { 
      user_id,
      user_vaccine_id, 
      dose_number, 
      completed_date, 
      completed_time, 
      city_id, 
      notes 
    } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!user_vaccine_id) {
      return res.status(400).json({
        success: false,
        message: 'User vaccine ID is required'
      });
    }

    if (!dose_number) {
      return res.status(400).json({
        success: false,
        message: 'Dose number is required'
      });
    }

    if (!completed_date) {
      return res.status(400).json({
        success: false,
        message: 'Completed date is required'
      });
    }

    // Decrypt user ID
    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId || actualUserId === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Verify user exists
    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not valid'
      });
    }

    const imageName = req.file ? req.file.filename : null;

    const result = await addVaccineRecord(
      user_vaccine_id,
      dose_number,
      completed_date,
      completed_time || null,
      city_id || null,
      imageName,
      notes || null
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to add vaccine record'
      });
    }

    logger.info(`Vaccine record added: user_vaccine_id ${user_vaccine_id}`);

    return res.status(200).json({
      success: true,
      message: result.message || 'Vaccine record added successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        user_vaccine_id: user_vaccine_id,
        dose_number: dose_number,
        completed_date: completed_date,
        completed_time: completed_time,
        city_id: city_id,
        notes: notes,
        image_name: imageName,
        image_url: imageName ? `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/vaccines/${imageName}` : null
      }
    });

  } catch (error) {
    logger.error('Add vaccine record error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getRecord = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id);
    }

    if (!actualUserId || actualUserId === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const userExists = await getUserById(actualUserId);
    if (!userExists.success) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not valid'
      });
    }

    const result = await getUserVaccineRecords(actualUserId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch vaccine records'
      });
    }

    logger.info(`Vaccine records fetched for user: ${actualUserId}`);

    return res.status(200).json({
      success: true,
      message: 'Vaccine records fetched successfully',
      data: {
        user_id: encryptUserId(actualUserId),
        records: result.records
      }
    });

  } catch (error) {
    logger.error('Get vaccine records error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCountriesAPI = async (req, res) => {
  try {
    const result = await getAllCountries();
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to fetch countries' });
    }
    return res.status(200).json({ success: true, message: 'Countries fetched successfully', data: { countries: result.countries } });
  } catch (error) {
    logger.error('Get countries error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCitiesAPI = async (req, res) => {
  try {
    const { country_id } = req.query;
    let result;
    if (country_id) {
      result = await getCitiesByCountry(country_id);
    } else {
      result = await getAllCities();
    }
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to fetch cities' });
    }
    return res.status(200).json({ success: true, message: 'Cities fetched successfully', data: { cities: result.cities } });
  } catch (error) {
    logger.error('Get cities error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getHospitalsAPI = async (req, res) => {
  try {
    const { city_id } = req.query;
    let result;
    if (city_id) {
      const { getAllHospitalsByCity } = await import('../../services/hospitals_service.js');
      result = await getAllHospitalsByCity(parseInt(city_id));
    } else {
      const { getAllHospitals } = await import('../../services/hospitals_service.js');
      result = await getAllHospitals();
    }
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: 'Hospitals fetched successfully', data: { hospitals: result.hospitals } });
  } catch (error) {
    logger.error('Get hospitals error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addVaccineAPI = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      category, 
      sub_category, 
      min_age_months, 
      max_age_months, 
      total_doses, 
      frequency, 
      when_to_give, 
      dose, 
      route, 
      site, 
      notes 
    } = req.body;

    // Validation
    if (!name || !type || !category || !sub_category) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, category, and sub_category are required'
      });
    }

    if (min_age_months === undefined || min_age_months === null) {
      return res.status(400).json({
        success: false,
        message: 'min_age_months is required'
      });
    }

    // Import the service
    const { addVaccine } = await import('../../services/vaccines_service.js');
    
    const result = await addVaccine({
      name,
      type,
      category,
      sub_category,
      min_age_months: parseInt(min_age_months) || 0,
      max_age_months: max_age_months ? parseInt(max_age_months) : null,
      total_doses: total_doses ? parseInt(total_doses) : null,
      frequency: frequency || 'One time',
      when_to_give: when_to_give || null,
      dose: dose || null,
      route: route || null,
      site: site || null,
      notes: notes || null
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to add vaccine'
      });
    }

    logger.info(`Vaccine added: ${name} (ID: ${result.vaccine_id})`);

    return res.status(201).json({
      success: true,
      message: 'Vaccine added successfully',
      data: {
        vaccine_id: result.vaccine_id,
        name: name,
        type: type,
        category: category,
        sub_category: sub_category
      }
    });

  } catch (error) {
    logger.error('Add vaccine error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
