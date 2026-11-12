import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, FileText, Download, Filter, Search,
  Calendar, Users, Printer, RefreshCw, BarChart2, CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportsApi, employeeApi, adminApi } from '../services/api';

export default function AdminReports() {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [reportType, setReportType] = useState('all'); // all | late | early | overtime | absent
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getReport({
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        departmentId: departmentId || undefined,
        employeeId: employeeId || undefined,
        status: status || undefined
      });

      if (res.data.success) {
        setReportData(res.data.records || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.warn('Reports error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([adminApi.getDepartments(), employeeApi.getPublicList()]).then(([dRes, eRes]) => {
      if (dRes.data.success) setDepartments(dRes.data.departments || []);
      if (eRes.data.success) setEmployees(eRes.data.employees || []);
    });
  }, []);

  useEffect(() => {
    fetchReports();
  }, [reportType, startDate, endDate, departmentId, employeeId, status]);

  const handleExportExcel = () => {
    const url = reportsApi.exportExcelUrl({
      reportType,
      startDate: startDate || '',
      endDate: endDate || '',
      departmentId: departmentId || '',
      employeeId: employeeId || '',
      status: status || ''
    });
    window.open(url, '_blank');
  };

  const handleExportCsv = () => {
    const url = reportsApi.exportCsvUrl({
      reportType,
      startDate: startDate || '',
      endDate: endDate || '',
      departmentId: departmentId || '',
      employeeId: employeeId || '',
      status: status || ''
    });
    window.open(url, '_blank');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    // Clean DASA TECH Header Branding
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DASA TECH — EMPLOYEE ATTENDANCE REPORT', 40, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | Filter Category: ${reportType.toUpperCase()}`, 40, 48);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    const summaryText = `Total Records: ${summary.totalRecords || 0} | Present: ${summary.totalPresent || 0} | Late Arrivals: ${summary.totalLate || 0} | Total Hours Logged: ${summary.totalHours || 0} hrs`;
    doc.text(summaryText, 40, 85);

    const tableRows = reportData.map((r) => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      r.employee_code,
      r.display_name,
      r.department_name || '-',
      r.shift_name || 'General',
      r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      r.total_working_minutes ? (r.total_working_minutes / 60).toFixed(1) + ' hrs' : '-',
      r.status,
      r.nickname || '-'
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Date', 'Code', 'Employee Name', 'Department', 'Shift', 'Check-In', 'Check-Out', 'Hours', 'Status', 'Nickname']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
      margin: { left: 40, right: 40 }
    });

    doc.save(`DASA_TECH_Attendance_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Workforce Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Attendance Reports & Multi-Format Exports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Query verified database records, inspect departmental ratios, and download audit-ready Excel, CSV, or PDF reports.
          </p>
        </div>

        {/* 1-Click Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PDF Print</span>
          </button>
        </div>
      </div>

      {/* Report Types Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'All Records' },
          { id: 'late', label: 'Late Arrivals (Chopplangi)' },
          { id: 'early', label: 'Early Arrivals (Minnal Murali)' },
          { id: 'overtime', label: 'Overtime & Late-Night' },
          { id: 'absent', label: 'Absence & Leave' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              reportType === tab.id
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">Employee</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.display_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setDepartmentId('');
              setEmployeeId('');
              setStatus('');
            }}
            className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Entries</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary.totalRecords || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Present</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{summary.totalPresent || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase">Late Arrivals</span>
          <p className="text-xl font-bold text-amber-700 mt-1">{summary.totalLate || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-cyan-200 bg-cyan-50/30 shadow-xs">
          <span className="text-[10px] font-bold text-cyan-700 uppercase">Early Birds</span>
          <p className="text-xl font-bold text-cyan-700 mt-1">{summary.totalEarly || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Hours Logged</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{summary.totalHours || 0} hrs</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Hours</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Nickname</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-semibold">
                    {new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {r.display_name} <span className="font-normal text-[10px] text-slate-400">({r.employee_code})</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.department_name || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{r.shift_name}</td>
                  <td className="py-3 px-4 text-slate-800">
                    {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-emerald-700 font-bold">
                    {r.total_working_minutes ? `${(r.total_working_minutes / 60).toFixed(1)} hrs` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      r.status === 'LATE' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-amber-800">
                    {r.nickname || '-'}
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No matching records found for the selected query filters.
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
