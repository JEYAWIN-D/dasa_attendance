const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dasa_tech_enterprise_jwt_secret_key_2026_super_secure';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user with role and employee profile if available
    const userRes = await query(`
      SELECT u.id, u.email, u.company_id, u.role_id, r.name as role,
             e.id as employee_id, e.employee_code, e.display_name, e.department_id, e.designation
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees e ON e.user_id = u.id
      WHERE u.id = $1 AND u.is_active = true
    `, [decoded.userId]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User session invalid or deactivated.' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Access forbidden. Super Admin role required.' });
  }
  next();
}

function requireEmployeeOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireEmployeeOrAdmin,
};

