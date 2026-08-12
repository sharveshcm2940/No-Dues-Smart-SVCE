import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import Badge from '../components/common/Badge';
import DataTable from '../components/common/DataTable';
import ReportsExporter from '../components/library/ReportsExporter';
import Modal from '../components/common/Modal';
import { 
  UserCheck, 
  FileCheck2, 
  Users, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  KeyRound, 
  Check, 
  Eye,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Search,
  User,
  ExternalLink
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export const FADashboard = () => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Approval Drawer Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Advisee Student Details Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Hall Ticket Management States
  const [htStudents, setHtStudents] = useState([]);
  const [htStats, setHtStats] = useState({ totalStudents: 0, issuedCount: 0, notIssuedCount: 0 });
  const [htSearchText, setHtSearchText] = useState('');
  const [htStatusFilter, setHtStatusFilter] = useState('ALL');
  const [htNoDuesFilter, setHtNoDuesFilter] = useState('ALL');
  const [htYearFilter, setHtYearFilter] = useState('ALL');
  
  // Confirmation Modal
  const [showHTConfirmModal, setShowHTConfirmModal] = useState(false);
  const [targetHTStudent, setTargetHTStudent] = useState(null);
  const [targetHTAction, setTargetHTAction] = useState('Issued');
  const [htActionRemarks, setHtActionRemarks] = useState('');
  const [htSubmitting, setHtSubmitting] = useState(false);

  // Student Profile Detail Modal
  const [showHTProfileModal, setShowHTProfileModal] = useState(false);
  const [htProfileData, setHtProfileData] = useState(null);
  const [loadingHTProfile, setLoadingHTProfile] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/fa/dashboard');
      if (res.data && res.data.success) {
        setDashboardData(res.data.data);
      } else {
        setDashboardData({ advisor: null, stats: { totalAdvisees: 0, pendingApprovals: 0, approvedCount: 0 }, advisees: [], pendingFARequests: [] });
      }
    } catch (err) {
      console.error('Error fetching FA dashboard:', err);
      setDashboardData({ advisor: null, stats: { totalAdvisees: 0, pendingApprovals: 0, approvedCount: 0 }, advisees: [], pendingFARequests: [] });
    }
  };

  const fetchAssignedStudents = async () => {
    try {
      const res = await api.get('/fa/students');
      if (res.data && res.data.success) {
        setHtStudents(res.data.data.students || []);
        setHtStats(res.data.data.stats || { totalStudents: 0, issuedCount: 0, notIssuedCount: 0 });
      }
    } catch (err) {
      console.error('Error fetching assigned students roster:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      if (res.data && res.data.success) setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchNotifications(), fetchAssignedStudents()]);
      setLoading(false);
    };
    loadAll();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdateHallTicket = async () => {
    if (!targetHTStudent) return;
    setHtSubmitting(true);
    try {
      const res = await api.post('/fa/hall-ticket/update', {
        register_number: targetHTStudent.register_number,
        hall_ticket_status: targetHTAction,
        remarks: htActionRemarks
      });

      if (res.data.success) {
        showAlert(res.data.message, 'success');
        setShowHTConfirmModal(false);
        setTargetHTStudent(null);
        setHtActionRemarks('');
        fetchDashboard();
        fetchAssignedStudents();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error updating Hall Ticket status.', 'danger');
    } finally {
      setHtSubmitting(false);
    }
  };

  const openHTProfileModal = async (regNo) => {
    setShowHTProfileModal(true);
    setLoadingHTProfile(true);
    try {
      const res = await api.get(`/fa/students/${regNo}/detail`);
      if (res.data && res.data.success) {
        setHtProfileData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading student profile detail:', err);
    } finally {
      setLoadingHTProfile(false);
    }
  };

  const filteredHtStudents = htStudents.filter((s) => {
    const matchesSearch = !htSearchText.trim() || 
      s.full_name?.toLowerCase().includes(htSearchText.toLowerCase()) || 
      s.register_number?.toLowerCase().includes(htSearchText.toLowerCase());

    const matchesStatus = htStatusFilter === 'ALL' || s.hall_ticket_status === htStatusFilter;

    const matchesNoDues = htNoDuesFilter === 'ALL' || 
      (htNoDuesFilter === 'Completed' && (s.nodues_status === 'Approved' || s.nodues_status === 'Completed')) ||
      (htNoDuesFilter === 'In Progress' && s.nodues_status === 'In Progress') ||
      (htNoDuesFilter === 'Rejected' && s.nodues_status === 'Rejected');

    const matchesYear = htYearFilter === 'ALL' || s.year === htYearFilter;

    return matchesSearch && matchesStatus && matchesNoDues && matchesYear;
  });

  const handleFAAction = async (action) => {
    if (!selectedRequest) return;
    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      showAlert('Mandatory Remarks Required for Rejection.', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/fa/process-nodues', {
        requestId: selectedRequest.request_id,
        action,
        remarks
      });

      if (res.data.success) {
        showAlert(res.data.message, 'success');
        setShowApprovalModal(false);
        setRemarks('');
        fetchDashboard();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error processing FA action.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSettingsMsg({ type: '', text: '' });
    try {
      const res = await api.post('/auth/password', { currentPassword, newPassword });
      if (res.data.success) {
        setSettingsMsg({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setSettingsMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-xs font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Faculty Advisor (FA) Portal Environment...</span>
        </div>
      </div>
    );
  }

  const {
    advisor = null,
    stats = { totalAdvisees: 0, pendingApprovals: 0, approvedCount: 0 },
    advisees = [],
    pendingFARequests = []
  } = dashboardData || {};

  const handleBulkApprove = () => {
    showConfirm('Are you sure you want to bulk approve all pending No-Dues requests for your assigned advisees?', async () => {
      try {
        const res = await api.post('/fa/bulk-approve');
        if (res.data.success) {
          showAlert(res.data.message);
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error executing bulk FA approval.', 'danger');
      }
    });
  };



  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Header notifications={notifications} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar role="faculty_advisor" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* FA Profile Header Banner */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700 border border-amber-200">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                      FACULTY ADVISOR DESK
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {advisor?.full_name || 'Faculty Advisor'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Emp ID: <strong>{advisor?.employee_id}</strong> | Designation: {advisor?.designation} | Assigned Batch: <strong>{advisor?.assigned_batch}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('approvals')}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Stage 4 Approvals Desk ({stats.pendingApprovals})</span>
                </button>
              </div>

              {/* 3 FA Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Assigned Advisees</span>
                    <Users className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{stats.totalAdvisees}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Students under your advisory</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Pending FA Approvals</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-600">{stats.pendingApprovals}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Awaiting Stage 4 verification</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Approved by FA</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600">{stats.approvedCount}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Cleared to DPC/HOD stages</p>
                </div>
              </div>

              {/* ASSIGNED ADVISEES LIST ON MAIN DASHBOARD */}
              <div className="space-y-3 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-600" />
                      <span>Assigned Advisee Student Details ({advisees.length} Students)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Detailed roster of all students under {advisor?.full_name}'s advisorship ({advisor?.assigned_batch})
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('advisees')}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>View Roster Table</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <DataTable
                  columns={[
                    { 
                      header: 'Register No', 
                      accessor: 'register_number', 
                      cell: (r) => <span className="font-mono font-bold text-brand-600">{r.register_number}</span> 
                    },
                    { 
                      header: 'Student Name', 
                      accessor: 'full_name', 
                      cell: (r) => (
                        <div>
                          <div className="font-bold text-slate-900">{r.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{r.email}</div>
                        </div>
                      ) 
                    },
                    { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                    { header: 'Sec', cell: (r) => <span className="font-semibold text-slate-700">{r.section}</span> },
                    { header: 'Contact Phone', accessor: 'phone', cell: (r) => <span className="text-slate-600 font-mono text-[11px]">{r.phone}</span> },
                    { 
                      header: 'Active Books', 
                      accessor: 'active_books', 
                      cell: (r) => (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          r.active_books > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {r.active_books} Books
                        </span>
                      ) 
                    },
                    { 
                      header: 'Unpaid Fine', 
                      accessor: 'fine_unpaid', 
                      cell: (r) => (
                        <span className={`font-bold ${r.fine_unpaid > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          ₹{r.fine_unpaid}
                        </span>
                      ) 
                    },
                    { 
                      header: 'Clearance Status', 
                      accessor: 'current_stage', 
                      cell: (r) => <Badge>{r.current_stage || 'Not Submitted'}</Badge> 
                    },
                    { 
                      header: 'Action', 
                      cell: (r) => (
                        <button
                          onClick={() => {
                            setSelectedStudent(r);
                            setShowStudentModal(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 border border-slate-200 font-semibold rounded text-[11px] transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-600" />
                          <span>Details</span>
                        </button>
                      ) 
                    }
                  ]}
                  data={advisees}
                  searchPlaceholder="Search advisees by name, roll, email, or section..."
                />
              </div>

              {/* Stage 4 Pending FA Approvals */}
              {pendingFARequests.length > 0 && (
                <div className="space-y-3 bg-white p-5 rounded-lg border border-amber-200 bg-amber-50/20 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Pending Advisee No-Dues Applications (Stage 4 - {pendingFARequests.length} Requests)</span>
                  </h3>

                  <DataTable
                    columns={[
                      { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                      { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                      { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                      { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                      { header: 'Year', accessor: 'year' },
                      { header: 'FA Stage Status', accessor: 'fa_stage_status', cell: (r) => <Badge>{r.fa_stage_status}</Badge> },
                      { 
                        header: 'Action', 
                        cell: (r) => (
                          <button
                            onClick={() => {
                              setSelectedRequest(r);
                              setShowApprovalModal(true);
                            }}
                            className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-xs transition-colors"
                          >
                            Review & Approve
                          </button>
                        ) 
                      }
                    ]}
                    data={pendingFARequests}
                    searchPlaceholder="Search pending advisees..."
                  />
                </div>
              )}

            </div>
          )}

          {/* TAB 2: STAGE 4 APPROVAL DESK */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Faculty Advisor Clearance Desk (Stage 4)</h3>
                  <p className="text-xs text-slate-500">Review student conduct, attendance records, and grant Stage 4 clearance</p>
                </div>

        <button
          onClick={handleBulkApprove}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Bulk Approve All Advisees</span>
        </button>
      </div>

              <DataTable
                columns={[
                  { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                  { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                  { header: 'Request Date', accessor: 'request_date', cell: (r) => <span>{new Date(r.request_date).toLocaleDateString()}</span> },
                  { header: 'Status', accessor: 'fa_stage_status', cell: (r) => <Badge>{r.fa_stage_status}</Badge> },
                  { 
                    header: 'Action', 
                    cell: (r) => (
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setShowApprovalModal(true);
                        }}
                        className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-xs transition-colors"
                      >
                        Action Drawer
                      </button>
                    ) 
                  }
                ]}
                data={pendingFARequests}
                searchPlaceholder="Search by student name or register number..."
              />
            </div>
          )}

          {/* TAB 3: ADVISEE ROSTER */}
          {activeTab === 'advisees' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Assigned Advisee Student Roster ({advisees.length} Students)</h3>
                  <p className="text-xs text-slate-500">View complete details of assigned students under {advisor?.full_name}</p>
                </div>
                <div className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                  Section: {advisor?.assigned_batch}
                </div>
              </div>

              <DataTable
                columns={[
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.register_number}</span> },
                  { 
                    header: 'Student Name', 
                    accessor: 'full_name', 
                    cell: (r) => (
                      <div>
                        <div className="font-bold text-slate-900">{r.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{r.email}</div>
                      </div>
                    ) 
                  },
                  { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                  { header: 'Section', cell: (r) => <span className="font-semibold text-slate-700">{r.section}</span> },
                  { header: 'Phone', accessor: 'phone', cell: (r) => <span className="font-mono text-xs text-slate-600">{r.phone}</span> },
                  { header: 'Active Books', accessor: 'active_books', cell: (r) => <span className={r.active_books > 0 ? 'font-bold text-red-600' : 'text-emerald-600'}>{r.active_books} Books</span> },
                  { header: 'Unpaid Fine', accessor: 'fine_unpaid', cell: (r) => <span className={r.fine_unpaid > 0 ? 'font-bold text-red-600' : 'text-slate-600'}>₹{r.fine_unpaid}</span> },
                  { header: 'Clearance Stage', accessor: 'current_stage', cell: (r) => <span className="font-semibold text-slate-700">{r.current_stage || 'Not Submitted'}</span> },
                  { header: 'Overall Status', accessor: 'nodues_status', cell: (r) => <Badge>{r.nodues_status || 'Not Submitted'}</Badge> },
                  { 
                    header: 'Action', 
                    cell: (r) => (
                      <button
                        onClick={() => {
                          setSelectedStudent(r);
                          setShowStudentModal(true);
                        }}
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded text-xs transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    ) 
                  }
                ]}
                data={advisees}
                searchPlaceholder="Search advisee roster..."
              />
            </div>
          )}

          {/* TAB: STUDENTS / HALL TICKET MANAGEMENT */}
          {activeTab === 'students' && (
            <div className="space-y-6">

              {/* Section Header */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-brand-600" />
                    <span>Hall Ticket Management & Advisee Students Roster</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View all students assigned under your Faculty Advisor responsibility and manually manage Hall Ticket issuance.
                  </p>
                </div>
                <Badge variant="brand">{advisor?.full_name || 'Faculty Advisor'}</Badge>
              </div>

              {/* 3 Summary Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Total Students Card */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Assigned Students</span>
                    <Users className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{htStats.totalStudents}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Total advisees assigned under your care</p>
                </div>

                {/* Hall Tickets Issued Card */}
                <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Hall Tickets Issued</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-700">{htStats.issuedCount}</p>
                  <p className="text-[11px] text-emerald-600 mt-1">Confirmed and issued to students ✅</p>
                </div>

                {/* Hall Tickets Not Issued Card */}
                <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/20 shadow-xs">
                  <div className="flex items-center justify-between text-amber-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Not Issued</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-700">{htStats.notIssuedCount}</p>
                  <p className="text-[11px] text-amber-600 mt-1">Pending manual FA verification ⏳</p>
                </div>

              </div>

              {/* Search & Multi-Filter Control Bar */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  
                  {/* Search Input */}
                  <div className="lg:col-span-2 relative">
                    <input
                      type="text"
                      value={htSearchText}
                      onChange={(e) => setHtSearchText(e.target.value)}
                      placeholder="Search by student name or register number..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-medium focus:bg-white transition-colors"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* Hall Ticket Status Filter */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Hall Ticket Status</label>
                    <select
                      value={htStatusFilter}
                      onChange={(e) => setHtStatusFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Issued">Issued ✅</option>
                      <option value="Not Issued">Not Issued ⏳</option>
                    </select>
                  </div>

                  {/* No Due Status Filter */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">No Due Status</label>
                    <select
                      value={htNoDuesFilter}
                      onChange={(e) => setHtNoDuesFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                    >
                      <option value="ALL">All No-Dues States</option>
                      <option value="Completed">Approved / Completed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Academic Year</label>
                    <select
                      value={htYearFilter}
                      onChange={(e) => setHtYearFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
                    >
                      <option value="ALL">All Years</option>
                      <option value="IV Year">IV Year</option>
                      <option value="III Year">III Year</option>
                      <option value="II Year">II Year</option>
                      <option value="I Year">I Year</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Searchable Student Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <DataTable
                  columns={[
                    { header: 'S.No', cell: (_, index) => <span className="font-mono text-slate-500 font-semibold">{index + 1}</span> },
                    { 
                      header: 'Student Name', 
                      accessor: 'full_name', 
                      cell: (s) => (
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{s.full_name}</div>
                          <div className="text-[11px] text-slate-400">{s.email}</div>
                        </div>
                      ) 
                    },
                    { header: 'Register No', accessor: 'register_number', cell: (s) => <span className="font-mono font-bold text-brand-600">{s.register_number}</span> },
                    { header: 'Dept', accessor: 'department', cell: (s) => <span className="font-semibold text-slate-700">{s.department}</span> },
                    { header: 'Year / Sec', cell: (s) => <span className="font-medium text-slate-700">{s.year} ({s.section})</span> },
                    { 
                      header: 'No Due Status', 
                      cell: (s) => (
                        <Badge variant={s.nodues_status === 'Approved' ? 'success' : (s.nodues_status === 'Rejected' ? 'danger' : 'warning')}>
                          {s.nodues_status || 'Not Submitted'}
                        </Badge>
                      ) 
                    },
                    { 
                      header: 'Hall Ticket Status', 
                      cell: (s) => (
                        <div>
                          {s.hall_ticket_status === 'Issued' ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Issued
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-bold text-[11px] inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Not Issued
                            </span>
                          )}
                          {s.hall_ticket_issued_at && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(s.hall_ticket_issued_at).toLocaleDateString()} {new Date(s.hall_ticket_issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ) 
                    },
                    { 
                      header: 'Action', 
                      cell: (s) => (
                        <div className="flex items-center gap-1.5">
                          {s.hall_ticket_status === 'Issued' ? (
                            <button
                              onClick={() => {
                                setTargetHTStudent(s);
                                setTargetHTAction('Not Issued');
                                setShowHTConfirmModal(true);
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold rounded text-xs transition-colors cursor-pointer"
                            >
                              Revoke Issue
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setTargetHTStudent(s);
                                setTargetHTAction('Issued');
                                setShowHTConfirmModal(true);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark as Issued</span>
                            </button>
                          )}

                          <button
                            onClick={() => openHTProfileModal(s.register_number)}
                            className="px-2 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 border border-slate-200 font-semibold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-brand-600" />
                            <span>Profile</span>
                          </button>
                        </div>
                      ) 
                    }
                  ]}
                  data={filteredHtStudents}
                  searchPlaceholder="Search advisee roster..."
                />
              </div>

            </div>
          )}

          {/* TAB 4: REPORTS */}
          {activeTab === 'reports' && (
            <ReportsExporter />
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl">
              {settingsMsg.text && (
                <div className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                  settingsMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {settingsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{settingsMsg.text}</span>
                </div>
              )}

              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-brand-600" />
                  <span>Update Advisor Account Password</span>
                </h3>

                <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Save New Password
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* HALL TICKET UPDATE CONFIRMATION MODAL */}
      <Modal
        isOpen={showHTConfirmModal}
        onClose={() => setShowHTConfirmModal(false)}
        title={`Confirm Hall Ticket Status Update`}
        maxWidth="max-w-md"
      >
        {targetHTStudent && (
          <div className="space-y-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Confirmation Required</h4>
                <p className="text-amber-800 mt-1 leading-relaxed">
                  Are you sure you want to mark the Hall Ticket as <strong>{targetHTAction}</strong> for student:
                </p>
                <div className="mt-2 bg-white p-2.5 rounded border border-amber-200 font-medium">
                  <div className="font-bold text-slate-900">{targetHTStudent.full_name}</div>
                  <div className="text-slate-600 font-mono">Reg No: {targetHTStudent.register_number} | Sec: {targetHTStudent.section}</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Optional Remarks / Reason</label>
              <input
                type="text"
                value={htActionRemarks}
                onChange={(e) => setHtActionRemarks(e.target.value)}
                placeholder="Enter remarks (e.g. Verified physically, Fees cleared)..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowHTConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateHallTicket}
                disabled={htSubmitting}
                className={`px-4 py-2 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 ${
                  targetHTAction === 'Issued' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm {targetHTAction}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DETAILED STUDENT PROFILE & HALL TICKET AUDIT HISTORY MODAL */}
      <Modal
        isOpen={showHTProfileModal}
        onClose={() => setShowHTProfileModal(false)}
        title={`Student Profile & Audit History - ${htProfileData?.student?.full_name || ''}`}
        maxWidth="max-w-3xl"
      >
        {loadingHTProfile ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading detailed profile & audit history...</div>
        ) : (
          htProfileData?.student && (
            <div className="space-y-6 text-xs">
              
              {/* Student Information */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Student Name</span>
                  <span className="font-bold text-slate-900 text-sm">{htProfileData.student.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Register Number</span>
                  <span className="font-mono font-bold text-brand-600">{htProfileData.student.register_number}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800">{htProfileData.student.department}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Academic Year</span>
                  <span className="font-semibold text-slate-800">{htProfileData.student.year} ({htProfileData.student.section})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                  <span className="font-medium text-slate-700">{htProfileData.student.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</span>
                  <span className="font-medium text-slate-700">{htProfileData.student.phone}</span>
                </div>
              </div>

              {/* Hall Ticket Current Status Info */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Hall Ticket Information</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    htProfileData.student.hall_ticket_status === 'Issued' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {htProfileData.student.hall_ticket_status === 'Issued' ? 'Issued ✅' : 'Not Issued ⏳'}
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="font-semibold block text-slate-500">Issued By:</span>
                    <span className="font-bold text-slate-900">{htProfileData.student.hall_ticket_issued_by || 'N/A'} ({htProfileData.student.hall_ticket_issued_by_emp_id || ''})</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Issued Date & Time:</span>
                    <span className="font-mono text-slate-800">
                      {htProfileData.student.hall_ticket_issued_at 
                        ? `${new Date(htProfileData.student.hall_ticket_issued_at).toLocaleDateString()} ${new Date(htProfileData.student.hall_ticket_issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Hall Ticket Audit History */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-600" />
                  <span>Hall Ticket Audit History ({htProfileData.htAuditLogs?.length || 0})</span>
                </h4>
                {htProfileData.htAuditLogs && htProfileData.htAuditLogs.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {htProfileData.htAuditLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">
                            Status changed from <span className="font-mono">{log.previous_status}</span> to <span className="font-mono font-bold text-brand-600">{log.new_status}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">Updated By: {log.updated_by_name} ({log.updated_by_emp_id}) {log.remarks ? `| Remarks: ${log.remarks}` : ''}</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No hall ticket status change audit history recorded yet.</p>
                )}
              </div>

              {/* No Due Clearance Stages Breakdown */}
              {htProfileData.noduesRequest && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>No-Dues Clearance Stage Breakdown ({htProfileData.noduesRequest.request_number})</span>
                    <Badge variant={htProfileData.noduesRequest.overall_status === 'Approved' ? 'success' : 'warning'}>
                      {htProfileData.noduesRequest.overall_status}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {htProfileData.stages?.map((stage) => (
                      <div key={stage.id} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                        <div className="font-bold text-slate-800 text-[11px]">{stage.department_name}</div>
                        <div className={`text-xs font-bold mt-1 ${
                          stage.status === 'Approved' ? 'text-emerald-700' : (stage.status === 'Rejected' ? 'text-red-600' : 'text-amber-600')
                        }`}>
                          {stage.status}
                        </div>
                        {stage.approved_by && <div className="text-[10px] text-slate-400 mt-0.5 truncate">{stage.approved_by}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )
        )}
      </Modal>

      {/* ADVISEE STUDENT DETAILS MODAL */}
      <Modal isOpen={showStudentModal} onClose={() => setShowStudentModal(false)} title={`Advisee Student Full Profile - ${selectedStudent?.full_name}`}>
        {selectedStudent && (
          <div className="space-y-5 text-xs">
            {/* Header Badge */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-brand-100 border border-brand-200 text-brand-700 flex items-center justify-center font-extrabold text-xl shrink-0">
                {selectedStudent.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900">{selectedStudent.full_name}</h4>
                  <Badge>{selectedStudent.nodues_status || 'Not Submitted'}</Badge>
                </div>
                <p className="text-slate-600 font-mono text-xs">
                  Register Number: <strong className="text-brand-600">{selectedStudent.register_number}</strong> | ID Card: <strong>{selectedStudent.id_card_number}</strong>
                </p>
                <p className="text-slate-500 text-[11px]">
                  {selectedStudent.programme} - {selectedStudent.department} | {selectedStudent.year} ({selectedStudent.semester}, {selectedStudent.section})
                </p>
              </div>
            </div>

            {/* Grid of Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box 1: Academic & Institution */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2.5">
                <h5 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-brand-600" />
                  <span>Academic Details</span>
                </h5>
                <div className="space-y-1.5 text-slate-600">
                  <p><span className="font-semibold text-slate-800">Institution:</span> {selectedStudent.college_name}</p>
                  <p><span className="font-semibold text-slate-800">Department:</span> {selectedStudent.department}</p>
                  <p><span className="font-semibold text-slate-800">Programme:</span> {selectedStudent.programme}</p>
                  <p><span className="font-semibold text-slate-800">Batch:</span> {selectedStudent.batch}</p>
                  <p><span className="font-semibold text-slate-800">Year / Semester:</span> {selectedStudent.year} / {selectedStudent.semester}</p>
                  <p><span className="font-semibold text-slate-800">Section:</span> {selectedStudent.section}</p>
                </div>
              </div>

              {/* Box 2: Contact Information */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2.5">
                <h5 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-brand-600" />
                  <span>Contact Information</span>
                </h5>
                <div className="space-y-1.5 text-slate-600">
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">Email:</span>
                    <a href={`mailto:${selectedStudent.email}`} className="text-brand-600 hover:underline">{selectedStudent.email}</a>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">Phone:</span>
                    <span className="font-mono text-slate-800">{selectedStudent.phone}</span>
                  </p>
                  <p className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">Assigned Advisor:</span>
                    <span>{selectedStudent.advisor_name} ({selectedStudent.advisor_emp_id})</span>
                  </p>
                </div>
              </div>

              {/* Box 3: Library Dues Status */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2.5">
                <h5 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  <span>Library Dues & Books</span>
                </h5>
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Issued Books</span>
                    <span className={`text-base font-extrabold ${selectedStudent.active_books > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedStudent.active_books} Books
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding Fine</span>
                    <span className={`text-base font-extrabold ${selectedStudent.fine_unpaid > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                      ₹{selectedStudent.fine_unpaid}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 4: No-Dues Clearance Stage */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2.5">
                <h5 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Clearance Workflow Status</span>
                </h5>
                <div className="space-y-1.5 text-slate-600">
                  <p><span className="font-semibold text-slate-800">Current Stage:</span> <span className="font-bold text-slate-900">{selectedStudent.current_stage || 'Not Submitted'}</span></p>
                  <p><span className="font-semibold text-slate-800">Overall Status:</span> <Badge>{selectedStudent.nodues_status || 'Not Submitted'}</Badge></p>
                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* FA Stage Approval Modal */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} title={`Stage 4 Faculty Advisor Verification #${selectedRequest?.request_number}`}>
        {selectedRequest && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
              <p><span className="font-semibold text-slate-700">Student Name:</span> {selectedRequest.student_name}</p>
              <p><span className="font-semibold text-slate-700">Register Number:</span> {selectedRequest.register_number}</p>
              <p><span className="font-semibold text-slate-700">Department:</span> {selectedRequest.department} ({selectedRequest.year})</p>
              <p><span className="font-semibold text-slate-700">ID Card No:</span> {selectedRequest.id_card_number}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Faculty Advisor Remarks / Conduct Verification</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter advisor verification remarks (optional for approval, mandatory for rejection)..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <span>If Rejected or Put On Hold, this message will be sent as a notification to <strong>the Student</strong> explaining the reason.</span>
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleFAAction('Hold')}
                disabled={submitting}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-xs"
              >
                Put On Hold
              </button>

              <button
                type="button"
                onClick={() => handleFAAction('Reject')}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Reject Request
              </button>

              <button
                type="button"
                onClick={() => handleFAAction('Approve')}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Stage 4</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default FADashboard;
