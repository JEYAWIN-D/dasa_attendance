import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { adminApi } from '../services/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({ action: actionFilter || undefined, limit: 50 });
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Immutable Audit Trail
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Security & Administrative Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tamper-evident system logs tracking attendance corrections, authentication events, and policy modifications.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
        <label className="text-xs font-semibold text-slate-600">Action Filter:</label>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Actions</option>
          <option value="ATTENDANCE_CORRECTION">Attendance Corrections</option>
          <option value="ADMIN_LOGIN">Admin Logins</option>
          <option value="UPDATE_EMPLOYEE">Employee Updates</option>
          <option value="CREATE_EMPLOYEE">Employee Creations</option>
          <option value="UPDATE_SETTING">Policy Adjustments</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin Email</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Audit Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 text-slate-700 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 text-slate-900 font-medium">
                    {log.admin_email || 'System'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-medium">
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate font-mono">
                    {log.new_values ? JSON.stringify(log.new_values) : '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-sans">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
