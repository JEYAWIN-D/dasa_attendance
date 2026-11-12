import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import Navbar from './components/Navbar';
import AdminSubNav from './components/AdminSubNav';

// Pages
import AttendanceLanding from './pages/AttendanceLanding';
import EmployeePortal from './pages/EmployeePortal';
import WorkRequests from './pages/WorkRequests';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminEmployees from './pages/AdminEmployees';
import AdminAttendance from './pages/AdminAttendance';
import AdminRequests from './pages/AdminRequests';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';
import AdminAuditLogs from './pages/AdminAuditLogs';

// Admin Route Guard
function ProtectedAdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

// Layout wrapper that conditionally renders AdminSubNav on /admin routes
function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-800">
      <Navbar />
      {isAdminRoute && <AdminSubNav />}

      <main className="flex-1">
        <Routes>
          {/* Main Hero Attendance Marking Screen */}
          <Route path="/" element={<AttendanceLanding />} />

          {/* Employee Self-Service Portal */}
          <Route path="/employee" element={<EmployeePortal />} />

          {/* Work & Attendance Requests Hub */}
          <Route path="/requests" element={<WorkRequests />} />

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Super Admin Protected Pages */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedAdminRoute>
                <AdminEmployees />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedAdminRoute>
                <AdminAttendance />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <ProtectedAdminRoute>
                <AdminRequests />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedAdminRoute>
                <AdminReports />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedAdminRoute>
                <AdminSettings />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedAdminRoute>
                <AdminAuditLogs />
              </ProtectedAdminRoute>
            }
          />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Modern SaaS Footer with Official Logo & Brand Palette */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/dasa-logo.png" alt="DASA TECH" className="h-6 w-auto object-contain" />
            <span className="font-bold text-slate-900 tracking-wider">DASA TECH</span>
            <span className="text-amber-500">•</span>
            <span className="text-slate-500 uppercase font-medium">Software Solutions</span>
          </div>
          <div className="text-slate-500">
            Enterprise Attendance & Workforce Telemetry Platform
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
