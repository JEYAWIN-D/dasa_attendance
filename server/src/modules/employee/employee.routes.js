const express = require('express');
const router = express.Router();
const employeeController = require('./employee.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

// Public route for landing page dropdown
router.get('/public', employeeController.getPublicEmployees);

// Protected routes
router.get('/', authenticateToken, requireAdmin, employeeController.getAllEmployees);
router.get('/:id', authenticateToken, employeeController.getEmployeeById);
router.post('/', authenticateToken, requireAdmin, employeeController.createEmployee);
router.put('/:id', authenticateToken, requireAdmin, employeeController.updateEmployee);
router.patch('/:id/toggle-status', authenticateToken, requireAdmin, employeeController.toggleEmployeeStatus);

module.exports = router;

