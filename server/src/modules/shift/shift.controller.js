const { query } = require('../../config/db');

async function getAllShifts(req, res, next) {
  try {
    const shiftsRes = await query(`
      SELECT s.*, count(e.id) as employee_count
      FROM shifts s
      LEFT JOIN employees e ON e.shift_id = s.id AND e.is_active = true
      GROUP BY s.id
      ORDER BY s.start_time ASC
    `);
    res.json({ success: true, shifts: shiftsRes.rows });
  } catch (err) {
    next(err);
  }
}

async function createShift(req, res, next) {
  try {
    const { name, startTime, endTime, gracePeriodMinutes, breakDurationMinutes, isNightShift } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Shift name, start time, and end time are required.' });
    }

    const compRes = await query(`SELECT id FROM companies WHERE slug = 'dasa-tech' LIMIT 1`);
    const companyId = compRes.rows[0].id;

    const insertRes = await query(`
      INSERT INTO shifts (company_id, name, start_time, end_time, grace_period_minutes, break_duration_minutes, is_night_shift)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [companyId, name, startTime, endTime, gracePeriodMinutes || 15, breakDurationMinutes || 60, isNightShift || false]);

    res.status(201).json({ success: true, shift: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateShift(req, res, next) {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, gracePeriodMinutes, breakDurationMinutes, isNightShift } = req.body;

    const updateRes = await query(`
      UPDATE shifts
      SET name = COALESCE($1, name),
          start_time = COALESCE($2, start_time),
          end_time = COALESCE($3, end_time),
          grace_period_minutes = COALESCE($4, grace_period_minutes),
          break_duration_minutes = COALESCE($5, break_duration_minutes),
          is_night_shift = COALESCE($6, is_night_shift),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, startTime, endTime, gracePeriodMinutes, breakDurationMinutes, isNightShift, id]);

    res.json({ success: true, shift: updateRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllShifts,
  createShift,
  updateShift
};

