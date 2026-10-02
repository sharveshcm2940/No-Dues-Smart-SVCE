import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SVCELogo from './SVCELogo';
import InstallAppButton from './InstallAppButton';
import api from '../../services/api';
import { formatTime } from '../../utils/dateUtils';
import { 
  Bell, 
  ShieldCheck, 
  LogOut, 
  User, 
  ChevronDown, 
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Info,
  Building2,
  Award,
  Crown,
  CheckCheck,
  Menu
} from 'lucide-react';

export const Header = ({ notifications: propNotifications = null, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);

  // Fetch real-time notifications every 4 seconds
  const fetchLiveNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      if (res.data.success) {
        setLiveNotifications(res.data.notifications || []);
      }
    } catch (err) {
      // Silent catch for background polling
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchLiveNotifications();

    const token = localStorage.getItem('nodues_token');
    let eventSource;

    if (token) {
      const hostname = window.location.hostname;
      const sseUrl = `http://${hostname}:5000/api/sse?token=${token}`;

      try {
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification' || data.type === 'nodues_update' || data.type === 'hallticket_update') {
              fetchLiveNotifications();
            }
          } catch (e) {
            // Heartbeat
          }
        };

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
        };
      } catch (e) {
        console.error('SSE Stream Error:', e);
      }
    }

    const interval = setInterval(fetchLiveNotifications, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [user]);

  const activeNotifications = propNotifications && propNotifications.length > 0 ? propNotifications : liveNotifications;
  const unreadCount = activeNotifications.filter(n => !n.is_read).length;

  const markAllAsRead = () => {
    setLiveNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'student':
        return { label: 'Student Portal', icon: User, color: 'bg-brand-50 text-brand-700 border-brand-200' };
      case 'library_staff':
        return { label: 'IT Library Desk', icon: ShieldCheck, color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'main_library_staff':
        return { label: 'Central Library Desk', icon: ShieldCheck, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'faculty_advisor':
        return { label: 'Faculty Advisor (FA)', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'hod':
        return { label: 'Head of Dept (HOD)', icon: Crown, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'dpc':
        return { label: 'Placement Coordinator (DPC)', icon: Building2, color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'finance':
        return { label: 'Finance Section', icon: ShieldCheck, color: 'bg-pink-50 text-pink-800 border-pink-200' };
      default:
        return { label: 'SVCE User', icon: User, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Brand & SVCE College Header */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile Navigation Drawer Trigger */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-menu'))}
              className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            <div className="h-8 sm:h-10 flex items-center">
              <SVCELogo className="h-8 sm:h-10" />
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest block">
                NO-DUES CLEARANCE ERP
              </span>
              <p className="text-xs font-semibold text-slate-800">Department of Information Technology</p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Download Web App Button / Desktop App Badge */}
            <InstallAppButton variant="header" />

            {/* Role Badge Indicator */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleInfo.label}</span>
            </div>

            {/* Notification Bell with Real-time Drawer */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
                title="Real-Time Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  {/* Backdrop for mobile click-away */}
                  <div 
                    className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs" 
                    onClick={() => setShowNotifications(false)} 
                  />

                  <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-0 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-brand-600" />
                        SVCE ERP Notifications
                      </h4>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-full font-bold transition-colors flex items-center gap-1 active:scale-95"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>Mark read</span>
                          </button>
                        )}
                        <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-medium">
                          {activeNotifications.length} live
                        </span>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                      {activeNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-slate-400 text-xs font-medium">No notifications available.</p>
                        </div>
                      ) : (
                        activeNotifications.map((n) => {
                          const isDanger = n.type === 'danger';
                          const isWarning = n.type === 'warning';
                          const isSuccess = n.type === 'success';

                          return (
                            <div 
                              key={n.id || Math.random()} 
                              className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                {isDanger && <XCircle className="w-4 h-4 text-red-600" />}
                                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                                {!isSuccess && !isDanger && !isWarning && <Info className="w-4 h-4 text-blue-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-xs font-bold text-slate-900 truncate">{n.title}</h5>
                                  <span className="text-[10px] text-slate-400">
                                    {formatTime(n.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors active:scale-95"
              >
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {user?.full_name ? user.full_name.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <span className="text-xs font-bold text-slate-900 block leading-none">
                    {user?.full_name || 'SVCE User'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    {user?.username}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {showUserMenu && (
                <>
                  {/* Backdrop for click-away */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)} 
                  />

                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{user?.username}</p>
                      <p className="text-[10px] text-blue-600 font-semibold uppercase mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
                    </div>
                    
                    <button
                      onClick={logout}
                      className="w-full px-4 py-2.5 text-left text-xs text-red-600 hover:bg-red-50 font-semibold transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Exit ERP Portal</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
