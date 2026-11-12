import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Edit3, Power,
  CheckCircle2, AlertCircle, RefreshCw, X, Flame
} from 'lucide-react';
import { employeeApi, shiftApi, adminApi } from '../services/api';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Form inputs
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [pin, setPin] = useState('1234');
  const [empStatus, setEmpStatus] = useState('ACTIVE');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, shiftRes] = await Promise.all([
        employeeApi.getAll({ search, department: selectedDept, status: selectedStatus }),
        adminApi.getDepartments(),
        shiftApi.getAll()
      ]);

      if (empRes.data.success) setEmployees(empRes.data.employees || []);
      if (deptRes.data.success) setDepartments(deptRes.data.departments || []);
      if (shiftRes.data.success) setShifts(shiftRes.data.shifts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [selectedDept, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAll();
  };

  const openAddModal = () => {
    setEditingEmp(null);
    setCode(`DASA-${100 + employees.length + 1}`);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDepartmentId(departments[0]?.id || '');
    setDesignation('Software Engineer');
    setShiftId(shifts[0]?.id || '');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setPin('1234');
    setEmpStatus('ACTIVE');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmp(emp);
    setCode(emp.employee_code);
    setFirstName(emp.first_name);
    setLastName(emp.last_name);
    setEmail(emp.email);
    setPhone(emp.phone || '');
    setDepartmentId(emp.department_id || '');
    setDesignation(emp.designation || '');
    setShiftId(emp.shift_id || '');
    setJoiningDate(emp.date_of_joining ? emp.date_of_joining.split('T')[0] : '');
    setPin('');
    setEmpStatus(emp.employment_status || 'ACTIVE');
    setError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingEmp) {
        const res = await employeeApi.update(editingEmp.id, {
          firstName,
          lastName,
          phone,
          departmentId,
          designation,
          shiftId,
          employmentStatus: empStatus,
          pin: pin ? pin : undefined
        });
        if (res.data.success) {
          setMessage(`Employee ${editingEmp.display_name} updated successfully.`);
          setModalOpen(false);
          loadAll();
        }
      } else {
        const res = await employeeApi.create({
          employeeCode: code,
          firstName,
          lastName,
          email,
          phone,
          departmentId,
          designation,
          shiftId,
          dateOfJoining: joiningDate,
          pin: pin || '1234'
        });
        if (res.data.success) {
          setMessage(`Employee ${firstName} ${lastName} created successfully.`);
          setModalOpen(false);
          loadAll();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    if (window.confirm(`Are you sure you want to ${emp.is_active ? 'deactivate' : 'activate'} ${emp.display_name}?`)) {
      try {
        const res = await employeeApi.toggleStatus(emp.id);
        if (res.data.success) {
          loadAll();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Workforce Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Employee Accounts & Shift Assignment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage employee master data, security PINs, shift timing, and department assignments.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-amber-500/20 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee code, or email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            onClick={loadAll}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Assigned Shift</th>
                <th className="py-3.5 px-4">Streak</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                        {emp.display_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{emp.display_name}</p>
                        <p className="text-[11px] text-slate-500">{emp.employee_code} • {emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {emp.department_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {emp.designation}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {emp.shift_name} ({emp.start_time?.slice(0, 5)} - {emp.end_time?.slice(0, 5)})
                  </td>
                  <td className="py-3 px-4 font-bold text-amber-600">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {emp.current_streak || 0}d
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      emp.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(emp)}
                        title="Edit Details & Shift"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        title={emp.is_active ? "Deactivate" : "Activate"}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          emp.is_active ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingEmp ? `Edit Employee: ${editingEmp.display_name}` : 'Create New Employee Account'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Employee ID / Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={Boolean(editingEmp)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 disabled:opacity-60 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={Boolean(editingEmp)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 disabled:opacity-60 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Shift</label>
                    <select
                      value={shiftId}
                      onChange={(e) => setShiftId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {editingEmp ? 'Reset PIN (Leave blank to keep)' : 'Quick Security PIN'}
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="e.g. 1234"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
                  >
                    {submitting ? 'Saving...' : editingEmp ? 'Update Employee' : 'Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
