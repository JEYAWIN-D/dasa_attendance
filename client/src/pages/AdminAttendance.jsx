import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, MapPin, Camera, CheckCircle2, AlertTriangle,
  Search, Filter, RefreshCw, Edit3, X, Eye, ExternalLink, ShieldCheck
} from 'lucide-react';
import { attendanceApi, employeeApi, adminApi } from '../services/api';
import NicknameBadge from '../components/NicknameBadge';

export default function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [selfieModalUrl, setSelfieModalUrl] = useState(null);
  const [correctModalRecord, setCorrectModalRecord] = useState(null);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [newStatus, setNewStatus] = useState('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, deptRes, empRes] = await Promise.all([
        attendanceApi.getHistory({
          startDate: selectedDate || undefined,
          endDate: selectedDate || undefined,
          departmentId: selectedDept || undefined,
          employeeId: selectedEmp || undefined,
          status: selectedStatus || undefined,
          limit: 100
        }),
        adminApi.getDepartments(),
        employeeApi.getPublicList()
      ]);

      if (recRes.data.success) setRecords(recRes.data.records || []);
      if (deptRes.data.success) setDepartments(deptRes.data.departments || []);
      if (empRes.data.success) setEmployees(empRes.data.employees || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedDept, selectedEmp, selectedStatus]);

  const openCorrectionModal = (rec) => {
    setCorrectModalRecord(rec);
    setNewCheckIn(rec.check_in_time ? new Date(rec.check_in_time).toISOString().slice(0, 16) : '');
    setNewCheckOut(rec.check_out_time ? new Date(rec.check_out_time).toISOString().slice(0, 16) : '');
    setNewStatus(rec.status || 'PRESENT');
    setCorrectionReason('');
    setFeedback(null);
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctionReason || correctionReason.trim().length < 5) {
      setFeedback({ type: 'error', message: 'A detailed explanation reason is required for administrative audit.' });
      return;
    }

    setCorrecting(true);
    try {
      const res = await attendanceApi.correctRecord(correctModalRecord.id, {
        checkInTime: newCheckIn ? new Date(newCheckIn).toISOString() : null,
        checkOutTime: newCheckOut ? new Date(newCheckOut).toISOString() : null,
        status: newStatus,
        reason: correctionReason
      });

      if (res.data.success) {
        setCorrectModalRecord(null);
        loadData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setCorrecting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Attendance Records & Audits
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Attendance Management & Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review daily touchpoints, inspect live selfies, verify GPS coordinates, and issue authorized corrections.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Dept:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Employee:</label>
          <select
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.display_name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>

        {(selectedDate || selectedDept || selectedEmp || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedDate('');
              setSelectedDept('');
              setSelectedEmp('');
              setSelectedStatus('');
            }}
            className="text-xs text-amber-600 hover:text-amber-700 underline ml-auto font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Selfie</th>
                <th className="py-3.5 px-4">Check-In</th>
                <th className="py-3.5 px-4">Check-Out</th>
                <th className="py-3.5 px-4">Working Hours</th>
                <th className="py-3.5 px-4">Status & Nickname</th>
                <th className="py-3.5 px-4">GPS Verification</th>
                <th className="py-3.5 px-4 text-right">Correct</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{r.display_name}</p>
                    <p className="text-[11px] text-slate-500">{r.employee_code} • {r.department_name}</p>
                  </td>
                  <td className="py-3 px-4">
                    {r.selfie_url ? (
                      <button
                        onClick={() => setSelfieModalUrl(r.selfie_url)}
                        title="View Full Selfie"
                        className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:border-amber-500 transition-all flex items-center justify-center bg-slate-100 group cursor-pointer"
                      >
                        <img src={r.selfie_url} alt="Selfie" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[10px]">No Photo</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {r.check_in_time ? (
                      <div>
                        <span className="text-slate-800 font-semibold">
                          {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`block text-[10px] font-medium ${
                          r.check_in_status === 'EARLY' ? 'text-cyan-600' :
                          r.check_in_status === 'LATE' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {r.check_in_status || 'ON_TIME'}
                        </span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {r.total_working_minutes ? `${(r.total_working_minutes / 60).toFixed(1)} hrs` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        r.status === 'LATE' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {r.status}
                      </span>
                      {r.nickname && (
                        <div className="mt-0.5">
                          <NicknameBadge nickname={r.nickname} size="sm" />
                        </div>
                      )}
                      {r.is_corrected && (
                        <span className="inline-block text-[9px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Audited
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[11px]">
                    {r.check_in_latitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${r.check_in_latitude},${r.check_in_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-600 hover:text-amber-700 flex items-center gap-1 group font-medium"
                      >
                        <MapPin className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110" />
                        <span>{parseFloat(r.check_in_latitude).toFixed(3)}, {parseFloat(r.check_in_longitude).toFixed(3)}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-slate-400">Not recorded</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openCorrectionModal(r)}
                      title="Adjust with Audit Reason"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selfie Lightbox Modal */}
      <AnimatePresence>
        {selfieModalUrl && (
          <div
            onClick={() => setSelfieModalUrl(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-lg w-full bg-white rounded-3xl p-4 border border-slate-200 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 px-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-600" />
                  <span>Attendance Selfie Verification</span>
                </h4>
                <button
                  onClick={() => setSelfieModalUrl(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img src={selfieModalUrl} alt="Enlarged Selfie" className="w-full aspect-[4/3] object-cover rounded-2xl border border-slate-100" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Correction Modal */}
      <AnimatePresence>
        {correctModalRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">Attendance Audit Correction</h3>
                </div>
                <button onClick={() => setCorrectModalRecord(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Employee: <strong className="text-slate-900">{correctModalRecord.display_name}</strong> • Date: {correctModalRecord.date}
              </p>

              <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Check-In Timestamp</label>
                  <input
                    type="datetime-local"
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Check-Out Timestamp</label>
                  <input
                    type="datetime-local"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="LATE">LATE</option>
                    <option value="HALF_DAY">HALF DAY</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mandatory Audit Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    required
                    placeholder="Provide justification (e.g. Employee forgot phone / network outage verified by manager)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {feedback && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {feedback.message}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCorrectModalRecord(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={correcting}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs shadow-sm shadow-amber-500/20 cursor-pointer"
                  >
                    {correcting ? 'Saving Audit...' : 'Authorize Correction'}
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
