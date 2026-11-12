const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { saveBase64Image } = require('../../middleware/upload');
const { updateEmployeeStreak } = require('./streakEngine');
const { calculateEmployeeNickname, evaluateCheckInStatus } = require('./nicknameEngine');

// Haversine distance calculator in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 1. Mark Check-In (Core Endpoint for Landing Page & Mobile/Web Staff)
async function markCheckIn(req, res, next) {
  try {
    const {
      employeeId,
      pin,
      latitude,
      longitude,
      accuracy,
      deviceInfo,
      selfieBase64
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    // Fetch employee + shift details
    const empRes = await query(`
      SELECT e.*, s.name as shift_name, s.start_time, s.end_time, s.grace_period_minutes,
             s.is_night_shift, d.name as department_name
      FROM employees e
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1 AND e.is_active = true
    `, [employeeId]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found or inactive.' });
    }
    const emp = empRes.rows[0];

    // Verify PIN if user is not already authorized via token as this employee
    if (!req.user || req.user.employee_id !== employeeId) {
      if (!pin) {
        return res.status(400).json({ success: false, message: 'PIN verification required to mark attendance.' });
      }
      const isPinValid = emp.attendance_pin_hash
        ? await bcrypt.compare(pin.trim(), emp.attendance_pin_hash)
        : (pin.trim() === '1234');

      if (!isPinValid) {
        return res.status(401).json({ success: false, message: 'Incorrect employee PIN. Access denied.' });
      }
    }

    // Today's date (server time)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check duplicate check-in
    const existingRec = await query(`
      SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2
    `, [employeeId, todayStr]);

    if (existingRec.rows.length > 0) {
      const rec = existingRec.rows[0];
      if (rec.check_in_time) {
        return res.status(400).json({
          success: false,
          message: `Already checked in today at ${new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          record: rec
        });
      }
    }

    // Geolocation verification against primary office
    const officeLocRes = await query(`
      SELECT * FROM attendance_locations WHERE is_active = true ORDER BY created_at ASC LIMIT 1
    `);
    const officeLoc = officeLocRes.rows[0];

    let distanceMeters = null;
    let isWithinGeofence = true;
    let locationName = 'Browser GPS Location';

    if (officeLoc && latitude && longitude) {
      distanceMeters = calculateDistanceMeters(
        parseFloat(latitude), parseFloat(longitude),
        parseFloat(officeLoc.latitude), parseFloat(officeLoc.longitude)
      );
      isWithinGeofence = distanceMeters <= (officeLoc.radius_meters || 300);
      locationName = isWithinGeofence 
        ? `${officeLoc.name} (Within perimeter)` 
        : `Off-site (${distanceMeters}m from HQ)`;
    }

    // Save selfie if provided
    let selfieUrl = '/uploads/dasa-logo.png';
    if (req.file) {
      selfieUrl = `/uploads/selfies/${req.file.filename}`;
    } else if (selfieBase64) {
      const savedPath = saveBase64Image(selfieBase64, 'selfies');
      if (savedPath) selfieUrl = savedPath;
    }

    // Evaluate Check-in timing vs shift start & grace period
    const shiftStart = emp.start_time || '09:30:00';
    const graceMins = emp.grace_period_minutes || 15;
    const timingEval = evaluateCheckInStatus(shiftStart, graceMins, now);

    // Calculate Dynamic Nickname (Minnal Murali, Chopplangi, Kutty Dragon, On-Time Star)
    const nickname = await calculateEmployeeNickname(employeeId, 30);

    const checkInStatus = timingEval.status; // EARLY, ON_TIME, LATE
    const attendanceStatus = checkInStatus === 'LATE' ? 'LATE' : 'PRESENT';

    let recordId;
    let updatedRecord;

    if (existingRec.rows.length > 0) {
      // Update existing record
      const updateRes = await query(`
        UPDATE attendance_records
        SET check_in_time = $1,
            shift_id = $2,
            status = $3,
            check_in_status = $4,
            nickname = $5,
            selfie_url = $6,
            check_in_latitude = $7,
            check_in_longitude = $8,
            check_in_accuracy = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `, [
        now.toISOString(), emp.shift_id, attendanceStatus, checkInStatus,
        nickname, selfieUrl, latitude || null, longitude || null, accuracy || null,
        existingRec.rows[0].id
      ]);
      recordId = existingRec.rows[0].id;
      updatedRecord = updateRes.rows[0];
    } else {
      // Insert new record
      const insertRes = await query(`
        INSERT INTO attendance_records (
          company_id, employee_id, shift_id, date, check_in_time,
          status, check_in_status, nickname, selfie_url, check_in_latitude,
          check_in_longitude, check_in_accuracy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        emp.company_id, employeeId, emp.shift_id, todayStr, now.toISOString(),
        attendanceStatus, checkInStatus, nickname, selfieUrl,
        latitude || null, longitude || null, accuracy || null
      ]);
      recordId = insertRes.rows[0].id;
      updatedRecord = insertRes.rows[0];
    }

    // Append-only immutable audit event
    await query(`
      INSERT INTO attendance_events (
        attendance_record_id, employee_id, event_type, timestamp,
        latitude, longitude, accuracy_meters, location_name, is_within_geofence,
        device_info, ip_address, selfie_url
      ) VALUES ($1, $2, 'CHECK_IN', $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      recordId, employeeId, now.toISOString(), latitude || null, longitude || null,
      accuracy || null, locationName, isWithinGeofence, deviceInfo || req.headers['user-agent'],
      req.ip, selfieUrl
    ]);

    // Update streak & milestones
    const { streak, newMilestone } = await updateEmployeeStreak(employeeId, todayStr);

    // In-app notification
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await query(`
      INSERT INTO notifications (employee_id, title, message, type)
      VALUES ($1, $2, $3, $4)
    `, [
      employeeId,
      `Check-in Confirmed: ${timeFormatted}`,
      `Recorded as ${timingEval.label} (${nickname}). Current streak: ${streak.current_streak} days.`,
      checkInStatus === 'LATE' ? 'WARNING' : 'SUCCESS'
    ]);

    res.json({
      success: true,
      message: `Welcome, ${emp.display_name}! Check-in recorded at ${timeFormatted}.`,
      record: updatedRecord,
      checkInStatus,
      nickname,
      timingLabel: timingEval.label,
      distanceMeters,
      isWithinGeofence,
      streak,
      newMilestone
    });
  } catch (err) {
    next(err);
  }
}

// 2. Mark Check-Out
async function markCheckOut(req, res, next) {
  try {
    const {
      employeeId,
      pin,
      latitude,
      longitude,
      accuracy,
      deviceInfo,
      selfieBase64
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }

    // Find active attendance record for today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const recordRes = await query(`
      SELECT ar.*, e.display_name, e.company_id, e.attendance_pin_hash, s.end_time
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      LEFT JOIN shifts s ON ar.shift_id = s.id
      WHERE ar.employee_id = $1 AND ar.date = $2
    `, [employeeId, todayStr]);

    let rec;
    let checkInDate;

    if (recordRes.rows.length === 0 || !recordRes.rows[0].check_in_time) {
      // Direct check-out fallback: auto-assign check-in to shift start time
      const empDetails = await query(`
        SELECT e.*, s.id as shift_id, s.start_time, s.end_time
        FROM employees e
        LEFT JOIN shifts s ON e.shift_id = s.id
        WHERE e.id = $1
      `, [employeeId]);

      if (empDetails.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
      const empInfo = empDetails.rows[0];

      // PIN verification
      if (!req.user || req.user.employee_id !== employeeId) {
        if (!pin) {
          return res.status(400).json({ success: false, message: 'PIN verification required to check out.' });
        }
        const isPinValid = empInfo.attendance_pin_hash
          ? await bcrypt.compare(pin.trim(), empInfo.attendance_pin_hash)
          : (pin.trim() === '1234');
        if (!isPinValid) {
          return res.status(401).json({ success: false, message: 'Incorrect employee PIN. Access denied.' });
        }
      }

      // Default check-in time to shift start today
      const shiftStartTime = empInfo.start_time || '09:30:00';
      const [sH, sM] = shiftStartTime.split(':').map(Number);
      const defaultCheckIn = new Date(now);
      defaultCheckIn.setHours(sH, sM, 0, 0);
      checkInDate = defaultCheckIn.getTime() > now.getTime() ? new Date(now.getTime() - 4 * 3600 * 1000) : defaultCheckIn;

      if (recordRes.rows.length === 0) {
        const createRes = await query(`
          INSERT INTO attendance_records (
            company_id, employee_id, shift_id, date, check_in_time, status, check_in_status
          ) VALUES ($1, $2, $3, $4, $5, 'PRESENT', 'ON_TIME')
          RETURNING *
        `, [empInfo.company_id, employeeId, empInfo.shift_id, todayStr, checkInDate.toISOString()]);
        rec = { ...createRes.rows[0], display_name: empInfo.display_name, end_time: empInfo.end_time };
      } else {
        const updRes = await query(`
          UPDATE attendance_records
          SET check_in_time = $1, status = 'PRESENT'
          WHERE id = $2
          RETURNING *
        `, [checkInDate.toISOString(), recordRes.rows[0].id]);
        rec = { ...updRes.rows[0], display_name: empInfo.display_name, end_time: empInfo.end_time };
      }
    } else {
      rec = recordRes.rows[0];
      checkInDate = new Date(rec.check_in_time);

      if (rec.check_out_time) {
        return res.status(400).json({
          success: false,
          message: `Already checked out today at ${new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        });
      }

      // PIN verification if not already authenticated
      if (!req.user || req.user.employee_id !== employeeId) {
        if (!pin) {
          return res.status(400).json({ success: false, message: 'PIN verification required to check out.' });
        }
        const isPinValid = rec.attendance_pin_hash
          ? await bcrypt.compare(pin.trim(), rec.attendance_pin_hash)
          : (pin.trim() === '1234');

        if (!isPinValid) {
          return res.status(401).json({ success: false, message: 'Incorrect employee PIN. Access denied.' });
        }
      }
    }

    // Check-out selfie (optional unless configured)
    let checkOutSelfieUrl = null;
    if (req.file) {
      checkOutSelfieUrl = `/uploads/selfies/${req.file.filename}`;
    } else if (selfieBase64) {
      checkOutSelfieUrl = saveBase64Image(selfieBase64, 'selfies');
    }

    // Calculate working duration in minutes
    checkInDate = new Date(rec.check_in_time);
    const diffMs = now.getTime() - checkInDate.getTime();
    const workingMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

    // Determine check-out status (Early, Normal, Overtime)
    let checkOutStatus = 'NORMAL';
    if (rec.end_time) {
      const [endH, endM] = rec.end_time.split(':').map(Number);
      const shiftEnd = new Date(now);
      shiftEnd.setHours(endH, endM, 0, 0);

      if (now.getTime() < shiftEnd.getTime() - 15 * 60 * 1000) {
        checkOutStatus = 'EARLY';
      } else if (now.getTime() > shiftEnd.getTime() + 60 * 60 * 1000) {
        checkOutStatus = 'OVERTIME';
      }
    }

    const updatedRes = await query(`
      UPDATE attendance_records
      SET check_out_time = $1,
          total_working_minutes = $2,
          check_out_status = $3,
          check_out_selfie_url = $4,
          check_out_latitude = $5,
          check_out_longitude = $6,
          check_out_accuracy = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      now.toISOString(), workingMinutes, checkOutStatus, checkOutSelfieUrl,
      latitude || null, longitude || null, accuracy || null, rec.id
    ]);

    const updatedRecord = updatedRes.rows[0];

    // Immutable event
    await query(`
      INSERT INTO attendance_events (
        attendance_record_id, employee_id, event_type, timestamp,
        latitude, longitude, accuracy_meters, device_info, ip_address
      ) VALUES ($1, $2, 'CHECK_OUT', $3, $4, $5, $6, $7, $8)
    `, [
      rec.id, employeeId, now.toISOString(), latitude || null, longitude || null,
      accuracy || null, deviceInfo || req.headers['user-agent'], req.ip
    ]);

    const hours = (workingMinutes / 60).toFixed(1);
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Notification
    await query(`
      INSERT INTO notifications (employee_id, title, message, type)
      VALUES ($1, $2, $3, 'INFO')
    `, [
      employeeId,
      `Check-out Recorded: ${timeFormatted}`,
      `Total shift hours logged: ${hours} hrs. Have a restful evening!`
    ]);

    res.json({
      success: true,
      message: `Goodbye, ${rec.display_name}! Shift concluded with ${hours} working hours.`,
      record: updatedRecord,
      totalHours: hours,
      checkOutStatus
    });
  } catch (err) {
    next(err);
  }
}

// 3. Get Today's Status for an Employee
async function getTodayStatus(req, res, next) {
  try {
    const { employeeId } = req.params;

    const recordRes = await query(`
      SELECT ar.*, s.name as shift_name, s.start_time, s.end_time, s.grace_period_minutes,
             st.current_streak, st.longest_streak
      FROM attendance_records ar
      LEFT JOIN shifts s ON ar.shift_id = s.id
      LEFT JOIN attendance_streaks st ON st.employee_id = ar.employee_id
      WHERE ar.employee_id = $1 AND ar.date = CURRENT_DATE
    `, [employeeId]);

    const record = recordRes.rows[0] || null;

    res.json({
      success: true,
      todayAttendance: record
    });
  } catch (err) {
    next(err);
  }
}

// 4. Get Attendance History (Filterable)
async function getAttendanceHistory(req, res, next) {
  try {
    const { employeeId, startDate, endDate, departmentId, status, limit, offset } = req.query;

    let queryText = `
      SELECT ar.*, e.employee_code, e.display_name, e.designation, e.profile_photo_url,
             d.name as department_name, s.name as shift_name
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON ar.shift_id = s.id
      WHERE 1=1
    `;
    const params = [];

    // If non-admin user requests history, restrict to their own records
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      params.push(req.user.employee_id);
      queryText += ` AND ar.employee_id = $${params.length}`;
    } else if (employeeId) {
      params.push(employeeId);
      queryText += ` AND ar.employee_id = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      queryText += ` AND ar.date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      queryText += ` AND ar.date <= $${params.length}`;
    }

    if (departmentId) {
      params.push(departmentId);
      queryText += ` AND e.department_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      queryText += ` AND ar.status = $${params.length}`;
    }

    queryText += ` ORDER BY ar.date DESC, ar.check_in_time DESC`;

    if (limit) {
      params.push(parseInt(limit, 10));
      queryText += ` LIMIT $${params.length}`;
    }

    if (offset) {
      params.push(parseInt(offset, 10));
      queryText += ` OFFSET $${params.length}`;
    }

    const result = await query(queryText, params);

    res.json({
      success: true,
      records: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    next(err);
  }
}

// 5. Get Today's Live Attendance Stream (for Admin Live Monitor)
async function getLiveAttendanceStream(req, res, next) {
  try {
    const streamRes = await query(`
      SELECT ar.*, e.employee_code, e.display_name, e.designation, e.profile_photo_url,
             d.name as department_name, s.name as shift_name, s.start_time, s.end_time,
             st.current_streak
      FROM employees e
      LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = CURRENT_DATE
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN attendance_streaks st ON st.employee_id = e.id
      WHERE e.is_active = true
      ORDER BY 
        CASE 
          WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NULL THEN 1
          WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NOT NULL THEN 2
          ELSE 3
        END,
        ar.check_in_time DESC NULLS LAST,
        e.display_name ASC
    `);

    // Fetch recent 15 live events
    const eventsRes = await query(`
      SELECT ae.*, e.display_name, e.employee_code, e.profile_photo_url
      FROM attendance_events ae
      JOIN employees e ON ae.employee_id = e.id
      WHERE ae.timestamp >= CURRENT_DATE
      ORDER BY ae.timestamp DESC
      LIMIT 15
    `);

    res.json({
      success: true,
      roster: streamRes.rows,
      recentEvents: eventsRes.rows
    });
  } catch (err) {
    next(err);
  }
}

// 6. Super Admin Attendance Correction (With Audit Reason)
async function adminCorrectAttendance(req, res, next) {
  try {
    const { recordId } = req.params;
    const { checkInTime, checkOutTime, status, notes, reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'A detailed correction reason is required for administrative audit compliance.' });
    }

    const currentRes = await query(`SELECT * FROM attendance_records WHERE id = $1`, [recordId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }
    const current = currentRes.rows[0];

    // Calculate updated minutes if both timestamps exist
    let totalMinutes = current.total_working_minutes;
    const newIn = checkInTime ? new Date(checkInTime) : (current.check_in_time ? new Date(current.check_in_time) : null);
    const newOut = checkOutTime ? new Date(checkOutTime) : (current.check_out_time ? new Date(current.check_out_time) : null);

    if (newIn && newOut) {
      totalMinutes = Math.max(0, Math.round((newOut.getTime() - newIn.getTime()) / (1000 * 60)));
    }

    const updateRes = await query(`
      UPDATE attendance_records
      SET check_in_time = COALESCE($1, check_in_time),
          check_out_time = COALESCE($2, check_out_time),
          status = COALESCE($3, status),
          notes = COALESCE($4, notes),
          total_working_minutes = $5,
          is_corrected = true,
          corrected_by = $6,
          correction_reason = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      checkInTime || null, checkOutTime || null, status || null, notes || null,
      totalMinutes, req.user.id, reason.trim(), recordId
    ]);

    // Record in attendance_corrections table
    await query(`
      INSERT INTO attendance_corrections (
        attendance_record_id, employee_id, requested_by, previous_check_in,
        previous_check_out, new_check_in, new_check_out, reason, approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $3)
    `, [
      recordId, current.employee_id, req.user.id, current.check_in_time,
      current.check_out_time, checkInTime || current.check_in_time,
      checkOutTime || current.check_out_time, reason.trim()
    ]);

    // Record audit log
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES ($1, 'ATTENDANCE_CORRECTION', 'ATTENDANCE_RECORD', $2, $3, $4, $5)
    `, [
      req.user.id, recordId, JSON.stringify(current), JSON.stringify(updateRes.rows[0]), req.ip
    ]);

    res.json({
      success: true,
      message: 'Attendance record updated and audit trail recorded successfully.',
      record: updateRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// 7. Geo-IP & Campus Coordinates Fallback Helper
async function getGeoIpLocation(req, res) {
  try {
    const officeLocRes = await query(`
      SELECT * FROM attendance_locations WHERE is_active = true ORDER BY created_at ASC LIMIT 1
    `);
    const office = officeLocRes.rows[0] || {
      name: 'DASA TECH HQ',
      address: 'DASA Tech Innovation Campus, Erode, TN',
      latitude: 11.341036,
      longitude: 77.717163,
      radius_meters: 300
    };

    let ipLocation = null;
    try {
      const response = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3500) });
      const data = await response.json();
      if (data && data.success) {
        ipLocation = {
          city: data.city,
          region: data.region,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          isp: data.connection?.isp || data.connection?.org,
          ip: data.ip
        };
      }
    } catch (e) {
      // Graceful fallback
    }

    res.json({
      success: true,
      office: {
        name: office.name,
        address: office.address,
        latitude: parseFloat(office.latitude),
        longitude: parseFloat(office.longitude),
        radiusMeters: office.radius_meters || 300
      },
      ipLocation: ipLocation || {
        city: 'Erode',
        region: 'Tamil Nadu',
        country: 'India',
        latitude: parseFloat(office.latitude),
        longitude: parseFloat(office.longitude),
        isp: 'Office Network',
        ip: req.ip
      }
    });
  } catch (err) {
    res.json({
      success: true,
      office: {
        name: 'DASA TECH HQ',
        address: 'DASA Tech Innovation Campus, Erode, TN',
        latitude: 11.341036,
        longitude: 77.717163,
        radiusMeters: 300
      },
      ipLocation: null
    });
  }
}

module.exports = {
  markCheckIn,
  markCheckOut,
  getTodayStatus,
  getAttendanceHistory,
  getLiveAttendanceStream,
  adminCorrectAttendance,
  getGeoIpLocation
};

