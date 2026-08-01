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
  Send
} from 'lucide-react';

const FinanceDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

  useEffect(() => {
    loadData();
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

  const handleBulkApprove = async () => {
    if (!window.confirm('Are you sure you want to approve all eligible pending finance clearance requests?')) return;
    try {
      const res = await api.post('/finance/bulk-approve');
      if (res.data.success) {
        alert(res.data.message);
        loadData();
      }
    } catch (err) {
      alert('Error during bulk approval.');
    }
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
        }, 3000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-xs font-semibold">Loading SVCE Finance ERP Panel...</p>
        </div>
      </div>
    );
  }

  const { finance, stats, allRequests, pendingRequests } = data || {};

  const pendingColumns = [
    { header: 'Student Details', cell: (row) => (
      <div>
        <div className="font-bold text-slate-800">{row.student_name}</div>
        <div className="text-[10px] text-slate-500">{row.register_number} | {row.id_card_number}</div>
      </div>
    )},
    { header: 'Year / Sec', cell: (row) => (
      <div className="font-medium text-slate-700">{row.year} - {row.section}</div>
    )},
    { header: 'Submitted Date', cell: (row) => (
      <div className="text-slate-500">{new Date(row.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    )},
    { header: 'Current Stage', cell: (row) => <Badge text={row.current_stage} color="amber" /> },
    { header: 'Action', cell: (row) => (
      <button 
        onClick={() => { setSelectedRequest(row); setShowReviewModal(true); }}
        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md font-semibold text-xs border border-brand-200 transition-colors flex items-center gap-1"
      >
        <span>Review</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    )}
  ];

  const auditColumns = [
    { header: 'Student Details', cell: (row) => (
      <div>
        <div className="font-bold text-slate-800">{row.student_name}</div>
        <div className="text-[10px] text-slate-500">{row.register_number} | {row.id_card_number}</div>
      </div>
    )},
    { header: 'Year', accessor: 'year' },
    { header: 'Overall Status', cell: (row) => {
      const color = row.overall_status === 'Approved' ? 'emerald' : (row.overall_status === 'Rejected' ? 'red' : 'blue');
      return <Badge text={row.overall_status} color={color} />;
    }},
    { header: 'Completion Date', cell: (row) => (
      <span className="text-slate-500">
        {row.completion_date ? new Date(row.completion_date).toLocaleDateString('en-IN') : 'N/A'}
      </span>
    )}
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar role="finance" activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700/30 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div>
                  <h2 className="text-xl font-bold">Finance & Accounts Office</h2>
                  <p className="text-slate-300 text-xs mt-1">Officer: <strong className="text-pink-300">{finance?.full_name}</strong> | Designation: <strong>{finance?.designation}</strong></p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-lg text-xs">
                  <div className="font-semibold text-slate-400">Section Location</div>
                  <div className="font-bold text-white mt-0.5">Admin Block, Ground Floor</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Pending Finance Clearances</h3>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.pendingApprovals}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Approved Clearances</h3>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.approvedCount}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600 shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Audited Student Submissions</h3>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{stats?.totalRequests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Clearance Operational Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setActiveTab('clearances')}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Go to Pending Approvals Desk</span>
                  </button>
                  <button 
                    onClick={handleBulkApprove}
                    disabled={pendingRequests.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Bulk Approve All Eligible</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clearances' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Clearance Stage 1: Finance Approval Desk</h2>
                  <p className="text-slate-500 text-xs">Verify students who have submitted their clearance forms. Dues check required.</p>
                </div>
                <button 
                  onClick={handleBulkApprove}
                  disabled={pendingRequests.length === 0}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bulk Sign-off</span>
                </button>
              </div>

              <DataTable 
                columns={pendingColumns} 
                data={pendingRequests} 
                searchPlaceholder="Search by student register number, name..."
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

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-800">Fee Audit & Clearance Reports Ledger</h2>
                <p className="text-slate-500 text-xs">Comprehensive log of students who have processed No-Dues requests in this term.</p>
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

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-red-700">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Role Handover / Position Transfer</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Transfer command of the Finance Clearance Officer role. All clearance approvals, logs, and account ownership will immediately transfer to the incoming officer.
                </p>

                {handoverSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{handoverSuccess}</span>
                  </div>
                )}
                {handoverError && (
                  <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    <span>{handoverError}</span>
                  </div>
                )}

                <form onSubmit={handleHandover} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Officer Employee ID (Username) *</label>
                    <input 
                      type="text" 
                      value={handoverData.newEmployeeId}
                      onChange={(e) => setHandoverData({...handoverData, newEmployeeId: e.target.value})}
                      placeholder="e.g. EMP-FIN-IT-02" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Officer Full Name *</label>
                    <input 
                      type="text" 
                      value={handoverData.newName}
                      onChange={(e) => setHandoverData({...handoverData, newName: e.target.value})}
                      placeholder="e.g. Gurusamy M" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Email Address *</label>
                    <input 
                      type="email" 
                      value={handoverData.newEmail}
                      onChange={(e) => setHandoverData({...handoverData, newEmail: e.target.value})}
                      placeholder="new.officer@svce.ac.in" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Phone Number *</label>
                    <input 
                      type="text" 
                      value={handoverData.newPhone}
                      onChange={(e) => setHandoverData({...handoverData, newPhone: e.target.value})}
                      placeholder="+91 94440 22336" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password for New Officer *</label>
                    <input 
                      type="password" 
                      value={handoverData.newPassword}
                      onChange={(e) => setHandoverData({...handoverData, newPassword: e.target.value})}
                      placeholder="Set initial login password" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={handoverSubmitting}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
                  >
                    {handoverSubmitting ? 'Transferring Role Control...' : 'Confirm Role Handover'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 h-fit">
                <div className="flex items-center gap-2 text-slate-700">
                  <KeyRound className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Security & Password Management</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Modify the access credentials for the current active Finance Officer session.
                </p>

                {pwSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{pwSuccess}</span>
                  </div>
                )}
                {pwError && (
                  <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    <span>{pwError}</span>
                  </div>
                )}

                <form onSubmit={handlePwChange} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Password *</label>
                    <input 
                      type="password" 
                      value={pwData.currentPassword}
                      onChange={(e) => setPwData({...pwData, currentPassword: e.target.value})}
                      placeholder="••••••••" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Access Password *</label>
                    <input 
                      type="password" 
                      value={pwData.newPassword}
                      onChange={(e) => setPwData({...pwData, newPassword: e.target.value})}
                      placeholder="Enter new password" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={pwSubmitting}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
                  >
                    {pwSubmitting ? 'Saving Password...' : 'Save New Password'}
                  </button>
                </form>
              </div>

            </div>
          )}

        </main>
      </div>

      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Review Fee Accounts Clearance #{selectedRequest.request_number}</h3>
              <button 
                onClick={() => { setShowReviewModal(false); setSelectedRequest(null); setRemarks(''); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs">
              {reviewError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 font-semibold rounded-lg flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  <span>{reviewError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-slate-400 font-semibold text-[10px] uppercase">Student Name</span>
                  <span className="font-bold text-slate-800">{selectedRequest.student_name}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold text-[10px] uppercase">Register Number</span>
                  <span className="font-bold text-slate-800">{selectedRequest.register_number}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold text-[10px] uppercase">Year & Section</span>
                  <span className="font-bold text-slate-800">{selectedRequest.year} - {selectedRequest.section}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold text-[10px] uppercase">Department / Course</span>
                  <span className="font-bold text-slate-800">{selectedRequest.programme}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Clearance verification remarks</label>
                <textarea 
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks/reason for hold or rejection (mandatory if rejecting)..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                />
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>If Rejected or Put On Hold, this message will be sent as a real-time notification to the Student and Faculty Advisor explaining the reason.</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => { setShowReviewModal(false); setSelectedRequest(null); setRemarks(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={() => handleAction('Hold')}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-sm"
                >
                  Put On Hold
                </button>
                <button
                  onClick={() => handleAction('Reject')}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => handleAction('Approve')}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Clear</span>
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