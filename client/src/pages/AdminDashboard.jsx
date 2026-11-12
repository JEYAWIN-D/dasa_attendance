import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CheckCircle2, AlertTriangle, Clock, Calendar,
  Briefcase, TrendingUp, Flame, ShieldCheck,
  RefreshCw, BarChart3, MapPin
} from 'lucide-react';
import { adminApi } from '../services/api';
import StreakFlame from '../components/StreakFlame';
import NicknameBadge from '../components/NicknameBadge';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboardAnalytics();
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin analytics', err);
      setError('Could not load analytics. Please ensure you are logged in as Super Admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          <span>Loading workforce analytics & live telemetry...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const leaderboard = data?.leaderboard || [];
  const departmentStats = data?.departmentStats || [];
  const weeklyTrend = data?.weeklyTrend || [];
  const liveActivity = data?.liveActivity || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Live Workforce Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Executive Analytics & Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time monitoring, arrival analytics, streak leadership, and department distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/reports"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Advanced Reports</span>
          </Link>
        </div>
      </div>

      {/* Top 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Employees', value: metrics.totalEmployees || 0, color: 'text-slate-900', border: 'border-slate-200' },
          { label: 'Present Today', value: metrics.presentToday || 0, color: 'text-emerald-600', border: 'border-emerald-200 bg-emerald-50/40' },
          { label: 'Absent Today', value: metrics.absentToday || 0, color: 'text-rose-600', border: 'border-rose-200 bg-rose-50/40' },
          { label: 'Late Arrivals', value: metrics.lateToday || 0, color: 'text-amber-600', border: 'border-amber-200 bg-amber-50/40' },
          { label: 'Early Birds', value: metrics.earlyToday || 0, color: 'text-cyan-600', border: 'border-cyan-200 bg-cyan-50/40' },
          { label: 'On Leave', value: metrics.onLeaveToday || 0, color: 'text-indigo-600', border: 'border-indigo-200 bg-indigo-50/40' },
          { label: 'Client Site', value: metrics.workingClientToday || 0, color: 'text-purple-600', border: 'border-purple-200 bg-purple-50/40' },
          { label: 'Pending Approvals', value: metrics.pendingApprovals || 0, color: 'text-orange-600', border: 'border-orange-200 bg-orange-50/40' },
        ].map((m, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-2xl border ${m.border} shadow-xs flex flex-col justify-between`}>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider line-clamp-1">
              {m.label}
            </span>
            <span className={`text-2xl font-black ${m.color} mt-2`}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Section 2: Main Analytics Grid (Weekly Trend & Streak Leaderboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 7-Day Trend Chart & Department Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          {/* Weekly Attendance Trend Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>7-Day Attendance Trend</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily ratio of on-time, late, and early arrivals across company shifts.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Punctuality Index: 92%
              </span>
            </div>

            {/* Custom Bar Visualization */}
            <div className="grid grid-cols-7 gap-3 pt-4">
              {weeklyTrend.map((day, idx) => {
                const total = parseInt(day.present || 0, 10);
                const late = parseInt(day.late || 0, 10);
                const early = parseInt(day.early || 0, 10);
                const maxVal = 10;
                const barHeight = Math.min(100, Math.max(15, (total / maxVal) * 100));

                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-700">{total}</span>
                    <div className="w-full bg-slate-100 rounded-xl p-1 h-36 flex flex-col justify-end border border-slate-200">
                      <div
                        style={{ height: `${barHeight}%` }}
                        className="w-full rounded-lg flex flex-col overflow-hidden bg-emerald-500"
                      >
                        {late > 0 && <div style={{ height: `${(late / total) * 100}%` }} className="bg-amber-400" title={`Late: ${late}`} />}
                        {early > 0 && <div style={{ height: `${(early / total) * 100}%` }} className="bg-cyan-400" title={`Early: ${early}`} />}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{day.day_name}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 pt-3 text-xs font-medium text-slate-600 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> On-Time</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span> Early (Minnal Murali)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span> Late (Chopplangi)</span>
            </div>
          </div>

          {/* Department-wise Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-600" />
              <span>Department Attendance Today</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {departmentStats.map((dept, idx) => {
                const total = parseInt(dept.total || 0, 10);
                const present = parseInt(dept.present || 0, 10);
                const pct = total ? Math.round((present / total) * 100) : 0;

                return (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{dept.department}</span>
                      <span className="font-semibold text-slate-600">{present} / {total} Present</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Streak Leaderboard & Live Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Streak Leaderboard */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Streak Leaderboard
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Top Consistency
              </span>
            </div>

            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((entry, idx) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0 ? 'bg-amber-400 text-slate-900 shadow-xs' :
                      idx === 1 ? 'bg-slate-300 text-slate-800' :
                      idx === 2 ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
                    }`}>
                      #{idx + 1}
                    </span>

                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{entry.display_name}</p>
                      <p className="text-[10px] text-slate-500">{entry.designation}</p>
                      {entry.current_nickname && (
                        <div className="mt-1">
                          <NicknameBadge nickname={entry.current_nickname} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  <StreakFlame streakCount={entry.current_streak} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity Stream (Recent Events) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Live Activity Stream</span>
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {liveActivity.map((evt) => (
                <div key={evt.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    evt.event_type === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {evt.event_type === 'CHECK_IN' ? 'IN' : 'OUT'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{evt.display_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {evt.location_name || 'DASA TECH HQ'}
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-500">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
