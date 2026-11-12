const { query } = require('../../config/db');

async function getNotifications(req, res, next) {
  try {
    let queryText = `SELECT * FROM notifications WHERE 1=1`;
    const params = [];

    if (req.user.employee_id) {
      params.push(req.user.employee_id);
      queryText += ` AND (employee_id = $${params.length} OR user_id = $${params.length + 1})`;
      params.push(req.user.id);
    } else {
      params.push(req.user.id);
      queryText += ` AND user_id = $${params.length}`;
    }

    queryText += ` ORDER BY created_at DESC LIMIT 20`;

    const result = await query(queryText, params);
    res.json({ success: true, notifications: result.rows });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    await query(`UPDATE notifications SET is_read = true WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    if (req.user.employee_id) {
      await query(`UPDATE notifications SET is_read = true WHERE employee_id = $1 OR user_id = $2`, [req.user.employee_id, req.user.id]);
    } else {
      await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};

