import React from 'react';
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
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ role, activeTab, setActiveTab }) => {
  const { logout } = useAuth();

  const studentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'No-Dues Tracker', icon: FileCheck2 },
    { id: 'certificate', label: 'Digital Certificate', icon: Award },
    { id: 'books', label: 'Borrowed Books', icon: BookOpen },
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
    { id: 'settings', label: 'Staff Settings', icon: Settings },
  ];

  const faNav = [
    { id: 'dashboard', label: 'FA Overview', icon: LayoutDashboard },
    { id: 'approvals', label: 'Stage 4 Approval Desk', icon: FileCheck2 },
    { id: 'advisees', label: 'Advisee Student Roster', icon: UserCheck },
    { id: 'reports', label: 'Advisee Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const hodNav = [
    { id: 'dashboard', label: 'HOD Executive Overview', icon: LayoutDashboard },
    { id: 'final_approvals', label: 'Stage 6 Final Approval Desk', icon: Crown },
    { id: 'master_requests', label: 'All Dept Applications', icon: FileCheck2 },
    { id: 'students', label: 'Department Roster', icon: Users },
    { id: 'announcements', label: 'Announcements Publisher', icon: Megaphone },
    { id: 'reports', label: 'Master Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const dpcNav = [
    { id: 'dashboard', label: 'DPC Overview', icon: LayoutDashboard },
    { id: 'approvals', label: 'Stage 5 Career Desk', icon: FileCheck2 },
    { id: 'career_roster', label: 'Student Career Roster', icon: Users },
    { id: 'reports', label: 'Placement Analytics', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  let navItems = studentNav;
  let sectionLabel = 'Student Services';

  if (role === 'library_staff') {
    navItems = libraryNav;
    sectionLabel = 'IT Library Desk';
  } else if (role === 'faculty_advisor') {
    navItems = faNav;
    sectionLabel = 'Faculty Advisor Desk';
  } else if (role === 'hod') {
    navItems = hodNav;
    sectionLabel = 'HOD Executive Desk';
  } else if (role === 'dpc') {
    navItems = dpcNav;
    sectionLabel = 'Placement Coordinator Desk';
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4">
      <div className="space-y-6">
        
        {/* Navigation Section Label */}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
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

        {/* Info Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>SVCE Campus ERP</span>
          </div>
          <p className="text-[11px] text-slate-500">Academic Year 2025 - 2026</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Even Semester Clearance</p>
        </div>

      </div>

      {/* Logout button */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span>Exit ERP Portal</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
