import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, User, LogOut, Bell, Clock, Menu, X, FileText,
  LayoutDashboard, Flame, ChevronRight
} from 'lucide-react';
import LiveClock from './LiveClock';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../services/api';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, employee, isAdmin, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      notificationsApi.getAll()
        .then(res => {
          if (res.data.success) {
            setNotifications(res.data.notifications || []);
            setUnreadCount((res.data.notifications || []).filter(n => !n.is_read).length);
          }
        })
        .catch(err => console.warn('Could not fetch notifications', err));
    }
  }, [user, location.pathname]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const navLinks = [
    { name: 'Mark Attendance', path: '/', icon: Clock },
    { name: 'Employee Portal', path: '/employee', icon: User },
    { name: 'Work Requests', path: '/requests', icon: FileText },
    ...(isAdmin ? [{ name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Official Logo */}
        <Link to="/" className="flex items-center gap-3.5 group shrink-0">
          <div className="h-11 w-auto flex items-center justify-center transition-transform group-hover:scale-[1.02]">
            <img
              src="/dasa-logo.png"
              alt="DASA TECH — Software Solutions"
              style={{ maxHeight: '42px', height: '42px', width: 'auto', display: 'block' }}
              className="object-contain"
            />
          </div>
          <div className="hidden sm:block border-l border-slate-200 pl-3.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                DASA <span className="text-amber-600 font-bold">TECH</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                Workforce OS
              </span>
            </div>
            <p className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
              Smart Employee Attendance & Real-Time Analytics
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'text-white bg-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{link.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-xl bg-slate-900 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Live Clock, Notifications, Auth */}
        <div className="flex items-center gap-3">
          {/* Live digital clock */}
          <div className="hidden lg:block">
            <LiveClock showDate={true} />
          </div>

          {/* Notifications Drawer */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 p-3 shadow-xl z-50 text-slate-800"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border text-xs transition-colors ${
                              n.is_read
                                ? 'bg-slate-50 border-slate-100 text-slate-500'
                                : 'bg-amber-50/50 border-amber-200/60 text-slate-800 font-medium'
                            }`}
                          >
                            <p className="font-bold text-slate-900">{n.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* User Auth Info or Admin Login Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 pl-2.5 pr-3.5 py-1.5 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-red-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {user.displayName ? user.displayName.charAt(0) : (employee?.displayName?.charAt(0) || 'U')}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {user.displayName || employee?.displayName || 'Active User'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {isAdmin ? 'Super Admin' : (employee?.code || 'Staff')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Sign Out"
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/admin/login"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Login</span>
            </Link>
          )}

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 border border-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg"
          >
            <div className="pb-2 mb-2 border-b border-slate-100">
              <LiveClock showDate={true} />
            </div>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
