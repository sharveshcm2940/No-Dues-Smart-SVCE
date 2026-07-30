import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SVCELogo from './SVCELogo';
import { 
  Bell, 
  ShieldCheck, 
  LogOut, 
  User, 
  ChevronDown, 
  CheckCircle2,
  AlertCircle,
  Building2,
  Award,
  Crown
} from 'lucide-react';

export const Header = ({ notifications = [], activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'student':
        return { label: 'Student Portal', icon: User, color: 'bg-brand-50 text-brand-700 border-brand-200' };
      case 'library_staff':
        return { label: 'IT Library Desk', icon: ShieldCheck, color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'faculty_advisor':
        return { label: 'Faculty Advisor (FA)', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'hod':
        return { label: 'Head of Dept (HOD)', icon: Crown, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'dpc':
        return { label: 'Placement Coordinator (DPC)', icon: Building2, color: 'bg-blue-50 text-blue-800 border-blue-200' };
      default:
        return { label: 'SVCE User', icon: User, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & SVCE College Header */}
          <div className="flex items-center space-x-3">
            <div className="h-10 flex items-center">
              <SVCELogo className="h-10" />
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest block">
                NO-DUES CLEARANCE ERP
              </span>
              <p className="text-xs font-semibold text-slate-800">Department of Information Technology</p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-4">
            
            {/* Role Badge Indicator */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border ${roleInfo.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleInfo.label}</span>
            </div>

            {/* Notification Bell with Drawer */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">SVCE ERP Notifications</h4>
                    <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                      {notifications.length} Total
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-2.5">
                            {n.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user?.profile?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {user?.profile?.full_name || user?.username}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {user?.role === 'student' ? user?.username : 'SVCE Staff'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-800">{user?.profile?.full_name}</p>
                    <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
                  </div>
                  
                  {setActiveTab && (
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Account Settings
                    </button>
                  )}

                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Sign Out ERP
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
