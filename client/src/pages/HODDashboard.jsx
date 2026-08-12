import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import Badge from '../components/common/Badge';
import DataTable from '../components/common/DataTable';
import ReportsExporter from '../components/library/ReportsExporter';
import Modal from '../components/common/Modal';
import { 
  Crown, 
  FileCheck2, 
  Users, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Megaphone, 
  KeyRound, 
  Plus,
  Trash2,
  Upload,
  UserPlus,
  FileSpreadsheet,
  ShieldAlert,
  UserCheck,
  RefreshCw,
  Edit3,
  UserX
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export const HODDashboard = () => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Approval Drawer Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Announcement Form
  const [ancTitle, setAncTitle] = useState('');
  const [ancDesc, setAncDesc] = useState('');

  // Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' });

  // Student Roster Admin States
  const [selectedWipeYear, setSelectedWipeYear] = useState('IV Year');
  const [csvFile, setCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Faculty Management States
  const [facultyList, setFacultyList] = useState([]);
  const [advisorAssignments, setAdvisorAssignments] = useState([]);
  const [activeFacultyList, setActiveFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  // Add/Edit Faculty Modal
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [facultyFormData, setFacultyFormData] = useState({
    employeeId: '', name: '', department: 'Information Technology', phone: '', email: '', status: 'ACTIVE'
  });

  // Batch & Section Reassign State
  const [selectedBatch, setSelectedBatch] = useState('2023-2027');
  const [selectedSection, setSelectedSection] = useState('Sec-A');
  const [newFacultyId, setNewFacultyId] = useState('');
  const [showReassignConfirmModal, setShowReassignConfirmModal] = useState(false);
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  // Replace Outgoing Faculty State
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [outgoingFacultyId, setOutgoingFacultyId] = useState('');
  const [replacementFacultyId, setReplacementFacultyId] = useState('');
  const [outgoingNewStatus, setOutgoingNewStatus] = useState('INACTIVE');
  const [selectedCohortKeys, setSelectedCohortKeys] = useState([]);
  const [showReplaceConfirmModal, setShowReplaceConfirmModal] = useState(false);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);

  // View Faculty Advisees Modal
  const [viewingFacultyAdvisees, setViewingFacultyAdvisees] = useState(null);
  const [facultyAdviseesList, setFacultyAdviseesList] = useState([]);

  const fetchFacultyData = async () => {
    setFacultyLoading(true);
    try {
      const [facRes, assignRes] = await Promise.all([
        api.get('/faculty'),
        api.get('/advisor-assignments')
      ]);
      if (facRes.data && facRes.data.success) {
        setFacultyList(facRes.data.data);
      }
      if (assignRes.data && assignRes.data.success) {
        setAdvisorAssignments(assignRes.data.data.assignments || []);
        setActiveFacultyList(assignRes.data.data.activeFaculty || []);
      }
    } catch (err) {
      console.error('Error loading faculty management data:', err);
    } finally {
      setFacultyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'faculty_management') {
      fetchFacultyData();
    }
  }, [activeTab]);

  const handleOpenAddFacultyModal = () => {
    setEditingFaculty(null);
    setFacultyFormData({ employeeId: '', name: '', department: 'Information Technology', phone: '', email: '', status: 'ACTIVE' });
    setShowFacultyModal(true);
  };

  const handleOpenEditFacultyModal = (fac) => {
    setEditingFaculty(fac);
    setFacultyFormData({
      employeeId: fac.employee_id,
      name: fac.name,
      department: fac.department || 'Information Technology',
      phone: fac.phone || '',
      email: fac.email,
      status: fac.status || 'ACTIVE'
    });
    setShowFacultyModal(true);
  };

  const handleSaveFaculty = async (e) => {
    e.preventDefault();
    try {
      if (editingFaculty) {
        const res = await api.put(`/faculty/${editingFaculty.id}`, facultyFormData);
        if (res.data.success) {
          showAlert(res.data.message, 'success');
          setShowFacultyModal(false);
          fetchFacultyData();
        }
      } else {
        const res = await api.post('/faculty', facultyFormData);
        if (res.data.success) {
          showAlert(res.data.message, 'success');
          setShowFacultyModal(false);
          fetchFacultyData();
        }
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error saving faculty details.', 'danger');
    }
  };

  const handleToggleFacultyStatus = async (fac, newStatus) => {
    try {
      const res = await api.patch(`/faculty/${fac.id}/status`, { status: newStatus });
      if (res.data.success) {
        showAlert(res.data.message, 'success');
        fetchFacultyData();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error updating faculty status.', 'danger');
    }
  };

  const handleViewFacultyAdvisees = async (fac) => {
    setViewingFacultyAdvisees(fac);
    try {
      const res = await api.get(`/faculty/${fac.id}/students`);
      if (res.data.success) {
        setFacultyAdviseesList(res.data.data.students || []);
      }
    } catch (err) {
      showAlert('Error loading advisees list.', 'danger');
    }
  };

  const handleConfirmBatchReassignment = async () => {
    if (!newFacultyId) {
      showAlert('Please select a new Faculty Advisor.', 'danger');
      return;
    }
    setReassignSubmitting(true);
    try {
      const res = await api.post('/advisor/reassign', {
        academicBatch: selectedBatch,
        section: selectedSection,
        newFacultyId: parseInt(newFacultyId, 10)
      });
      if (res.data.success) {
        showAlert(res.data.message, 'success');
        setShowReassignConfirmModal(false);
        setNewFacultyId('');
        fetchFacultyData();
        fetchDashboard();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error reassigning batch advisor.', 'danger');
    } finally {
      setReassignSubmitting(false);
    }
  };

  const handleConfirmFacultyReplacement = async () => {
    if (!outgoingFacultyId || !replacementFacultyId || selectedCohortKeys.length === 0) {
      showAlert('Please select outgoing faculty, replacement faculty, and at least one student cohort.', 'danger');
      return;
    }
    setReplaceSubmitting(true);
    try {
      const selectedGroups = selectedCohortKeys.map(k => {
        const [batch, section] = k.split('|');
        return { batch, section };
      });

      const res = await api.post('/advisor/replace-faculty', {
        outgoingFacultyId: parseInt(outgoingFacultyId, 10),
        replacementFacultyId: parseInt(replacementFacultyId, 10),
        selectedGroups,
        newStatus: outgoingNewStatus
      });

      if (res.data.success) {
        showAlert(res.data.message, 'success');
        setShowReplaceConfirmModal(false);
        setShowReplaceModal(false);
        setOutgoingFacultyId('');
        setReplacementFacultyId('');
        setSelectedCohortKeys([]);
        fetchFacultyData();
        fetchDashboard();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error completing faculty replacement.', 'danger');
    } finally {
      setReplaceSubmitting(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/hod/dashboard');
      if (res.data && res.data.success) {
        setDashboardData(res.data.data);
      } else {
        setDashboardData({ hod: null, stats: { totalRequests: 0, pendingApprovals: 0, completedCount: 0, totalStudents: 0 }, pendingHODApprovals: [], allDepartmentRequests: [], allStudents: [] });
      }
    } catch (err) {
      console.error('Error fetching HOD dashboard:', err);
      setDashboardData({ hod: null, stats: { totalRequests: 0, pendingApprovals: 0, completedCount: 0, totalStudents: 0 }, pendingHODApprovals: [], allDepartmentRequests: [], allStudents: [] });
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
      await Promise.all([fetchDashboard(), fetchAnnouncements(), fetchNotifications()]);
      setLoading(false);
    };
    loadAll();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleHODAction = async (action) => {
    if (!selectedRequest) return;
    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      showAlert('Mandatory Remarks Required for Rejection.', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/hod/process-nodues', {
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
      showAlert(err.response?.data?.message || 'Error processing HOD sign-off.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/library/announcements', {
        title: ancTitle,
        description: ancDesc,
        category: 'Department',
        priority: 'High',
        is_pinned: 1
      });
      if (res.data.success) {
        fetchAnnouncements();
        setAncTitle('');
        setAncDesc('');
        showAlert('HOD Official Announcement published!', 'success');
      }
    } catch (err) {
      showAlert('Error publishing announcement.', 'danger');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    showConfirm('Delete this announcement?', async () => {
      try {
        const res = await api.delete(`/library/announcements/${id}`);
        if (res.data.success) fetchAnnouncements();
      } catch (err) {
        showAlert('Error deleting announcement.', 'danger');
      }
    });
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

  const handleBulkApprove = async () => {
    showConfirm('Are you sure you want to grant final HOD approval and issue Digital Certificates for ALL pending Stage 6 requests?', async () => {
      try {
        const res = await api.post('/hod/bulk-approve');
        if (res.data.success) {
          showAlert(res.data.message, 'success');
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error executing bulk HOD final sign-off.', 'danger');
      }
    });
  };

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      showAlert('Please select a CSV file to upload.', 'danger');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        if (rows.length <= 1) {
          showAlert('CSV file is empty or missing data rows.', 'danger');
          return;
        }

        const headers = rows[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const parsedStudents = [];

        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (columns.length < headers.length) continue;

          const student = {};
          headers.forEach((header, index) => {
            student[header] = columns[index];
          });
          
          if (student.register_number && student.full_name && student.email) {
            parsedStudents.push(student);
          }
        }

        if (parsedStudents.length === 0) {
          showAlert('No valid student records found in CSV. Required headers: register_number, full_name, email, phone, id_card_number, year, section, programme, advisor_name.', 'danger');
          return;
        }

        setIsUploading(true);
        const res = await api.post('/hod/bulk-register-students', { students: parsedStudents });
        if (res.data.success) {
          showAlert(res.data.message || `Successfully registered ${res.data.count} students!`, 'success');
          setCsvFile(null);
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error processing CSV upload.', 'danger');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(csvFile);
  };

  const handleDeleteBatch = () => {
    showConfirm(`WARNING: Are you sure you want to delete all students registered for batch "${selectedWipeYear}"? This will also remove their clearance applications.`, async () => {
      try {
        const res = await api.delete(`/hod/students/year/${selectedWipeYear}`);
        if (res.data.success) {
          showAlert(res.data.message);
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error deleting student batch.', 'danger');
      }
    });
  };

  const handleWipeAll = () => {
    showConfirm('CRITICAL WARNING: This action will PERMANENTLY WIPE ALL student profiles, clearance requests, and dues records for all academic years. Are you sure you want to proceed with full database wipe?', async () => {
      try {
        const res = await api.delete('/hod/students/all');
        if (res.data.success) {
          showAlert(res.data.message);
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error wiping department student database.', 'danger');
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-xs font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Head of Department (HOD) Executive Portal Environment...</span>
        </div>
      </div>
    );
  }

  const {
    hod = null,
    stats = { totalRequests: 0, pendingApprovals: 0, completedCount: 0, totalStudents: 0 },
    pendingHODApprovals = [],
    allDepartmentRequests = [],
    allStudents = []
  } = dashboardData || {};

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header notifications={notifications} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar role="hod" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* HOD Profile Banner */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-800 border border-emerald-200">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest">
                      HEAD OF DEPARTMENT EXECUTIVE DESK
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {hod?.full_name || 'Dr V Vidhya'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hod?.college_name || 'Sri Venkateswara College of Engineering'} | Department of {hod?.department || 'Information Technology'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('final_approvals')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Crown className="w-4 h-4" />
                  <span>Stage 6 Final Approvals ({stats.pendingHODCount})</span>
                </button>
              </div>

              {/* 4 HOD Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Total IT Students</span>
                    <Users className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{stats.totalStudents}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Enrolled IT department roster</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Pending HOD Sign-off</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-600">{stats.pendingHODCount}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Stage 6 final review queue</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Cleared Students</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600">{stats.clearedStudents}</p>
                  <p className="text-[11px] text-slate-500 mt-1">100% No-Dues cleared</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Certificates Generated</span>
                    <Award className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-brand-600">{stats.totalCertificates}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Official SVCE digital certificates</p>
                </div>
              </div>

              {/* Pending Stage 6 Final Approvals */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Pending Head of Department Final Sign-off (Stage 6)</h3>

                <DataTable
                  columns={[
                    { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                    { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                    { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                    { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                    { header: 'Department', accessor: 'department' },
                    { header: 'HOD Stage', accessor: 'hod_stage_status', cell: (r) => <Badge>{r.hod_stage_status}</Badge> },
                    { 
                      header: 'Action', 
                      cell: (r) => (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setShowApprovalModal(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>Final Sign-Off</span>
                        </button>
                      ) 
                    }
                  ]}
                  data={pendingHODApprovals}
                  searchPlaceholder="Search final sign-off requests..."
                />
              </div>

            </div>
          )}

          {/* TAB 2: STAGE 6 FINAL APPROVAL DESK */}
          {activeTab === 'final_approvals' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Stage 6 Head of Department Final Sign-off Desk</h3>
                  <p className="text-xs text-slate-500">Grant final institutional sign-off and issue official SVCE Digital Clearance Certificates</p>
                </div>

                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Crown className="w-4 h-4" />
                  <span>Bulk Grant Final HOD Sign-Off & Issue Certificates</span>
                </button>
              </div>

              <DataTable
                columns={[
                  { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                  { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                  { header: 'Submission Date', accessor: 'request_date', cell: (r) => <span>{new Date(r.request_date).toLocaleDateString()}</span> },
                  { header: 'Status', accessor: 'hod_stage_status', cell: (r) => <Badge>{r.hod_stage_status}</Badge> },
                  { 
                    header: 'Action', 
                    cell: (r) => (
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setShowApprovalModal(true);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors"
                      >
                        Action Drawer
                      </button>
                    ) 
                  }
                ]}
                data={pendingHODApprovals}
                searchPlaceholder="Search final sign-off..."
              />
            </div>
          )}

          {/* TAB 3: ALL DEPARTMENT APPLICATIONS */}
          {activeTab === 'master_requests' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800">Master Department Clearance Applications Roster</h3>
                <p className="text-xs text-slate-500">Complete overview of all submitted No-Dues clearance applications across IT department</p>
              </div>

              <DataTable
                columns={[
                  { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                  { header: 'Current Stage', accessor: 'current_stage', cell: (r) => <span className="font-semibold text-slate-700">{r.current_stage}</span> },
                  { header: 'Progress', accessor: 'progress_percentage', cell: (r) => <span className="font-bold text-brand-600">{r.progress_percentage}%</span> },
                  { header: 'Certificate No', accessor: 'certificate_number', cell: (r) => <span className="font-mono text-emerald-700 font-bold">{r.certificate_number || 'Pending'}</span> },
                  { header: 'Overall Status', accessor: 'overall_status', cell: (r) => <Badge>{r.overall_status}</Badge> }
                ]}
                data={allDepartmentRequests}
                searchPlaceholder="Search master roster..."
              />
            </div>
          )}

          {/* TAB 4: DEPARTMENT STUDENT MASTER ROSTER */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              
              {/* Roster Administration Controls Card */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Excel / CSV Bulk Registration Panel */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wider">Bulk Student Import (CSV / Excel)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Upload new batch roster. CSV headers required: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">register_number, full_name, email, phone, id_card_number, year, section, programme, advisor_name</code>
                  </p>
                  
                  <form onSubmit={handleCSVUpload} className="space-y-3 pt-1">
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files[0])}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={isUploading || !csvFile}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Registering Students...' : 'Upload & Add Batch Roster'}</span>
                    </button>
                  </form>
                </div>

                {/* Batch Wipe & Department Reset Panel */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <ShieldAlert className="w-5 h-5" />
                    <h4 className="font-bold text-xs uppercase tracking-wider">Academic Batch Reset & Data Wipe</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Remove completed student batches or clear student roster for the upcoming academic cycle.
                  </p>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2">
                      <select 
                        value={selectedWipeYear}
                        onChange={(e) => setSelectedWipeYear(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex-1"
                      >
                        <option value="IV Year">IV Year Batch</option>
                        <option value="III Year">III Year Batch</option>
                        <option value="II Year">II Year Batch</option>
                        <option value="I Year">I Year Batch</option>
                      </select>
                      <button
                        onClick={handleDeleteBatch}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Batch</span>
                      </button>
                    </div>

                    <button
                      onClick={handleWipeAll}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear & Wipe All Department Student Records</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Department Roster Directory Table */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Department Student Master Roster ({allStudents.length} Students)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Sorted by Academic Year and Student Name (Alphabetical)</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                    Total: {allStudents.length} Students
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded border border-blue-200">
                    Cleared: {allStudents.filter(s => s.nodues_status === 'Approved').length}
                  </span>
                </div>
              </div>

              <DataTable
                columns={[
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'full_name', cell: (r) => <span className="font-bold text-slate-900">{r.full_name}</span> },
                  { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                  { header: 'Year / Section', accessor: 'year', cell: (r) => <span className="text-slate-700 font-medium">{r.year} ({r.section || 'Sec-A'})</span> },
                  { header: 'Faculty Advisor', accessor: 'advisor_name', cell: (r) => <span className="font-semibold text-slate-800">{r.advisor_name || 'V Praveenkumar'}</span> },
                  { header: 'Clearance Status', accessor: 'nodues_status', cell: (r) => <Badge>{r.nodues_status}</Badge> },
                  { header: 'Current Stage', accessor: 'current_stage', cell: (r) => <span className="font-medium text-slate-600">{r.current_stage}</span> },
                  { header: 'Certificate ID', accessor: 'certificate_number', cell: (r) => <span className="font-mono text-emerald-700 font-bold">{r.certificate_number || '—'}</span> }
                ]}
                data={allStudents}
                searchPlaceholder="Search by student name, register number, advisor..."
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

          {/* TAB 5: REPORTS */}
          {activeTab === 'reports' && (
            <ReportsExporter />
          )}

          {/* TAB 6: SETTINGS */}
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
                  <span>Update HOD Account Password</span>
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

          {/* TAB 7: FACULTY & ADVISOR MANAGEMENT */}
          {activeTab === 'faculty_management' && (
            <div className="space-y-6">
              
              {/* Page Title & Action Bar */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 border border-brand-200">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-brand-600 uppercase tracking-widest">
                      DEPARTMENT ADMINISTRATION
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Faculty & Advisor Management Desk
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Manage faculty records, dynamically assign advisors to cohorts, and bulk reassign advisees when faculty transfers or leaves.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleOpenAddFacultyModal}
                    className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add Faculty Member</span>
                  </button>
                  <button
                    onClick={() => setShowReplaceModal(true)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Replace Outgoing Faculty</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Batch & Section Reassignment Tool */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <RefreshCw className="w-5 h-5 text-brand-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Cohort Advisor Allocation & Bulk Reassignment</h3>
                    <p className="text-xs text-slate-500">Select an Academic Batch & Section to view current allocation and reassign a new Faculty Advisor.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Academic Batch</label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="2022-2026">2022-2026 (IV Year IT)</option>
                      <option value="2023-2027">2023-2027 (III Year IT)</option>
                      <option value="2024-2028">2024-2028 (II Year IT)</option>
                      <option value="2025-2029">2025-2029 (I Year IT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="Sec-A">Section A (Sec-A)</option>
                      <option value="Sec-B">Section B (Sec-B)</option>
                      <option value="Sec-C">Section C (Sec-C)</option>
                    </select>
                  </div>

                  {/* Current Allocation Info */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Advisor</div>
                    <div className="font-bold text-slate-800 text-xs truncate">
                      {
                        advisorAssignments.find(a => a.academic_batch === selectedBatch && a.section === selectedSection)?.faculty_name || 'Unassigned / Static'
                      }
                    </div>
                    <div className="text-[10px] text-brand-600 font-medium">
                      {advisorAssignments.find(a => a.academic_batch === selectedBatch && a.section === selectedSection)?.student_count || 0} Students Assigned
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Faculty Advisor</label>
                    <select
                      value={newFacultyId}
                      onChange={(e) => setNewFacultyId(e.target.value)}
                      className="w-full bg-white border border-brand-300 text-slate-900 text-xs font-semibold rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="">-- Select New Faculty --</option>
                      {activeFacultyList.map(fac => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name} ({fac.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!newFacultyId) {
                        showAlert('Please select a new Faculty Advisor from the dropdown.', 'danger');
                        return;
                      }
                      setShowReassignConfirmModal(true);
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reassign Students</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Master Faculty Directory Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Department Faculty Roster & Advisee Counts</h3>
                    <p className="text-xs text-slate-500">Live roster of faculty members, active statuses, and assigned student advisee numbers.</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    Total Faculty: {facultyList.length}
                  </span>
                </div>

                <DataTable
                  columns={[
                    { header: 'Emp ID / ID', cell: (row) => (
                      <div className="font-mono text-xs font-bold text-slate-700">{row.employee_id}</div>
                    )},
                    { header: 'Faculty Name', cell: (row) => (
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{row.name}</div>
                        <div className="text-[10px] text-slate-500">{row.department}</div>
                      </div>
                    )},
                    { header: 'Contact Info', cell: (row) => (
                      <div>
                        <div className="text-xs text-slate-700">{row.email}</div>
                        <div className="text-[10px] text-slate-500">{row.phone || 'N/A'}</div>
                      </div>
                    )},
                    { header: 'Status', cell: (row) => {
                      let variant = 'success';
                      if (row.status === 'INACTIVE' || row.status === 'RETIRED') variant = 'danger';
                      if (row.status === 'ON_LEAVE' || row.status === 'TRANSFERRED') variant = 'warning';
                      return <Badge variant={variant}>{row.status}</Badge>;
                    }},
                    { header: 'Assigned Advisees', cell: (row) => (
                      <button
                        onClick={() => handleViewFacultyAdvisees(row)}
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-brand-600" />
                        <span>{row.assigned_students_count || 0} Advisees</span>
                      </button>
                    )},
                    { header: 'Actions', cell: (row) => (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditFacultyModal(row)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                          title="Edit Faculty"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {row.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleToggleFacultyStatus(row, 'INACTIVE')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold rounded transition-colors"
                            title="Mark Inactive"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleFacultyStatus(row, 'ACTIVE')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded transition-colors"
                            title="Mark Active"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    )}
                  ]}
                  data={facultyList}
                  emptyMessage="No faculty records found."
                />
              </div>

            </div>
          )}

        </main>
      </div>

      {/* HOD Final Sign-off Modal */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} title={`Stage 6 HOD Final Approval Sign-off #${selectedRequest?.request_number}`}>
        {selectedRequest && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
              <p><span className="font-semibold text-slate-700">Student Name:</span> {selectedRequest.student_name}</p>
              <p><span className="font-semibold text-slate-700">Register Number:</span> {selectedRequest.register_number}</p>
              <p><span className="font-semibold text-slate-700">Department:</span> {selectedRequest.department} ({selectedRequest.year})</p>
              <p><span className="font-semibold text-slate-700">ID Card No:</span> {selectedRequest.id_card_number}</p>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-medium">
              Approving this application will issue the official <strong>SVCE Digital No-Dues Clearance Certificate</strong> with a unique certificate ID and QR code stamp.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Head of Department Remarks</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Final clearance remarks (optional for approval, mandatory for rejection)..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <span>If Rejected or Put On Hold, this remark will be sent as a notification to <strong>the Student and their Faculty Advisor</strong>.</span>
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
                onClick={() => handleHODAction('Hold')}
                disabled={submitting}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-xs"
              >
                Put On Hold
              </button>

              <button
                type="button"
                onClick={() => handleHODAction('Reject')}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Reject Request
              </button>

              <button
                type="button"
                onClick={() => handleHODAction('Approve')}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                <span>Grant Final HOD Sign-Off & Issue Certificate</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 1: Batch & Section Reassign Confirmation */}
      <Modal
        isOpen={showReassignConfirmModal}
        onClose={() => setShowReassignConfirmModal(false)}
        title="Confirm Cohort Advisor Reassignment"
      >
        <div className="space-y-4 text-slate-700 text-xs">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 font-medium leading-relaxed">
            ⚠️ <strong>You are about to reassign student advisees.</strong> All selected students will be linked to the new Faculty Advisor in the database.
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Academic Batch:</span>
              <span className="font-bold text-slate-800">{selectedBatch}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Section:</span>
              <span className="font-bold text-slate-800">{selectedSection}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Current Advisor:</span>
              <span className="font-bold text-slate-800">
                {advisorAssignments.find(a => a.academic_batch === selectedBatch && a.section === selectedSection)?.faculty_name || 'Unassigned / Static'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Students Affected:</span>
              <span className="font-bold text-brand-600">
                {advisorAssignments.find(a => a.academic_batch === selectedBatch && a.section === selectedSection)?.student_count || 0} Students
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-500">New Faculty Advisor:</span>
              <span className="font-bold text-emerald-600">
                {activeFacultyList.find(f => f.id === parseInt(newFacultyId, 10))?.name || 'Selected Faculty'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowReassignConfirmModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBatchReassignment}
              disabled={reassignSubmitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
            >
              {reassignSubmitting ? 'Updating...' : 'Confirm Reassignment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Replace Outgoing Faculty */}
      <Modal
        isOpen={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        title="Replace Outgoing / Transferring Faculty Advisor"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            Select an outgoing faculty member to bulk reassign their advisees to a replacement faculty member and update their status.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Outgoing Faculty</label>
              <select
                value={outgoingFacultyId}
                onChange={(e) => {
                  const val = e.target.value;
                  setOutgoingFacultyId(val);
                  const fac = facultyList.find(f => f.id === parseInt(val, 10));
                  if (fac) {
                    const groups = advisorAssignments.filter(a => a.faculty_id === fac.id || a.faculty_emp_id === fac.employee_id);
                    setSelectedCohortKeys(groups.map(g => `${g.academic_batch}|${g.section}`));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium"
              >
                <option value="">-- Select Outgoing Faculty --</option>
                {facultyList.map(fac => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.employee_id}) - {fac.assigned_students_count || 0} Advisees
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Replacement Faculty</label>
              <select
                value={replacementFacultyId}
                onChange={(e) => setReplacementFacultyId(e.target.value)}
                className="w-full bg-white border border-brand-300 text-slate-900 text-xs font-semibold rounded-lg p-2.5"
              >
                <option value="">-- Select Replacement Faculty --</option>
                {activeFacultyList.filter(f => f.id !== parseInt(outgoingFacultyId, 10)).map(fac => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.employee_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {outgoingFacultyId && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Cohorts to Reassign</label>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                {advisorAssignments.filter(a => a.faculty_id === parseInt(outgoingFacultyId, 10) || a.faculty_emp_id === facultyList.find(f => f.id === parseInt(outgoingFacultyId, 10))?.employee_id).map(g => {
                  const key = `${g.academic_batch}|${g.section}`;
                  const isChecked = selectedCohortKeys.includes(key);
                  return (
                    <label key={key} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCohortKeys([...selectedCohortKeys, key]);
                            } else {
                              setSelectedCohortKeys(selectedCohortKeys.filter(k => k !== key));
                            }
                          }}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-bold text-slate-800">Batch {g.academic_batch} ({g.section})</span>
                      </div>
                      <span className="text-brand-600 font-semibold">{g.student_count} Students</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Outgoing Faculty New Status</label>
            <select
              value={outgoingNewStatus}
              onChange={(e) => setOutgoingNewStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium"
            >
              <option value="INACTIVE">INACTIVE (Faculty Left College)</option>
              <option value="TRANSFERRED">TRANSFERRED (Moved to another department)</option>
              <option value="ON_LEAVE">ON_LEAVE (Sabbatical / Leave of Absence)</option>
              <option value="RETIRED">RETIRED (Superannuated)</option>
              <option value="ACTIVE">Keep ACTIVE</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowReplaceModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmFacultyReplacement}
              disabled={replaceSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
            >
              {replaceSubmitting ? 'Updating...' : 'Reassign All Selected'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Add / Edit Faculty Modal */}
      <Modal
        isOpen={showFacultyModal}
        onClose={() => setShowFacultyModal(false)}
        title={editingFaculty ? 'Edit Faculty Member Details' : 'Add New Faculty Member'}
      >
        <form onSubmit={handleSaveFaculty} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Faculty Employee ID</label>
            <input
              type="text"
              required
              disabled={!!editingFaculty}
              value={facultyFormData.employeeId}
              onChange={(e) => setFacultyFormData({ ...facultyFormData, employeeId: e.target.value })}
              placeholder="e.g. EMP-FA-IT-05"
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Name (with Prefix)</label>
            <input
              type="text"
              required
              value={facultyFormData.name}
              onChange={(e) => setFacultyFormData({ ...facultyFormData, name: e.target.value })}
              placeholder="e.g. V. Ranjith"
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Department</label>
            <input
              type="text"
              value={facultyFormData.department}
              onChange={(e) => setFacultyFormData({ ...facultyFormData, department: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={facultyFormData.email}
                onChange={(e) => setFacultyFormData({ ...facultyFormData, email: e.target.value })}
                placeholder="ranjith.v@svce.ac.in"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={facultyFormData.phone}
                onChange={(e) => setFacultyFormData({ ...facultyFormData, phone: e.target.value })}
                placeholder="+91 98403 33445"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Status</label>
            <select
              value={facultyFormData.status}
              onChange={(e) => setFacultyFormData({ ...facultyFormData, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 font-medium"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ON_LEAVE">ON_LEAVE</option>
              <option value="TRANSFERRED">TRANSFERRED</option>
              <option value="RETIRED">RETIRED</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowFacultyModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-xs shadow-xs"
            >
              {editingFaculty ? 'Save Changes' : 'Create Faculty Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: View Faculty Advisees Drawer */}
      <Modal
        isOpen={!!viewingFacultyAdvisees}
        onClose={() => setViewingFacultyAdvisees(null)}
        title={`Assigned Advisees for ${viewingFacultyAdvisees?.name || 'Faculty Member'}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-800">{viewingFacultyAdvisees?.name}</span> ({viewingFacultyAdvisees?.employee_id})
              <div className="text-[10px] text-slate-500">{viewingFacultyAdvisees?.email}</div>
            </div>
            <Badge variant="brand">{facultyAdviseesList.length} Advisees Linked</Badge>
          </div>

          <DataTable
            columns={[
              { header: 'Register No', cell: (row) => <span className="font-mono font-bold text-xs text-brand-600">{row.register_number}</span> },
              { header: 'Student Name', cell: (row) => <span className="font-bold text-xs text-slate-800">{row.full_name}</span> },
              { header: 'Batch / Sec', cell: (row) => <span className="text-xs text-slate-600">{row.academic_batch} ({row.section})</span> },
              { header: 'Clearance Status', cell: (row) => <Badge variant={row.nodues_status === 'Approved' ? 'success' : 'warning'}>{row.nodues_status}</Badge> }
            ]}
            data={facultyAdviseesList}
            emptyMessage="No advisees currently assigned to this faculty member."
          />
        </div>
      </Modal>

    </div>
  );
};

export default HODDashboard;
