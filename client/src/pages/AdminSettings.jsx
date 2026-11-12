import React, { useState, useEffect } from 'react';
import {
  Clock, Shield, Calendar,
  CheckCircle2, AlertCircle, Save, Plus, Trash2, RefreshCw
} from 'lucide-react';
import { adminApi, shiftApi } from '../services/api';

export default function AdminSettings() {
  const [shifts, setShifts] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [settings, setSettings] = useState({});
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form states
  const [gracePeriod, setGracePeriod] = useState(15);
  const [geofenceEnforced, setGeofenceEnforced] = useState(false);
  const [checkoutSelfie, setCheckoutSelfie] = useState(false);

  // New Holiday Form
  const [newHName, setNewHName] = useState('');
  const [newHDate, setNewHDate] = useState('');
  const [newHDesc, setNewHDesc] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftRes, holRes, setRes] = await Promise.all([
        shiftApi.getAll(),
        adminApi.getHolidays(),
        adminApi.getSettings()
      ]);

      if (shiftRes.data.success) setShifts(shiftRes.data.shifts || []);
      if (holRes.data.success) setHolidays(holRes.data.holidays || []);
      if (setRes.data.success) {
        setSettings(setRes.data.settings || {});
        setLocations(setRes.data.locations || []);
        if (setRes.data.settings?.grace_period_minutes) {
          setGracePeriod(setRes.data.settings.grace_period_minutes);
        }
        if (setRes.data.settings?.geofence_policy) {
          setGeofenceEnforced(Boolean(setRes.data.settings.geofence_policy.enforced));
        }
        if (setRes.data.settings?.checkout_selfie_required) {
          setCheckoutSelfie(Boolean(setRes.data.settings.checkout_selfie_required));
        }
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePolicy = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await Promise.all([
        adminApi.updateSetting('grace_period_minutes', { value: parseInt(gracePeriod, 10), description: 'Grace period minutes' }),
        adminApi.updateSetting('geofence_policy', { value: { enforced: geofenceEnforced, max_distance_meters: 300 }, description: 'Geofence policy' }),
        adminApi.updateSetting('checkout_selfie_required', { value: checkoutSelfie, description: 'Check-out selfie policy' }),
      ]);
      setFeedback({ type: 'success', text: 'Company attendance policies updated successfully.' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      const res = await adminApi.createHoliday({
        name: newHName,
        date: newHDate,
        description: newHDesc,
        isRecurring: true
      });
      if (res.data.success) {
        setNewHName('');
        setNewHDate('');
        setNewHDesc('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            System Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Attendance Policies & Company Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure grace periods, shift timings, Snapchat streak rules, nickname thresholds, and holidays.
          </p>
        </div>

        <button
          onClick={handleSavePolicy}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-amber-500/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Policies'}</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Shifts & General Policies */}
        <div className="lg:col-span-7 space-y-6">
          {/* Shift Timings */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Configured Working Shifts</span>
            </h3>

            <div className="space-y-3">
              {shifts.map((s) => (
                <div key={s.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{s.name}</h5>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Window: {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} • Grace: {s.grace_period_minutes}m
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                      {s.employee_count || 0} Staff Assigned
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grace Period & Security Policy */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Punctuality & Verification Policy</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Global Arrival Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Arrivals past (Shift Start + Grace Period) are recorded as Late and labeled <strong>Chopplangi</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <h6 className="text-xs font-bold text-slate-900">Strict Geofence Enforcement</h6>
                  <p className="text-[11px] text-slate-500">Block check-in if GPS coordinate is outside campus radius.</p>
                </div>
                <input
                  type="checkbox"
                  checked={geofenceEnforced}
                  onChange={(e) => setGeofenceEnforced(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <h6 className="text-xs font-bold text-slate-900">Mandatory Check-out Selfie</h6>
                  <p className="text-[11px] text-slate-500">Require camera selfie verification during check-out.</p>
                </div>
                <input
                  type="checkbox"
                  checked={checkoutSelfie}
                  onChange={(e) => setCheckoutSelfie(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Holidays & Company Calendar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Company Calendar & Holidays</span>
            </h3>

            {/* Add holiday mini form */}
            <form onSubmit={handleAddHoliday} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">Add Holiday</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Holiday Name"
                  value={newHName}
                  onChange={(e) => setNewHName(e.target.value)}
                  required
                  className="bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="date"
                  value={newHDate}
                  onChange={(e) => setNewHDate(e.target.value)}
                  required
                  className="bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Company Holiday</span>
              </button>
            </form>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {holidays.map((h) => (
                <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{h.name}</p>
                    <p className="text-[10px] text-slate-500">{h.description}</p>
                  </div>
                  <span className="font-semibold text-slate-600">
                    {new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
