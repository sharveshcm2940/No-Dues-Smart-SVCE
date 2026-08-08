import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import Badge from '../components/common/Badge';
import DataTable from '../components/common/DataTable';
import NoDuesTracker from '../components/student/NoDuesTracker';
import DigitalCertificate from '../components/student/DigitalCertificate';
import ComplaintModal from '../components/student/ComplaintModal';
import { 
  User, 
  BookOpen, 
  IndianRupee, 
  ShieldCheck, 
  Award, 
  FileCheck2, 
  Clock, 
  Plus, 
  MessageSquareWarning, 
  Megaphone, 
  UserCheck, 
  Phone, 
  Mail, 
  KeyRound, 
  Camera, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export const StudentDashboard = () => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [borrowRecords, setBorrowRecords] = useState({ activeBooks: [], history: [] });
  const [complaints, setComplaints] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [autoOpenModal, setAutoOpenModal] = useState(false);

  // Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' });

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/student/dashboard');
      if (res.data.success) {
        setDashboardData(res.data.data);
        if (res.data.data.profile) {
          setPhoneInput(res.data.data.profile.phone || '');
          setPhotoUrlInput(res.data.data.profile.photo_url || '');
        }
      }
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    }
  };

  const fetchBorrowRecords = async () => {
    try {
      const res = await api.get('/student/borrow-records');
      if (res.data.success) setBorrowRecords(res.data.data);
    } catch (err) {
      console.error('Error fetching borrow records:', err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/student/complaints');
      if (res.data.success) setComplaints(res.data.complaints);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/student/announcements');
      if (res.data.success) setAnnouncements(res.data.announcements);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      if (res.data.success) setNotifications(res.data.notifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchBorrowRecords(),
        fetchComplaints(),
        fetchAnnouncements(),
        fetchNotifications()
      ]);
      setLoading(false);
    };
    loadAll();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleNewApplicationClick = () => {
    const studentYear = dashboardData?.profile?.year || '';
    const isFourthYear = studentYear.includes('IV') || 
                         studentYear.includes('4th') || 
                         studentYear.includes('Fourth') || 
                         studentYear === 'IV Year';

    if (isFourthYear) {
      showAlert('As a Final Year (4th Year) student, please submit your mandatory Career Pathway details (Placements / Higher Studies / Competitive Exams / Entrepreneurship) for Stage 5 DPC clearance.', 'info');
    }
    setAutoOpenModal(true);
    setActiveTab('requests');
  };

  const handleSubmitRequest = async (payload = {}) => {
    // Called with { refreshOnly: true } after re-submission — just refresh data
    if (payload.refreshOnly) {
      fetchDashboard();
      return;
    }
    try {
      const res = await api.post('/student/request-nodues', payload);
      if (res.data.success) {
        showAlert(res.data.message, 'success');
        fetchDashboard();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error submitting No-Dues request.', 'danger');
    }
  };

  const handleCancelRequest = (requestId) => {
    showConfirm('Are you sure you want to cancel this pending No-Dues application?', async () => {
      try {
        const res = await api.post('/student/cancel-nodues', { requestId });
        if (res.data.success) {
          showAlert(res.data.message || 'No-Dues application cancelled successfully.');
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error cancelling request.', 'danger');
      }
    });
  };

  const handleCreateComplaint = async (payload) => {
    const res = await api.post('/student/complaints', payload);
    if (res.data.success) {
      fetchComplaints();
      showAlert('Complaint ticket registered successfully!', 'success');
    } else {
      throw new Error(res.data.message);
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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSettingsMsg({ type: '', text: '' });
    try {
      const res = await api.put('/student/profile', { phone: phoneInput, photoUrl: photoUrlInput });
      if (res.data.success) {
        setSettingsMsg({ type: 'success', text: 'Profile details updated!' });
        fetchDashboard();
      }
    } catch (err) {
      setSettingsMsg({ type: 'error', text: 'Failed to update profile.' });
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-xs font-semibold">
        Loading ERP Student Portal Environment...
      </div>
    );
  }

  const { profile, metrics, activeRequest, stages } = dashboardData;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header notifications={notifications} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar role="student" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Welcome Card Banner */}
              <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-lg p-6 text-white shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-200">
                      STUDENT clearance DESK
                    </span>
                    <h2 className="text-xl font-bold tracking-tight mt-0.5">
                      Welcome back, {profile.full_name}!
                    </h2>
                    <p className="text-xs text-brand-100 mt-1 max-w-2xl leading-relaxed">
                      Department of Information Technology | Programme: {profile.programme} ({profile.batch}) | Current: {profile.year}, {profile.semester} ({profile.section})
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg border border-white/20 text-right">
                    <p className="text-[11px] text-brand-200 font-medium">Clearance Status</p>
                    <p className="text-sm font-extrabold uppercase tracking-wide text-white mt-0.5">
                      {metrics.overallStatus}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 ERP Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Pending Returns</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{metrics.pendingBooks}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Books to be returned</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Current Fine</span>
                    <IndianRupee className="w-4 h-4 text-red-600" />
                  </div>
                  <p className={`text-2xl font-extrabold ${metrics.currentFine > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ₹{metrics.currentFine}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Library overdue fines</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Dept Library Status</span>
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="mt-1">
                    <Badge>{metrics.deptLibraryStatus}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">IT Dept Library verification</p>
                </div>
              </div>

              {/* Profile Card & Faculty Advisor Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Student Profile Card */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-600" />
                    <span>Academic Student Profile</span>
                  </h3>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="w-16 h-16 rounded-lg bg-brand-50 border border-brand-200 flex-shrink-0 flex items-center justify-center font-black text-brand-700 text-xl shadow-2xs">
                      {profile.full_name.charAt(0)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs flex-1">
                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Student Name</span>
                        <p className="font-bold text-slate-900 text-sm">{profile.full_name}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Register Number</span>
                        <p className="font-mono font-bold text-brand-600">{profile.register_number}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">ID Card Number</span>
                        <p className="font-mono font-semibold text-slate-800">{profile.id_card_number}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Department</span>
                        <p className="font-semibold text-slate-800">{profile.department}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Batch / Academic Year</span>
                        <p className="font-semibold text-slate-800">{profile.batch} ({profile.year})</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Semester & Section</span>
                        <p className="font-semibold text-slate-800">{profile.semester} - {profile.section}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Email Address</span>
                        <p className="font-medium text-slate-700">{profile.email}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Contact Phone</span>
                        <p className="font-medium text-slate-700">{profile.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Faculty Advisor Details Card */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-brand-600" />
                    <span>Faculty Advisor Details</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Advisor Name</span>
                      <p className="font-bold text-slate-900">{profile.advisor_name}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Employee ID</span>
                      <p className="font-mono font-semibold text-slate-700">{profile.advisor_emp_id}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Email Address</span>
                      <p className="font-medium text-slate-700">{profile.advisor_email}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Phone Number</span>
                      <p className="font-medium text-slate-700">{profile.advisor_phone}</p>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-semibold inline-block">
                        Assigned IT Department Advisor
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* No-Dues Quick Status Card */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No-Dues Application Status</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeRequest ? `Active Request #${activeRequest.request_number}` : 'No active application submitted.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleNewApplicationClick}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Submit New Application</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>View Live Clearance Tracker</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LIVE NO-DUES TRACKER */}
          {activeTab === 'requests' && (
            <NoDuesTracker
              activeRequest={activeRequest}
              stages={stages}
              profile={profile}
              onSubmitRequest={handleSubmitRequest}
              onCancelRequest={handleCancelRequest}
              autoOpenModal={autoOpenModal}
              onClearAutoOpenModal={() => setAutoOpenModal(false)}
            />
          )}

          {/* TAB 3: DIGITAL NO-DUES CERTIFICATE */}
          {activeTab === 'certificate' && (
            <DigitalCertificate 
              activeRequest={activeRequest} 
              profile={profile} 
              approvedCertificates={dashboardData?.approvedCertificates || []}
            />
          )}



          {/* TAB 5: COMPLAINT DESK */}
          {activeTab === 'complaints' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Support & Complaint Ticket Center</h3>
                  <p className="text-xs text-slate-500">Register library or no-dues complaints for staff assistance</p>
                </div>

                <button
                  onClick={() => setShowComplaintModal(true)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Ticket</span>
                </button>
              </div>

              <DataTable
                columns={[
                  { header: 'Ticket ID', accessor: 'complaint_id', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.complaint_id}</span> },
                  { header: 'Category', accessor: 'category', cell: (r) => <span className="font-semibold text-slate-700">{r.category}</span> },
                  { header: 'Subject Title', accessor: 'title', cell: (r) => <span className="font-bold text-slate-800">{r.title}</span> },
                  { header: 'Priority', accessor: 'priority', cell: (r) => <span className={r.priority === 'High' ? 'font-bold text-red-600' : 'text-slate-600'}>{r.priority}</span> },
                  { header: 'Status', accessor: 'status', cell: (r) => <Badge>{r.status}</Badge> },
                  { header: 'Official Reply', accessor: 'reply', cell: (r) => <span className="text-slate-600 italic">{r.reply || 'Pending staff review'}</span> },
                  { header: 'Date', accessor: 'created_at', cell: (r) => <span className="text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span> }
                ]}
                data={complaints}
                searchPlaceholder="Search complaints..."
              />

              <ComplaintModal
                isOpen={showComplaintModal}
                onClose={() => setShowComplaintModal(false)}
                onSubmit={handleCreateComplaint}
              />
            </div>
          )}

          {/* TAB 6: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-brand-600" />
                  <span>IT Department & Library Announcements Feed</span>
                </h3>
              </div>

              <div className="space-y-3">
                {announcements.map((anc) => (
                  <div key={anc.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {anc.is_pinned === 1 && (
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                            PINNED
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-900">{anc.title}</h4>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(anc.created_at).toLocaleDateString()}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{anc.description}</p>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>Category: <strong>{anc.category}</strong></span>
                      <span>•</span>
                      <span>Priority: <strong className="text-brand-600">{anc.priority}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              
              {settingsMsg.text && (
                <div className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                  settingsMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {settingsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{settingsMsg.text}</span>
                </div>
              )}

              {/* Password Update Form */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-brand-600" />
                  <span>Update Account Password</span>
                </h3>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Update Password
                  </button>
                </form>
              </div>

              {/* Contact Details Update */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  <span>Update Profile Contact Info</span>
                </h3>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
