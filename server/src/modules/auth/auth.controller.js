const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dasa_tech_enterprise_jwt_secret_key_2026_super_secure';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dasa_tech_refresh_secret_998877_secure';

// Super Admin Email/Password Login
async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const userRes = await query(`
      SELECT u.id, u.email, u.password_hash, u.role_id, r.name as role,
             e.id as employee_id, e.display_name, e.designation, e.profile_photo_url
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees e ON e.user_id = u.id
      WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true
    `, [email.trim()]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    const user = userRes.rows[0];
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only Super Admin can login here.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token & update last login
    await query(`
      UPDATE users SET refresh_token = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2
    `, [refreshToken, user.id]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
      VALUES ($1, 'ADMIN_LOGIN', 'USER', $2, $3, $4)
    `, [user.id, user.id.toString(), req.ip, req.headers['user-agent']]);

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name || 'Super Admin',
        designation: user.designation || 'System Administrator',
        photo: user.profile_photo_url
      }
    });
  } catch (err) {
    next(err);
  }
}

// Employee PIN Verification (for Attendance marking & Employee Portal)
async function employeeVerifyPin(req, res, next) {
  try {
    const { employeeId, pin } = req.body;

    if (!employeeId || !pin) {
      return res.status(400).json({ success: false, message: 'Employee selection and PIN are required.' });
    }

    const empRes = await query(`
      SELECT e.id, e.user_id, e.employee_code, e.first_name, e.last_name, e.display_name,
             e.email, e.attendance_pin_hash, e.profile_photo_url, e.department_id, d.name as department_name,
             e.designation, e.shift_id, s.name as shift_name, s.start_time, s.end_time, s.grace_period_minutes,
             u.role_id, r.name as role
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE e.id = $1 AND e.is_active = true
    `, [employeeId]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found or inactive.' });
    }

    const emp = empRes.rows[0];

    // If PIN is not set, default is '1234'
    const isPinValid = emp.attendance_pin_hash 
      ? await bcrypt.compare(pin, emp.attendance_pin_hash)
      : (pin === '1234');

    if (!isPinValid) {
      return res.status(401).json({ success: false, message: 'Incorrect PIN. Please try again.' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: emp.user_id, employeeId: emp.id, role: emp.role || 'EMPLOYEE', email: emp.email },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Fetch today's attendance record
    const todayRes = await query(`
      SELECT * FROM attendance_records
      WHERE employee_id = $1 AND date = CURRENT_DATE
    `, [emp.id]);

    // Fetch streak & badge summary
    const streakRes = await query(`
      SELECT * FROM attendance_streaks WHERE employee_id = $1
    `, [emp.id]);

    const badgesRes = await query(`
      SELECT * FROM employee_achievements WHERE employee_id = $1 ORDER BY earned_at DESC
    `, [emp.id]);

    res.json({
      success: true,
      token,
      employee: {
        id: emp.id,
        userId: emp.user_id,
        code: emp.employee_code,
        displayName: emp.display_name,
        email: emp.email,
        department: emp.department_name,
        designation: emp.designation,
        photo: emp.profile_photo_url,
        shift: {
          id: emp.shift_id,
          name: emp.shift_name,
          startTime: emp.start_time,
          endTime: emp.end_time,
          gracePeriod: emp.grace_period_minutes
        }
      },
      todayAttendance: todayRes.rows[0] || null,
      streak: streakRes.rows[0] || { current_streak: 0, longest_streak: 0 },
      badges: badgesRes.rows
    });
  } catch (err) {
    next(err);
  }
}

// Refresh Token
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const userRes = await query(`SELECT id, role_id, is_active FROM users WHERE id = $1`, [decoded.userId]);

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Session expired or user deactivated.' });
    }

    const token = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid refresh token.' });
  }
}

// Get Current User Profile
async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const empRes = await query(`
      SELECT e.*, d.name as department_name, s.name as shift_name, s.start_time, s.end_time, s.grace_period_minutes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.user_id = $1
    `, [req.user.id]);

    const employee = empRes.rows[0] || null;

    let todayAttendance = null;
    let streak = null;
    let badges = [];

    if (employee) {
      const todayRes = await query(`SELECT * FROM attendance_records WHERE employee_id = $1 AND date = CURRENT_DATE`, [employee.id]);
      todayAttendance = todayRes.rows[0] || null;

      const streakRes = await query(`SELECT * FROM attendance_streaks WHERE employee_id = $1`, [employee.id]);
      streak = streakRes.rows[0] || null;

      const bRes = await query(`SELECT * FROM employee_achievements WHERE employee_id = $1 ORDER BY earned_at DESC`, [employee.id]);
      badges = bRes.rows;
    }

    res.json({
      success: true,
      user: req.user,
      employee,
      todayAttendance,
      streak,
      badges
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLogin,
  employeeVerifyPin,
  refreshToken,
  getMe
};
