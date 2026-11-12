const { query } = require('../../config/db');

/**
 * Calculates the employee's internal recognition nickname based on their last 30 working days.
 * Nicknames:
 * - 'Minnal Murali' : Consistently early arrivals (> 50% early)
 * - 'Chopplangi'    : High frequency of late arrivals (> 30% late)
 * - 'Kutty Dragon'  : Healthy mix of early and punctual arrivals
 * - 'On-Time Star'  : Rock solid punctual arrivals
 */
async function calculateEmployeeNickname(employeeId, daysWindow = 30) {
  const recordsRes = await query(`
    SELECT check_in_status, status
    FROM attendance_records
    WHERE employee_id = $1
      AND date >= CURRENT_DATE - ($2 || ' days')::interval
      AND check_in_time IS NOT NULL
    ORDER BY date DESC
  `, [employeeId, daysWindow]);

  const records = recordsRes.rows;
  if (records.length === 0) {
    return 'On-Time Star';
  }

  let earlyCount = 0;
  let lateCount = 0;
  let onTimeCount = 0;

  for (const r of records) {
    if (r.check_in_status === 'EARLY') earlyCount++;
    else if (r.check_in_status === 'LATE') lateCount++;
    else onTimeCount++;
  }

  const total = records.length;
  const earlyRatio = earlyCount / total;
  const lateRatio = lateCount / total;
  const onTimeRatio = onTimeCount / total;

  if (lateRatio >= 0.35) {
    return 'Chopplangi';
  } else if (earlyRatio >= 0.5) {
    return 'Minnal Murali';
  } else if (earlyRatio >= 0.2 && onTimeRatio >= 0.3) {
    return 'Kutty Dragon';
  } else {
    return 'On-Time Star';
  }
}

/**
 * Helper to determine immediate check-in status for today's record:
 * - shiftStart: e.g. "09:30:00"
 * - graceMinutes: e.g. 15
 * - checkInDate: JavaScript Date object of check-in
 */
function evaluateCheckInStatus(shiftStartTimeStr, graceMinutes, checkInDate) {
  const [shiftHours, shiftMins] = shiftStartTimeStr.split(':').map(Number);
  
  // Create shift start Date on checkInDate's day
  const shiftStart = new Date(checkInDate);
  shiftStart.setHours(shiftHours, shiftMins, 0, 0);

  const graceEnd = new Date(shiftStart.getTime() + (graceMinutes || 15) * 60 * 1000);

  if (checkInDate.getTime() < shiftStart.getTime()) {
    return { status: 'EARLY', label: 'Early Arrival' };
  } else if (checkInDate.getTime() <= graceEnd.getTime()) {
    return { status: 'ON_TIME', label: 'On Time' };
  } else {
    return { status: 'LATE', label: 'Late Arrival' };
  }
}

module.exports = {
  calculateEmployeeNickname,
  evaluateCheckInStatus
};

