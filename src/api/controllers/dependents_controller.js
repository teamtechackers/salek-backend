import {
  addDependent,
  getDependentsByUserId,
  getDependentById,
  updateDependentProfile,
  deleteDependent
} from '../../services/dependents_service.js';
import { generateUserVaccines } from '../../services/user_vaccines_service.js';
import { decryptUserId, encryptUserId } from '../../services/encryption_service.js';
import { uploadProfileImage } from '../../middleware/upload_middleware.js';
import { BASE_URL } from '../../config/constants.js';
import logger from '../../config/logger.js';

// Add a new dependent
export const addDependentAPI = async (req, res) => {
  try {
    const {
      user_id,
      relation_id,
      full_name,
      phone_number,
      dob,
      gender,
      country,
      address,
      contact_no,
      material_status,
      do_you_have_children,
      how_many_children,
      are_you_pregnant,
      pregnancy_detail,
      country_id,
      state_id,
      city_id
    } = req.body;

    // Handle image upload
    const image = req.file ? `/uploads/profiles/${req.file.filename}` : req.body.image;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
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

    const dependentData = {
      userId: actualUserId,
      relationId: relation_id ? parseInt(relation_id) : null,
      fullName: full_name,
      phoneNumber: phone_number,
      dob: dob,
      gender: gender,
      country: country,
      countryId: country_id ? parseInt(country_id) : null,
      stateId: state_id ? parseInt(state_id) : null,
      cityId: city_id ? parseInt(city_id) : null,
      address: address,
      contactNo: contact_no,
      materialStatus: material_status,
      doYouHaveChildren: do_you_have_children,
      howManyChildren: how_many_children,
      areYouPregnant: are_you_pregnant,
      pregnancyDetail: pregnancy_detail,
      image: image,
      profileCompleted: !!(full_name && dob && phone_number) ? 1 : 0
    };

    const result = await addDependent(dependentData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to add dependent'
      });
    }

    // Generate vaccines for the new dependent automatically
    const vaccineResult = await generateUserVaccines(actualUserId, result.dependentId);

    if (!vaccineResult.success) {
      logger.warn(`Failed to generate vaccines for dependent ${result.dependentId}: ${vaccineResult.error}`);
    } else {
      logger.info(`Generated ${vaccineResult.addedCount} vaccines for dependent ${result.dependentId}`);
    }

    logger.info(`Dependent added: User ${actualUserId}, Dependent ID: ${result.dependentId}`);

    return res.status(201).json({
      success: true,
      message: 'Dependent added successfully',
      data: {
        user_id: actualUserId,
        encrypted_user_id: encryptUserId(actualUserId),
        dependent_id: result.dependentId,
        encrypted_dependent_id: encryptUserId(result.dependentId),
        dependent: {
          relation_id: relation_id ? parseInt(relation_id) : null,
          full_name: full_name,
          dob: dob,
          gender: gender,
          country: country,
          country_id: country_id ? parseInt(country_id) : null,
          state_id: state_id ? parseInt(state_id) : null,
          city_id: city_id ? parseInt(city_id) : null,
          address: address,
          contact_no: contact_no,
          material_status: material_status,
          do_you_have_children: do_you_have_children,
          how_many_children: how_many_children,
          are_you_pregnant: are_you_pregnant,
          pregnancy_detail: pregnancy_detail,
          image: image ? `${BASE_URL}${image}` : null,
          profile_completed: dependentData.profileCompleted
        },
        vaccines_generated: vaccineResult.success ? vaccineResult.addedCount : 0
      }
    });
  } catch (error) {
    logger.error('Add dependent API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all dependents for a user
export const getDependentsAPI = async (req, res) => {
  try {
    const { user_id } = req.query;

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

    const result = await getDependentsByUserId(actualUserId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch dependents'
      });
    }

    logger.info(`Dependents fetched: User ${actualUserId}, Count: ${result.dependents.length}`);

    return res.status(200).json({
      success: true,
      message: 'Dependents fetched successfully',
      data: {
        user_id: actualUserId,
        encrypted_user_id: encryptUserId(actualUserId),
        dependents: result.dependents.map(dependent => ({
          dependent_id: dependent.dependent_id,
          encrypted_dependent_id: encryptUserId(dependent.dependent_id),
          relation_id: dependent.relation_id,
          relation_type: dependent.relation_type,
          full_name: dependent.full_name,
          dob: dependent.dob,
          gender: dependent.gender,
          country: dependent.country,
          address: dependent.address,
          contact_no: dependent.contact_no,
          material_status: dependent.material_status,
          do_you_have_children: dependent.do_you_have_children,
          how_many_children: dependent.how_many_children,
          are_you_pregnant: dependent.are_you_pregnant,
          pregnancy_detail: dependent.pregnancy_detail,
          image: dependent.image ? `${BASE_URL}${dependent.image}` : null,
          profile_completed: dependent.profile_completed,
          created_at: dependent.created_at,
          updated_at: dependent.updated_at
        })),
        count: result.dependents.length
      }
    });
  } catch (error) {
    logger.error('Get dependents API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get a specific dependent by ID
export const getDependentAPI = async (req, res) => {
  try {
    const { dependent_id } = req.params;

    if (!dependent_id) {
      return res.status(400).json({
        success: false,
        message: 'Dependent ID is required'
      });
    }

    // Decrypt dependent ID if needed
    let actualDependentId;
    if (isNaN(dependent_id)) {
      actualDependentId = decryptUserId(dependent_id);
    } else {
      actualDependentId = parseInt(dependent_id);
    }

    if (!actualDependentId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dependent ID format'
      });
    }

    const result = await getDependentById(actualDependentId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || 'Dependent not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dependent fetched successfully',
      data: {
        dependent_id: result.dependent.dependent_id,
        encrypted_dependent_id: encryptUserId(result.dependent.dependent_id),
        user_id: result.dependent.user_id,
        encrypted_user_id: encryptUserId(result.dependent.user_id),
        dependent: {
          full_name: result.dependent.full_name,
          dob: result.dependent.dob,
          gender: result.dependent.gender,
          country: result.dependent.country,
          address: result.dependent.address,
          contact_no: result.dependent.contact_no,
          material_status: result.dependent.material_status,
          do_you_have_children: result.dependent.do_you_have_children,
          how_many_children: result.dependent.how_many_children,
          are_you_pregnant: result.dependent.are_you_pregnant,
          pregnancy_detail: result.dependent.pregnancy_detail,
          image: result.dependent.image ? `${BASE_URL}${result.dependent.image}` : null,
          profile_completed: result.dependent.profile_completed,
          created_at: result.dependent.created_at,
          updated_at: result.dependent.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Get dependent API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update dependent profile
export const updateDependentAPI = async (req, res) => {
  try {
    const { dependent_id } = req.params;
    const {
      full_name,
      phone_number,
      dob,
      gender,
      country,
      address,
      contact_no,
      material_status,
      do_you_have_children,
      how_many_children,
      are_you_pregnant,
      pregnancy_detail,
      country_id,
      state_id,
      city_id
    } = req.body;

    if (!dependent_id) {
      return res.status(400).json({
        success: false,
        message: 'Dependent ID is required'
      });
    }

    // Decrypt dependent ID if needed
    let actualDependentId;
    if (isNaN(dependent_id)) {
      actualDependentId = decryptUserId(dependent_id);
    } else {
      actualDependentId = parseInt(dependent_id);
    }

    if (!actualDependentId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dependent ID format'
      });
    }

    const profileData = {};

    // Only include fields that are provided
    if (full_name !== undefined) profileData.full_name = full_name;
    if (phone_number !== undefined) profileData.phone_number = phone_number;
    if (dob !== undefined) profileData.dob = dob;
    if (gender !== undefined) profileData.gender = gender;
    if (country !== undefined) profileData.country = country;
    if (country_id !== undefined) profileData.country_id = country_id;
    if (state_id !== undefined) profileData.state_id = state_id;
    if (city_id !== undefined) profileData.city_id = city_id;
    if (address !== undefined) profileData.address = address;
    if (contact_no !== undefined) profileData.contact_no = contact_no;
    if (material_status !== undefined) profileData.material_status = material_status;
    if (do_you_have_children !== undefined) profileData.do_you_have_children = do_you_have_children;
    if (how_many_children !== undefined) profileData.how_many_children = how_many_children;
    if (are_you_pregnant !== undefined) profileData.are_you_pregnant = are_you_pregnant;
    if (pregnancy_detail !== undefined) profileData.pregnancy_detail = pregnancy_detail;

    // Update profile_completed based on required fields
    if (full_name !== undefined || dob !== undefined) {
      const currentDependent = await getDependentById(actualDependentId);
      if (currentDependent.success) {
        const finalFullName = full_name !== undefined ? full_name : currentDependent.dependent.full_name;
        const finalDob = dob !== undefined ? dob : currentDependent.dependent.dob;
        profileData.profile_completed = !!(finalFullName && finalDob) ? 1 : 0;
      }
    }

    const result = await updateDependentProfile(actualDependentId, profileData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to update dependent'
      });
    }

    logger.info(`Dependent updated: ID ${actualDependentId}`);

    return res.status(200).json({
      success: true,
      message: 'Dependent updated successfully',
      data: {
        dependent_id: actualDependentId,
        encrypted_dependent_id: encryptUserId(actualDependentId),
        updated_fields: Object.keys(profileData)
      }
    });
  } catch (error) {
    logger.error('Update dependent API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete dependent
export const deleteDependentAPI = async (req, res) => {
  try {
    const { dependent_id } = req.params;

    if (!dependent_id) {
      return res.status(400).json({
        success: false,
        message: 'Dependent ID is required'
      });
    }

    // Decrypt dependent ID if needed
    let actualDependentId;
    if (isNaN(dependent_id)) {
      actualDependentId = decryptUserId(dependent_id);
    } else {
      actualDependentId = parseInt(dependent_id);
    }

    if (!actualDependentId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dependent ID format'
      });
    }

    const result = await deleteDependent(actualDependentId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to delete dependent'
      });
    }

    logger.info(`Dependent deleted: ID ${actualDependentId}`);

    return res.status(200).json({
      success: true,
      message: 'Dependent deleted successfully',
      data: {
        dependent_id: actualDependentId,
        encrypted_dependent_id: encryptUserId(actualDependentId)
      }
    });
  } catch (error) {
    logger.error('Delete dependent API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Generate vaccines for dependent
export const generateDependentVaccinesAPI = async (req, res) => {
  try {
    const { dependent_id } = req.params;

    if (!dependent_id) {
      return res.status(400).json({
        success: false,
        message: 'Dependent ID is required'
      });
    }

    // Decrypt dependent ID if needed
    let actualDependentId;
    if (isNaN(dependent_id)) {
      actualDependentId = decryptUserId(dependent_id);
    } else {
      actualDependentId = parseInt(dependent_id);
    }

    if (!actualDependentId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dependent ID format'
      });
    }

    // Verify dependent exists
    const dependentResult = await getDependentById(actualDependentId);
    if (!dependentResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Dependent not found'
      });
    }

    const dependent = dependentResult.dependent;

    // Generate vaccines for dependent
    const result = await generateUserVaccines(dependent.user_id, actualDependentId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to generate vaccines for dependent'
      });
    }

    logger.info(`Vaccines generated for dependent: ID ${actualDependentId}, Count: ${result.addedCount}`);

    return res.status(200).json({
      success: true,
      message: 'Vaccines generated successfully for dependent',
      data: {
        dependent_id: actualDependentId,
        encrypted_dependent_id: encryptUserId(actualDependentId),
        user_id: dependent.user_id,
        encrypted_user_id: encryptUserId(dependent.user_id),
        dependent: {
          id: dependent.dependent_id,
          full_name: dependent.full_name,
          dob: dependent.dob,
          gender: dependent.gender
        },
        vaccines_generated: result.addedCount
      }
    });
  } catch (error) {
    logger.error('Generate dependent vaccines API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
