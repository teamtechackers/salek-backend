import { query } from '../../config/database.js';
import logger from '../../config/logger.js';
import { decryptUserId } from '../../services/encryption_service.js';
import { encryptUserId } from '../../services/encryption_service.js';
import { getUserVaccinesGroupedByType } from '../../services/user_vaccines_service.js';
import { getDependentsByUserId } from '../../services/dependents_service.js';
import { getDependentById } from '../../services/dependents_service.js';
import { BASE_URL } from '../../config/constants.js';

export const getDashboardStats = async (req, res) => {
  try {
    // Require user_id and ensure it matches token user
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    let actualUserId;
    if (isNaN(user_id)) {
      actualUserId = decryptUserId(user_id);
    } else {
      actualUserId = parseInt(user_id, 10);
    }
    if (!actualUserId) {
      return res.status(400).json({ success: false, message: 'Invalid user_id format' });
    }
    if (!req.user || req.user.userId !== actualUserId) {
      return res.status(403).json({ success: false, message: 'User/token mismatch' });
    }
    // Totals
    const [usersCountRow] = await query('SELECT COUNT(*) AS total_users FROM users WHERE is_active = true');
    const [dependentsCountRow] = await query('SELECT COUNT(*) AS total_dependents FROM dependents WHERE is_active = 1');
    const [completedVaccinesRow] = await query("SELECT COUNT(*) AS total_completed FROM user_vaccines WHERE is_active = true AND status = 'completed'");
    const [totalVaccinesRow] = await query('SELECT COUNT(*) AS total_vaccines FROM vaccines');

    // Current calendar year, completed vaccines per month (users + dependents)
    const graphSql = `
      SELECT DATE_FORMAT(completed_date, '%Y-%m') AS ym, COUNT(*) AS cnt
      FROM user_vaccines
      WHERE is_active = true
        AND status = 'completed'
        AND completed_date IS NOT NULL
        AND YEAR(completed_date) = YEAR(CURDATE())
      GROUP BY ym
      ORDER BY ym ASC
    `;
    const rows = await query(graphSql);

    // Normalize to Jan..Dec of current year including months with zero
    const now = new Date();
    const year = now.getFullYear();
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`;
      months.push(ym);
    }
    const map = new Map(rows.map(r => [r.ym, r.cnt]));
    const series = months.map(ym => ({ month: ym, completed: map.get(ym) || 0 }));

    return res.status(200).json({
      success: true,
      message: 'Admin dashboard stats fetched successfully',
      data: {
        totals: {
          users: usersCountRow?.total_users || 0,
          dependents: dependentsCountRow?.total_dependents || 0,
          total_users_with_dependents: (usersCountRow?.total_users || 0) + (dependentsCountRow?.total_dependents || 0),
          completed_vaccines: completedVaccinesRow?.total_completed || 0,
          total_vaccines: totalVaccinesRow?.total_vaccines || 0
        },
        graph: series
      }
    });
  } catch (error) {
    logger.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const getAdminUsersList = async (req, res) => {
  try {
    const { page = 0, limit = 10, search } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 0, 0); // zero-based page index
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = pageNum * pageSize;

    let where = 'WHERE is_active = 1';
    const params = [];
    if (search) {
      where += ' AND (phone_number LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countSql = `SELECT COUNT(*) AS total FROM users ${where}`;
    const [countRow] = await query(countSql, params);
    const total = countRow?.total || 0;

    // Enhanced query with more user details
    const dataSql = `
      SELECT 
        u.id, 
        u.phone_number, 
        u.full_name, 
        u.dob, 
        u.gender, 
        u.country,
        u.address,
        u.contact_no,
        u.material_status,
        u.do_you_have_children,
        u.how_many_children,
        u.are_you_pregnant,
        u.pregnancy_detail,
        u.profile_completed, 
        u.image,
        u.created_at,
        u.updated_at,
        u.is_active,
        -- Dependents count
        COALESCE(dep_count.dependents_count, 0) as dependents_count,
        -- Vaccine statistics
        COALESCE(vaccine_stats.total_vaccines, 0) as total_vaccines,
        COALESCE(vaccine_stats.completed_vaccines, 0) as completed_vaccines,
        COALESCE(vaccine_stats.overdue_vaccines, 0) as overdue_vaccines,
        COALESCE(vaccine_stats.upcoming_vaccines, 0) as upcoming_vaccines,
        -- Last vaccine date
        vaccine_stats.last_vaccine_date
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id, 
          COUNT(*) as dependents_count
        FROM dependents 
        WHERE is_active = 1
        GROUP BY user_id
      ) dep_count ON u.id = dep_count.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as total_vaccines,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_vaccines,
          SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_vaccines,
          SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END) as upcoming_vaccines,
          MAX(completed_date) as last_vaccine_date
        FROM user_vaccines 
        WHERE is_active = 1 AND dependent_id IS NULL
        GROUP BY user_id
      ) vaccine_stats ON u.id = vaccine_stats.user_id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ${Number(offset)}, ${Number(pageSize)}
    `;
    const dataRows = await query(dataSql, params);

    // Get dependents for all users in the current page
    const userIds = dataRows.map(u => u.id);
    const dependentsMap = new Map();
    
    if (userIds.length > 0) {
      const dependentsSql = `
        SELECT 
          d.dependent_id,
          d.user_id,
          d.full_name,
          d.dob,
          d.gender,
          d.created_at,
          r.relation_type
        FROM dependents d
        LEFT JOIN relationships r ON d.relation_id = r.id
        WHERE d.user_id IN (${userIds.map(() => '?').join(',')}) 
        AND d.is_active = 1
        ORDER BY d.created_at DESC
      `;
      
      const dependentsRows = await query(dependentsSql, userIds);
      
      // Group dependents by user_id
      dependentsRows.forEach(dep => {
        if (!dependentsMap.has(dep.user_id)) {
          dependentsMap.set(dep.user_id, []);
        }
        dependentsMap.get(dep.user_id).push({
          id: dep.dependent_id,
          name: dep.full_name,
          dob: dep.dob,
          gender: dep.gender,
          relation_type: dep.relation_type,
          created_at: dep.created_at
        });
      });
    }

    const users = dataRows.map(u => ({
      id: u.id,
      encrypted_id: encryptUserId(u.id),
      image: u.image ? `${BASE_URL}${u.image}` : null,
      username: u.full_name || null,
      email: null,
      phoneNo: u.phone_number || null,
      DOB: u.dob || null,
      gender: u.gender || null,
      country: u.country || null,
      address: u.address || null,
      contact_no: u.contact_no || null,
      material_status: u.material_status || null,
      do_you_have_children: !!u.do_you_have_children,
      how_many_children: u.how_many_children || 0,
      are_you_pregnant: !!u.are_you_pregnant,
      pregnancy_detail: u.pregnancy_detail || null,
      profile_completed: !!u.profile_completed,
      created_at: u.created_at,
      updated_at: u.updated_at,
      is_active: !!u.is_active
    }));

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: {
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          pages: Math.ceil(total / pageSize),
          range: {
            start_index: offset,
            end_index: Math.min(offset + pageSize - 1, Math.max(total - 1, 0))
          }
        },
        users
      }
    });
  } catch (error) {
    logger.error('getAdminUsersList error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAdminUserDetails = async (req, res) => {
  try {
    const { user_id, admin_user_id, years_ahead } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id query parameter is required' 
      });
    }

    if (!admin_user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'admin_user_id query parameter is required' 
      });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }

    // Verify admin user ID matches the authenticated user
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin user ID mismatch' 
      });
    }

    // Get target user ID
    let userId;
    if (isNaN(user_id)) {
      // Encrypted user ID
      userId = decryptUserId(user_id);
    } else {
      // Numeric user ID
      userId = parseInt(user_id, 10);
    }
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user_id format' 
      });
    }

    // Get user details
    const userSql = `
      SELECT id, phone_number, full_name, dob, gender, country, address, 
             contact_no, material_status, do_you_have_children, how_many_children,
             are_you_pregnant, pregnancy_detail, profile_completed, created_at, updated_at
      FROM users 
      WHERE id = ? AND is_active = 1
    `;
    const userRows = await query(userSql, [userId]);
    
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userRows[0];

    // Get user's dependents
    const dependentsResult = await getDependentsByUserId(userId);
    const dependents = dependentsResult?.dependents || [];

    // Get user's vaccines grouped by status
    const yearsAhead = parseInt(years_ahead) || 2; // Default to 2 years if not provided
    const vaccinesData = await getUserVaccinesGroupedByType(userId, false, null, null, yearsAhead);
    
    // Organize vaccines by status
    const vaccines = {
      completed: [],
      upcoming: [],
      dueSoon: [],
      overdue: []
    };

    // Process all vaccine groups and categorize by status
    if (vaccinesData.success && vaccinesData.groups) {
      Object.values(vaccinesData.groups).forEach(vaccineList => {
        vaccineList.forEach(vaccine => {
          switch (vaccine.status) {
            case 'completed':
              vaccines.completed.push(vaccine);
              break;
            case 'upcoming':
              vaccines.upcoming.push(vaccine);
              break;
            case 'due_soon':
              vaccines.dueSoon.push(vaccine);
              break;
            case 'overdue':
              vaccines.overdue.push(vaccine);
              break;
            default:
              // Handle any other statuses
              vaccines.upcoming.push(vaccine);
              break;
          }
        });
      });
    }
    
    console.log('Admin API - final vaccines counts:', {
      completed: vaccines.completed.length,
      upcoming: vaccines.upcoming.length,
      dueSoon: vaccines.dueSoon.length,
      overdue: vaccines.overdue.length
    });

    return res.status(200).json({
      success: true,
      message: 'User details fetched successfully',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          phone_number: user.phone_number,
          dob: user.dob,
          gender: user.gender,
          country: user.country,
          address: user.address,
          contact_no: user.contact_no,
          material_status: user.material_status,
          do_you_have_children: user.do_you_have_children,
          how_many_children: user.how_many_children,
          are_you_pregnant: user.are_you_pregnant,
          pregnancy_detail: user.pregnancy_detail,
          profile_completed: !!user.profile_completed,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        dependents: dependents.map(dep => ({
          id: dep.id,
          user_id: dep.user_id,
          full_name: dep.full_name,
          dob: dep.dob,
          gender: dep.gender,
          relation_type: dep.relation_type,
          created_at: dep.created_at
        })),
        vaccines
      }
    });

  } catch (error) {
    logger.error('getAdminUserDetails error:', error);
    console.error('getAdminUserDetails error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

export const getAdminAllVaccines = async (req, res) => {
  try {
    const { admin_user_id, page = 0, limit = 50, search, type, category } = req.query;
    
    if (!admin_user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'admin_user_id query parameter is required' 
      });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }

    // Verify admin user ID matches the authenticated user
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin user ID mismatch' 
      });
    }

    // Pagination
    const pageNum = Math.max(parseInt(page, 10) || 0, 0);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = pageNum * pageSize;

    // Build WHERE clause - using is_active field for soft delete
    let whereClause = 'WHERE is_active = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR type LIKE ? OR category LIKE ? OR sub_category LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    // Get total count
    const countSql = `SELECT COUNT(*) AS total FROM vaccines ${whereClause}`;
    const [countRow] = await query(countSql, params);
    const total = countRow?.total || 0;

    // Get vaccines with pagination
    const vaccinesSql = `
      SELECT 
        vaccine_id,
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
        notes,
        created_at,
        updated_at
      FROM vaccines 
      ${whereClause}
      ORDER BY type ASC, category ASC, name ASC
      LIMIT ${offset}, ${pageSize}
    `;
    
    const vaccines = await query(vaccinesSql, params);

    // Get vaccine types for filter options
    const typesSql = `SELECT DISTINCT type FROM vaccines ORDER BY type ASC`;
    const types = await query(typesSql);

    // Get vaccine categories for filter options
    const categoriesSql = `SELECT DISTINCT category FROM vaccines ORDER BY category ASC`;
    const categories = await query(categoriesSql);

    logger.info(`Admin fetched all vaccines: ${vaccines.length} vaccines, page ${pageNum + 1}`);

    return res.status(200).json({
      success: true,
      message: 'All vaccines fetched successfully',
      data: {
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          pages: Math.ceil(total / pageSize),
          range: {
            start_index: offset,
            end_index: Math.min(offset + pageSize - 1, Math.max(total - 1, 0))
          }
        },
        filters: {
          types: types.map(t => t.type),
          categories: categories.map(c => c.category)
        },
        vaccines: vaccines.map(vaccine => ({
          vaccine_id: vaccine.vaccine_id,
          name: vaccine.name,
          type: vaccine.type,
          category: vaccine.category,
          sub_category: vaccine.sub_category,
          age_range: {
            min_age_months: vaccine.min_age_months,
            max_age_months: vaccine.max_age_months
          },
          doses: {
            total_doses: vaccine.total_doses,
            frequency: vaccine.frequency
          },
          details: {
            when_to_give: vaccine.when_to_give,
            dose: vaccine.dose,
            route: vaccine.route,
            site: vaccine.site,
            notes: vaccine.notes
          },
          created_at: vaccine.created_at,
          updated_at: vaccine.updated_at
        })),
        summary: {
          total_vaccines: total,
          current_page_count: vaccines.length
        }
      }
    });

  } catch (error) {
    logger.error('getAdminAllVaccines error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

export const updateAdminVaccine = async (req, res) => {
  try {
    const { 
      admin_user_id, 
      vaccine_id,
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

    if (!admin_user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'admin_user_id is required' 
      });
    }

    if (!vaccine_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'vaccine_id is required' 
      });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }

    // Verify admin user ID matches the authenticated user
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin user ID mismatch' 
      });
    }

    // Check if vaccine exists
    const checkSql = `SELECT vaccine_id FROM vaccines WHERE vaccine_id = ?`;
    const [existingVaccine] = await query(checkSql, [vaccine_id]);
    
    if (!existingVaccine) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vaccine not found' 
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (sub_category !== undefined) {
      updateFields.push('sub_category = ?');
      updateValues.push(sub_category);
    }
    if (min_age_months !== undefined) {
      updateFields.push('min_age_months = ?');
      updateValues.push(parseInt(min_age_months) || 0);
    }
    if (max_age_months !== undefined) {
      updateFields.push('max_age_months = ?');
      updateValues.push(max_age_months ? parseInt(max_age_months) : null);
    }
    if (total_doses !== undefined) {
      updateFields.push('total_doses = ?');
      updateValues.push(total_doses ? parseInt(total_doses) : null);
    }
    if (frequency !== undefined) {
      updateFields.push('frequency = ?');
      updateValues.push(frequency);
    }
    if (when_to_give !== undefined) {
      updateFields.push('when_to_give = ?');
      updateValues.push(when_to_give);
    }
    if (dose !== undefined) {
      updateFields.push('dose = ?');
      updateValues.push(dose);
    }
    if (route !== undefined) {
      updateFields.push('route = ?');
      updateValues.push(route);
    }
    if (site !== undefined) {
      updateFields.push('site = ?');
      updateValues.push(site);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No fields to update' 
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(vaccine_id);

    const updateSql = `
      UPDATE vaccines 
      SET ${updateFields.join(', ')}
      WHERE vaccine_id = ?
    `;

    const result = await query(updateSql, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vaccine not found or no changes made' 
      });
    }

    logger.info(`Admin updated vaccine: ${vaccine_id}`);

    return res.status(200).json({
      success: true,
      message: 'Vaccine updated successfully',
      data: {
        vaccine_id: parseInt(vaccine_id),
        updated_fields: updateFields.length - 1, // Exclude updated_at
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('updateAdminVaccine error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

export const deleteAdminVaccine = async (req, res) => {
  try {
    const { admin_user_id, vaccine_id } = req.body;

    if (!admin_user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'admin_user_id is required' 
      });
    }

    if (!vaccine_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'vaccine_id is required' 
      });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }

    // Verify admin user ID matches the authenticated user
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin user ID mismatch' 
      });
    }

    // Check if vaccine exists
    const checkSql = `SELECT vaccine_id, name FROM vaccines WHERE vaccine_id = ?`;
    const [existingVaccine] = await query(checkSql, [vaccine_id]);
    
    if (!existingVaccine) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vaccine not found' 
      });
    }

    // Soft delete - set is_active to 0
    const deleteSql = `
      UPDATE vaccines 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE vaccine_id = ?
    `;

    const result = await query(deleteSql, [vaccine_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vaccine not found' 
      });
    }

    // Also soft delete all user vaccines for this vaccine_id
    const deleteUserVaccinesSql = `
      UPDATE user_vaccines 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE vaccine_id = ?
    `;
    
    await query(deleteUserVaccinesSql, [vaccine_id]);
    logger.info(`Soft deleted all user vaccines for vaccine_id: ${vaccine_id}`);

    logger.info(`Admin deleted vaccine: ${vaccine_id} (${existingVaccine.name})`);

    return res.status(200).json({
      success: true,
      message: 'Vaccine deleted successfully',
      data: {
        vaccine_id: parseInt(vaccine_id),
        vaccine_name: existingVaccine.name,
        deleted_at: new Date().toISOString(),
        status: 'deleted'
      }
    });

  } catch (error) {
    logger.error('deleteAdminVaccine error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const {
      admin_user_id,
      user_id,
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
      pregnancy_detail
    } = req.body;

    if (!admin_user_id) {
      return res.status(400).json({
        success: false,
        message: 'admin_user_id is required'
      });
    }

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }

    // Verify admin user ID matches the authenticated user
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Admin user ID mismatch'
      });
    }

    // Get target user ID
    let targetUserId;
    if (isNaN(user_id)) {
      targetUserId = decryptUserId(user_id);
    } else {
      targetUserId = parseInt(user_id, 10);
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id format'
      });
    }

    // Check if user exists
    const checkSql = `SELECT id FROM users WHERE id = ? AND is_active = true`;
    const [existingUser] = await query(checkSql, [targetUserId]);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    if (phone_number !== undefined) {
      updateFields.push('phone_number = ?');
      updateValues.push(phone_number);
    }
    // DOB field is intentionally ignored - not allowed to be updated
    // if (dob !== undefined) {
    //   updateFields.push('dob = ?');
    //   updateValues.push(dob);
    // }
    if (gender !== undefined) {
      updateFields.push('gender = ?');
      updateValues.push(gender);
    }
    if (country !== undefined) {
      updateFields.push('country = ?');
      updateValues.push(country);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (contact_no !== undefined) {
      updateFields.push('contact_no = ?');
      updateValues.push(contact_no);
    }
    if (material_status !== undefined) {
      updateFields.push('material_status = ?');
      updateValues.push(material_status);
    }
    if (do_you_have_children !== undefined) {
      updateFields.push('do_you_have_children = ?');
      updateValues.push(do_you_have_children ? 1 : 0);
    }
    if (how_many_children !== undefined) {
      updateFields.push('how_many_children = ?');
      updateValues.push(how_many_children);
    }
    if (are_you_pregnant !== undefined) {
      updateFields.push('are_you_pregnant = ?');
      updateValues.push(are_you_pregnant ? 1 : 0);
    }
    if (pregnancy_detail !== undefined) {
      updateFields.push('pregnancy_detail = ?');
      updateValues.push(pregnancy_detail);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(targetUserId);

    const updateSql = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const result = await query(updateSql, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no changes made'
      });
    }

    logger.info(`Admin updated user: ${targetUserId}`);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user_id: targetUserId,
        encrypted_user_id: encryptUserId(targetUserId),
        updated_fields: updateFields.length - 1, // Exclude updated_at
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('updateAdminUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const { admin_user_id, user_id } = req.body;

    if (!admin_user_id) {
      return res.status(400).json({
        success: false,
        message: 'admin_user_id is required'
      });
    }

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }

    // Verify admin user ID matches the authenticated user
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Admin user ID mismatch'
      });
    }

    // Get target user ID
    let targetUserId;
    if (isNaN(user_id)) {
      targetUserId = decryptUserId(user_id);
    } else {
      targetUserId = parseInt(user_id, 10);
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id format'
      });
    }

    // Check if user exists
    const checkSql = `SELECT id, full_name FROM users WHERE id = ? AND is_active = true`;
    const [existingUser] = await query(checkSql, [targetUserId]);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete user - set is_active to false
    const deleteSql = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await query(deleteSql, [targetUserId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Also soft delete user's dependents
    const deleteDependentsSql = `
      UPDATE dependents
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    await query(deleteDependentsSql, [targetUserId]);

    logger.info(`Admin soft deleted user: ${targetUserId} (${existingUser.full_name})`);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully (soft delete)',
      data: {
        user_id: targetUserId,
        user_name: existingUser.full_name,
        deleted_at: new Date().toISOString(),
        status: 'soft_deleted',
        dependents_also_deleted: true
      }
    });

  } catch (error) {
    logger.error('deleteAdminUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Get dependent details (profile + vaccines grouped like user details)
export const getAdminDependentDetails = async (req, res) => {
  try {
    const { admin_user_id, user_id, dependent_id } = req.query;

    if (!admin_user_id) {
      return res.status(400).json({ success: false, message: 'admin_user_id query parameter is required' });
    }
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id query parameter is required' });
    }
    if (!dependent_id) {
      return res.status(400).json({ success: false, message: 'dependent_id query parameter is required' });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Admin user ID mismatch' });
    }

    // Use user_id as simple ID (like user-detail API) and dependent_id as encrypted
    const actualUserId = parseInt(user_id, 10);
    
    let actualDependentId;
    if (isNaN(dependent_id)) {
      actualDependentId = decryptUserId(dependent_id);
    } else {
      actualDependentId = parseInt(dependent_id, 10);
    }
    
    if (!actualUserId || isNaN(actualUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user_id format' });
    }
    if (!actualDependentId) {
      return res.status(400).json({ success: false, message: 'Invalid dependent_id format' });
    }

    // Get dependent and validate ownership
    const depResult = await getDependentById(actualDependentId);
    if (!depResult.success) {
      return res.status(404).json({ success: false, message: 'Dependent not found' });
    }
    const dep = depResult.dependent;
    if (dep.user_id !== actualUserId) {
      return res.status(403).json({ success: false, message: 'Dependent does not belong to this user' });
    }

    // Fetch vaccines grouped by type for this dependent
    const vaccinesData = await getUserVaccinesGroupedByType(actualUserId, false, null, actualDependentId);

    // Organize vaccines by status similar to user details
    const vaccines = { completed: [], upcoming: [], dueSoon: [], overdue: [] };
    Object.values(vaccinesData.groups || {}).forEach(list => {
      list.forEach(v => {
        switch (v.status) {
          case 'completed':
            vaccines.completed.push(v);
            break;
          case 'upcoming':
            vaccines.upcoming.push(v);
            break;
          case 'due_soon':
            vaccines.dueSoon.push(v);
            break;
          case 'overdue':
            vaccines.overdue.push(v);
            break;
        }
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Dependent details fetched successfully',
      data: {
        user_id: actualUserId,
        dependent: {
          id: dep.dependent_id || dep.id,
          full_name: dep.full_name,
          dob: dep.dob,
          gender: dep.gender,
          relation_type: dep.relation_type,
          phone_number: dep.phone_number,
          country: dep.country,
          address: dep.address,
          contact_no: dep.contact_no,
          material_status: dep.material_status,
          do_you_have_children: dep.do_you_have_children,
          how_many_children: dep.how_many_children,
          are_you_pregnant: dep.are_you_pregnant,
          pregnancy_detail: dep.pregnancy_detail,
          profile_completed: !!dep.profile_completed,
          created_at: dep.created_at,
          updated_at: dep.updated_at
        },
        vaccines
      }
    });
  } catch (error) {
    logger.error('getAdminDependentDetails error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Add new vaccine - Admin API
 * POST /api/admin/vaccine-add
 * 
 * Required Headers:
 * - Authorization: Bearer <admin_token>
 * 
 * Required Fields:
 * - admin_user_id: Admin user ID (encrypted or numeric)
 * - name: Vaccine name (string)
 * - type: Vaccine type (string) - e.g., "Mandatory", "Optional"
 * - category: Vaccine category (string) - e.g., "Child", "Adult", "Pregnancy"
 * - sub_category: Vaccine sub-category (string) - e.g., "Mandatory", "Recommended"
 * - min_age_months: Minimum age in months (number)
 * - frequency: Vaccine frequency (string) - e.g., "Single", "Multiple", "Booster"
 * 
 * Optional Fields:
 * - max_age_months: Maximum age in months (number)
 * - total_doses: Total number of doses (number)
 * - when_to_give: When to give the vaccine (string)
 * - dose: Vaccine dose information (string)
 * - route: Administration route (string) - e.g., "Oral", "Injection", "Nasal"
 * - site: Administration site (string) - e.g., "Arm", "Thigh", "Oral"
 * - notes: Additional notes (string)
 * 
 * Example Request Body:
 * {
 *   "admin_user_id": "SLK_1_9b25065e",
 *   "name": "OPV Booster",
 *   "type": "Mandatory",
 *   "category": "Child",
 *   "sub_category": "Mandatory",
 *   "min_age_months": 16,
 *   "max_age_months": 24,
 *   "total_doses": 1,
 *   "frequency": "Booster",
 *   "when_to_give": "16–24 months",
 *   "dose": "2 drops",
 *   "route": "Oral",
 *   "site": "Oral",
 *   "notes": "Mandatory."
 * }
 */
export const addAdminVaccine = async (req, res) => {
  try {
    const {
      admin_user_id,
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

    // Validate required fields
    if (!admin_user_id) {
      return res.status(400).json({
        success: false,
        message: 'admin_user_id is required'
      });
    }

    // Validate vaccine required fields
    const requiredFields = ['name', 'type', 'category', 'sub_category', 'frequency'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        required_fields: requiredFields,
        missing_fields: missingFields
      });
    }

    // Validate min_age_months is provided and is a number
    if (min_age_months === undefined || min_age_months === null || min_age_months === '') {
      return res.status(400).json({
        success: false,
        message: 'min_age_months is required and must be a number'
      });
    }

    // Decrypt admin user ID to verify it matches the logged-in admin
    let adminUserId;
    if (isNaN(admin_user_id)) {
      adminUserId = decryptUserId(admin_user_id);
    } else {
      adminUserId = parseInt(admin_user_id, 10);
    }

    // Verify admin user ID matches the authenticated user
    if (!adminUserId || adminUserId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Admin user ID mismatch'
      });
    }

    // Check if vaccine with same name already exists
    const checkSql = `SELECT vaccine_id FROM vaccines WHERE name = ? AND is_active = 1`;
    const [existingVaccine] = await query(checkSql, [name]);
    
    if (existingVaccine) {
      return res.status(409).json({
        success: false,
        message: 'Vaccine with this name already exists'
      });
    }

    // Insert new vaccine with all fields
    const insertSql = `
      INSERT INTO vaccines (
        name, type, category, sub_category, min_age_months, max_age_months,
        total_doses, frequency, when_to_give, dose, route, site, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      name.trim(),
      type.trim(),
      category.trim(),
      sub_category.trim(),
      parseInt(min_age_months) || 0,
      max_age_months ? parseInt(max_age_months) : null,
      total_doses ? parseInt(total_doses) : null,
      frequency.trim(),
      when_to_give ? when_to_give.trim() : null,
      dose ? dose.trim() : null,
      route ? route.trim() : null,
      site ? site.trim() : null,
      notes ? notes.trim() : null
    ];

    const result = await query(insertSql, params);

    logger.info(`Admin added new vaccine: ${name} (ID: ${result.insertId})`);

    // Return complete vaccine data
    return res.status(201).json({
      success: true,
      message: 'Vaccine added successfully',
      data: {
        vaccine_id: result.insertId,
        name: name.trim(),
        type: type.trim(),
        category: category.trim(),
        sub_category: sub_category.trim(),
        min_age_months: parseInt(min_age_months) || 0,
        max_age_months: max_age_months ? parseInt(max_age_months) : null,
        total_doses: total_doses ? parseInt(total_doses) : null,
        frequency: frequency.trim(),
        when_to_give: when_to_give ? when_to_give.trim() : null,
        dose: dose ? dose.trim() : null,
        route: route ? route.trim() : null,
        site: site ? site.trim() : null,
        notes: notes ? notes.trim() : null,
        created_at: new Date().toISOString(),
        is_active: true
      }
    });

  } catch (error) {
    logger.error('addAdminVaccine error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


