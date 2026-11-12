const { query } = require('../../config/db');

// --- LEAVE REQUESTS ---
async function getLeaveTypes(req, res, next) {
  try {
    const typesRes = await query(`SELECT * FROM leave_types ORDER BY name ASC`);
    res.json({ success: true, leaveTypes: typesRes.rows });
  } catch (err) {
    next(err);
  }
}

async function getLeaveRequests(req, res, next) {
  try {
    const { employeeId, status } = req.query;
    let queryText = `
      SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.is_paid,
             e.display_name, e.employee_code, e.department_id, d.name as department_name,
             u.email as reviewer_email
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON lr.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'SUPER_ADMIN') {
      params.push(req.user.employee_id);
      queryText += ` AND lr.employee_id = $${params.length}`;
    } else if (employeeId) {
      params.push(employeeId);
      queryText += ` AND lr.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      queryText += ` AND lr.status = $${params.length}`;
    }

    queryText += ` ORDER BY lr.created_at DESC`;

    const result = await query(queryText, params);
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    next(err);
  }
}

async function submitLeaveRequest(req, res, next) {
  try {
    const { leaveTypeId, startDate, endDate, totalDays, reason } = req.body;
    const employeeId = req.user.employee_id || req.body.employeeId;

    if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'All leave details are required.' });
    }

    let docUrl = null;
    if (req.file) {
      docUrl = `/uploads/documents/${req.file.filename}`;
    }

    const compRes = await query(`SELECT company_id FROM employees WHERE id = $1`, [employeeId]);
    const companyId = compRes.rows[0].company_id;

    const insertRes = await query(`
      INSERT INTO leave_requests (
        company_id, employee_id, leave_type_id, start_date, end_date, total_days, reason, document_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING *
    `, [companyId, employeeId, leaveTypeId, startDate, endDate, totalDays || 1, reason, docUrl]);

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully.',
      request: insertRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

async function reviewLeaveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
    }

    const updatedRes = await query(`
      UPDATE leave_requests
      SET status = $1,
          reviewed_by = $2,
          review_comment = $3,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, req.user.id, reviewComment || null, id]);

    if (updatedRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const reqRecord = updatedRes.rows[0];

    // Create notification for employee
    await query(`
      INSERT INTO notifications (employee_id, title, message, type)
      VALUES ($1, $2, $3, $4)
    `, [
      reqRecord.employee_id,
      `Leave Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      `Your leave request for ${reqRecord.start_date} to ${reqRecord.end_date} has been ${status.toLowerCase()}.${reviewComment ? ' Note: ' + reviewComment : ''}`,
      status === 'APPROVED' ? 'SUCCESS' : 'WARNING'
    ]);

    res.json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully.`,
      request: reqRecord
    });
  } catch (err) {
    next(err);
  }
}

// --- PERMISSION REQUESTS ---
async function getPermissionRequests(req, res, next) {
  try {
    const { employeeId, status } = req.query;
    let queryText = `
      SELECT pr.*, e.display_name, e.employee_code, d.name as department_name
      FROM permission_requests pr
      JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'SUPER_ADMIN') {
      params.push(req.user.employee_id);
      queryText += ` AND pr.employee_id = $${params.length}`;
    } else if (employeeId) {
      params.push(employeeId);
      queryText += ` AND pr.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      queryText += ` AND pr.status = $${params.length}`;
    }

    queryText += ` ORDER BY pr.created_at DESC`;

    const result = await query(queryText, params);
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    next(err);
  }
}

async function submitPermissionRequest(req, res, next) {
  try {
    const { date, startTime, endTime, durationMinutes, requestType, reason } = req.body;
    const employeeId = req.user.employee_id || req.body.employeeId;

    if (!employeeId || !date || !startTime || !endTime || !reason) {
      return res.status(400).json({ success: false, message: 'All permission details are required.' });
    }

    const compRes = await query(`SELECT company_id FROM employees WHERE id = $1`, [employeeId]);
    const companyId = compRes.rows[0].company_id;

    const insertRes = await query(`
      INSERT INTO permission_requests (
        company_id, employee_id, date, start_time, end_time, duration_minutes, request_type, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING *
    `, [companyId, employeeId, date, startTime, endTime, durationMinutes || 60, requestType || 'PERSONAL_BREAK', reason]);

    res.status(201).json({
      success: true,
      message: 'Permission request submitted.',
      request: insertRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

async function reviewPermissionRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;

    const updatedRes = await query(`
      UPDATE permission_requests
      SET status = $1, reviewed_by = $2, review_comment = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, req.user.id, reviewComment || null, id]);

    res.json({ success: true, request: updatedRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

// --- WEEKEND & NIGHT WORK ---
async function getWeekendWork(req, res, next) {
  try {
    const { employeeId } = req.query;
    let queryText = `
      SELECT ww.*, e.display_name, e.employee_code
      FROM weekend_work ww
      JOIN employees e ON ww.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (req.user.role !== 'SUPER_ADMIN') {
      params.push(req.user.employee_id);
      queryText += ` AND ww.employee_id = $${params.length}`;
    } else if (employeeId) {
      params.push(employeeId);
      queryText += ` AND ww.employee_id = $${params.length}`;
    }
    queryText += ` ORDER BY ww.date DESC`;
    const result = await query(queryText, params);
    res.json({ success: true, records: result.rows });
  } catch (err) {
    next(err);
  }
}

async function submitWeekendWork(req, res, next) {
  try {
    const { date, startTime, endTime, totalHours, projectName, clientName, workDescription } = req.body;
    const employeeId = req.user.employee_id || req.body.employeeId;

    const compRes = await query(`SELECT company_id FROM employees WHERE id = $1`, [employeeId]);
    const companyId = compRes.rows[0].company_id;

    const insertRes = await query(`
      INSERT INTO weekend_work (
        company_id, employee_id, date, start_time, end_time, total_hours,
        project_name, client_name, work_description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
      RETURNING *
    `, [companyId, employeeId, date, startTime, endTime, totalHours, projectName, clientName, workDescription]);

    res.status(201).json({ success: true, record: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function reviewWeekendWork(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;
    const resRow = await query(`
      UPDATE weekend_work SET status = $1, reviewed_by = $2, review_comment = $3, reviewed_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *
    `, [status, req.user.id, reviewComment, id]);
    res.json({ success: true, record: resRow.rows[0] });
  } catch (err) {
    next(err);
  }
}

// --- CLIENT VISITS & MEETINGS ---
async function getClientVisits(req, res, next) {
  try {
    const { employeeId } = req.query;
    let queryText = `
      SELECT cv.*, e.display_name, e.employee_code
      FROM client_visits cv
      JOIN employees e ON cv.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (req.user.role !== 'SUPER_ADMIN') {
      params.push(req.user.employee_id);
      queryText += ` AND cv.employee_id = $${params.length}`;
    } else if (employeeId) {
      params.push(employeeId);
      queryText += ` AND cv.employee_id = $${params.length}`;
    }
    queryText += ` ORDER BY cv.date DESC`;
    const result = await query(queryText, params);
    res.json({ success: true, visits: result.rows });
  } catch (err) {
    next(err);
  }
}

async function submitClientVisit(req, res, next) {
  try {
    const { date, clientName, clientLocation, latitude, longitude, startTime, endTime, purpose, description } = req.body;
    const employeeId = req.user.employee_id || req.body.employeeId;

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/documents/${req.file.filename}`;
    }

    const compRes = await query(`SELECT company_id FROM employees WHERE id = $1`, [employeeId]);
    const companyId = compRes.rows[0].company_id;

    const insertRes = await query(`
      INSERT INTO client_visits (
        company_id, employee_id, date, client_name, client_location, latitude, longitude,
        start_time, end_time, purpose, visit_photo_url, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING')
      RETURNING *
    `, [companyId, employeeId, date, clientName, clientLocation, latitude || null, longitude || null, startTime, endTime, purpose, photoUrl, description]);

    res.status(201).json({ success: true, visit: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function reviewClientVisit(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedRes = await query(`
      UPDATE client_visits SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *
    `, [status, req.user.id, id]);
    res.json({ success: true, visit: updatedRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getClientMeetings(req, res, next) {
  try {
    const { employeeId } = req.query;
    let queryText = `
      SELECT cm.*, e.display_name, e.employee_code
      FROM client_meetings cm
      JOIN employees e ON cm.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (req.user.role !== 'SUPER_ADMIN') {
      params.push(req.user.employee_id);
      queryText += ` AND cm.employee_id = $${params.length}`;
    } else if (employeeId) {
      params.push(employeeId);
      queryText += ` AND cm.employee_id = $${params.length}`;
    }
    queryText += ` ORDER BY cm.date DESC`;
    const result = await query(queryText, params);
    res.json({ success: true, meetings: result.rows });
  } catch (err) {
    next(err);
  }
}

async function submitClientMeeting(req, res, next) {
  try {
    const { date, clientName, meetingLocation, startTime, endTime, purpose, discussionSummary, followUpActions } = req.body;
    const employeeId = req.user.employee_id || req.body.employeeId;

    const compRes = await query(`SELECT company_id FROM employees WHERE id = $1`, [employeeId]);
    const companyId = compRes.rows[0].company_id;

    const insertRes = await query(`
      INSERT INTO client_meetings (
        company_id, employee_id, date, client_name, meeting_location, start_time, end_time,
        purpose, discussion_summary, follow_up_actions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [companyId, employeeId, date, clientName, meetingLocation, startTime, endTime, purpose, discussionSummary, followUpActions]);

    res.status(201).json({ success: true, meeting: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLeaveTypes,
  getLeaveRequests,
  submitLeaveRequest,
  reviewLeaveRequest,
  getPermissionRequests,
  submitPermissionRequest,
  reviewPermissionRequest,
  getWeekendWork,
  submitWeekendWork,
  reviewWeekendWork,
  getClientVisits,
  submitClientVisit,
  reviewClientVisit,
  getClientMeetings,
  submitClientMeeting
};

