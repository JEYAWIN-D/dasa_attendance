const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');

// Public List for Landing Page (Safe: no sensitive hashes or private contact details)
async function getPublicEmployees(req, res, next) {
  try {
    const employeesRes = await query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.display_name,
             e.designation, e.profile_photo_url, d.name as department_name,
             s.id as shift_id, s.name as shift_name, s.start_time, s.end_time, s.grace_period_minutes,
             st.current_streak, st.longest_streak,
             ar.id as today_attendance_id, ar.check_in_time as today_check_in, ar.check_out_time as today_check_out,
             ar.status as today_status, ar.nickname as current_nickname
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN attendance_streaks st ON st.employee_id = e.id
      LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = CURRENT_DATE
      WHERE e.is_active = true
      ORDER BY e.display_name ASC
    `);

    res.json({
      success: true,
      employees: employeesRes.rows
    });
  } catch (err) {
    next(err);
  }
}

// Full List for Admin Management
async function getAllEmployees(req, res, next) {
  try {
    const { department, status, search } = req.query;

    let queryText = `
      SELECT e.*, d.name as department_name, d.code as department_code,
             s.name as shift_name, s.start_time, s.end_time, s.grace_period_minutes,
             st.current_streak, st.longest_streak, st.total_present_days,
             ar.check_in_time as today_check_in, ar.check_out_time as today_check_out, ar.status as today_status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN attendance_streaks st ON st.employee_id = e.id
      LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = CURRENT_DATE
      WHERE 1=1
    `;
    const params = [];

    if (department) {
      params.push(department);
      queryText += ` AND e.department_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      queryText += ` AND e.employment_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (e.display_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
    }

    queryText += ` ORDER BY e.created_at DESC`;

    const result = await query(queryText, params);

    res.json({
      success: true,
      employees: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// Single Employee Details
async function getEmployeeById(req, res, next) {
  try {
    const { id } = req.params;

    const empRes = await query(`
      SELECT e.*, d.name as department_name, s.name as shift_name, s.start_time, s.end_time, s.grace_period_minutes,
             st.current_streak, st.longest_streak, st.monthly_streak, st.total_present_days, st.total_on_time_days
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN attendance_streaks st ON st.employee_id = e.id
      WHERE e.id = $1
    `, [id]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const employee = empRes.rows[0];

    // Recent 10 attendance records
    const recentRes = await query(`
      SELECT * FROM attendance_records
      WHERE employee_id = $1
      ORDER BY date DESC
      LIMIT 10
    `, [id]);

    // Achievements
    const achRes = await query(`
      SELECT * FROM employee_achievements
      WHERE employee_id = $1
      ORDER BY earned_at DESC
    `, [id]);

    res.json({
      success: true,
      employee,
      recentAttendance: recentRes.rows,
      achievements: achRes.rows
    });
  } catch (err) {
    next(err);
  }
}

// Create Employee (Admin)
async function createEmployee(req, res, next) {
  try {
    const {
      firstName, lastName, email, phone, employeeCode, departmentId,
      designation, shiftId, dateOfJoining, pin, initialPassword
    } = req.body;

    if (!firstName || !lastName || !email || !employeeCode) {
      return res.status(400).json({ success: false, message: 'First name, last name, email, and employee code are required.' });
    }

    const companyRes = await query(`SELECT id FROM companies WHERE slug = 'dasa-tech' LIMIT 1`);
    const companyId = companyRes.rows[0].id;

    // Check duplicate code or email
    const dupCheck = await query(`
      SELECT id FROM employees WHERE employee_code = $1 OR email = $2
    `, [employeeCode.trim(), email.trim()]);

    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Employee code or email already exists.' });
    }

    // Role
    const roleRes = await query(`SELECT id FROM roles WHERE name = 'EMPLOYEE' LIMIT 1`);
    const roleId = roleRes.rows[0].id;

    const passwordHash = await bcrypt.hash(initialPassword || 'dasa2026', 10);
    const pinHash = await bcrypt.hash(pin || '1234', 10);

    // Create user
    const userRes = await query(`
      INSERT INTO users (company_id, role_id, email, password_hash, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id
    `, [companyId, roleId, email.trim(), passwordHash]);
    const userId = userRes.rows[0].id;

    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    // Create employee
    const empRes = await query(`
      INSERT INTO employees (
        company_id, user_id, employee_code, first_name, last_name, display_name,
        email, phone, department_id, designation, shift_id, date_of_joining,
        attendance_pin_hash, profile_photo_url, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, '/uploads/dasa-logo.png', true)
      RETURNING *
    `, [
      companyId, userId, employeeCode.trim(), firstName.trim(), lastName.trim(), displayName,
      email.trim(), phone || null, departmentId || null, designation || 'Staff Specialist',
      shiftId || null, dateOfJoining || new Date().toISOString().split('T')[0], pinHash
    ]);

    const createdEmp = empRes.rows[0];

    // Initialize streak
    await query(`
      INSERT INTO attendance_streaks (employee_id, current_streak, longest_streak, monthly_streak, total_present_days, last_attendance_date)
      VALUES ($1, 0, 0, 0, 0, NULL)
    `, [createdEmp.id]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
      VALUES ($1, 'CREATE_EMPLOYEE', 'EMPLOYEE', $2, $3, $4)
    `, [req.user.id, createdEmp.id, JSON.stringify(createdEmp), req.ip]);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: createdEmp
    });
  } catch (err) {
    next(err);
  }
}

// Update Employee
async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, phone, departmentId, designation,
      shiftId, employmentStatus, pin
    } = req.body;

    const existingRes = await query(`SELECT * FROM employees WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    const current = existingRes.rows[0];

    const displayName = firstName && lastName ? `${firstName} ${lastName}` : current.display_name;
    let pinHash = current.attendance_pin_hash;
    if (pin && pin.trim().length >= 4) {
      pinHash = await bcrypt.hash(pin.trim(), 10);
    }

    const updatedRes = await query(`
      UPDATE employees
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          display_name = $3,
          phone = COALESCE($4, phone),
          department_id = COALESCE($5, department_id),
          designation = COALESCE($6, designation),
          shift_id = COALESCE($7, shift_id),
          employment_status = COALESCE($8, employment_status),
          attendance_pin_hash = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      firstName, lastName, displayName, phone, departmentId,
      designation, shiftId, employmentStatus, pinHash, id
    ]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES ($1, 'UPDATE_EMPLOYEE', 'EMPLOYEE', $2, $3, $4, $5)
    `, [req.user.id, id, JSON.stringify(current), JSON.stringify(updatedRes.rows[0]), req.ip]);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: updatedRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// Toggle Employee Active Status
async function toggleEmployeeStatus(req, res, next) {
  try {
    const { id } = req.params;
    const empRes = await query(`SELECT is_active, user_id FROM employees WHERE id = $1`, [id]);
    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const newStatus = !empRes.rows[0].is_active;
    await query(`UPDATE employees SET is_active = $1 WHERE id = $2`, [newStatus, id]);
    if (empRes.rows[0].user_id) {
      await query(`UPDATE users SET is_active = $1 WHERE id = $2`, [newStatus, empRes.rows[0].user_id]);
    }

    res.json({
      success: true,
      message: `Employee ${newStatus ? 'activated' : 'deactivated'} successfully`,
      isActive: newStatus
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublicEmployees,
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus
};

