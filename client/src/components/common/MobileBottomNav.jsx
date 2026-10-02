import React from 'react';
import { 
  LayoutDashboard, 
  FileCheck2, 
  Award, 
  MessageSquareWarning, 
  Menu, 
  BookOpen, 
  FileText, 
  Users, 
  UserCheck, 
  Crown, 
  Settings 
} from 'lucide-react';

export const MobileBottomNav = ({ role, activeTab, onTabSelect, onOpenMenu }) => {
  const getBottomNavItems = () => {
    switch (role) {
      case 'student':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'requests', label: 'Tracker', icon: FileCheck2 },
          { id: 'certificate', label: 'Certificate', icon: Award },
          { id: 'complaints', label: 'Desk', icon: MessageSquareWarning },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
      case 'library_staff':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'nodues', label: 'No-Dues', icon: FileCheck2 },
          { id: 'books', label: 'Books', icon: BookOpen },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
      case 'main_library_staff':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'clearances', label: 'Clearance', icon: FileCheck2 },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
      case 'faculty_advisor':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'approvals', label: 'Approvals', icon: FileCheck2 },
          { id: 'students', label: 'Hall Ticket', icon: UserCheck },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
      case 'hod':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'final_approvals', label: 'Stage 6', icon: Crown },
          { id: 'master_requests', label: 'All Apps', icon: FileCheck2 },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
      case 'dpc':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'approvals', label: 'Approvals', icon: FileCheck2 },
          { id: 'career_roster', label: 'Roster', icon: Users },
          { id: 'reports', label: 'Analytics', icon: FileText },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
      case 'finance':
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'clearances', label: 'Clearances', icon: FileCheck2 },
          { id: 'reports', label: 'Audit', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
      default:
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: '__menu__', label: 'Menu', icon: Menu, isMenu: true },
        ];
    }
  };

  const navItems = getBottomNavItems();

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isMenu && activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isMenu) {
                  onOpenMenu();
                } else {
                  onTabSelect(item.id);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-90 group relative ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {/* Active top pill indicator */}
              {isActive && (
                <span className="absolute -top-1.5 w-8 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-xs animate-in fade-in zoom-in-75 duration-200"></span>
              )}

              <div className={`p-1 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-blue-50/90 text-blue-600' : 'group-hover:bg-slate-50'
              }`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'
                }`} />
              </div>

              <span className={`text-[10px] tracking-tight mt-0.5 transition-all duration-150 ${
                isActive ? 'font-bold text-blue-700' : 'font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
