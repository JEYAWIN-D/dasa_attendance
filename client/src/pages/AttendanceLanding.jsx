import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, CheckCircle2, Clock, MapPin, Camera, Flame,
  AlertCircle, ArrowRight, LogIn, LogOut as LogOutIcon, Sparkles,
  ShieldCheck, RefreshCw, Briefcase, Calendar, Check
} from 'lucide-react';
import { employeeApi, attendanceApi } from '../services/api';
import LiveClock from '../components/LiveClock';
import StreakFlame from '../components/StreakFlame';
import NicknameBadge from '../components/NicknameBadge';
import LocationBadge from '../components/LocationBadge';
import WebcamCapture from '../components/WebcamCapture';
import PINPadModal from '../components/PINPadModal';
import MilestoneCelebration from '../components/MilestoneCelebration';

export default function AttendanceLanding() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Attendance inputs
  const [locationData, setLocationData] = useState(null);
  const [selfieData, setSelfieData] = useState(null);
  const [actionType, setActionType] = useState(null); // 'checkIn' | 'checkOut'

  // PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinError, setPinError] = useState(null);

  // Status & celebration messages
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeMilestone, setActiveMilestone] = useState(null);

  // Load dynamically fetched employees from PostgreSQL
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeeApi.getPublicList();
      if (res.data.success) {
        setEmployees(res.data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employee list', err);
      setErrorMessage('Could not load employees from server. Please verify backend status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Memoized location update callback to prevent parent-child render loops
  const handleLocationUpdate = React.useCallback((loc) => {
    setLocationData(prev => {
      if (prev && prev.latitude === loc?.latitude && prev.longitude === loc?.longitude && prev.source === loc?.source) {
        return prev;
      }
      return loc;
    });
  }, []);

  // When an employee is selected from the dropdown
  const handleEmployeeSelect = async (e) => {
    const empId = e.target.value;
    setSelectedEmployeeId(empId);
    setStatusMessage(null);
    setErrorMessage(null);
    setSelfieData(null);

    if (!empId) {
      setSelectedEmployee(null);
      setTodayAttendance(null);
      return;
    }

    const emp = employees.find((x) => x.id === empId);
    setSelectedEmployee(emp);

    try {
      const statusRes = await attendanceApi.getTodayStatus(empId);
      if (statusRes.data.success) {
        setTodayAttendance(statusRes.data.todayAttendance);
      }
    } catch (err) {
      console.warn('Could not fetch today status', err);
    }
  };

  // Trigger Check-In Flow with friendly user guidance
  const handleStartCheckIn = () => {
    if (!selectedEmployee) {
      setErrorMessage('⚠️ Please select your employee name in Step 1 first to check in.');
      const el = document.getElementById('employee-selector');
      if (el) el.focus();
      return;
    }
    if (todayAttendance?.check_in_time) {
      const timeStr = new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setStatusMessage({
        type: 'info',
        title: 'Already Checked In',
        text: `You have already checked in for today at ${timeStr}. Click CHECK OUT when finishing your shift.`
      });
      return;
    }
    setActionType('checkIn');
    setPinError(null);
    setErrorMessage(null);
    setPinModalOpen(true);
  };

  // Trigger Check-Out Flow with friendly user guidance
  const handleStartCheckOut = () => {
    if (!selectedEmployee) {
      setErrorMessage('⚠️ Please select your employee name in Step 1 first to check out.');
      const el = document.getElementById('employee-selector');
      if (el) el.focus();
      return;
    }
    if (todayAttendance?.check_out_time) {
      const outTime = new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setStatusMessage({
        type: 'info',
        title: 'Shift Already Concluded',
        text: `You have already completed check-out today at ${outTime}. Have a great rest of your day!`
      });
      return;
    }
    // Proceed with check-out (supports normal checkout and direct checkout fallback)
    setActionType('checkOut');
    setPinError(null);
    setErrorMessage(null);
    setPinModalOpen(true);
  };

  // Execute Check-in or Check-out after PIN verification
  const handlePinSubmit = async (pin) => {
    setSubmitting(true);
    setPinError(null);

    const payload = {
      employeeId: selectedEmployee.id,
      pin,
      latitude: locationData?.latitude || 11.341036,
      longitude: locationData?.longitude || 77.717163,
      accuracy: locationData?.accuracy || 15,
      locationName: locationData?.locationName || 'DASA TECH Campus HQ',
      selfieBase64: selfieData,
      deviceInfo: `${navigator.platform} - ${navigator.userAgent.slice(0, 80)}`
    };

    try {
      if (actionType === 'checkIn') {
        const res = await attendanceApi.checkIn(payload);
        if (res.data.success) {
          setPinModalOpen(false);
          setTodayAttendance(res.data.record);
          setStatusMessage({
            type: 'success',
            title: `Check-in Confirmed!`,
            text: res.data.message,
            sub: `Arrival: ${res.data.timingLabel} • Status: ${res.data.nickname}`
          });

          if (res.data.newMilestone) {
            setActiveMilestone(res.data.newMilestone);
          }
          fetchEmployees();
        }
      } else if (actionType === 'checkOut') {
        const res = await attendanceApi.checkOut(payload);
        if (res.data.success) {
          setPinModalOpen(false);
          setTodayAttendance(res.data.record);
          setStatusMessage({
            type: 'info',
            title: `Shift Concluded!`,
            text: res.data.message,
            sub: `Total Hours Logged: ${res.data.totalHours} hrs • Status: ${res.data.checkOutStatus}`
          });
          fetchEmployees();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      setPinError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isCheckedIn = Boolean(todayAttendance?.check_in_time);
  const isCheckedOut = Boolean(todayAttendance?.check_out_time);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#F8F9FA] py-10 px-4 sm:px-6 lg:px-8">
      {/* Milestone celebration modal */}
      {activeMilestone && (
        <MilestoneCelebration
          milestone={activeMilestone}
          streakCount={selectedEmployee?.current_streak}
          onClose={() => setActiveMilestone(null)}
        />
      )}

      {/* PIN entry modal */}
      <PINPadModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSubmit={handlePinSubmit}
        employeeName={selectedEmployee?.display_name || ''}
        employeeCode={selectedEmployee?.employee_code || ''}
        error={pinError}
      />

      <div className="max-w-4xl mx-auto space-y-7">
        {/* Friendly Hero Header */}
        <div className="text-center space-y-2.5">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold tracking-wide shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Welcome to DASA TECH Workforce Portal</span>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Mark Your <span className="text-gradient-dasa">Daily Attendance</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Select your profile, verify your location, take a quick selfie, and record your attendance with ease.
          </p>

          <div className="pt-1 flex justify-center">
            <LiveClock showDate={true} className="text-sm" />
          </div>
        </div>

        {/* Global Feedback Banners */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">{statusMessage.title}</h4>
                <p className="text-xs text-slate-700 mt-0.5">{statusMessage.text}</p>
                {statusMessage.sub && (
                  <p className="text-[11px] font-mono text-slate-600 mt-1">{statusMessage.sub}</p>
                )}
              </div>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-2xl border bg-red-50 border-red-200 text-red-900 flex items-start gap-3 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold">{errorMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Attendance Card (Milky White Theme with Crisp Surface) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200/90 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Employee Selection & Information */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Employee Selection Dropdown */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Your Profile
                  </label>
                </div>

                <div className="relative">
                  <select
                    id="employee-selector"
                    value={selectedEmployeeId}
                    onChange={handleEmployeeSelect}
                    disabled={loading}
                    className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl py-3.5 pl-4 pr-10 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Choose Employee Name --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.display_name} ({emp.employee_code}) — {emp.department_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Employee Summary Preview Card */}
              {selectedEmployee ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-slate-50/90 border border-slate-200 p-5 space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 p-0.5 shadow-sm">
                      <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-black text-xl text-slate-900">
                        {selectedEmployee.display_name.charAt(0)}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-lg">
                          {selectedEmployee.display_name}
                        </h3>
                        <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {selectedEmployee.employee_code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {selectedEmployee.designation} • <span className="font-semibold text-slate-800">{selectedEmployee.department_name}</span>
                      </p>

                      <div className="flex items-center gap-2.5 mt-2.5">
                        <StreakFlame
                          streakCount={selectedEmployee.current_streak || 0}
                          longestStreak={selectedEmployee.longest_streak || 0}
                          size="sm"
                        />
                        <NicknameBadge nickname={selectedEmployee.current_nickname || 'On-Time Star'} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Shift details */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Assigned Shift</span>
                      <span className="text-slate-900 font-bold">{selectedEmployee.shift_name || 'General Day'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Shift Hours</span>
                      <span className="text-amber-700 font-mono font-bold">
                        {selectedEmployee.start_time?.slice(0, 5)} - {selectedEmployee.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* Today's Status Banner */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Today's Attendance</span>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isCheckedOut ? 'bg-amber-500' : isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`} />
                        {isCheckedOut ? (
                          <span className="text-amber-800">Shift Completed ({todayAttendance?.check_out_time ? new Date(todayAttendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})</span>
                        ) : isCheckedIn ? (
                          <span className="text-emerald-700">Checked In at {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        ) : (
                          <span className="text-slate-500">Not Checked In Yet</span>
                        )}
                      </span>
                    </div>

                    {todayAttendance?.total_working_minutes > 0 && (
                      <div className="text-right font-mono text-xs">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Total Hours</span>
                        <strong className="text-sm font-bold text-slate-900">{(todayAttendance.total_working_minutes / 60).toFixed(1)}</strong> hrs
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs bg-slate-50/50">
                  <User className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  Select your profile above to load your active shift schedule and today's status.
                </div>
              )}

              {/* Step 2: Location Verification */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Location Verification
                  </label>
                </div>
                <LocationBadge
                  onLocationUpdate={handleLocationUpdate}
                />
              </div>
            </div>

            {/* Right Column: Live Camera Selfie & Action Buttons */}
            <div className="lg:col-span-5 space-y-6">
              {/* Step 3: Selfie Verification */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Selfie Verification
                  </label>
                </div>
                <WebcamCapture
                  onCapture={(img) => setSelfieData(img)}
                  capturedImage={selfieData}
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleStartCheckIn}
                  className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                    isCheckedIn
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  <LogIn className="w-5 h-5" />
                  <span>{isCheckedIn ? 'Checked In Today' : 'CHECK IN'}</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleStartCheckOut}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                    isCheckedOut
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                      : isCheckedIn
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 ring-2 ring-amber-400/50'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>
                    {isCheckedOut
                      ? 'Shift Concluded'
                      : isCheckedIn
                      ? 'CHECK OUT (Shift in Progress)'
                      : 'CHECK OUT'}
                  </span>
                </button>

                <p className="text-[11px] text-center text-slate-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  Secure employee verification & tamper-proof server timestamps.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Today's Office Activity Mini-Feed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Today's Live Check-Ins</h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Live Stream</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {employees.filter(e => e.today_check_in).slice(0, 6).map((emp) => (
              <div key={emp.id} className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  {emp.display_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{emp.display_name}</p>
                  <p className="text-[10px] text-emerald-700 font-mono font-semibold">
                    In: {new Date(emp.today_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {emp.current_nickname && (
                  <NicknameBadge nickname={emp.current_nickname} size="sm" />
                )}
              </div>
            ))}
            {employees.filter(e => e.today_check_in).length === 0 && (
              <p className="text-xs text-slate-500 col-span-3 text-center py-3">
                No check-ins recorded yet today. Be the first to start the day!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
