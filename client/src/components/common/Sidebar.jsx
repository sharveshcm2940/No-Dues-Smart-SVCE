import React, { useState } from 'react';
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
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ role, activeTab, setActiveTab }) => {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const studentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'No-Dues Tracker', icon: FileCheck2 },
    { id: 'certificate', label: 'Digital Certificate', icon: Award },
    { id: 'complaints', label: 'Complaint Desk', icon: MessageSquareWarning },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const libraryNav = [
    { id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard },
    { id: 'nodues', label: 'No-Dues Desk', icon: FileCheck2 },
    { id: 'books', label: 'Book Inventory', icon: BookOpen },
    { id: 'students', label: 'Student Directory', icon: Users },
    { id: 'complaints', label: 'Complaint Tickets', icon: MessageSquareWarning },
    { id: 'reports', label: 'Analytics & Reports', icon: FileText },
    { id: 'settings', label: 'Staff Settings', icon: Settings },
  ];

  const faNav = [
    { id: 'dashboard', label: 'FA Overview', icon: LayoutDashboard },
    { id: 'approvals', label: 'Stage 4 Approvals', icon: FileCheck2 },
    { id: 'students', label: 'Students & Hall Ticket', icon: UserCheck },
    { id: 'advisees', label: 'Advisee Roster', icon: Users },
    { id: 'reports', label: 'Advisee Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const hodNav = [
    { id: 'dashboard', label: 'HOD Overview', icon: LayoutDashboard },
    { id: 'final_approvals', label: 'Stage 6 Approvals', icon: Crown },
    { id: 'master_requests', label: 'All Applications', icon: FileCheck2 },
    { id: 'students', label: 'Department Roster', icon: Users },
    { id: 'faculty_management', label: 'Faculty & Advisors', icon: UserCheck },
    { id: 'reports', label: 'Master Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const dpcNav = [
    { id: 'dashboard', label: 'DPC Overview', icon: LayoutDashboard },
    { id: 'approvals', label: 'Stage 5 Career Desk', icon: FileCheck2 },
    { id: 'career_roster', label: 'Career Roster', icon: Users },
    { id: 'reports', label: 'Placement Analytics', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const financeNav = [
    { id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard },
    { id: 'clearances', label: 'Stage 1 Finance Desk', icon: FileCheck2 },
    { id: 'reports', label: 'Fee Audit Reports', icon: FileText },
    { id: 'settings', label: 'Officer Settings', icon: Settings },
  ];

  const mainLibraryNav = [
    { id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard },
    { id: 'clearances', label: 'Stage 2 Central Library', icon: FileCheck2 },
    { id: 'reports', label: 'Central Library Reports', icon: FileText },
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

  const handleTabClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* 1. MOBILE TOP HORIZONTAL NAVIGATION STRIP (VISIBLE ONLY ON MOBILE < md) */}
      <div className="md:hidden w-full bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto sticky top-16 z-20 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[calc(100%-3rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Full Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex-shrink-0 border border-slate-200 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. MOBILE DRAWER SLIDE-OVER OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600">
                  {sectionLabel}
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Exit ERP Portal</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* 3. DESKTOP SIDEBAR (VISIBLE ON md AND UP) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
              <Clock className="w-3.5 h-3.5 text-brand-600" />
              <span>SVCE Campus ERP</span>
            </div>
            <p className="text-[11px] text-slate-500">Academic Year 2025 - 2026</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Even Semester Clearance</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
