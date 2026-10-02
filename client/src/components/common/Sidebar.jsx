import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileCheck2, 
  Award, 
  MessageSquareWarning, 
  Megaphone, 
  Settings, 
  Users, 
  FileText, 
  Clock, 
  LogOut, 
  Crown, 
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from './MobileBottomNav';
import MobileDrawer from './MobileDrawer';

export const Sidebar = ({ role, activeTab, setActiveTab }) => {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Listen for header hamburger menu clicks
  useEffect(() => {
    const handleToggle = () => setMobileMenuOpen(prev => !prev);
    window.addEventListener('toggle-mobile-menu', handleToggle);
    return () => window.removeEventListener('toggle-mobile-menu', handleToggle);
  }, []);

  const studentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'No-Dues Tracker', icon: FileCheck2 },
    { id: 'certificate', label: 'Digital Certificate', icon: Award },
    { id: 'complaints', label: 'Complaint Desk', icon: MessageSquareWarning },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const libraryNav = [
    { id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard },
    { id: 'nodues', label: 'No-Dues Desk', icon: FileCheck2 },
    { id: 'books', label: 'Book Inventory', icon: BookOpen },
    { id: 'students', label: 'Student Directory', icon: Users },
    { id: 'complaints', label: 'Complaint Tickets', icon: MessageSquareWarning },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'reports', label: 'Analytics & Reports', icon: FileText },
    { id: 'audit_logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Staff Settings', icon: Settings },
  ];

  const faNav = [
    { id: 'dashboard', label: 'FA Overview', icon: LayoutDashboard },
    { id: 'approvals', label: 'Stage 4 Approvals', icon: FileCheck2 },
    { id: 'students', label: 'Students & Hall Ticket', icon: UserCheck },
    { id: 'advisees', label: 'Advisee Roster', icon: Users },
    { id: 'reports', label: 'Advisee Reports', icon: FileText },
    { id: 'audit_logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const hodNav = [
    { id: 'dashboard', label: 'HOD Overview', icon: LayoutDashboard },
    { id: 'final_approvals', label: 'Stage 6 Approvals', icon: Crown },
    { id: 'master_requests', label: 'All Applications', icon: FileCheck2 },
    { id: 'students', label: 'Department Roster', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'reports', label: 'Master Reports', icon: FileText },
    { id: 'audit_logs', label: 'System Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const dpcNav = [
    { id: 'dashboard', label: 'DPC Overview', icon: LayoutDashboard },
    { id: 'approvals', label: 'Stage 5 Career Desk', icon: FileCheck2 },
    { id: 'career_roster', label: 'Career Roster', icon: Users },
    { id: 'reports', label: 'Placement Analytics', icon: FileText },
    { id: 'audit_logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const financeNav = [
    { id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard },
    { id: 'clearances', label: 'Stage 1 Finance Desk', icon: FileCheck2 },
    { id: 'reports', label: 'Fee Audit Reports', icon: FileText },
    { id: 'audit_logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Officer Settings', icon: Settings },
  ];

  const mainLibraryNav = [
    { id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard },
    { id: 'clearances', label: 'Stage 2 Central Library', icon: FileCheck2 },
    { id: 'reports', label: 'Central Library Reports', icon: FileText },
    { id: 'audit_logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Library Settings', icon: Settings },
  ];

  let navItems = studentNav;
  let sectionLabel = 'Student Services';

  if (role === 'library_staff') {
    navItems = libraryNav;
    sectionLabel = 'IT Library Desk';
  } else if (role === 'main_library_staff') {
    navItems = mainLibraryNav;
    sectionLabel = 'Central Library Desk';
  } else if (role === 'faculty_advisor') {
    navItems = faNav;
    sectionLabel = 'Faculty Advisor Desk';
  } else if (role === 'hod') {
    navItems = hodNav;
    sectionLabel = 'HOD Executive Desk';
  } else if (role === 'dpc') {
    navItems = dpcNav;
    sectionLabel = 'Placement Coordinator';
  } else if (role === 'finance') {
    navItems = financeNav;
    sectionLabel = 'Finance Clearance Desk';
  }

  return (
    <>
      {/* 1. NATIVE MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav 
        role={role} 
        activeTab={activeTab} 
        onTabSelect={(id) => setActiveTab(id)} 
        onOpenMenu={() => setMobileMenuOpen(true)} 
      />

      {/* 2. MOBILE SLIDE-OVER DRAWER FOR ALL SERVICES & PROFILE */}
      <MobileDrawer 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        navItems={navItems} 
        activeTab={activeTab} 
        onTabSelect={(id) => setActiveTab(id)} 
        sectionLabel={sectionLabel} 
      />

      {/* 3. DESKTOP SIDEBAR (VISIBLE ON md AND UP) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200/90 min-h-[calc(100vh-4rem)] flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">
              {sectionLabel}
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-2xl text-xs shadow-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>SVCE Campus ERP</span>
            </div>
            <p className="text-[11px] text-slate-500">Academic Year 2025 - 2026</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Even Semester Clearance</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Exit ERP Portal</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
