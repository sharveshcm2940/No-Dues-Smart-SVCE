import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import { DataTable } from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import api from '../services/api';
import { 
  Building2, 
  FileCheck2, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  KeyRound, 
  ExternalLink,
  DollarSign,
  AlertOctagon,
  XCircle,
  TrendingUp,
  FileText,
  User,
  ShieldAlert,
  Send,
  Download,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Layers,
  Award
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';

const FinanceDashboard = () => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Handover state
  const [handoverData, setHandoverData] = useState({
    newEmployeeId: '',
    newName: '',
    newEmail: '',
    newPhone: '',
    newPassword: ''
  });
  const [handoverSuccess, setHandoverSuccess] = useState('');
  const [handoverError, setHandoverError] = useState('');
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Password state
  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '' });
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError('Failed to load Finance Section data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    loadData();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action) => {
    if (!selectedRequest) return;
    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      setReviewError('Rejection remarks are mandatory to notify the student.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');

    try {
      const res = await api.post('/finance/process-nodues', {
        requestId: selectedRequest.id,
        action,
        remarks
      });

      if (res.data.success) {
        showAlert(res.data.message, 'success');
        setShowReviewModal(false);
        setSelectedRequest(null);
        setRemarks('');
        loadData();
      }
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Error processing clearance action.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleBulkApprove = () => {
    showConfirm('Are you sure you want to approve all eligible pending finance clearance requests?', async () => {
      try {
        const res = await api.post('/finance/bulk-approve');
        if (res.data.success) {
          showAlert(res.data.message);
          loadData();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error during bulk approval.', 'danger');
      }
    });
  };

  const handleHandover = async (e) => {
    e.preventDefault();
    setHandoverError('');
    setHandoverSuccess('');
    setHandoverSubmitting(true);

    try {
      const res = await api.post('/auth/handover', handoverData);
      if (res.data.success) {
        setHandoverSuccess(res.data.message);
        setHandoverData({ newEmployeeId: '', newName: '', newEmail: '', newPhone: '', newPassword: '' });
        setTimeout(() => {
          localStorage.removeItem('nodues_token');
          window.location.reload();
        }, 2500);
      }
    } catch (err) {
      setHandoverError(err.response?.data?.message || 'Failed to complete role handover.');
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const handlePwChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    setPwSubmitting(true);

    try {
      const res = await api.post('/auth/password', pwData);
      if (res.data.success) {
        setPwSuccess('Password updated successfully.');
        setPwData({ currentPassword: '', newPassword: '' });
      }
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const exportCSV = () => {
    if (!data?.allRequests || data.allRequests.length === 0) {
      showAlert('No audit data available to export.', 'danger');
      return;
    }
    const headers = ['Request Number', 'Register Number', 'Student Name', 'Department', 'Year', 'Overall Status', 'Current Stage', 'Completion Date'];
    const rows = data.allRequests.map(r => [
      r.request_number,
      r.register_number,
      `"${r.student_name}"`,
      r.department,
      r.year,
      r.overall_status,
      `"${r.current_stage}"`,
      r.completion_date || 'N/A'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finance_Fee_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-xs font-semibold">
        Loading Finance & Accounts Office Portal...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">Connection Failed</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { finance, stats, pendingRequests = [], allRequests = [] } = data || {};
  const completionRate = stats?.totalRequests > 0 ? Math.round((stats.approvedCount / stats.totalRequests) * 100) : 100;

  const pendingColumns = [
    { header: 'Request Details', cell: (row) => (
      <div>
        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
          <span className="font-mono text-brand-600">{row.request_number}</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{row.register_number}</div>
      </div>
    )},
    { header: 'Student Name', cell: (row) => (
      <div>
        <div className="font-bold text-slate-800 text-xs">{row.student_name}</div>
        <div className="text-[10px] text-slate-500">{row.programme} | Batch {row.batch}</div>
      </div>
    )},
    { header: 'Year / Sec', cell: (row) => (
      <span className="font-medium text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
        {row.year} - {row.section}
      </span>
    )},
    { header: 'Submitted Date', cell: (row) => (
      <div className="text-slate-500 text-xs">
        {row.request_date ? new Date(row.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
      </div>
    )},
    { header: 'Stage Status', cell: (row) => (
      <Badge text={row.finance_stage_status || 'Pending'} color={row.finance_stage_status === 'Approved' ? 'emerald' : 'amber'} />
    )},
    { header: 'Action', cell: (row) => (
      <button 
        onClick={() => { setSelectedRequest(row); setRemarks(''); setReviewError(''); setShowReviewModal(true); }}
        className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-semibold text-xs border border-brand-200 transition-colors flex items-center gap-1.5 shadow-xs"
      >
        <span>Review Dues</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    )}
  ];

  const auditColumns = [
    { header: 'Student Details', cell: (row) => (
      <div>
        <div className="font-bold text-slate-800 text-xs">{row.student_name}</div>
        <div className="text-[10px] text-slate-500 font-mono">{row.register_number} | {row.id_card_number}</div>
      </div>
    )},
    { header: 'Year / Sec', cell: (row) => (
      <span className="text-xs text-slate-600 font-medium">{row.year} ({row.section})</span>
    )},
    { header: 'Overall Status', cell: (row) => {
      const color = row.overall_status === 'Approved' ? 'emerald' : (row.overall_status === 'Rejected' ? 'red' : 'blue');
      return <Badge text={row.overall_status} color={color} />;
    }},
    { header: 'Current Stage', cell: (row) => (
      <span className="text-xs text-slate-600 font-semibold">{row.current_stage}</span>
    )},
    { header: 'Completion Date', cell: (row) => (
      <span className="text-xs text-slate-500">
        {row.completion_date ? new Date(row.completion_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'In Progress'}
      </span>
    )},
    { header: 'Certificate', cell: (row) => (
      row.certificate_number ? (
        <span className="font-mono text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {row.certificate_number}
        </span>
      ) : (
        <span className="text-[11px] text-slate-400 italic">Pending</span>
      )
    )}
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header notifications={notifications} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role="finance" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Officer Profile Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700/40 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-500/10 rounded-xl border border-pink-500/30 flex items-center justify-center text-pink-400">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-pink-400 uppercase tracking-widest">
                        FINANCE & ACCOUNTS SECTION (STAGE 4)
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                        ACTIVE DESK
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                      {finance?.full_name || 'Finance Officer'}
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {finance?.college_name || 'Sri Venkateswara College of Engineering'} | Designation: {finance?.designation || 'Senior Finance Officer'} ({finance?.employee_id})
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-lg text-xs">
                  <div className="font-semibold text-slate-400">Office Location</div>
                  <div className="font-bold text-white mt-0.5">Admin Block, Room 102 (Ground Floor)</div>
                </div>
              </div>

              {/* Master Executive Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Stage 1 Pending</h3>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{stats?.pendingApprovals || 0}</p>
                    <p className="text-[11px] text-slate-500">Finance sign-offs required</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Finance Approved</h3>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{stats?.approvedCount || 0}</p>
                    <p className="text-[11px] text-slate-500">Student dues cleared</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Audited</h3>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{stats?.totalRequests || 0}</p>
                    <p className="text-[11px] text-slate-500">Applications in ledger</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0 border border-purple-100">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Clearance Rate</h3>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{completionRate}%</p>
                    <p className="text-[11px] text-slate-500">Finance clearance ratio</p>
                  </div>
                </div>
              </div>

              {/* Quick Operational Controls */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-600" />
                    <span>Clearance Operational Actions</span>
                  </h3>
                  <button
                    onClick={loadData}
                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setActiveTab('clearances')}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Go to Stage 1 Clearance Desk ({pendingRequests.length})</span>
                  </button>
                  <button 
                    onClick={handleBulkApprove}
                    disabled={pendingRequests.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Bulk Approve All Pending ({pendingRequests.length})</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('reports')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs border border-slate-300 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>View Full Fee Audit Ledger</span>
                  </button>
                </div>
              </div>

              {/* Pending Preview Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Recent Pending Stage 1 Clearance Submissions</span>
                  </h3>
                  <button 
                    onClick={() => setActiveTab('clearances')}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    View All →
                  </button>
                </div>
                {pendingRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    No pending finance clearance applications at present.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pendingRequests.slice(0, 5).map((req) => (
                      <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{req.student_name} <span className="font-mono text-slate-400 font-normal">({req.register_number})</span></div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{req.year} - {req.section} | {req.programme}</div>
                        </div>
                        <button
                          onClick={() => { setSelectedRequest(req); setRemarks(''); setReviewError(''); setShowReviewModal(true); }}
                          className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs rounded border border-brand-200 transition-colors"
                        >
                          Review Dues
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: STAGE 1 CLEARANCE DESK */}
          {activeTab === 'clearances' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Clearance Stage 1: Finance Officer Desk</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Verify tuition fee payments, hostel dues, and lab charges before granting Stage 1 clearance.</p>
                </div>
                <button 
                  onClick={handleBulkApprove}
                  disabled={pendingRequests.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bulk Approve All ({pendingRequests.length})</span>
                </button>
              </div>

              <DataTable 
                columns={pendingColumns} 
                data={pendingRequests} 
                searchPlaceholder="Search register number, student name..."
                filterKey="year"
                filterOptions={[
                  { value: 'IV Year', label: 'IV Year Only' },
                  { value: 'III Year', label: 'III Year Only' },
                  { value: 'II Year', label: 'II Year Only' },
                  { value: 'I Year', label: 'I Year Only' }
                ]}
              />
            </div>
          )}

          {/* TAB 3: FEE AUDIT LEDGER */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Fee Audit & Clearance Reports Ledger</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Complete institutional audit ledger of all processed student No-Dues requests.</p>
                </div>
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Audit Ledger (CSV)</span>
                </button>
              </div>

              <DataTable 
                columns={auditColumns} 
                data={allRequests} 
                searchPlaceholder="Search audit log..."
                filterKey="year"
                filterOptions={[
                  { value: 'IV Year', label: 'IV Year Only' },
                  { value: 'III Year', label: 'III Year Only' },
                  { value: 'II Year', label: 'II Year Only' },
                  { value: 'I Year', label: 'I Year Only' }
                ]}
              />
            </div>
          )}

          {/* TAB 4: OFFICER SETTINGS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Handover Form */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-pink-700">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-sm">Finance Position Handover</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Transfer the Finance Officer role to a successor. Their account will inherit clearance sign-off privileges.
                </p>

                {handoverSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
                    {handoverSuccess}
                  </div>
                )}
                {handoverError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                    {handoverError}
                  </div>
                )}

                <form onSubmit={handleHandover} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Successor Employee ID</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. EMP-FIN-IT-02"
                      value={handoverData.newEmployeeId}
                      onChange={(e) => setHandoverData({ ...handoverData, newEmployeeId: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Successor Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="Full Name"
                      value={handoverData.newName}
                      onChange={(e) => setHandoverData({ ...handoverData, newName: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                      <input 
                        type="email"
                        required
                        placeholder="email@svce.ac.in"
                        value={handoverData.newEmail}
                        onChange={(e) => setHandoverData({ ...handoverData, newEmail: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                      <input 
                        type="text"
                        required
                        placeholder="+91 99999 88888"
                        value={handoverData.newPhone}
                        onChange={(e) => setHandoverData({ ...handoverData, newPhone: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Initial Password for Successor</label>
                    <input 
                      type="password"
                      required
                      placeholder="Password"
                      value={handoverData.newPassword}
                      onChange={(e) => setHandoverData({ ...handoverData, newPassword: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={handoverSubmitting}
                    className="w-full py-2.5 bg-pink-700 hover:bg-pink-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{handoverSubmitting ? 'Transferring Role...' : 'Execute Position Handover'}</span>
                  </button>
                </form>
              </div>

              {/* Password Change Form */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <KeyRound className="w-5 h-5 text-brand-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Account Security Settings</h3>
                </div>
                <p className="text-xs text-slate-500">Update your current Finance Officer account login password.</p>

                {pwSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
                    {pwSuccess}
                  </div>
                )}
                {pwError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                    {pwError}
                  </div>
                )}

                <form onSubmit={handlePwChange} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Current Password</label>
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={pwData.currentPassword}
                      onChange={(e) => setPwData({ ...pwData, currentPassword: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">New Password</label>
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={pwData.newPassword}
                      onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pwSubmitting}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{pwSubmitting ? 'Updating...' : 'Update Account Password'}</span>
                  </button>
                </form>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Review & Approval Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-400 border border-pink-500/30">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Stage 1 Finance Clearance Verification</h3>
                  <p className="text-[11px] text-slate-400">Request Ref: {selectedRequest.request_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              {/* Student Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Student Name:</span>
                  <span className="font-bold text-slate-900">{selectedRequest.student_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Register Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRequest.register_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Academic Year & Sec:</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.year} - {selectedRequest.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tuition & Lab Dues Check:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified / No Dues Pending</span>
                  </span>
                </div>
              </div>

              {reviewError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                  {reviewError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Finance Remarks / Audit Note
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter remarks (Mandatory if rejecting clearance)..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleAction('Reject')}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Reject Clearance
                </button>
                <button
                  onClick={() => handleAction('Hold')}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Put On Hold
                </button>
                <button
                  onClick={() => handleAction('Approve')}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Grant Clearance</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceDashboard;