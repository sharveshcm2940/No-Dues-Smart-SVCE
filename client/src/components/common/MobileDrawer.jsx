import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePWA } from '../../context/PWAContext';
import SVCELogo from './SVCELogo';
import { 
  X, 
  LogOut, 
  Clock, 
  ShieldCheck, 
  Download, 
  CheckCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export const MobileDrawer = ({ 
  isOpen, 
  onClose, 
  navItems = [], 
  activeTab, 
  onTabSelect, 
  sectionLabel = 'Portal Services' 
}) => {
  const { user, logout } = useAuth();
  const { isInstalled, promptInstall } = usePWA();

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-300">
        
        {/* Top Header & Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <SVCELogo className="h-8" />
              <div className="leading-tight">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block">
                  SVCE ERP
                </span>
                <span className="text-[11px] font-semibold text-slate-700">No-Dues Portal</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          {user && (
            <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-100/80 flex items-center space-x-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                {user.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.full_name}
                </p>
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  {user.username}
                </p>
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                  <span>{user.role?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Download App CTA in drawer */}
          {!isInstalled ? (
            <button
              onClick={() => {
                promptInstall();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-between shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-white animate-bounce" />
                <span>Download Mobile App</span>
              </div>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold">
                PWA
              </span>
            </button>
          ) : (
            <div className="py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Running as Installed App</span>
            </div>
          )}

          {/* Navigation Links */}
          <div className="pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 px-2">
              {sectionLabel}
            </span>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabSelect(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate flex-1">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0"></span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Term Info Card */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Academic Year 2025 - 2026</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium pl-5">
              Even Semester Clearance Period
            </p>
          </div>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Exit ERP Portal</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default MobileDrawer;
