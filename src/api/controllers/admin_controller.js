import { query } from '../../config/database.js';
import logger from '../../config/logger.js';
import { decryptUserId } from '../../services/encryption_service.js';
import { encryptUserId } from '../../services/encryption_service.js';

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

    const dataSql = `
      SELECT id, phone_number, full_name, dob, gender, profile_completed, created_at
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT ${Number(offset)}, ${Number(pageSize)}
    `;
    const dataRows = await query(dataSql, params);

    const users = dataRows.map(u => ({
      id: u.id,
      encrypted_id: encryptUserId(u.id),
      phone_number: u.phone_number,
      full_name: u.full_name,
      dob: u.dob,
      gender: u.gender,
      profile_completed: !!u.profile_completed,
      created_at: u.created_at
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


