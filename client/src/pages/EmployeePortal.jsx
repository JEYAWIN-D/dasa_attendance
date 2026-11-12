import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, Clock, Award, Flame, Zap, ShieldCheck,
  CheckCircle2, AlertTriangle, ArrowRight, FileText, ChevronRight,
  TrendingUp, MapPin, Sparkles, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { employeeApi, attendanceApi, requestsApi } from '../services/api';
import StreakFlame from '../components/StreakFlame';
import NicknameBadge from '../components/NicknameBadge';
import PINPadModal from '../components/PINPadModal';

export default function EmployeePortal() {
  const { user, employee, verifyEmployeePin } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(employee?.id || '');
  const [activeEmp, setActiveEmp] = useState(employee || null);
  const [history, setHistory] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Quick Login / Unlock Modal
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  // Load employee list if not unlocked
  useEffect(() => {
    employeeApi.getPublicList().then(res => {
      if (res.data.success) {
        setEmployees(res.data.employees || []);
        if (!activeEmp && res.data.employees.length > 0) {
          setSelectedEmpId(res.data.employees[0].id);
        }
      }
    });
  }, []);

  // When activeEmp is established, load their data
  useEffect(() => {
    if (activeEmp?.id) {
      loadEmployeeDashboard(activeEmp.id);
    }
  }, [activeEmp]);

  const loadEmployeeDashboard = async (empId) => {
    setLoading(true);
    try {
      const empRes = await employeeApi.getById(empId);
      if (empRes.data.success) {
        setActiveEmp(empRes.data.employee);
        setStreakData({
          current: empRes.data.employee.current_streak,
          longest: empRes.data.employee.longest_streak,
          monthly: empRes.data.employee.monthly_streak,
          present: empRes.data.employee.total_present_days,
          onTime: empRes.data.employee.total_on_time_days
        });
        setAchievements(empRes.data.achievements || []);
      }

      const todayRes = await attendanceApi.getTodayStatus(empId);
      if (todayRes.data.success) {
        setTodayRecord(todayRes.data.todayAttendance);
      }

      const histRes = await attendanceApi.getHistory({ employeeId: empId, limit: 30 });
      if (histRes.data.success) {
        setHistory(histRes.data.records || []);
      }

      const reqRes = await requestsApi.getLeaves({ employeeId: empId });
      if (reqRes.data.success) {
        setMyRequests(reqRes.data.requests || []);
      }
    } catch (err) {
      console.warn('Dashboard load error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockSubmit = async (pin) => {
    try {
      setUnlockError(null);
      const res = await verifyEmployeePin(selectedEmpId, pin);
      setActiveEmp(res.employee);
      setUnlockModalOpen(false);
    } catch (err) {
      setUnlockError(err.message || 'Incorrect PIN');
    }
  };

  // If not unlocked, render prompt
  if (!activeEmp) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 text-center border border-slate-200 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-amber-600" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Employee Portal Access</h2>
          <p className="text-xs text-slate-600 mb-6">
            Select your employee profile and verify your security PIN to access your personal dashboard, attendance history, and request center.
          </p>

          <div className="mb-4 text-left">
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              Select Your Profile
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3.5 text-slate-900 text-xs font-semibold focus:outline-none focus:border-amber-500"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.display_name} ({e.employee_code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setUnlockError(null);
              setUnlockModalOpen(true);
            }}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Enter PIN to Unlock Portal</span>
          </button>

          <p className="text-[11px] text-slate-400 mt-4">
            Default Demo PIN: <strong className="text-slate-700 font-bold">1234</strong>
          </p>

          <PINPadModal
            isOpen={unlockModalOpen}
            onClose={() => setUnlockModalOpen(false)}
            onSubmit={handleUnlockSubmit}
            employeeName={employees.find(x => x.id === selectedEmpId)?.display_name || ''}
            employeeCode={employees.find(x => x.id === selectedEmpId)?.employee_code || ''}
            error={unlockError}
          />
        </div>
      </div>
    );
  }

  const totalLoggedHours = history.reduce((acc, cur) => acc + (cur.total_working_minutes || 0) / 60, 0);
  const lateCount = history.filter(x => x.check_in_status === 'LATE').length;
  const earlyCount = history.filter(x => x.check_in_status === 'EARLY').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#F8F9FA]">
      {/* Top Profile Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-3xl font-extrabold shadow-sm">
                {activeEmp.display_name?.charAt(0) || 'U'}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {activeEmp.display_name}
                </h1>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  {activeEmp.employee_code}
                </span>
                <NicknameBadge nickname={activeEmp.nickname || 'On-Time Star'} size="md" />
              </div>

              <p className="text-sm text-slate-600 mt-1">
                {activeEmp.designation} • <span className="font-semibold text-slate-800">{activeEmp.department_name}</span>
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-mono">
                <span>Joined: {activeEmp.date_of_joining ? new Date(activeEmp.date_of_joining).toLocaleDateString() : 'Active'}</span>
                <span>•</span>
                <span>Shift: {activeEmp.shift_name} ({activeEmp.start_time?.slice(0, 5)} - {activeEmp.end_time?.slice(0, 5)})</span>
              </div>
            </div>
          </div>

          {/* Streak Flame Component */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <StreakFlame
              streakCount={streakData?.current || 0}
              longestStreak={streakData?.longest || 0}
              size="lg"
              showLongest={true}
            />
            <div className="border-l border-slate-200 pl-4 text-xs font-mono space-y-1">
              <p className="text-slate-600">Total Present: <strong className="text-slate-900 font-bold">{streakData?.present || 0} days</strong></p>
              <p className="text-slate-600">On-Time Days: <strong className="text-emerald-700 font-bold">{streakData?.onTime || 0} days</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Logged Hours</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {totalLoggedHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span>
          </span>
          <span className="text-[11px] text-slate-400">Past 30 days total</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Early Arrivals</span>
          <span className="text-2xl font-black text-sky-700 font-mono mt-1 block">
            {earlyCount} <span className="text-xs font-normal text-slate-500">days</span>
          </span>
          <span className="text-[11px] text-sky-700/80">Minnal Murali style</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Late Arrivals</span>
          <span className="text-2xl font-black text-amber-700 font-mono mt-1 block">
            {lateCount} <span className="text-xs font-normal text-slate-500">days</span>
          </span>
          <span className="text-[11px] text-amber-700/80">Past grace period</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Badges Earned</span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
            {achievements.length} <span className="text-xs font-normal text-slate-500">unlocked</span>
          </span>
          <span className="text-[11px] text-amber-700/80">Milestone achievements</span>
        </div>
      </div>

      {/* Main Grid: Left = Attendance History, Right = Achievements & Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Attendance History Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Attendance History</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Showing last {history.length} records
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Check-In</th>
                    <th className="py-3.5 px-4">Check-Out</th>
                    <th className="py-3.5 px-4">Working Hours</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Recognition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {history.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 font-sans">
                        {new Date(record.date).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                      </td>
                      <td className="py-3 px-4">
                        {record.check_in_time ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            record.check_in_status === 'EARLY'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : record.check_in_status === 'LATE'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-sans">
                        {record.check_out_time ? (
                          new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-bold">
                        {record.total_working_minutes ? `${(record.total_working_minutes / 60).toFixed(1)} hrs` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          record.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : record.status === 'LATE'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {record.nickname ? (
                          <NicknameBadge nickname={record.nickname} size="sm" />
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 font-sans">
                        No historical attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Achievements & Requests Section */}
        <div className="lg:col-span-4 space-y-6">
          {/* Achievements */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Streak Achievements</span>
              </h3>
              <span className="text-xs font-mono font-bold text-amber-700">{achievements.length} Badges</span>
            </div>

            <div className="space-y-2.5">
              {achievements.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{a.badge_name}</h5>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{a.badge_description}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      Earned: {new Date(a.earned_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Recent Requests</span>
              </h3>
              <a href="/requests" className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1 font-bold">
                <span>Submit New</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-2">
              {myRequests.slice(0, 4).map((r) => (
                <div key={r.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{r.leave_type_name || 'Leave Request'}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      r.status === 'REJECTED' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate">{r.reason}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    {r.start_date} to {r.end_date} ({r.total_days} days)
                  </p>
                </div>
              ))}
              {myRequests.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No recent requests submitted.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
