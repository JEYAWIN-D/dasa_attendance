const { query } = require('../../config/db');

// Main Super Admin Dashboard Analytics
async function getDashboardAnalytics(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Total Active Employees
    const totalEmpRes = await query(`SELECT count(*) as count FROM employees WHERE is_active = true`);
    const totalEmployees = parseInt(totalEmpRes.rows[0].count, 10);

    // 2. Today's Attendance Stats
    const todayStatsRes = await query(`
      SELECT 
        COUNT(CASE WHEN check_in_time IS NOT NULL THEN 1 END) as present_today,
        COUNT(CASE WHEN check_in_status = 'LATE' THEN 1 END) as late_today,
        COUNT(CASE WHEN check_in_status = 'EARLY' THEN 1 END) as early_today,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_today,
        COUNT(CASE WHEN check_out_time IS NOT NULL THEN 1 END) as checked_out_today
      FROM attendance_records
      WHERE date = $1
    `, [today]);
    const todayStats = todayStatsRes.rows[0];

    // 3. Approved Leave Today
    const onLeaveRes = await query(`
      SELECT count(*) as count
      FROM leave_requests
      WHERE status = 'APPROVED' AND $1 BETWEEN start_date AND end_date
    `, [today]);
    const onLeaveToday = parseInt(onLeaveRes.rows[0].count, 10);

    // 4. Pending Requests (Leave + Permission + Weekend + Client Visit)
    const pendingLeavesRes = await query(`SELECT count(*) as count FROM leave_requests WHERE status = 'PENDING'`);
    const pendingPermRes = await query(`SELECT count(*) as count FROM permission_requests WHERE status = 'PENDING'`);
    const pendingWeekendRes = await query(`SELECT count(*) as count FROM weekend_work WHERE status = 'PENDING'`);
    const pendingClientRes = await query(`SELECT count(*) as count FROM client_visits WHERE status = 'PENDING'`);
    const pendingApprovals = 
      parseInt(pendingLeavesRes.rows[0].count, 10) +
      parseInt(pendingPermRes.rows[0].count, 10) +
      parseInt(pendingWeekendRes.rows[0].count, 10) +
      parseInt(pendingClientRes.rows[0].count, 10);

    // 5. Active Remote / Client Visits Today
    const clientVisitsRes = await query(`SELECT count(*) as count FROM client_visits WHERE date = $1`, [today]);
    const workingClientToday = parseInt(clientVisitsRes.rows[0].count, 10);

    // 6. Streak Leaderboard (Top 10 employees by streak)
    const leaderboardRes = await query(`
      SELECT st.current_streak, st.longest_streak, st.total_present_days,
             e.id, e.display_name, e.employee_code, e.profile_photo_url, e.designation,
             d.name as department_name,
             ar.nickname as current_nickname, ar.check_in_status
      FROM attendance_streaks st
      JOIN employees e ON st.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = $1
      WHERE e.is_active = true
      ORDER BY st.current_streak DESC, st.longest_streak DESC
      LIMIT 10
    `, [today]);

    // 7. Department-wise Attendance
    const deptAttendanceRes = await query(`
      SELECT d.name as department, count(e.id) as total,
             count(ar.id) FILTER (WHERE ar.check_in_time IS NOT NULL) as present
      FROM departments d
      JOIN employees e ON e.department_id = d.id AND e.is_active = true
      LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = $1
      GROUP BY d.name
    `, [today]);

    // 8. Weekly Attendance Trend (Last 7 days)
    const weeklyTrendRes = await query(`
      SELECT 
        d.day::date as date,
        TO_CHAR(d.day, 'Dy') as day_name,
        COUNT(ar.id) FILTER (WHERE ar.check_in_time IS NOT NULL) as present,
        COUNT(ar.id) FILTER (WHERE ar.check_in_status = 'LATE') as late,
        COUNT(ar.id) FILTER (WHERE ar.check_in_status = 'EARLY') as early
      FROM generate_series(CURRENT_DATE - interval '6 days', CURRENT_DATE, interval '1 day') as d(day)
      LEFT JOIN attendance_records ar ON ar.date = d.day::date
      GROUP BY d.day
      ORDER BY d.day ASC
    `);

    // 9. Live Activity Feed (Latest 10 check-ins / outs)
    const liveActivityRes = await query(`
      SELECT ae.id, ae.event_type, ae.timestamp, ae.latitude, ae.longitude,
             ae.accuracy_meters, ae.location_name, ae.selfie_url,
             e.display_name, e.employee_code, e.designation, d.name as department_name
      FROM attendance_events ae
      JOIN employees e ON ae.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY ae.timestamp DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      metrics: {
        totalEmployees,
        presentToday: parseInt(todayStats.present_today || 0, 10),
        absentToday: Math.max(0, totalEmployees - parseInt(todayStats.present_today || 0, 10) - onLeaveToday),
        lateToday: parseInt(todayStats.late_today || 0, 10),
        earlyToday: parseInt(todayStats.early_today || 0, 10),
        checkedOutToday: parseInt(todayStats.checked_out_today || 0, 10),
        onLeaveToday,
        workingClientToday,
        pendingApprovals
      },
      leaderboard: leaderboardRes.rows,
      departmentStats: deptAttendanceRes.rows,
      weeklyTrend: weeklyTrendRes.rows,
      liveActivity: liveActivityRes.rows
    });
  } catch (err) {
    next(err);
  }
}

// Audit Logs
async function getAuditLogs(req, res, next) {
  try {
    const { action, limit, offset } = req.query;
    let queryText = `
      SELECT al.*, u.email as admin_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      params.push(action);
      queryText += ` AND al.action = $${params.length}`;
    }

    queryText += ` ORDER BY al.created_at DESC`;

    const limitVal = parseInt(limit || 50, 10);
    const offsetVal = parseInt(offset || 0, 10);
    params.push(limitVal);
    queryText += ` LIMIT $${params.length}`;
    params.push(offsetVal);
    queryText += ` OFFSET $${params.length}`;

    const logsRes = await query(queryText, params);
    res.json({ success: true, logs: logsRes.rows });
  } catch (err) {
    next(err);
  }
}

// Company Settings
async function getCompanySettings(req, res, next) {
  try {
    const settingsRes = await query(`SELECT * FROM company_settings ORDER BY setting_key ASC`);
    const locRes = await query(`SELECT * FROM attendance_locations WHERE is_active = true`);

    const formattedSettings = {};
    settingsRes.rows.forEach(s => {
      formattedSettings[s.setting_key] = s.setting_value;
    });

    res.json({
      success: true,
      settings: formattedSettings,
      locations: locRes.rows
    });
  } catch (err) {
    next(err);
  }
}

async function updateCompanySetting(req, res, next) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const compRes = await query(`SELECT id FROM companies WHERE slug = 'dasa-tech' LIMIT 1`);
    const companyId = compRes.rows[0].id;

    const upsertRes = await query(`
      INSERT INTO company_settings (company_id, setting_key, setting_value, description, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (company_id, setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value,
                    description = COALESCE(EXCLUDED.description, company_settings.description),
                    updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [companyId, key, JSON.stringify(value), description]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES ($1, 'UPDATE_SETTING', 'COMPANY_SETTINGS', $2, $3, $4)
    `, [req.user.id, key, JSON.stringify(value), req.ip]);

    res.json({ success: true, setting: upsertRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Holidays
async function getHolidays(req, res, next) {
  try {
    const holidaysRes = await query(`SELECT * FROM holidays ORDER BY date ASC`);
    res.json({ success: true, holidays: holidaysRes.rows });
  } catch (err) {
    next(err);
  }
}

async function createHoliday(req, res, next) {
  try {
    const { name, date, description, isRecurring } = req.body;
    const compRes = await query(`SELECT id FROM companies WHERE slug = 'dasa-tech' LIMIT 1`);
    const companyId = compRes.rows[0].id;

    const insertRes = await query(`
      INSERT INTO holidays (company_id, name, date, description, is_recurring)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [companyId, name, date, description, isRecurring || false]);

    res.status(201).json({ success: true, holiday: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Departments
async function getDepartments(req, res, next) {
  try {
    const deptsRes = await query(`
      SELECT d.*, count(e.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = true
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    res.json({ success: true, departments: deptsRes.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardAnalytics,
  getAuditLogs,
  getCompanySettings,
  updateCompanySetting,
  getHolidays,
  createHoliday,
  getDepartments
};

