import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Calendar, Clock, Briefcase, MapPin, Check, X,
  CheckCircle2, AlertCircle, RefreshCw, MessageSquare
} from 'lucide-react';
import { requestsApi } from '../services/api';

export default function AdminRequests() {
  const [activeTab, setActiveTab] = useState('leaves'); // 'leaves' | 'permissions' | 'weekend' | 'visits'
  const [leaves, setLeaves] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [weekendWork, setWeekendWork] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review comment modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [comment, setComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [lRes, pRes, wRes, vRes] = await Promise.all([
        requestsApi.getLeaves(),
        requestsApi.getPermissions(),
        requestsApi.getWeekendWork(),
        requestsApi.getClientVisits()
      ]);
      if (lRes.data.success) setLeaves(lRes.data.requests || []);
      if (pRes.data.success) setPermissions(pRes.data.requests || []);
      if (wRes.data.success) setWeekendWork(wRes.data.records || []);
      if (vRes.data.success) setVisits(vRes.data.visits || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openReview = (item, action) => {
    setSelectedItem(item);
    setReviewAction(action);
    setComment('');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewing(true);
    try {
      if (activeTab === 'leaves') {
        await requestsApi.reviewLeave(selectedItem.id, { status: reviewAction, reviewComment: comment });
      } else if (activeTab === 'permissions') {
        await requestsApi.reviewPermission(selectedItem.id, { status: reviewAction, reviewComment: comment });
      } else if (activeTab === 'weekend') {
        await requestsApi.reviewWeekendWork(selectedItem.id, { status: reviewAction, reviewComment: comment });
      } else if (activeTab === 'visits') {
        await requestsApi.reviewClientVisit(selectedItem.id, { status: reviewAction });
      }
      setReviewModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Workforce Approvals
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Leave, Permission & Work Authorization
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review pending employee requests, grant approvals, or request clarifications.
          </p>
        </div>

        <button
          onClick={loadAll}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'leaves', label: 'Leave Requests', count: leaves.filter(x => x.status === 'PENDING').length, icon: Calendar },
          { id: 'permissions', label: 'Permission Requests', count: permissions.filter(x => x.status === 'PENDING').length, icon: Clock },
          { id: 'weekend', label: 'Weekend Work', count: weekendWork.filter(x => x.status === 'PENDING').length, icon: Briefcase },
          { id: 'visits', label: 'Client Visits', count: visits.filter(x => x.status === 'PENDING').length, icon: MapPin },
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
              {tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'leaves' && leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{l.display_name}</p>
                    <p className="text-[10px] text-slate-500">{l.employee_code} • {l.department_name}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{l.leave_type_name} ({l.total_days} days)</p>
                    <p className="text-[11px] text-slate-500">{l.start_date} to {l.end_date}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                    {l.reason}
                    {l.review_comment && (
                      <p className="text-[10px] text-amber-800 mt-1 italic">Review: "{l.review_comment}"</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      l.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {l.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openReview(l, 'APPROVED')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => openReview(l, 'REJECTED')}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}

              {activeTab === 'permissions' && permissions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{p.display_name}</p>
                    <p className="text-[10px] text-slate-500">{p.employee_code} • {p.department_name}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{p.request_type}</p>
                    <p className="text-[11px] text-slate-500">{p.date} • {p.start_time?.slice(0, 5)} - {p.end_time?.slice(0, 5)} ({p.duration_minutes}m)</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm">{p.reason}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      p.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {p.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openReview(p, 'APPROVED')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => openReview(p, 'REJECTED')}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}

              {activeTab === 'weekend' && weekendWork.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{w.display_name}</p>
                    <p className="text-[10px] text-slate-500">{w.employee_code}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{w.project_name} ({w.total_hours} hrs)</p>
                    <p className="text-[11px] text-slate-500">{w.date}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm">{w.work_description}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      w.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      w.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {w.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openReview(w, 'APPROVED')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => openReview(w, 'REJECTED')}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Dialog Modal */}
      <AnimatePresence>
        {reviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-800"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-900">
                  {reviewAction === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
                </h3>
                <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Employee: <strong className="text-slate-900">{selectedItem?.display_name}</strong>
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Review Comment / Note for Employee
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Optional message..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewing}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-xs cursor-pointer ${
                      reviewAction === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {reviewing ? 'Saving...' : `Confirm ${reviewAction}`}
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
