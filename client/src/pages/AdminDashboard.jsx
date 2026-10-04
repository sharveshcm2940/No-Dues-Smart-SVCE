import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { AuditLogsViewer } from '../components/common/AuditLogsViewer';
import { useAlert } from '../context/AlertContext';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Settings,
  Upload,
  Download,
  KeyRound,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  Clock,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  HelpCircle,
  IndianRupee,
  Sliders,
  Eye,
  Check
} from 'lucide-react';

export const AdminDashboard = () => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState('users');

  // ==========================================
  // Tab 1: User Management State
  // ==========================================
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // User form
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    full_name: '',
    department: 'Information Technology',
    phone: '',
    id_card_number: '',
    year: 'IV Year',
    section: 'A',
    employee_id: '',
    designation: ''
  });

  // ==========================================
  // Tab 2: System Settings State
  // ==========================================
  const [settings, setSettings] = useState({
    fine_rate_per_day: '5.00',
    fine_grace_days: '0',
    fine_cap_amount: '500.00',
    payment_gateway_mode: 'mock',
    allow_student_self_registration: 'true'
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // ==========================================
  // Tab 3: Bulk Import State
  // ==========================================
  const [importType, setImportType] = useState('students');
  const [importFile, setImportFile] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // ==========================================
  // Tab 5: Complaints Desk State
  // ==========================================
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ assigneeUserId: '', assigneeName: '', assigneeRole: 'library_staff', remarks: '' });
  const [statusForm, setStatusForm] = useState({ status: 'In Progress', reply: '', remarks: '' });

  // ------------------------------------------
  // Data Fetching
  // ------------------------------------------
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: '15'
      });
      if (userSearch.trim()) params.append('search', userSearch.trim());
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data && res.data.success) {
        setUsers(res.data.users || []);
        if (res.data.pagination) {
          setTotalUserPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showAlert({ type: 'error', title: 'Failed to load users', message: err.response?.data?.message || 'Server error' });
    } finally {
      setLoadingUsers(false);
    }
  }, [userPage, userSearch, roleFilter, statusFilter, showAlert]);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get('/admin/settings');
      if (res.data && res.data.success && res.data.settings) {
        const raw = res.data.settings;
        setSettings({
          fine_rate_per_day: raw.fine_rate_per_day?.value || '5.00',
          fine_grace_days: raw.fine_grace_days?.value || '0',
          fine_cap_amount: raw.fine_cap_amount?.value || '500.00',
          payment_gateway_mode: raw.payment_gateway_mode?.value || 'mock',
          allow_student_self_registration: raw.allow_student_self_registration?.value || 'true'
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchComplaints = useCallback(async () => {
    setLoadingComplaints(true);
    try {
      const res = await api.get('/complaints');
      if (res.data && res.data.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'complaints') fetchComplaints();
  }, [activeTab, fetchUsers, fetchSettings, fetchComplaints]);

  // ------------------------------------------
  // User Management Actions
  // ------------------------------------------
  const handleToggleUserStatus = async (user) => {
    const actionName = user.is_active ? 'deactivate' : 'activate';
    const confirmed = await showConfirm({
      title: `${actionName.toUpperCase()} User Account`,
      message: `Are you sure you want to ${actionName} user '${user.username}'? Deactivated users cannot log into the system.`
    });
    if (!confirmed) return;

    try {
      const res = await api.post(`/admin/users/${user.id}/toggle-status`);
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'Status Updated', message: res.data.message });
        fetchUsers();
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Action Failed', message: err.response?.data?.message || 'Server error' });
    }
  };

  const handleUnlockUser = async (user) => {
    try {
      const res = await api.post(`/admin/users/${user.id}/unlock`);
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'Account Unlocked', message: res.data.message });
        fetchUsers();
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Unlock Failed', message: err.response?.data?.message || 'Server error' });
    }
  };

  const handleForcePasswordReset = async (user) => {
    const confirmed = await showConfirm({
      title: 'Force Password Reset',
      message: `Force password reset on next login for '${user.username}'? Existing sessions will be terminated.`
    });
    if (!confirmed) return;

    try {
      const res = await api.post(`/admin/users/${user.id}/force-password-reset`);
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'Reset Flagged', message: res.data.message });
        fetchUsers();
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Action Failed', message: err.response?.data?.message || 'Server error' });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', userFormData);
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'User Created', message: res.data.message });
        setShowCreateModal(false);
        fetchUsers();
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Creation Failed', message: err.response?.data?.message || 'Server error' });
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await api.put(`/admin/users/${selectedUser.id}`, {
        role: userFormData.role,
        full_name: userFormData.full_name,
        email: userFormData.email,
        phone: userFormData.phone,
        department: userFormData.department,
        designation: userFormData.designation
      });
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'User Updated', message: res.data.message });
        setShowEditModal(false);
        fetchUsers();
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || 'Server error' });
    }
  };

  // ------------------------------------------
  // System Settings Actions
  // ------------------------------------------
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.put('/admin/settings', { settings });
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'Settings Saved', message: 'System fine policies and settings updated successfully.' });
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Save Failed', message: err.response?.data?.message || 'Server error' });
    } finally {
      setSavingSettings(false);
    }
  };

  // ------------------------------------------
  // Bulk CSV Import Actions
  // ------------------------------------------
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get(`/admin/bulk-import/template/${importType}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${importType}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showAlert({ type: 'error', title: 'Download Failed', message: 'Failed to download sample template.' });
    }
  };

  const handleRunBulkImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showAlert({ type: 'warning', title: 'File Required', message: 'Please select a CSV file to upload.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    setUploading(true);
    setImportResults(null);
    try {
      const res = await api.post(`/admin/bulk-import/${importType}?dryRun=${isDryRun}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.success) {
        setImportResults(res.data);
        showAlert({
          type: res.data.errorCount > 0 ? 'warning' : 'success',
          title: isDryRun ? 'Dry-Run Preview Complete' : 'Import Complete',
          message: `${res.data.validCount} valid records processed. ${res.data.errorCount} row errors detected.`
        });
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Import Failed', message: err.response?.data?.message || 'Server error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!importResults || !importResults.errors || importResults.errors.length === 0) return;
    const header = 'Row,Identifier,Error Reason\n';
    const csvRows = importResults.errors.map(e => `${e.row},"${e.identifier}","${(e.error || '').replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `import_errors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ------------------------------------------
  // Complaint Actions
  // ------------------------------------------
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      const res = await api.put(`/complaints/${selectedComplaint.id}/assign`, assignForm);
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'Ticket Assigned', message: res.data.message });
        setShowAssignModal(false);
        fetchComplaints();
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Assignment Failed', message: err.response?.data?.message || 'Server error' });
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      const res = await api.put(`/complaints/${selectedComplaint.id}/status`, statusForm);
      if (res.data && res.data.success) {
        showAlert({ type: 'success', title: 'Status Updated', message: 'Ticket status and resolution updated.' });
        setShowStatusModal(false);
        fetchComplaints();
      }
    } catch (err) {
      showAlert({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || 'Server error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          role="admin"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          customNavItems={[
            { id: 'users', label: 'User Directory', icon: Users },
            { id: 'settings', label: 'System Settings', icon: Settings },
            { id: 'bulk-import', label: 'Bulk CSV Import', icon: Upload },
            { id: 'audit-logs', label: 'Audit Trail & Integrity', icon: ShieldCheck },
            { id: 'complaints', label: 'Unified Complaint Desk', icon: MessageSquare }
          ]}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Top Welcome Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-mono font-bold uppercase tracking-wider">
                    Institutional Superuser
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight mt-1 text-white">System Administrator Console</h1>
                <p className="text-xs text-slate-300 mt-1">
                  Manage user accounts, fine policies, bulk student/staff imports, and cryptographically verified audit records.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Role-Based Access Control</span>
                </span>
              </div>
            </div>

            {/* TAB 1: USER MANAGEMENT */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative min-w-[200px] flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search register #, employee ID, email..."
                        value={userSearch}
                        onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(e) => { setRoleFilter(e.target.value); setUserPage(1); }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="student">Student</option>
                      <option value="faculty_advisor">Faculty Advisor</option>
                      <option value="library_staff">Department Library</option>
                      <option value="main_library_staff">Central Library</option>
                      <option value="dpc">DPC (Placement)</option>
                      <option value="finance">Finance Office</option>
                      <option value="hod">HOD Executive</option>
                      <option value="admin">System Administrator</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setUserPage(1); }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                    >
                      <option value="ALL">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="deactivated">Deactivated Only</option>
                      <option value="locked">Locked Accounts</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setUserFormData({
                        username: '',
                        email: '',
                        password: '',
                        role: 'student',
                        full_name: '',
                        department: 'Information Technology',
                        phone: '',
                        id_card_number: '',
                        year: 'IV Year',
                        section: 'A',
                        employee_id: '',
                        designation: ''
                      });
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create User</span>
                  </button>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  {loadingUsers ? (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                      <p className="text-xs">Loading users directory...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <p className="text-sm font-semibold text-slate-700">No Users Found</p>
                      <p className="text-xs mt-1">Try adjusting your search criteria or role filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Identifier / Username</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Account Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.map((u) => {
                            const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
                            return (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                                  <span>{u.username}</span>
                                  {u.must_change_password ? (
                                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-50 text-amber-700 border border-amber-200" title="Password reset required on login">
                                      Reset Req
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-3 px-4 text-slate-600">{u.email}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded font-medium text-[11px] bg-slate-100 text-slate-700">
                                    {u.role}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant={u.is_active ? 'success' : 'danger'}>
                                      {u.is_active ? 'Active' : 'Deactivated'}
                                    </Badge>
                                    {isLocked && (
                                      <Badge variant="warning">
                                        Locked
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                                  {/* Unlock Button */}
                                  {(isLocked || u.failed_login_attempts > 0) && (
                                    <button
                                      onClick={() => handleUnlockUser(u)}
                                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                                      title="Unlock Account"
                                    >
                                      <Unlock className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Force Reset Button */}
                                  <button
                                    onClick={() => handleForcePasswordReset(u)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                    title="Force Password Reset"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>

                                  {/* Edit User Button */}
                                  <button
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setUserFormData({
                                        username: u.username,
                                        email: u.email,
                                        role: u.role,
                                        full_name: u.full_name || '',
                                        department: u.department || 'Information Technology',
                                        phone: u.phone || '',
                                        designation: u.designation || ''
                                      });
                                      setShowEditModal(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit User"
                                  >
                                    <Sliders className="w-4 h-4" />
                                  </button>

                                  {/* Toggle Status Button */}
                                  <button
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={`p-1.5 rounded ${u.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                    title={u.is_active ? 'Deactivate User' : 'Activate User'}
                                  >
                                    {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>Page {userPage} of {totalUserPages}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setUserPage(p => Math.max(1, p - 1))}
                        disabled={userPage <= 1}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                        disabled={userPage >= totalUserPages}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SYSTEM SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6 max-w-3xl">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-indigo-600" />
                    <span>Dynamic Fine Policies & System Parameters</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fine rules are dynamically applied to library and institutional borrow records.
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fine Rate Per Day (₹)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={settings.fine_rate_per_day}
                        onChange={(e) => setSettings({ ...settings, fine_rate_per_day: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                        required
                      />
                      <span className="text-[11px] text-slate-400">Charged per billable overdue day</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.fine_grace_days}
                        onChange={(e) => setSettings({ ...settings, fine_grace_days: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                        required
                      />
                      <span className="text-[11px] text-slate-400">Days before overdue fine begins accumulating</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Fine Cap (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.fine_cap_amount}
                        onChange={(e) => setSettings({ ...settings, fine_cap_amount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                        required
                      />
                      <span className="text-[11px] text-slate-400">Upper cap on overdue fine per book</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Gateway Mode</label>
                      <select
                        value={settings.payment_gateway_mode}
                        onChange={(e) => setSettings({ ...settings, payment_gateway_mode: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium bg-white"
                      >
                        <option value="mock">Mock Gateway (Simulation & Verification)</option>
                        <option value="production">Production Gateway (Live Interface)</option>
                      </select>
                      <span className="text-[11px] text-slate-400">Select online checkout processor</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: BULK IMPORT */}
            {activeTab === 'bulk-import' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                        <span>Bulk CSV Data Ingestion & Upsert</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload student rosters, staff credentials, and borrow records with dry-run schema validation.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Download Sample Template</span>
                    </button>
                  </div>

                  <form onSubmit={handleRunBulkImport} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Dataset Entity</label>
                        <select
                          value={importType}
                          onChange={(e) => { setImportType(e.target.value); setImportResults(null); }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium bg-white"
                        >
                          <option value="students">Students Roster</option>
                          <option value="staff">Department Staff & Officers</option>
                          <option value="borrow_records">Library Borrow Records</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Execution Mode</label>
                        <div className="flex items-center gap-3 h-9">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="dryRun"
                              checked={isDryRun}
                              onChange={() => setIsDryRun(true)}
                              className="text-indigo-600"
                            />
                            <span>Dry-Run Preview (Validate only)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="dryRun"
                              checked={!isDryRun}
                              onChange={() => setIsDryRun(false)}
                              className="text-indigo-600"
                            />
                            <span>Live Upsert (Save to Database)</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Select CSV File (Max 5MB)</label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setImportFile(e.target.files[0] || null)}
                        className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={uploading || !importFile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{uploading ? 'Processing CSV...' : (isDryRun ? 'Run Dry-Run Preview' : 'Execute Live Import')}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Import Results Card */}
                {importResults && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {importResults.dryRun ? 'Dry-Run Validation Report' : 'Import Execution Summary'}
                      </h3>
                      {importResults.errors && importResults.errors.length > 0 && (
                        <button
                          onClick={handleDownloadErrorReport}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Error Report ({importResults.errors.length})</span>
                        </button>
                      )}
                    </div>

                    {/* Stats Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-slate-500 font-medium">Total Rows</span>
                        <p className="text-lg font-bold text-slate-900">{importResults.totalRows}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-emerald-700 font-medium">Valid Rows</span>
                        <p className="text-lg font-bold text-emerald-800">{importResults.validCount}</p>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <span className="text-blue-700 font-medium">{importResults.dryRun ? 'Ready for Insert' : 'Created / Updated'}</span>
                        <p className="text-lg font-bold text-blue-800">
                          {importResults.dryRun ? importResults.validCount : `${importResults.createdCount || 0} / ${importResults.updatedCount || 0}`}
                        </p>
                      </div>
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="text-rose-700 font-medium">Errors</span>
                        <p className="text-lg font-bold text-rose-800">{importResults.errorCount}</p>
                      </div>
                    </div>

                    {/* Error Table */}
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="border border-rose-200 rounded-xl overflow-hidden mt-4">
                        <div className="bg-rose-50 px-4 py-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                          Row Validation Issues
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3">Row</th>
                                <th className="py-2 px-3">Identifier</th>
                                <th className="py-2 px-3">Error Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importResults.errors.map((err, idx) => (
                                <tr key={idx} className="hover:bg-rose-50/50">
                                  <td className="py-2 px-3 font-mono font-bold text-slate-800">{err.row}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-700">{err.identifier}</td>
                                  <td className="py-2 px-3 text-rose-600">{err.error}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: AUDIT LOGS & TAMPER CHECK */}
            {activeTab === 'audit-logs' && (
              <AuditLogsViewer role="admin" title="Institutional Audit Trail & Cryptographic Verification" />
            )}

            {/* TAB 5: COMPLAINT DESK */}
            {activeTab === 'complaints' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Unified Institutional Complaint Desk</h2>
                    <p className="text-xs text-slate-500">Review, assign, and resolve student grievance tickets across all clearance departments.</p>
                  </div>
                  <button
                    onClick={fetchComplaints}
                    className="p-2 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                    title="Refresh Tickets"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  {loadingComplaints ? (
                    <div className="p-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                      <p className="text-xs mt-2">Loading complaints...</p>
                    </div>
                  ) : complaints.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <p className="text-sm font-semibold text-slate-700">No Complaints Logged</p>
                      <p className="text-xs mt-1">Grievances filed by students will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Ticket ID</th>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Department</th>
                            <th className="py-3 px-4">Title</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Assignee</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {complaints.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-indigo-600">{c.complaint_id}</td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-900">{c.student_name}</p>
                                <p className="text-[11px] text-slate-400">{c.register_number}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded font-medium text-[11px] bg-indigo-50 text-indigo-700">
                                  {c.department}
                                </span>
                              </td>
                              <td className="py-3 px-4 max-w-xs truncate" title={c.title}>
                                {c.title}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={c.status === 'Resolved' ? 'success' : (c.status === 'Open' ? 'warning' : 'primary')}>
                                  {c.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-medium">
                                {c.assigned_to || 'Unassigned'}
                              </td>
                              <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setSelectedComplaint(c);
                                    setAssignForm({
                                      assigneeUserId: c.assigned_to_user_id || '',
                                      assigneeName: c.assigned_to || '',
                                      assigneeRole: c.assigned_to_role || 'library_staff',
                                      remarks: ''
                                    });
                                    setShowAssignModal(true);
                                  }}
                                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                                >
                                  Assign
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedComplaint(c);
                                    setStatusForm({
                                      status: c.status === 'Open' ? 'In Progress' : 'Resolved',
                                      reply: c.reply || '',
                                      remarks: ''
                                    });
                                    setShowStatusModal(true);
                                  }}
                                  className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-medium"
                                >
                                  Update Status
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Username / Register #</label>
              <input
                type="text"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Temporary Password</label>
              <input
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">User Role</label>
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                <option value="student">Student</option>
                <option value="faculty_advisor">Faculty Advisor</option>
                <option value="library_staff">Department Library</option>
                <option value="main_library_staff">Central Library</option>
                <option value="dpc">DPC (Placement)</option>
                <option value="finance">Finance Office</option>
                <option value="hod">HOD Executive</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                value={userFormData.full_name}
                onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={userFormData.department}
                onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={userFormData.phone}
                onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Profile: ${selectedUser?.username}`}
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role Assignment</label>
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                <option value="student">Student</option>
                <option value="faculty_advisor">Faculty Advisor</option>
                <option value="library_staff">Department Library</option>
                <option value="main_library_staff">Central Library</option>
                <option value="dpc">DPC (Placement)</option>
                <option value="finance">Finance Office</option>
                <option value="hod">HOD Executive</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={userFormData.full_name}
                onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={userFormData.department}
                onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Update User
            </button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN COMPLAINT MODAL */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Complaint: ${selectedComplaint?.complaint_id}`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assignee Staff User ID</label>
            <input
              type="number"
              value={assignForm.assigneeUserId}
              onChange={(e) => setAssignForm({ ...assignForm, assigneeUserId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g. 5"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assignee Full Name</label>
            <input
              type="text"
              value={assignForm.assigneeName}
              onChange={(e) => setAssignForm({ ...assignForm, assigneeName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g. Dr. Librarian Incharge"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={assignForm.remarks}
              onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Assignment instructions..."
            />
          </div>
          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* UPDATE COMPLAINT STATUS MODAL */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Update Status: ${selectedComplaint?.complaint_id}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Status</label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-white"
            >
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Resolution Reply</label>
            <textarea
              rows={3}
              value={statusForm.reply}
              onChange={(e) => setStatusForm({ ...statusForm, reply: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Formal response to the student explaining the resolution..."
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Audit Remarks</label>
            <input
              type="text"
              value={statusForm.remarks}
              onChange={(e) => setStatusForm({ ...statusForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Internal notes for audit log..."
            />
          </div>
          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowStatusModal(false)}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
            >
              Update Ticket
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AdminDashboard;
