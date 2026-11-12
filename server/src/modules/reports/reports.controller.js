const XLSX = require('xlsx');
const { query } = require('../../config/db');

// Main Filtered Attendance Query
async function getReportData(filters = {}) {
  const { startDate, endDate, departmentId, employeeId, status, reportType } = filters;

  let queryText = `
    SELECT ar.*, e.employee_code, e.display_name, e.designation,
           d.name as department_name, s.name as shift_name, s.start_time as shift_start,
           st.current_streak
    FROM attendance_records ar
    JOIN employees e ON ar.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN shifts s ON ar.shift_id = s.id
    LEFT JOIN attendance_streaks st ON st.employee_id = e.id
    WHERE 1=1
  `;
  const params = [];

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
  if (employeeId) {
    params.push(employeeId);
    queryText += ` AND ar.employee_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    queryText += ` AND ar.status = $${params.length}`;
  }

  // Handle specific report types
  if (reportType === 'late') {
    queryText += ` AND ar.check_in_status = 'LATE'`;
  } else if (reportType === 'early') {
    queryText += ` AND ar.check_in_status = 'EARLY'`;
  } else if (reportType === 'overtime') {
    queryText += ` AND ar.check_out_status = 'OVERTIME'`;
  } else if (reportType === 'absent') {
    queryText += ` AND ar.status = 'ABSENT'`;
  }

  queryText += ` ORDER BY ar.date DESC, ar.check_in_time DESC`;

  const result = await query(queryText, params);
  return result.rows;
}

// JSON endpoint for dashboard and reports view
async function getAttendanceReport(req, res, next) {
  try {
    const records = await getReportData(req.query);

    // Summary metrics
    let totalPresent = 0;
    let totalLate = 0;
    let totalEarly = 0;
    let totalHours = 0;

    records.forEach(r => {
      if (r.status === 'PRESENT' || r.status === 'LATE') totalPresent++;
      if (r.check_in_status === 'LATE') totalLate++;
      if (r.check_in_status === 'EARLY') totalEarly++;
      if (r.total_working_minutes) totalHours += r.total_working_minutes / 60;
    });

    res.json({
      success: true,
      summary: {
        totalRecords: records.length,
        totalPresent,
        totalLate,
        totalEarly,
        totalHours: totalHours.toFixed(1),
        avgHours: records.length ? (totalHours / records.length).toFixed(1) : 0
      },
      records
    });
  } catch (err) {
    next(err);
  }
}

// Export to Excel (XLSX)
async function exportExcel(req, res, next) {
  try {
    const records = await getReportData(req.query);

    const formattedData = records.map(r => ({
      'Date': r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      'Employee Code': r.employee_code,
      'Employee Name': r.display_name,
      'Department': r.department_name || 'N/A',
      'Shift': r.shift_name || 'General',
      'Check-in Time': r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      'Check-out Time': r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      'Working Hours': r.total_working_minutes ? (r.total_working_minutes / 60).toFixed(1) + ' hrs' : '0 hrs',
      'Status': r.status,
      'Timing Status': r.check_in_status || 'N/A',
      'Nickname': r.nickname || 'N/A',
      'Current Streak': r.current_streak ? `${r.current_streak} days` : '0 days',
      'Location Verification': r.check_in_latitude ? `${r.check_in_latitude}, ${r.check_in_longitude}` : 'Manual/N/A',
      'Corrected': r.is_corrected ? 'Yes' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

    // Auto-fit column widths
    const max_width = formattedData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
    worksheet['!cols'] = Object.keys(formattedData[0] || {}).map(() => ({ wch: 18 }));

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=DASA_TECH_Attendance_Report_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// Export to CSV
async function exportCsv(req, res, next) {
  try {
    const records = await getReportData(req.query);

    const headers = [
      'Date', 'Employee Code', 'Employee Name', 'Department', 'Shift',
      'Check-in Time', 'Check-out Time', 'Working Hours', 'Status', 'Timing Status', 'Nickname', 'Streak'
    ];

    const rows = records.map(r => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      `"${r.employee_code}"`,
      `"${r.display_name}"`,
      `"${r.department_name || 'N/A'}"`,
      `"${r.shift_name || 'General'}"`,
      r.check_in_time ? `"${new Date(r.check_in_time).toLocaleTimeString()}"` : '""',
      r.check_out_time ? `"${new Date(r.check_out_time).toLocaleTimeString()}"` : '""',
      r.total_working_minutes ? (r.total_working_minutes / 60).toFixed(1) : 0,
      `"${r.status}"`,
      `"${r.check_in_status || ''}"`,
      `"${r.nickname || ''}"`,
      r.current_streak || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=DASA_TECH_Attendance_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAttendanceReport,
  exportExcel,
  exportCsv
};

