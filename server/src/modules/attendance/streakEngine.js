const { query } = require('../../config/db');

/**
 * Updates an employee's streak when a valid attendance record is submitted.
 * Evaluates milestones (3, 7, 15, 30, 60, 100) and awards badges.
 */
async function updateEmployeeStreak(employeeId, attendanceDate) {
  // Fetch employee streak record
  let streakRes = await query(`
    SELECT * FROM attendance_streaks WHERE employee_id = $1
  `, [employeeId]);

  let streak = streakRes.rows[0];
  if (!streak) {
    const insertRes = await query(`
      INSERT INTO attendance_streaks (employee_id, current_streak, longest_streak, monthly_streak, total_present_days, last_attendance_date)
      VALUES ($1, 0, 0, 0, 0, NULL)
      RETURNING *
    `, [employeeId]);
    streak = insertRes.rows[0];
  }

  const currentDate = new Date(attendanceDate);
  const lastDate = streak.last_attendance_date ? new Date(streak.last_attendance_date) : null;

  let newCurrent = streak.current_streak;
  let isContinued = false;

  if (!lastDate) {
    newCurrent = 1;
    isContinued = true;
  } else {
    // If today is already recorded, streak doesn't increment twice
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 0) {
      // Already marked today
      return { streak, newMilestone: null };
    } else if (diffDays === 1) {
      // Direct consecutive day
      newCurrent += 1;
      isContinued = true;
    } else {
      // Check if intermediate days were holidays or approved leaves or weekly offs
      const intermediateCheck = await query(`
        SELECT COUNT(*) as valid_breaks
        FROM generate_series($1::date + interval '1 day', $2::date - interval '1 day', interval '1 day') as d(day)
        WHERE 
          EXTRACT(DOW FROM d.day) IN (0, 6) -- Weekend
          OR EXISTS (SELECT 1 FROM holidays h WHERE h.date = d.day::date)
          OR EXISTS (
            SELECT 1 FROM leave_requests lr
            WHERE lr.employee_id = $3
              AND lr.status = 'APPROVED'
              AND d.day::date BETWEEN lr.start_date AND lr.end_date
          )
      `, [lastDate.toISOString().split('T')[0], currentDate.toISOString().split('T')[0], employeeId]);

      const totalIntermediateDays = diffDays - 1;
      const validExemptions = parseInt(intermediateCheck.rows[0].valid_breaks, 10);

      if (validExemptions === totalIntermediateDays) {
        // All missed days were valid weekends/holidays/approved leaves! Streak continues!
        newCurrent += 1;
        isContinued = true;
      } else {
        // Unauthorized break: reset streak to 1
        newCurrent = 1;
      }
    }
  }

  const newLongest = Math.max(streak.longest_streak, newCurrent);
  const totalPresent = (streak.total_present_days || 0) + 1;

  // Update streak in DB
  const updatedRes = await query(`
    UPDATE attendance_streaks
    SET current_streak = $1,
        longest_streak = $2,
        monthly_streak = monthly_streak + 1,
        total_present_days = $3,
        last_attendance_date = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = $5
    RETURNING *
  `, [newCurrent, newLongest, totalPresent, attendanceDate, employeeId]);

  const updatedStreak = updatedRes.rows[0];

  // Milestone check: 3, 7, 15, 30, 60, 100
  const milestones = [
    { days: 3, code: 'STREAK_3', name: '3-Day Fire Starter', desc: 'Maintained 3 consecutive days of punctuality', icon: 'Flame' },
    { days: 7, code: 'STREAK_7', name: '7-Day Iron Will', desc: 'Completed a full week without breaking streak', icon: 'Zap' },
    { days: 15, code: 'STREAK_15', name: '15-Day Unstoppable', desc: '15 consecutive active days of stellar presence', icon: 'ShieldCheck' },
    { days: 30, code: 'STREAK_30', name: '30-Day Legend', desc: 'A full month of unbroken streak dedication', icon: 'Crown' },
    { days: 60, code: 'STREAK_60', name: '60-Day Titan', desc: 'Two months of unwavering consistency', icon: 'Trophy' },
    { days: 100, code: 'STREAK_100', name: '100-Day Grandmaster', desc: 'Century of excellence at DASA TECH', icon: 'Sparkles' },
  ];

  let newMilestone = null;
  for (const m of milestones) {
    if (newCurrent >= m.days) {
      const existingBadge = await query(`
        SELECT 1 FROM employee_achievements WHERE employee_id = $1 AND badge_code = $2
      `, [employeeId, m.code]);

      if (existingBadge.rows.length === 0) {
        await query(`
          INSERT INTO employee_achievements (employee_id, badge_code, badge_name, badge_description, icon)
          VALUES ($1, $2, $3, $4, $5)
        `, [employeeId, m.code, m.name, m.desc, m.icon]);

        // Create notification
        await query(`
          INSERT INTO notifications (employee_id, title, message, type)
          VALUES ($1, $2, $3, 'MILESTONE')
        `, [employeeId, `🔥 Milestone Reached: ${m.name}!`, `Congratulations on reaching ${m.days} days streak! Keep the flame burning!`]);

        newMilestone = m;
      }
    }
  }

  return { streak: updatedStreak, newMilestone };
}

module.exports = {
  updateEmployeeStreak
};

