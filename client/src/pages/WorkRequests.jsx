import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Calendar, Clock, Briefcase, MapPin, Send,
  CheckCircle2, AlertCircle, Plus, Users, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestsApi, employeeApi } from '../services/api';

export default function WorkRequests() {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState('leave'); // 'leave' | 'permission' | 'weekend' | 'client'

  // Data states
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [weekendWork, setWeekendWork] = useState([]);
  const [clientVisits, setClientVisits] = useState([]);
  const [clientMeetings, setClientMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employee?.id || '');

  // Modal / Form state
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Form fields
  // Leave
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

  // Permission
  const [permDate, setPermDate] = useState(new Date().toISOString().split('T')[0]);
  const [permStart, setPermStart] = useState('16:00');
  const [permEnd, setPermEnd] = useState('17:30');
  const [permDuration, setPermDuration] = useState(90);
  const [permType, setPermType] = useState('EARLY_DEPARTURE');
  const [permReason, setPermReason] = useState('');

  // Weekend
  const [wkDate, setWkDate] = useState('');
  const [wkStart, setWkStart] = useState('10:00');
  const [wkEnd, setWkEnd] = useState('16:00');
  const [wkHours, setWkHours] = useState(6);
  const [wkProject, setWkProject] = useState('');
  const [wkClient, setWkClient] = useState('');
  const [wkDesc, setWkDesc] = useState('');

  // Client Visit
  const [cvDate, setCvDate] = useState(new Date().toISOString().split('T')[0]);
  const [cvClient, setCvClient] = useState('');
  const [cvLocation, setCvLocation] = useState('');
  const [cvPurpose, setCvPurpose] = useState('');
  const [cvDesc, setCvDesc] = useState('');

  const loadData = async () => {
    try {
      const [typesRes, empRes] = await Promise.all([
        requestsApi.getLeaveTypes(),
        employeeApi.getPublicList()
      ]);
      if (typesRes.data.success) {
        setLeaveTypes(typesRes.data.leaveTypes || []);
        if (typesRes.data.leaveTypes.length > 0) {
          setLeaveTypeId(typesRes.data.leaveTypes[0].id);
        }
      }
      if (empRes.data.success) {
        setEmployees(empRes.data.employees || []);
        if (!selectedEmployeeId && empRes.data.employees.length > 0) {
          setSelectedEmployeeId(empRes.data.employees[0].id);
        }
      }

      const [lRes, pRes, wRes, cvRes, cmRes] = await Promise.all([
        requestsApi.getLeaves(),
        requestsApi.getPermissions(),
        requestsApi.getWeekendWork(),
        requestsApi.getClientVisits(),
        requestsApi.getClientMeetings()
      ]);

      if (lRes.data.success) setLeaves(lRes.data.requests || []);
      if (pRes.data.success) setPermissions(pRes.data.requests || []);
      if (wRes.data.success) setWeekendWork(wRes.data.records || []);
      if (cvRes.data.success) setClientVisits(cvRes.data.visits || []);
      if (cmRes.data.success) setClientMeetings(cmRes.data.meetings || []);
    } catch (e) {
      console.warn('Requests load error', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const empId = employee?.id || selectedEmployeeId;

    try {
      if (activeTab === 'leave') {
        const res = await requestsApi.submitLeave({
          employeeId: empId,
          leaveTypeId,
          startDate: leaveStart,
          endDate: leaveEnd,
          totalDays: leaveDays,
          reason: leaveReason
        });
        if (res.data.success) {
          setMessage('Leave request submitted successfully.');
          setFormOpen(false);
          loadData();
        }
      } else if (activeTab === 'permission') {
        const res = await requestsApi.submitPermission({
          employeeId: empId,
          date: permDate,
          startTime: permStart,
          endTime: permEnd,
          durationMinutes: permDuration,
          requestType: permType,
          reason: permReason
        });
        if (res.data.success) {
          setMessage('Permission request submitted.');
          setFormOpen(false);
          loadData();
        }
      } else if (activeTab === 'weekend') {
        const res = await requestsApi.submitWeekendWork({
          employeeId: empId,
          date: wkDate,
          startTime: wkStart,
          endTime: wkEnd,
          totalHours: wkHours,
          projectName: wkProject,
          clientName: wkClient,
          workDescription: wkDesc
        });
        if (res.data.success) {
          setMessage('Weekend work logged.');
          setFormOpen(false);
          loadData();
        }
      } else if (activeTab === 'client') {
        const res = await requestsApi.submitClientVisit({
          employeeId: empId,
          date: cvDate,
          clientName: cvClient,
          clientLocation: cvLocation,
          purpose: cvPurpose,
          description: cvDesc
        });
        if (res.data.success) {
          setMessage('Client visit recorded.');
          setFormOpen(false);
          loadData();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Workforce Requests Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Work & Attendance Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Apply for leave, request permission, log weekend/night work, and record off-site client meetings.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setMessage(null);
            setFormOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-amber-500/20 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New {activeTab === 'leave' ? 'Leave' : activeTab === 'permission' ? 'Permission' : activeTab === 'weekend' ? 'Weekend Work' : 'Client Visit'}</span>
        </button>
      </div>

      {/* Global alert messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'leave', label: 'Leave Applications', count: leaves.length, icon: Calendar },
          { id: 'permission', label: 'Permission Requests', count: permissions.length, icon: Clock },
          { id: 'weekend', label: 'Weekend & Overtime', count: weekendWork.length, icon: Briefcase },
          { id: 'client', label: 'Client Visits & Meetings', count: clientVisits.length + clientMeetings.length, icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Leave Requests List */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No leave requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {l.display_name} <span className="text-[10px] text-slate-400 font-normal">({l.employee_code})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {l.leave_type_name} ({l.leave_type_code})
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-bold">
                        {l.total_days} {l.total_days === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {l.reason}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          l.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Permission Requests */}
      {activeTab === 'permission' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Window</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No permission requests logged yet.
                    </td>
                  </tr>
                ) : (
                  permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {p.display_name} <span className="text-[10px] text-slate-400 font-normal">({p.employee_code})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(p.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {p.start_time?.slice(0, 5)} - {p.end_time?.slice(0, 5)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {p.duration_minutes} mins
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.request_type}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {p.reason}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Weekend Work */}
      {activeTab === 'weekend' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Hours</th>
                  <th className="py-3.5 px-4">Project / Client</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weekendWork.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No weekend work records submitted.
                    </td>
                  </tr>
                ) : (
                  weekendWork.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {w.display_name} <span className="text-[10px] text-slate-400 font-normal">({w.employee_code})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(w.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {w.total_hours} hrs
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {w.project_name} {w.client_name ? `(${w.client_name})` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {w.work_description}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          w.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          w.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Client Visits & Meetings */}
      {activeTab === 'client' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>On-Site Client Visits</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientVisits.map((cv) => (
                <div key={cv.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{cv.client_name}</span>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {cv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{cv.client_location}</span>
                  </p>
                  <p className="text-xs text-amber-800 font-semibold">{cv.purpose}</p>
                  <p className="text-[11px] text-slate-500">{cv.description}</p>
                  <p className="text-[10px] text-slate-400">
                    Logged by {cv.display_name} on {new Date(cv.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span>Executive Client Meetings</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientMeetings.map((cm) => (
                <div key={cm.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{cm.client_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {cm.start_time?.slice(0, 5)} - {cm.end_time?.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{cm.meeting_location}</p>
                  <p className="text-xs text-slate-700 font-medium">Purpose: {cm.purpose}</p>
                  <p className="text-[11px] text-slate-600 bg-white border border-slate-200 p-2.5 rounded-lg">
                    <strong>Summary:</strong> {cm.discussion_summary}
                  </p>
                  {cm.follow_up_actions && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      Follow-up: {cm.follow_up_actions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Submit {activeTab === 'leave' ? 'Leave Request' : activeTab === 'permission' ? 'Permission Request' : activeTab === 'weekend' ? 'Weekend Work Log' : 'Client Visit'}
                </h3>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Employee Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Employee Profile
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.display_name} ({e.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Leave fields */}
                {activeTab === 'leave' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Leave Type
                      </label>
                      <select
                        value={leaveTypeId}
                        onChange={(e) => setLeaveTypeId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                      >
                        {leaveTypes.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code}) {t.is_paid ? '• Paid' : '• Unpaid'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">End Date</label>
                        <input
                          type="date"
                          value={leaveEnd}
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Total Working Days</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={leaveDays}
                        onChange={(e) => setLeaveDays(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Leave</label>
                      <textarea
                        rows={3}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        required
                        placeholder="Please provide explicit reason..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}

                {/* Permission fields */}
                {activeTab === 'permission' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                        <input
                          type="date"
                          value={permDate}
                          onChange={(e) => setPermDate(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                        <select
                          value={permType}
                          onChange={(e) => setPermType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="LATE_ARRIVAL">Late Arrival</option>
                          <option value="EARLY_DEPARTURE">Early Departure</option>
                          <option value="PERSONAL_BREAK">Short Personal Break</option>
                          <option value="APPOINTMENT">Medical Appointment</option>
                          <option value="OTHER">Other Reason</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Start Time</label>
                        <input
                          type="time"
                          value={permStart}
                          onChange={(e) => setPermStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">End Time</label>
                        <input
                          type="time"
                          value={permEnd}
                          onChange={(e) => setPermEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Reason</label>
                      <textarea
                        rows={3}
                        value={permReason}
                        onChange={(e) => setPermReason(e.target.value)}
                        required
                        placeholder="Reason for permission..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}

                {/* Weekend Work fields */}
                {activeTab === 'weekend' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                        <input
                          type="date"
                          value={wkDate}
                          onChange={(e) => setWkDate(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Total Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={wkHours}
                          onChange={(e) => setWkHours(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Project Name</label>
                        <input
                          type="text"
                          value={wkProject}
                          onChange={(e) => setWkProject(e.target.value)}
                          required
                          placeholder="e.g. ERP Cloud Rollout"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Client Name</label>
                        <input
                          type="text"
                          value={wkClient}
                          onChange={(e) => setWkClient(e.target.value)}
                          placeholder="e.g. NEXO Systems"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Work Description</label>
                      <textarea
                        rows={3}
                        value={wkDesc}
                        onChange={(e) => setWkDesc(e.target.value)}
                        required
                        placeholder="Details of deliverables..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}

                {/* Client Visit fields */}
                {activeTab === 'client' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Client Name</label>
                        <input
                          type="text"
                          value={cvClient}
                          onChange={(e) => setCvClient(e.target.value)}
                          required
                          placeholder="Client Company"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Location Address</label>
                        <input
                          type="text"
                          value={cvLocation}
                          onChange={(e) => setCvLocation(e.target.value)}
                          required
                          placeholder="Client Site / Address"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Purpose of Visit</label>
                      <input
                        type="text"
                        value={cvPurpose}
                        onChange={(e) => setCvPurpose(e.target.value)}
                        required
                        placeholder="e.g. Network Audit & Deployment"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Description / Notes</label>
                      <textarea
                        rows={3}
                        value={cvDesc}
                        onChange={(e) => setCvDesc(e.target.value)}
                        placeholder="Summary of on-site activities..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
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
