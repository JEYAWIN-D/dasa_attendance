const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

async function runMigration() {
  console.log('🚀 Running PostgreSQL schema migrations...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await query(schemaSql);
  console.log('✅ PostgreSQL Schema created successfully.');

  // Check if company exists
  const existingCompany = await query(`SELECT id FROM companies WHERE slug = 'dasa-tech' LIMIT 1`);
  if (existingCompany.rows.length > 0) {
    console.log('ℹ️ Database already seeded. Skipping initial seed.');
    return;
  }

  console.log('🌱 Seeding initial company and master records...');

  // 1. Company
  const compRes = await query(`
    INSERT INTO companies (name, slug, logo_url, contact_email, contact_phone, address)
    VALUES ('DASA TECH', 'dasa-tech', '/uploads/dasa-logo.png', 'contact@dasatech.com', '+91 98765 43210', 'DASA Tech Park, Innovation Highway, Erode, Tamil Nadu')
    RETURNING id;
  `);
  const companyId = compRes.rows[0].id;

  // 2. Roles
  const adminRoleRes = await query(`
    INSERT INTO roles (name, description, is_system)
    VALUES ('SUPER_ADMIN', 'Super Administrator with full workforce management controls', true)
    RETURNING id;
  `);
  const adminRoleId = adminRoleRes.rows[0].id;

  const empRoleRes = await query(`
    INSERT INTO roles (name, description, is_system)
    VALUES ('EMPLOYEE', 'Standard Staff Member with personal attendance and request access', true)
    RETURNING id;
  `);
  const empRoleId = empRoleRes.rows[0].id;

  // 3. Departments
  const depts = [
    { name: 'Engineering', code: 'ENG', desc: 'Software Development & Architecture' },
    { name: 'UI/UX Design', code: 'DSN', desc: 'Product Experience & Visual Design' },
    { name: 'Quality Assurance', code: 'QA', desc: 'Testing, Automation & Reliability' },
    { name: 'Cloud & Infrastructure', code: 'OPS', desc: 'DevOps, SRE & Cloud Systems' },
    { name: 'Product & Client Relations', code: 'BIZ', desc: 'Client Solutions & Growth' },
  ];
  const deptMap = {};
  for (const d of depts) {
    const res = await query(
      `INSERT INTO departments (company_id, name, code, description) VALUES ($1, $2, $3, $4) RETURNING id`,
      [companyId, d.name, d.code, d.desc]
    );
    deptMap[d.code] = res.rows[0].id;
  }

  // 4. Shifts
  const shiftsData = [
    { name: 'General Day Shift', start: '09:30:00', end: '18:30:00', grace: 15, isNight: false },
    { name: 'Early Morning Shift', start: '08:00:00', end: '17:00:00', grace: 15, isNight: false },
    { name: 'Night Shift', start: '21:00:00', end: '06:00:00', grace: 20, isNight: true },
  ];
  const shiftMap = {};
  for (const s of shiftsData) {
    const res = await query(
      `INSERT INTO shifts (company_id, name, start_time, end_time, grace_period_minutes, is_night_shift)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [companyId, s.name, s.start, s.end, s.grace, s.isNight]
    );
    shiftMap[s.name] = res.rows[0].id;
  }
  const defaultShiftId = shiftMap['General Day Shift'];

  // 5. Office Location (Geofence reference)
  await query(`
    INSERT INTO attendance_locations (company_id, name, address, latitude, longitude, radius_meters, is_geofence_enforced)
    VALUES ($1, 'DASA TECH HQ', 'DASA Tech Innovation Campus, Erode, TN', 11.341036, 77.717163, 300, false)
  `, [companyId]);

  // 6. Leave Types
  const leaveTypesData = [
    { name: 'Paid Leave', code: 'PL', days: 12, isPaid: true, desc: 'Annual earned paid leave' },
    { name: 'Casual Leave', code: 'CL', days: 8, isPaid: true, desc: 'Casual unforeseen personal leave' },
    { name: 'Sick Leave', code: 'SL', days: 10, isPaid: true, desc: 'Medical and health recovery leave' },
    { name: 'Unpaid Leave', code: 'UL', days: 30, isPaid: false, desc: 'Leave without pay' },
    { name: 'Emergency Leave', code: 'EL', days: 5, isPaid: true, desc: 'Urgent family / critical emergency' },
  ];
  const leaveTypeMap = {};
  for (const lt of leaveTypesData) {
    const res = await query(`
      INSERT INTO leave_types (company_id, name, code, days_per_year, is_paid, description)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [companyId, lt.name, lt.code, lt.days, lt.isPaid, lt.desc]);
    leaveTypeMap[lt.code] = res.rows[0].id;
  }

  // 7. Holidays
  const holidays = [
    { name: 'New Year', date: '2026-01-01', desc: 'New Year celebration' },
    { name: 'Pongal / Makar Sankranti', date: '2026-01-15', desc: 'Harvest festival' },
    { name: 'Republic Day', date: '2026-01-26', desc: 'National celebration' },
    { name: 'Tamil New Year', date: '2026-04-14', desc: 'Tamil New Year' },
    { name: 'May Day', date: '2026-05-01', desc: 'International Workers Day' },
    { name: 'Independence Day', date: '2026-08-15', desc: 'Indian Independence Day' },
    { name: 'Gandhi Jayanti', date: '2026-10-02', desc: 'Mahatma Gandhi Birthday' },
    { name: 'Diwali', date: '2026-11-08', desc: 'Festival of Lights' },
    { name: 'Christmas', date: '2026-12-25', desc: 'Christmas Day' },
  ];
  for (const h of holidays) {
    await query(`
      INSERT INTO holidays (company_id, name, date, description, is_recurring)
      VALUES ($1, $2, $3, $4, true)
    `, [companyId, h.name, h.date, h.desc]);
  }

  // 8. Company Settings
  const settings = [
    { key: 'grace_period_minutes', val: JSON.stringify(15), desc: 'Grace period for on-time arrival in minutes' },
    { key: 'streak_rules', val: JSON.stringify({ count_holidays: false, count_approved_leaves: true, break_on_unauthorized_absence: true }), desc: 'Rules for calculating Snapchat-style streaks' },
    { key: 'nickname_thresholds', val: JSON.stringify({ late_minutes: 15, early_minutes: 0, sample_days: 30, kutty_dragon_early_ratio: 0.3 }), desc: 'Thresholds for Minnal Murali, Chopplangi, Kutty Dragon' },
    { key: 'geofence_policy', val: JSON.stringify({ enforced: false, warning_only: true, max_distance_meters: 500 }), desc: 'Office boundary location verification settings' },
    { key: 'checkout_selfie_required', val: JSON.stringify(false), desc: 'Whether selfie is mandatory during check-out' },
  ];
  for (const s of settings) {
    await query(`
      INSERT INTO company_settings (company_id, setting_key, setting_value, description)
      VALUES ($1, $2, $3, $4)
    `, [companyId, s.key, s.val, s.desc]);
  }

  // Common password & PIN hashes
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const employeePasswordHash = await bcrypt.hash('dasa2026', 10);
  const defaultPinHash = await bcrypt.hash('1234', 10);

  // 9. Super Admin User
  const adminUserRes = await query(`
    INSERT INTO users (company_id, role_id, email, password_hash, is_active)
    VALUES ($1, $2, 'admin@dasatech.com', $3, true)
    RETURNING id;
  `, [companyId, adminRoleId, adminPasswordHash]);
  const adminUserId = adminUserRes.rows[0].id;

  // Admin Employee profile
  await query(`
    INSERT INTO employees (
      company_id, user_id, employee_code, first_name, last_name, display_name,
      email, phone, department_id, designation, date_of_joining, employment_status,
      shift_id, weekly_off_days, attendance_pin_hash, profile_photo_url
    ) VALUES (
      $1, $2, 'DASA-000', 'Suresh', 'Dasan', 'Suresh Dasan',
      'admin@dasatech.com', '+91 99440 11223', $3, 'Chief Executive & Founder', '2023-01-01', 'ACTIVE',
      $4, '{0,6}', $5, '/uploads/dasa-logo.png'
    )
  `, [companyId, adminUserId, deptMap['BIZ'], defaultShiftId, defaultPinHash]);

  // 10. Employees Data
  const sampleEmployees = [
    {
      code: 'DASA-101',
      first: 'Karthik',
      last: 'Raja',
      display: 'Karthik Raja',
      email: 'karthik.r@dasatech.com',
      phone: '+91 98421 23456',
      dept: 'ENG',
      roleTitle: 'Principal Full-Stack Architect',
      joining: '2024-02-15',
      tendency: 'EARLY', // Always arrives early: Minnal Murali
    },
    {
      code: 'DASA-102',
      first: 'Divya',
      last: 'Sundaram',
      display: 'Divya Sundaram',
      email: 'divya.s@dasatech.com',
      phone: '+91 98422 34567',
      dept: 'DSN',
      roleTitle: 'Senior UI/UX Designer',
      joining: '2024-03-01',
      tendency: 'HYBRID', // Kutty Dragon: mix of early & punctual
    },
    {
      code: 'DASA-103',
      first: 'Praveen',
      last: 'Kumar',
      display: 'Praveen Kumar',
      email: 'praveen.k@dasatech.com',
      phone: '+91 98423 45678',
      dept: 'ENG',
      roleTitle: 'Senior Backend Engineer',
      joining: '2024-05-10',
      tendency: 'LATE', // Chopplangi: often runs 15-20 mins late!
    },
    {
      code: 'DASA-104',
      first: 'Ananya',
      last: 'Mohan',
      display: 'Ananya Mohan',
      email: 'ananya.m@dasatech.com',
      phone: '+91 98424 56789',
      dept: 'QA',
      roleTitle: 'Lead QA & Automation Engineer',
      joining: '2024-06-01',
      tendency: 'PUNCTUAL', // On-time star
    },
    {
      code: 'DASA-105',
      first: 'Vijay',
      last: 'Sethu',
      display: 'Vijay Sethupathi',
      email: 'vijay.s@dasatech.com',
      phone: '+91 98425 67890',
      dept: 'OPS',
      roleTitle: 'DevOps & Cloud Engineer',
      joining: '2024-07-15',
      tendency: 'PUNCTUAL',
    },
    {
      code: 'DASA-106',
      first: 'Sneha',
      last: 'Priya',
      display: 'Sneha Priya',
      email: 'sneha.p@dasatech.com',
      phone: '+91 98426 78901',
      dept: 'ENG',
      roleTitle: 'Frontend React Developer',
      joining: '2024-08-01',
      tendency: 'HYBRID',
    },
  ];

  const createdEmployees = [];

  for (const emp of sampleEmployees) {
    const userRes = await query(`
      INSERT INTO users (company_id, role_id, email, password_hash, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id;
    `, [companyId, empRoleId, emp.email, employeePasswordHash]);
    const userId = userRes.rows[0].id;

    const empRes = await query(`
      INSERT INTO employees (
        company_id, user_id, employee_code, first_name, last_name, display_name,
        email, phone, department_id, designation, date_of_joining, employment_status,
        shift_id, weekly_off_days, attendance_pin_hash, profile_photo_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE',
        $12, '{0,6}', $13, '/uploads/dasa-logo.png'
      ) RETURNING id, display_name, employee_code;
    `, [
      companyId, userId, emp.code, emp.first, emp.last, emp.display,
      emp.email, emp.phone, deptMap[emp.dept], emp.roleTitle, emp.joining,
      defaultShiftId, defaultPinHash
    ]);

    const createdEmp = { ...empRes.rows[0], tendency: emp.tendency };
    createdEmployees.push(createdEmp);

    // Initial streak & achievements
    let streakCount = 12;
    if (emp.tendency === 'EARLY') streakCount = 28;
    if (emp.tendency === 'LATE') streakCount = 4;
    if (emp.tendency === 'HYBRID') streakCount = 19;

    await query(`
      INSERT INTO attendance_streaks (
        employee_id, current_streak, longest_streak, monthly_streak,
        consecutive_on_time_days, total_present_days, total_on_time_days, last_attendance_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
    `, [
      createdEmp.id,
      streakCount,
      Math.max(streakCount, 32),
      Math.min(streakCount, 22),
      emp.tendency === 'LATE' ? 2 : streakCount,
      streakCount + 10,
      emp.tendency === 'LATE' ? 8 : streakCount + 6
    ]);

    // Badges
    await query(`
      INSERT INTO employee_achievements (employee_id, badge_code, badge_name, badge_description, icon)
      VALUES 
      ($1, 'STREAK_3', '3-Day Fire Starter', 'Maintained 3 consecutive days of punctuality', 'Flame'),
      ($1, 'STREAK_7', '7-Day Iron Will', 'Completed a full week without breaking streak', 'Zap'),
      ($1, 'PUNCTUAL_PRO', 'Clockwork Titan', 'Consistently clocked in before grace period ended', 'Award')
      ON CONFLICT DO NOTHING;
    `, [createdEmp.id]);

    if (emp.tendency === 'EARLY') {
      await query(`
        INSERT INTO employee_achievements (employee_id, badge_code, badge_name, badge_description, icon)
        VALUES 
        ($1, 'STREAK_15', '15-Day Unstoppable', 'Maintained a stellar 15-day streak', 'ShieldCheck'),
        ($1, 'MINNAL_MURALI', 'Minnal Murali Crown', 'Speed of lightning: Consistently ahead of shift schedule', 'Sparkles')
        ON CONFLICT DO NOTHING;
      `, [createdEmp.id]);
    }
  }

  // 11. Generate Past 20 Working Days of Attendance Records & Events
  console.log('📊 Generating realistic 20-day attendance history & audit events...');
  const now = new Date();

  for (let i = 20; i >= 1; i--) {
    const recordDate = new Date();
    recordDate.setDate(now.getDate() - i);
    const dayOfWeek = recordDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends for regular attendance

    const dateStr = recordDate.toISOString().split('T')[0];

    for (const emp of createdEmployees) {
      // 5% chance of being absent or on leave for realism
      if (emp.tendency === 'LATE' && i === 5) {
        await query(`
          INSERT INTO attendance_records (
            company_id, employee_id, shift_id, date, status, notes
          ) VALUES ($1, $2, $3, $4, 'ABSENT', 'Unplanned personal emergency')
          ON CONFLICT DO NOTHING
        `, [companyId, emp.id, defaultShiftId, dateStr]);
        continue;
      }

      let checkInHour = 9;
      let checkInMin = 25;
      let checkInStatus = 'ON_TIME';
      let nickname = 'On-Time Star';

      if (emp.tendency === 'EARLY') {
        checkInHour = 9;
        checkInMin = Math.floor(Math.random() * 15) + 5; // 09:05 - 09:20
        checkInStatus = 'EARLY';
        nickname = 'Minnal Murali';
      } else if (emp.tendency === 'LATE') {
        checkInHour = 9;
        checkInMin = 46 + Math.floor(Math.random() * 18); // 09:46 - 10:04 (Late past 09:45 grace)
        checkInStatus = 'LATE';
        nickname = 'Chopplangi';
      } else if (emp.tendency === 'HYBRID') {
        // Kutty Dragon: alternate between early and punctual
        if (i % 2 === 0) {
          checkInHour = 9;
          checkInMin = 18;
          checkInStatus = 'EARLY';
        } else {
          checkInHour = 9;
          checkInMin = 34;
          checkInStatus = 'ON_TIME';
        }
        nickname = 'Kutty Dragon';
      } else {
        // Punctual
        checkInHour = 9;
        checkInMin = 25 + Math.floor(Math.random() * 15); // 09:25 - 09:40
        checkInStatus = 'ON_TIME';
        nickname = 'On-Time Star';
      }

      const checkInIso = new Date(Date.UTC(
        recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(),
        checkInHour - 5, checkInMin + 30, 0 // IST to UTC offset approx
      )).toISOString();

      const checkOutHour = 18;
      const checkOutMin = 35 + Math.floor(Math.random() * 25); // 18:35 - 19:00
      const checkOutIso = new Date(Date.UTC(
        recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(),
        checkOutHour - 5, checkOutMin + 30, 0
      )).toISOString();

      const totalMinutes = (checkOutHour - checkInHour) * 60 + (checkOutMin - checkInMin) - 60; // minus lunch

      const recRes = await query(`
        INSERT INTO attendance_records (
          company_id, employee_id, shift_id, date, check_in_time, check_out_time,
          total_working_minutes, break_duration_minutes, status, check_in_status,
          check_out_status, nickname, selfie_url, check_in_latitude, check_in_longitude,
          check_in_accuracy, is_corrected
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 60,
          $8, $9, 'NORMAL', $10, '/uploads/dasa-logo.png',
          11.341036, 77.717163, 14.5, false
        ) RETURNING id;
      `, [
        companyId, emp.id, defaultShiftId, dateStr, checkInIso, checkOutIso,
        totalMinutes, checkInStatus === 'LATE' ? 'LATE' : 'PRESENT',
        checkInStatus, nickname
      ]);

      const recordId = recRes.rows[0].id;

      // Add append-only audit event for check-in
      await query(`
        INSERT INTO attendance_events (
          attendance_record_id, employee_id, event_type, timestamp,
          latitude, longitude, accuracy_meters, location_name, is_within_geofence,
          device_info, selfie_url
        ) VALUES ($1, $2, 'CHECK_IN', $3, 11.341036, 77.717163, 14.5, 'DASA TECH HQ, Erode', true, 'Chrome on Windows 11', '/uploads/dasa-logo.png')
      `, [recordId, emp.id, checkInIso]);

      // Add append-only audit event for check-out
      await query(`
        INSERT INTO attendance_events (
          attendance_record_id, employee_id, event_type, timestamp,
          latitude, longitude, accuracy_meters, location_name, is_within_geofence,
          device_info
        ) VALUES ($1, $2, 'CHECK_OUT', $3, 11.341036, 77.717163, 15.2, 'DASA TECH HQ, Erode', true, 'Chrome on Windows 11')
      `, [recordId, emp.id, checkOutIso]);
    }
  }

  // 12. Create Today's Live Attendance for some employees so the Landing & Admin screen are live!
  const todayStr = now.toISOString().split('T')[0];
  console.log(`⏱️ Setting up live attendance check-ins for today (${todayStr})...`);

  // Employee 0 (Karthik Raja) checked in early at 09:12 today
  const karthik = createdEmployees[0];
  const karthikIn = new Date();
  karthikIn.setHours(9, 12, 0, 0);
  const karthikRec = await query(`
    INSERT INTO attendance_records (
      company_id, employee_id, shift_id, date, check_in_time,
      status, check_in_status, nickname, selfie_url, check_in_latitude,
      check_in_longitude, check_in_accuracy
    ) VALUES ($1, $2, $3, $4, $5, 'PRESENT', 'EARLY', 'Minnal Murali', '/uploads/dasa-logo.png', 11.341036, 77.717163, 12.0)
    ON CONFLICT (employee_id, date) DO UPDATE SET check_in_time = EXCLUDED.check_in_time
    RETURNING id;
  `, [companyId, karthik.id, defaultShiftId, todayStr, karthikIn.toISOString()]);

  await query(`
    INSERT INTO attendance_events (
      attendance_record_id, employee_id, event_type, timestamp, latitude, longitude,
      accuracy_meters, location_name, is_within_geofence, device_info, selfie_url
    ) VALUES ($1, $2, 'CHECK_IN', $3, 11.341036, 77.717163, 12.0, 'DASA TECH HQ', true, 'Chrome / Windows', '/uploads/dasa-logo.png')
  `, [karthikRec.rows[0].id, karthik.id, karthikIn.toISOString()]);

  // Employee 1 (Divya Sundaram) checked in on-time at 09:28 today
  const divya = createdEmployees[1];
  const divyaIn = new Date();
  divyaIn.setHours(9, 28, 0, 0);
  const divyaRec = await query(`
    INSERT INTO attendance_records (
      company_id, employee_id, shift_id, date, check_in_time,
      status, check_in_status, nickname, selfie_url, check_in_latitude,
      check_in_longitude, check_in_accuracy
    ) VALUES ($1, $2, $3, $4, $5, 'PRESENT', 'ON_TIME', 'Kutty Dragon', '/uploads/dasa-logo.png', 11.341036, 77.717163, 18.0)
    ON CONFLICT (employee_id, date) DO UPDATE SET check_in_time = EXCLUDED.check_in_time
    RETURNING id;
  `, [companyId, divya.id, defaultShiftId, todayStr, divyaIn.toISOString()]);

  await query(`
    INSERT INTO attendance_events (
      attendance_record_id, employee_id, event_type, timestamp, latitude, longitude,
      accuracy_meters, location_name, is_within_geofence, device_info, selfie_url
    ) VALUES ($1, $2, 'CHECK_IN', $3, 11.341036, 77.717163, 18.0, 'DASA TECH HQ', true, 'Safari / macOS', '/uploads/dasa-logo.png')
  `, [divyaRec.rows[0].id, divya.id, divyaIn.toISOString()]);

  // 13. Work & Attendance Requests sample data
  console.log('📝 Creating sample leave, permission, weekend work & client visit requests...');

  // Leave Request
  await query(`
    INSERT INTO leave_requests (
      company_id, employee_id, leave_type_id, start_date, end_date, total_days,
      reason, status, reviewed_by, review_comment, reviewed_at
    ) VALUES ($1, $2, $3, CURRENT_DATE + 3, CURRENT_DATE + 4, 2, 'Attending family wedding ceremony', 'APPROVED', $4, 'Approved. Have a great time!', CURRENT_TIMESTAMP)
  `, [companyId, karthik.id, leaveTypeMap['CL'], adminUserId]);

  const praveen = createdEmployees[2];
  await query(`
    INSERT INTO leave_requests (
      company_id, employee_id, leave_type_id, start_date, end_date, total_days,
      reason, status
    ) VALUES ($1, $2, $3, CURRENT_DATE + 6, CURRENT_DATE + 7, 2, 'Medical follow-up appointment with physician', 'PENDING')
  `, [companyId, praveen.id, leaveTypeMap['SL']]);

  // Permission Request
  await query(`
    INSERT INTO permission_requests (
      company_id, employee_id, date, start_time, end_time, duration_minutes,
      request_type, reason, status
    ) VALUES ($1, $2, CURRENT_DATE + 1, '16:30:00', '18:00:00', 90, 'EARLY_DEPARTURE', 'Parent-teacher conference at school', 'PENDING')
  `, [companyId, divya.id]);

  // Weekend Work
  await query(`
    INSERT INTO weekend_work (
      company_id, employee_id, date, start_time, end_time, total_hours,
      project_name, client_name, work_description, status
    ) VALUES ($1, $2, CURRENT_DATE - 5, '10:00:00', '16:00:00', 6.0, 'ERP Microservices Rollout', 'NEXO Systems', 'Database migration and load testing for sprint 4 delivery', 'APPROVED')
  `, [companyId, karthik.id]);

  // Client Visit
  await query(`
    INSERT INTO client_visits (
      company_id, employee_id, date, client_name, client_location, latitude, longitude,
      start_time, end_time, purpose, description, status
    ) VALUES ($1, $2, CURRENT_DATE - 2, 'Sri Murugan Metals Ltd', 'Perundurai Industrial SIPCOT, Erode', 11.278912, 77.584321,
      '11:00:00', '14:30:00', 'IoT Sensor Installation Review', 'Reviewed physical network telemetry and on-site RFID antenna placement.', 'APPROVED')
  `, [companyId, karthik.id]);

  // Client Meeting
  await query(`
    INSERT INTO client_meetings (
      company_id, employee_id, date, client_name, meeting_location, start_time, end_time,
      purpose, discussion_summary, follow_up_actions
    ) VALUES ($1, $2, CURRENT_DATE - 1, 'Royal Embassy Hotel Group', 'Conference Room A, Royal Embassy, Erode',
      '14:00:00', '15:30:00', 'Hotel PMS & NFC Card Integration Pitch', 'Demonstrated high-speed keycard check-in and breakfast audit. Client requested customized quotation.', 'Send revised commercial quotation by Friday.')
  `, [companyId, praveen.id]);

  // Notifications
  await query(`
    INSERT INTO notifications (user_id, employee_id, title, message, type)
    VALUES 
    ($1, $2, '🎉 28-Day Streak Milestone!', 'Outstanding dedication! You have achieved 28 consecutive days on streak.', 'MILESTONE'),
    ($1, $2, 'Leave Request Approved', 'Your casual leave for next week has been approved by management.', 'SUCCESS')
  `, [adminUserId, karthik.id]);

  // Audit Log
  await query(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
    VALUES ($1, 'SYSTEM_INITIALIZATION', 'SYSTEM', 'DASA-TECH-SEED', '{"event": "Master migration and initial seed completed"}'::jsonb, '127.0.0.1', 'Node.js Migration Engine')
  `, [adminUserId]);

  console.log('✨ All migrations and comprehensive seed data created successfully!');
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🏁 Migration script finished cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };

