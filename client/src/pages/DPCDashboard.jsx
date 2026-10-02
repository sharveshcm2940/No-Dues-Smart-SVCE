import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import Badge from '../components/common/Badge';
import DataTable from '../components/common/DataTable';
import ReportsExporter from '../components/library/ReportsExporter';
import Modal from '../components/common/Modal';
import AuditLogsViewer from '../components/common/AuditLogsViewer';
import { 
  Building2, 
  FileCheck2, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  KeyRound, 
  Briefcase, 
  GraduationCap, 
  FileSpreadsheet, 
  Lightbulb, 
  ExternalLink,
  Eye,
  FileText,
  Building
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export const DPCDashboard = () => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification Drawer Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pathwayFilter, setPathwayFilter] = useState('ALL');

  // Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' });

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dpc/dashboard');
      if (res.data && res.data.success) {
        setDashboardData(res.data.data);
      } else {
        setDashboardData({ dpc: null, stats: { totalSubmissions: 0, pendingApprovals: 0, approvedCount: 0 }, careerSubmissions: [], pendingDPCRequests: [] });
      }
    } catch (err) {
      console.error('Error fetching DPC dashboard:', err);
      setDashboardData({ dpc: null, stats: { totalSubmissions: 0, pendingApprovals: 0, approvedCount: 0 }, careerSubmissions: [], pendingDPCRequests: [] });
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
      await Promise.all([fetchDashboard(), fetchNotifications()]);
      setLoading(false);
    };
    loadAll();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleDPCAction = async (action) => {
    if (!selectedRequest) return;
    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      showAlert('Mandatory Remarks Required for Rejection.', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/dpc/process-nodues', {
        requestId: selectedRequest.id,
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
      showAlert(err.response?.data?.message || 'Error processing DPC clearance.', 'danger');
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
          <span>Loading Department Placement Coordinator (DPC) Portal...</span>
        </div>
      </div>
    );
  }

  const {
    dpc = null,
    stats = { totalSubmissions: 0, pendingApprovals: 0, approvedCount: 0 },
    careerSubmissions = [],
    pendingDPCRequests = []
  } = dashboardData || {};

  const isDataUrl = (val) => typeof val === 'string' && val.startsWith('data:');

  const getOptionBadgeColor = (opt) => {
    switch (opt) {
      case 'Placements':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Higher Studies':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Competitive Exams':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Entrepreneurship':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSegregatedColumns = (filter) => {
    const commonHeader = [
      { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
      { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
      { 
        header: 'Student Name', 
        accessor: 'student_name', 
        cell: (r) => (
          <div>
            <div className="font-bold text-slate-900">{r.student_name}</div>
            <div className="text-[11px] text-slate-400">{r.section} ({r.year})</div>
          </div>
        ) 
      }
    ];

    const actionColumn = {
      header: 'Action',
      cell: (r) => (
        <button
          onClick={() => {
            setSelectedRequest(r);
            setShowApprovalModal(true);
          }}
          className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Audit Credentials</span>
        </button>
      )
    };

    const statusColumn = { header: 'Status', accessor: 'dpc_stage_status', cell: (r) => <Badge>{r.dpc_stage_status}</Badge> };

    if (filter === 'Placements') {
      return [
        ...commonHeader,
        { header: 'Company Name', accessor: 'company_name', cell: (r) => <span className="font-bold text-blue-900">{r.company_name || 'N/A'}</span> },
        { header: 'Job Designation', accessor: 'job_designation', cell: (r) => <span className="font-medium text-slate-800">{r.job_designation || 'N/A'}</span> },
        { header: 'CTC Package', accessor: 'ctc_package', cell: (r) => <span className="font-semibold text-emerald-700">{r.ctc_package || 'N/A'}</span> },
        { 
          header: 'Offer Letter Proof', 
          cell: (r) => r.offer_letter_url ? (
            <a href={r.offer_letter_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-xs">
              <FileText className="w-3.5 h-3.5" /> Offer Letter
            </a>
          ) : <span className="text-slate-400 text-xs">No file</span>
        },
        statusColumn,
        actionColumn
      ];
    }

    if (filter === 'Higher Studies') {
      return [
        ...commonHeader,
        { header: 'Target University', accessor: 'higher_college_name', cell: (r) => <span className="font-bold text-purple-900">{r.higher_college_name || 'N/A'}</span> },
        { header: 'Degree & Program', accessor: 'higher_degree', cell: (r) => <span className="font-medium text-slate-800">{r.higher_degree || 'N/A'}</span> },
        { 
          header: 'Attached Proofs', 
          cell: (r) => (
            <div className="flex flex-wrap items-center gap-1">
              {r.higher_app_form_url && (
                <a href={r.higher_app_form_url} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded text-[10px] font-bold">App Form</a>
              )}
              {r.higher_scorecard_url && (
                <a href={r.higher_scorecard_url} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded text-[10px] font-bold">Scorecard</a>
              )}
              {r.higher_letter_url && (
                <a href={r.higher_letter_url} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded text-[10px] font-bold">Letter</a>
              )}
              {!r.higher_app_form_url && !r.higher_scorecard_url && !r.higher_letter_url && (
                <span className="text-slate-400 text-xs">No files</span>
              )}
            </div>
          ) 
        },
        statusColumn,
        actionColumn
      ];
    }

    if (filter === 'Competitive Exams') {
      return [
        ...commonHeader,
        { header: 'Exam Name', accessor: 'exam_name', cell: (r) => <span className="font-bold text-amber-900">{r.exam_name || 'N/A'}</span> },
        { header: 'Reg / Roll Details', accessor: 'exam_reg_no', cell: (r) => <span className="font-mono text-slate-800">{r.exam_reg_no || 'N/A'}</span> },
        { header: 'Score / Percentile', accessor: 'exam_details', cell: (r) => <span className="font-medium text-slate-800">{r.exam_details || 'N/A'}</span> },
        { 
          header: 'Proof Documents', 
          cell: (r) => (
            <div className="flex flex-wrap items-center gap-1">
              {r.admit_card_url && (
                <a href={r.admit_card_url} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-[10px] font-bold">Admit/Scorecard</a>
              )}
              {r.exam_letter_url && (
                <a href={r.exam_letter_url} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-[10px] font-bold">Letter Proof</a>
              )}
              {!r.admit_card_url && !r.exam_letter_url && (
                <span className="text-slate-400 text-xs">No files</span>
              )}
            </div>
          ) 
        },
        statusColumn,
        actionColumn
      ];
    }

    if (filter === 'Entrepreneurship') {
      return [
        ...commonHeader,
        { header: 'Startup Entity', accessor: 'startup_name', cell: (r) => <span className="font-bold text-emerald-900">{r.startup_name || 'N/A'}</span> },
        { header: 'Business Idea Summary', accessor: 'business_idea', cell: (r) => <span className="font-medium text-slate-800 truncate max-w-[200px] block">{r.business_idea || 'N/A'}</span> },
        { 
          header: 'Pitch Deck Proof', 
          cell: (r) => r.pitch_deck_url ? (
            <a href={r.pitch_deck_url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-semibold flex items-center gap-1 text-xs">
              <FileText className="w-3.5 h-3.5" /> Pitch Deck
            </a>
          ) : <span className="text-slate-400 text-xs">No deck</span>
        },
        statusColumn,
        actionColumn
      ];
    }

    // Default / ALL
    return [
      ...commonHeader,
      { 
        header: 'Career Pathway', 
        accessor: 'career_option', 
        cell: (r) => (
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getOptionBadgeColor(r.career_option)}`}>
            {r.career_option || 'Not Selected'}
          </span>
        ) 
      },
      { 
        header: 'Key Organization / Details', 
        cell: (r) => (
          <span className="text-slate-700 font-medium text-xs">
            {r.company_name || r.higher_college_name || r.exam_name || r.startup_name || 'N/A'}
          </span>
        ) 
      },
      statusColumn,
      actionColumn
    ];
  };

  const handleBulkApprove = () => {
    showConfirm('Are you sure you want to bulk approve all pending DPC Stage 5 career pathway requests?', async () => {
      try {
        const res = await api.post('/dpc/bulk-approve');
        if (res.data.success) {
          showAlert(res.data.message);
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error executing bulk DPC approval.', 'danger');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-brand-600 selection:text-white">
      <Header notifications={notifications} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar role="dpc" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto pb-24 md:pb-8">

          {/* TAB 1: EXECUTIVE OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* DPC Profile Header Banner */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 font-bold text-lg">
                    DPC
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {dpc?.full_name || 'Department Placement Coordinator'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Emp ID: <strong>{dpc?.employee_id}</strong> | Designation: {dpc?.designation} | Dept: <strong>{dpc?.department}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('approvals')}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Stage 5 Career Desk ({stats.pendingApprovals})</span>
                </button>
              </div>

              {/* 4 Career Pathway Metrics Cards (Interactive Segregation Selectors) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Placements Card */}
                <button
                  type="button"
                  onClick={() => setPathwayFilter(pathwayFilter === 'Placements' ? 'ALL' : 'Placements')}
                  className={`bg-white p-4 rounded-lg border text-left shadow-xs transition-all cursor-pointer ${
                    pathwayFilter === 'Placements'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Option A: Placements</span>
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{stats.placementCount}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Students with verified offer letters</p>
                </button>

                {/* Higher Studies Card */}
                <button
                  type="button"
                  onClick={() => setPathwayFilter(pathwayFilter === 'Higher Studies' ? 'ALL' : 'Higher Studies')}
                  className={`bg-white p-4 rounded-lg border text-left shadow-xs transition-all cursor-pointer ${
                    pathwayFilter === 'Higher Studies'
                      ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20'
                      : 'border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Option B: Higher Studies</span>
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-purple-700">{stats.higherStudiesCount}</p>
                  <p className="text-[11px] text-slate-500 mt-1">MS / M.Tech admit applications</p>
                </button>

                {/* Competitive Exams Card */}
                <button
                  type="button"
                  onClick={() => setPathwayFilter(pathwayFilter === 'Competitive Exams' ? 'ALL' : 'Competitive Exams')}
                  className={`bg-white p-4 rounded-lg border text-left shadow-xs transition-all cursor-pointer ${
                    pathwayFilter === 'Competitive Exams'
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
                      : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Option C: Competitive Exams</span>
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-600">{stats.competitiveExamCount}</p>
                  <p className="text-[11px] text-slate-500 mt-1">GATE / CAT / UPSC scorecards</p>
                </button>

                {/* Entrepreneurship Card */}
                <button
                  type="button"
                  onClick={() => setPathwayFilter(pathwayFilter === 'Entrepreneurship' ? 'ALL' : 'Entrepreneurship')}
                  className={`bg-white p-4 rounded-lg border text-left shadow-xs transition-all cursor-pointer ${
                    pathwayFilter === 'Entrepreneurship'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Option E: Entrepreneurship</span>
                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600">{stats.entrepreneurshipCount}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Registered startups & business ideas</p>
                </button>

              </div>

              {/* STAGE 1 PENDING CAREER VERIFICATION DESK */}
              <div className="space-y-4 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Pending Career Verification Requests ({pendingDPCRequests.filter(r => pathwayFilter === 'ALL' || r.career_option === pathwayFilter).length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review 4th Year student career credentials segregated by Option A, B, C, and E
                    </p>
                  </div>

                  {/* Option Segregation Tab Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPathwayFilter('ALL')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        pathwayFilter === 'ALL'
                          ? 'bg-brand-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Options ({pendingDPCRequests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPathwayFilter('Placements')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        pathwayFilter === 'Placements'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      Option A: Placements ({pendingDPCRequests.filter(r => r.career_option === 'Placements').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPathwayFilter('Higher Studies')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        pathwayFilter === 'Higher Studies'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      Option B: Higher Studies ({pendingDPCRequests.filter(r => r.career_option === 'Higher Studies').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPathwayFilter('Competitive Exams')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        pathwayFilter === 'Competitive Exams'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      Option C: Exams ({pendingDPCRequests.filter(r => r.career_option === 'Competitive Exams').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPathwayFilter('Entrepreneurship')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        pathwayFilter === 'Entrepreneurship'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      Option E: Startup ({pendingDPCRequests.filter(r => r.career_option === 'Entrepreneurship').length})
                    </button>
                  </div>
                </div>

                <DataTable
                  columns={getSegregatedColumns(pathwayFilter)}
                  data={pendingDPCRequests.filter(r => pathwayFilter === 'ALL' || r.career_option === pathwayFilter)}
                  searchPlaceholder="Search by student name, roll number, or organization..."
                />
              </div>

            </div>
          )}

          {/* TAB 2: STAGE 5 APPROVAL DESK */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Stage 5 Department Placement Coordinator Desk</h3>
                  <p className="text-xs text-slate-500">Audit student career documentation (Options A, B, C, E) and grant Stage 5 clearance</p>
                </div>

                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bulk Approve All Placement Requests</span>
                </button>
              </div>

              <DataTable
                columns={[
                  { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                  { 
                    header: 'Career Pathway', 
                    accessor: 'career_option', 
                    cell: (r) => (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getOptionBadgeColor(r.career_option)}`}>
                        {r.career_option || 'Not Selected'}
                      </span>
                    ) 
                  },
                  { header: 'Submission Date', accessor: 'request_date', cell: (r) => <span>{new Date(r.request_date).toLocaleDateString()}</span> },
                  { header: 'Status', accessor: 'dpc_stage_status', cell: (r) => <Badge>{r.dpc_stage_status}</Badge> },
                  { 
                    header: 'Action', 
                    cell: (r) => (
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setShowApprovalModal(true);
                        }}
                        className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Audit Credentials</span>
                      </button>
                    ) 
                  }
                ]}
                data={pendingDPCRequests}
                searchPlaceholder="Search pending requests..."
              />
            </div>
          )}

          {/* TAB 3: STUDENT CAREER ROSTER */}
          {activeTab === 'career_roster' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">4th Year Student Career Roster ({careerSubmissions.length} Students)</h3>
                  <p className="text-xs text-slate-500">Master repository of verified placements, higher studies, exams, and entrepreneurship</p>
                </div>
              </div>

              <DataTable
                columns={[
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.register_number}</span> },
                  { 
                    header: 'Student Name', 
                    accessor: 'student_name', 
                    cell: (r) => (
                      <div>
                        <div className="font-bold text-slate-900">{r.student_name}</div>
                        <div className="text-[11px] text-slate-400">{r.student_email}</div>
                      </div>
                    ) 
                  },
                  { header: 'Sec', cell: (r) => <span className="font-semibold text-slate-700">{r.section}</span> },
                  { 
                    header: 'Career Pathway', 
                    accessor: 'career_option', 
                    cell: (r) => (
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${getOptionBadgeColor(r.career_option)}`}>
                        {r.career_option}
                      </span>
                    ) 
                  },
                  { 
                    header: 'Company / Organization / Details', 
                    cell: (r) => (
                      <span className="font-medium text-slate-800 text-xs">
                        {r.company_name ? `${r.company_name} (${r.ctc_package || ''})` : (r.higher_college_name || r.exam_name || r.startup_name || 'N/A')}
                      </span>
                    ) 
                  },
                  { header: 'Clearance Stage', accessor: 'current_stage', cell: (r) => <span className="font-semibold text-slate-700">{r.current_stage}</span> },
                  { header: 'Overall Status', accessor: 'overall_status', cell: (r) => <Badge>{r.overall_status}</Badge> },
                  { 
                    header: 'Action', 
                    cell: (r) => (
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setShowApprovalModal(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 border border-slate-200 font-semibold rounded text-[11px] transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-600" />
                        <span>View Details</span>
                      </button>
                    ) 
                  }
                ]}
                data={careerSubmissions}
                searchPlaceholder="Search career submissions..."
              />
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
                  <span>Update DPC Account Password</span>
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

          {/* Audit Logs Tab */}
          {activeTab === 'audit_logs' && (
            <AuditLogsViewer role="dpc" title="Department Placement Coordinator Audit & Device Activity Trail" />
          )}

        </main>
      </div>

      {/* CAREER DOCUMENT VERIFICATION DRAWER (MODAL) */}
      <Modal 
        isOpen={showApprovalModal} 
        onClose={() => setShowApprovalModal(false)} 
        title={`Stage 5 Career Verification - ${selectedRequest?.student_name} (${selectedRequest?.register_number})`}
      >
        {selectedRequest && (
          <div className="space-y-5 text-xs">
            
            {/* Student Header */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">{selectedRequest.student_name}</h4>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${getOptionBadgeColor(selectedRequest.career_option)}`}>
                  {selectedRequest.career_option || 'General Application'}
                </span>
              </div>
              <p className="text-slate-600">
                Register No: <strong className="font-mono text-brand-600">{selectedRequest.register_number}</strong> | ID Card: <strong>{selectedRequest.id_card_number}</strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                {selectedRequest.department} ({selectedRequest.year}) | Request ID: <span className="font-mono">{selectedRequest.request_number}</span>
              </p>
            </div>

            {/* DYNAMIC CAREER CREDENTIALS INSPECTION */}
            
            {/* OPTION A: PLACEMENTS */}
            {selectedRequest.career_option === 'Placements' && (
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200 space-y-3">
                <h5 className="font-bold text-blue-900 border-b border-blue-200 pb-1 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Option A: Campus Placement Details</span>
                </h5>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="font-semibold block text-slate-500">Company Name:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedRequest.company_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Job Designation:</span>
                    <span className="font-bold text-slate-900">{selectedRequest.job_designation || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">CTC Package:</span>
                    <span className="font-bold text-emerald-700">{selectedRequest.ctc_package || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500 mb-1">Offer Letter Document:</span>
                    {selectedRequest.offer_letter_url ? (
                      <a 
                        href={selectedRequest.offer_letter_url} 
                        download={isDataUrl(selectedRequest.offer_letter_url) ? `${selectedRequest.student_name}_Offer_Letter` : undefined}
                        target="_blank" 
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 inline-flex shadow-2xs cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View / Download Uploaded Offer Letter</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">No document attached</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* OPTION B: HIGHER STUDIES */}
            {selectedRequest.career_option === 'Higher Studies' && (
              <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-200 space-y-3">
                <h5 className="font-bold text-purple-900 border-b border-purple-200 pb-1 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span>Option B: Higher Studies Admission Details</span>
                </h5>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="font-semibold block text-slate-500">Target University / College:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedRequest.higher_college_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Degree & Specialization:</span>
                    <span className="font-bold text-slate-900">{selectedRequest.higher_degree || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Contact / Reg Info:</span>
                    <span className="font-mono text-slate-800">{selectedRequest.higher_contact || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500 mb-1">Documents Attached:</span>
                    <div className="space-y-1.5">
                      {selectedRequest.higher_app_form_url && (
                        <a 
                          href={selectedRequest.higher_app_form_url} 
                          download={isDataUrl(selectedRequest.higher_app_form_url) ? `${selectedRequest.student_name}_Application_Form` : undefined}
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 inline-flex shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View / Download Application Form
                        </a>
                      )}
                      {selectedRequest.higher_scorecard_url && (
                        <a 
                          href={selectedRequest.higher_scorecard_url} 
                          download={isDataUrl(selectedRequest.higher_scorecard_url) ? `${selectedRequest.student_name}_Scorecard` : undefined}
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 inline-flex shadow-2xs block mt-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View / Download Scorecard
                        </a>
                      )}
                      {selectedRequest.higher_letter_url && (
                        <a 
                          href={selectedRequest.higher_letter_url} 
                          download={isDataUrl(selectedRequest.higher_letter_url) ? `${selectedRequest.student_name}_Supporting_Letter` : undefined}
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 inline-flex shadow-2xs block mt-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View / Download Admission Letter / Proof
                        </a>
                      )}
                      {!selectedRequest.higher_app_form_url && !selectedRequest.higher_scorecard_url && !selectedRequest.higher_letter_url && (
                        <span className="text-slate-400">No documents attached</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OPTION C: COMPETITIVE EXAMS */}
            {selectedRequest.career_option === 'Competitive Exams' && (
              <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200 space-y-3">
                <h5 className="font-bold text-amber-900 border-b border-amber-200 pb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>Option C: Competitive Exam Details</span>
                </h5>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="font-semibold block text-slate-500">Exam Name:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedRequest.exam_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Registration / Roll No:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedRequest.exam_reg_no || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Score & Remarks:</span>
                    <span className="text-slate-800">{selectedRequest.exam_details || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500 mb-1">Attached Documents:</span>
                    <div className="space-y-1">
                      {selectedRequest.admit_card_url && (
                        <a 
                          href={selectedRequest.admit_card_url} 
                          download={isDataUrl(selectedRequest.admit_card_url) ? `${selectedRequest.student_name}_Admit_Card` : undefined}
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 inline-flex shadow-2xs block cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View / Download Scorecard / Admit Card
                        </a>
                      )}
                      {selectedRequest.exam_letter_url && (
                        <a 
                          href={selectedRequest.exam_letter_url} 
                          download={isDataUrl(selectedRequest.exam_letter_url) ? `${selectedRequest.student_name}_Supporting_Letter` : undefined}
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 inline-flex shadow-2xs block mt-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View / Download Supporting Letter / Proof
                        </a>
                      )}
                      {!selectedRequest.admit_card_url && !selectedRequest.exam_letter_url && (
                        <span className="text-slate-400">No documents attached</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OPTION E: ENTREPRENEURSHIP */}
            {selectedRequest.career_option === 'Entrepreneurship' && (
              <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-200 space-y-3">
                <h5 className="font-bold text-emerald-900 border-b border-emerald-200 pb-1 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-emerald-600" />
                  <span>Option E: Entrepreneurship & Startup Venture</span>
                </h5>
                <div className="space-y-2 text-slate-700">
                  <div>
                    <span className="font-semibold block text-slate-500">Startup / Business Name:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedRequest.startup_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Executive Summary / Business Idea:</span>
                    <p className="text-slate-800 bg-white p-2.5 rounded border border-emerald-100 leading-relaxed font-medium">
                      {selectedRequest.business_idea || 'No description provided.'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500 mb-1">Pitch Deck / Incubation Document:</span>
                    {selectedRequest.pitch_deck_url ? (
                      <a 
                        href={selectedRequest.pitch_deck_url} 
                        download={isDataUrl(selectedRequest.pitch_deck_url) ? `${selectedRequest.student_name}_Pitch_Deck` : undefined}
                        target="_blank" 
                        rel="noreferrer" 
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 inline-flex shadow-2xs cursor-pointer"
                      >
                        <FileText className="w-4 h-4" /> View / Download Pitch Deck Document
                      </a>
                    ) : (
                      <span className="text-slate-400">No deck attached</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* GENERAL / NON-4TH YEAR / OTHER CAREER DETAILS FALLBACK */}
            {(!selectedRequest.career_option || !['Placements', 'Higher Studies', 'Competitive Exams', 'Entrepreneurship'].includes(selectedRequest.career_option)) && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <h5 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>General Clearance Application Details</span>
                </h5>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="font-semibold block text-slate-500">Department & Year:</span>
                    <span className="font-bold text-slate-900">{selectedRequest.department || 'N/A'} ({selectedRequest.year || 'N/A'})</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Submission Date:</span>
                    <span className="font-bold text-slate-900">{selectedRequest.request_date ? new Date(selectedRequest.request_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* DPC Verification Remarks Input */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Department Placement Coordinator Verification Remarks *
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter career audit remarks (e.g. Offer letter verified with HR, College admit confirmed)..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <span>If Rejected, this message will be sent as a notification to <strong>the Student and their Faculty Advisor</strong> with the reason.</span>
              </p>
            </div>

            {/* Actions */}
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
                onClick={() => handleDPCAction('Reject')}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Reject Request
              </button>

              <button
                type="button"
                onClick={() => handleDPCAction('Approve')}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Stage 5 DPC Clearance</span>
              </button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};

export default DPCDashboard;
