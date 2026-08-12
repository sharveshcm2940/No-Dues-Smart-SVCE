import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import Badge from '../components/common/Badge';
import DataTable from '../components/common/DataTable';
import ApprovalDialog from '../components/library/ApprovalDialog';
import BookModal from '../components/library/BookModal';
import ReportsExporter from '../components/library/ReportsExporter';
import Modal from '../components/common/Modal';
import { 
  Building2, 
  BookOpen, 
  Users, 
  FileCheck2, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  FileText, 
  Megaphone, 
  MessageSquareWarning, 
  Send,
  Eye,
  KeyRound,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export const LibraryDashboard = () => {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);

  const [selectedStudentReg, setSelectedStudentReg] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [showStudentDrawer, setShowStudentDrawer] = useState(false);

  // Ticket Reply state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [ticketStatus, setTicketStatus] = useState('In Progress');

  // Edit Library Metrics State
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [editTotalBooks, setEditTotalBooks] = useState('');
  const [editAvailableBooks, setEditAvailableBooks] = useState('');
  const [editBorrowedBooks, setEditBorrowedBooks] = useState('');
  const [editPendingReturns, setEditPendingReturns] = useState('');
  const [savingMetrics, setSavingMetrics] = useState(false);

  const openMetricsModal = () => {
    if (dashboardData?.stats) {
      setEditTotalBooks(dashboardData.stats.totalBooks);
      setEditAvailableBooks(dashboardData.stats.availableBooks);
      setEditBorrowedBooks(dashboardData.stats.borrowedBooks);
      setEditPendingReturns(dashboardData.stats.pendingReturns);
    }
    setShowMetricsModal(true);
  };

  const handleSaveMetrics = async (e) => {
    e.preventDefault();
    setSavingMetrics(true);
    try {
      const res = await api.post('/library/update-metrics', {
        total_books: editTotalBooks,
        available_books: editAvailableBooks,
        borrowed_books: editBorrowedBooks,
        pending_returns: editPendingReturns
      });
      if (res.data.success) {
        showAlert(res.data.message, 'success');
        setShowMetricsModal(false);
        fetchDashboard();
      }
    } catch (err) {
      showAlert('Failed to update library metrics.', 'danger');
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleResetMetrics = () => {
    showConfirm('Reset metric statistics to auto-calculated database totals?', async () => {
      setSavingMetrics(true);
      try {
        const res = await api.post('/library/update-metrics', { reset_to_auto: true });
        if (res.data.success) {
          showAlert(res.data.message);
          setShowMetricsModal(false);
          fetchDashboard();
        }
      } catch (err) {
        showAlert('Failed to reset library metrics.', 'danger');
      } finally {
        setSavingMetrics(false);
      }
    });
  };

  // Announcement Form State
  const [ancTitle, setAncTitle] = useState('');
  const [ancDesc, setAncDesc] = useState('');
  const [ancCategory, setAncCategory] = useState('Library');
  const [ancPriority, setAncPriority] = useState('Medium');
  const [ancPinned, setAncPinned] = useState(false);

  // Staff Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' });

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/library/dashboard');
      if (res.data && res.data.success) {
        setDashboardData(res.data.data);
      } else {
        setDashboardData({ staff: null, stats: { totalBooks: 0, borrowedBooks: 0, activeRequests: 0, totalFineCollected: 0 }, recentRequests: [] });
      }
    } catch (err) {
      console.error('Error fetching library dashboard:', err);
      setDashboardData({ staff: null, stats: { totalBooks: 0, borrowedBooks: 0, activeRequests: 0, totalFineCollected: 0 }, recentRequests: [] });
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await api.get('/library/books');
      if (res.data.success) setBooks(res.data.books);
    } catch (err) {
      console.error('Error loading books:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/library/students');
      if (res.data.success) setStudents(res.data.students);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/library/complaints');
      if (res.data.success) setComplaints(res.data.complaints);
    } catch (err) {
      console.error('Error loading complaints:', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/student/announcements');
      if (res.data.success) setAnnouncements(res.data.announcements);
    } catch (err) {
      console.error('Error loading announcements:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      if (res.data.success) setNotifications(res.data.notifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchBooks(),
        fetchStudents(),
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
  const handleProcessNoDues = async (requestId, action, remarks) => {
    try {
      const res = await api.post('/library/process-nodues', { requestId, action, remarks });
      if (res.data.success) {
        showAlert(res.data.message, 'success');
        fetchDashboard();
        fetchStudents();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to process request.';
      showAlert(msg, 'danger');
      throw new Error(msg);
    }
  };

  const handleSaveBook = async (formData) => {
    try {
      let res;
      if (selectedBook) {
        res = await api.put(`/library/books/${selectedBook.id}`, formData);
      } else {
        res = await api.post('/library/books', formData);
      }
      if (res.data.success) {
        showAlert(res.data.message, 'success');
        fetchBooks();
        fetchDashboard();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving book.';
      showAlert(msg, 'danger');
      throw new Error(msg);
    }
  };

  const handleDeleteBook = async (id, title) => {
    showConfirm(`Are you sure you want to remove "${title}" from catalog?`, async () => {
      try {
        const res = await api.delete(`/library/books/${id}`);
        if (res.data.success) {
          fetchBooks();
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error deleting book.', 'danger');
      }
    });
  };

  const handleViewStudentDrawer = async (regNo) => {
    try {
      setSelectedStudentReg(regNo);
      const res = await api.get(`/library/students/${regNo}`);
      if (res.data.success) {
        setStudentDetail(res.data.data);
        setShowStudentDrawer(true);
      }
    } catch (err) {
      showAlert('Error fetching student details.', 'danger');
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      const res = await api.put(`/library/complaints/${selectedComplaint.id}`, {
        status: ticketStatus,
        reply: replyText
      });
      if (res.data.success) {
        fetchComplaints();
        setShowReplyModal(false);
        showAlert('Complaint ticket status updated!', 'success');
      }
    } catch (err) {
      showAlert('Error updating complaint ticket.', 'danger');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/library/announcements', {
        title: ancTitle,
        description: ancDesc,
        category: ancCategory,
        priority: ancPriority,
        is_pinned: ancPinned
      });
      if (res.data.success) {
        fetchAnnouncements();
        setAncTitle('');
        setAncDesc('');
        showAlert('Announcement published successfully!', 'success');
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

  const handleBulkApprove = () => {
    showConfirm('Are you sure you want to bulk approve all eligible student No-Dues requests? (Students with 0 borrowed books and 0 unpaid fines will be cleared automatically)', async () => {
      try {
        const res = await api.post('/library/bulk-approve');
        if (res.data.success) {
          showAlert(res.data.message);
          fetchDashboard();
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Error executing bulk library approval.', 'danger');
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-500 font-sans text-xs font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading ERP Department Library Staff Desk...</span>
        </div>
      </div>
    );
  }

  const {
    staff = null,
    stats = { totalBooks: 0, borrowedBooks: 0, activeRequests: 0, totalFineCollected: 0 },
    recentRequests = []
  } = dashboardData || {};

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header notifications={notifications} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar role="library_staff" activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">

          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Department Information Banner */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 border border-brand-200">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-brand-600 uppercase tracking-widest">
                      FACULTY OFFICERS DESK
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {staff?.department || 'Information Technology'} Department Library
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Faculty In-Charge: <strong>{staff?.full_name}</strong> (Emp ID: {staff?.employee_id}) | Designation: {staff?.designation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openMetricsModal}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
                    title="Edit Catalog & Circulation Stat Numbers"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit Metric Totals</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('nodues')}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Review No-Dues Desk ({stats.pendingRequests})</span>
                  </button>
                </div>
              </div>

              {/* 8 ERP Metric Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs relative group">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Total Books Catalog</span>
                      <button onClick={openMetricsModal} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-brand-600" title="Edit value">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </span>
                    <BookOpen className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{stats.totalBooks}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Total physical copies in IT library</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs relative group">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Books Available</span>
                      <button onClick={openMetricsModal} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-brand-600" title="Edit value">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{stats.availableBooks}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Ready for circulation on shelf</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs relative group">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Books Borrowed</span>
                      <button onClick={openMetricsModal} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-brand-600" title="Edit value">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </span>
                    <Clock className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{stats.borrowedBooks}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Issued to IT students</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs relative group">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Pending Returns</span>
                      <button onClick={openMetricsModal} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-brand-600" title="Edit value">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-600">{stats.pendingReturns}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Overdue return records</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Pending Requests</span>
                    <FileCheck2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-600">{stats.pendingRequests}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Awaiting Dept Library review</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Approved Requests</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600">{stats.approvedRequests}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Cleared by IT Library</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Rejected Requests</span>
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-red-600">{stats.rejectedRequests}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Dues non-compliance</p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Today's Applications</span>
                    <Building2 className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{stats.todayRequests}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Received today</p>
                </div>
              </div>

              {/* Recent No-Dues Applications Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Recent Student No-Dues Clearance Applications</h3>
                  <button
                    onClick={() => setActiveTab('nodues')}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700"
                  >
                    View All Applications →
                  </button>
                </div>

                <DataTable
                  columns={[
                    { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                    { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                    { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                    { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                    { header: 'Year', accessor: 'year' },
                    { header: 'Pending Books', accessor: 'pending_books', cell: (r) => <span className={r.pending_books > 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{r.pending_books} Active</span> },
                    { header: 'Unpaid Fine', accessor: 'fine_amount', cell: (r) => <span className={r.fine_amount > 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>₹{r.fine_amount}</span> },
                    { header: 'Dept Status', accessor: 'dept_library_status', cell: (r) => <Badge>{r.dept_library_status}</Badge> },
                    { 
                      header: 'Actions', 
                      cell: (r) => (
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setShowApprovalModal(true);
                          }}
                          className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-xs transition-colors"
                        >
                          Review & Verify
                        </button>
                      ) 
                    }
                  ]}
                  data={recentRequests}
                  searchPlaceholder="Search recent applications..."
                />
              </div>

            </div>
          )}

          {/* TAB 2: NO-DUES REQUEST MANAGEMENT */}
          {activeTab === 'nodues' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No-Dues Clearance Desk (Strict Rule Verification)</h3>
                  <p className="text-xs text-slate-500">Automated verification blocks approval if student has active books or unpaid fine</p>
                </div>

                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bulk Approve All Eligible Dues</span>
                </button>
              </div>

              <DataTable
                columns={[
                  { header: 'Request ID', accessor: 'request_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.request_number}</span> },
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                  { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                  { header: 'Year', accessor: 'year' },
                  { header: 'Pending Books', accessor: 'pending_books', cell: (r) => <span className={r.pending_books > 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{r.pending_books} Active</span> },
                  { header: 'Fine Amount', accessor: 'fine_amount', cell: (r) => <span className={r.fine_amount > 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>₹{r.fine_amount}</span> },
                  { header: 'Dept Status', accessor: 'dept_library_status', cell: (r) => <Badge>{r.dept_library_status}</Badge> },
                  { header: 'Date', accessor: 'request_date', cell: (r) => <span>{new Date(r.request_date).toLocaleDateString()}</span> },
                  { 
                    header: 'Actions', 
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
                data={recentRequests}
                searchPlaceholder="Search by student name or register number..."
                filterOptions={[
                  { value: 'Pending', label: 'Pending Review' },
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Rejected', label: 'Rejected' },
                  { value: 'Hold', label: 'On Hold' }
                ]}
                filterKey="dept_library_status"
              />

              <ApprovalDialog
                isOpen={showApprovalModal}
                onClose={() => setShowApprovalModal(false)}
                requestItem={selectedRequest}
                onProcessAction={handleProcessNoDues}
                onRefresh={fetchDashboard}
              />
            </div>
          )}

          {/* TAB 3: BOOK INVENTORY MANAGEMENT */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">IT Department Book Inventory Catalog</h3>
                  <p className="text-xs text-slate-500">Manage catalog records, shelf locations, ISBN numbers, and copy stock</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedBook(null);
                    setShowBookModal(true);
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Book</span>
                </button>
              </div>

              <DataTable
                columns={[
                  { header: 'Book ID', accessor: 'book_id', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.book_id}</span> },
                  { header: 'Title', accessor: 'title', cell: (r) => <span className="font-bold text-slate-800">{r.title}</span> },
                  { header: 'Author', accessor: 'author' },
                  { header: 'Category', accessor: 'category', cell: (r) => <span className="font-semibold text-slate-700">{r.category}</span> },
                  { header: 'ISBN', accessor: 'isbn', cell: (r) => <span className="font-mono text-slate-600 text-[11px]">{r.isbn}</span> },
                  { header: 'Shelf Location', accessor: 'shelf_number', cell: (r) => <span className="font-mono font-semibold text-slate-700">{r.shelf_number}</span> },
                  { header: 'Copies (Total / Avail / Issued)', cell: (r) => <span><strong>{r.total_copies}</strong> / <strong className="text-emerald-600">{r.available_copies}</strong> / <strong className="text-amber-600">{r.issued_copies}</strong></span> },
                  { header: 'Status', accessor: 'status', cell: (r) => <Badge>{r.status}</Badge> },
                  {
                    header: 'Actions',
                    cell: (r) => (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedBook(r);
                            setShowBookModal(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded"
                          title="Edit Book"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(r.id, r.title)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  }
                ]}
                data={books}
                searchPlaceholder="Search catalog by title, author, or ISBN..."
                filterOptions={[
                  { value: 'Core IT', label: 'Core IT' },
                  { value: 'Data Structures', label: 'Data Structures' },
                  { value: 'Database Systems', label: 'Database Systems' },
                  { value: 'Networks', label: 'Networks' },
                  { value: 'AI & ML', label: 'AI & ML' },
                  { value: 'Software Engineering', label: 'Software Engineering' }
                ]}
                filterKey="category"
              />

              <BookModal
                isOpen={showBookModal}
                onClose={() => setShowBookModal(false)}
                bookData={selectedBook}
                onSubmit={handleSaveBook}
              />
            </div>
          )}

          {/* TAB 4: STUDENT DIRECTORY */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800">IT Department Student Directory</h3>
                <p className="text-xs text-slate-500">View active student records, borrow history, fine status, and clearance records</p>
              </div>

              <DataTable
                columns={[
                  { header: 'Register No', accessor: 'register_number', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'full_name', cell: (r) => <span className="font-bold text-slate-900">{r.full_name}</span> },
                  { header: 'ID Card No', accessor: 'id_card_number', cell: (r) => <span className="font-mono text-slate-600">{r.id_card_number}</span> },
                  { header: 'Batch / Year', cell: (r) => <span>{r.batch} ({r.year})</span> },
                  { header: 'Active Borrowed', accessor: 'active_borrowed_count', cell: (r) => <span className={r.active_borrowed_count > 0 ? 'font-bold text-red-600' : 'text-emerald-600'}>{r.active_borrowed_count} Books</span> },
                  { header: 'Unpaid Fine', accessor: 'unpaid_fine', cell: (r) => <span className={r.unpaid_fine > 0 ? 'font-bold text-red-600' : 'text-emerald-600'}>₹{r.unpaid_fine}</span> },
                  { header: 'No-Dues Status', accessor: 'nodues_status', cell: (r) => <Badge>{r.nodues_status || 'Not Submitted'}</Badge> },
                  {
                    header: 'Actions',
                    cell: (r) => (
                      <button
                        onClick={() => handleViewStudentDrawer(r.register_number)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded transition-colors flex items-center gap-1 border border-slate-300"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Profile</span>
                      </button>
                    )
                  }
                ]}
                data={students}
                searchPlaceholder="Search student directory..."
              />

              {/* Student Detail Drawer Modal */}
              <Modal isOpen={showStudentDrawer} onClose={() => setShowStudentDrawer(false)} title={`Student Record File - ${studentDetail?.student?.full_name}`} maxWidth="max-w-3xl">
                {studentDetail && (
                  <div className="space-y-5 text-xs">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                      <div>
                        <p><span className="font-semibold text-slate-700">Register No:</span> {studentDetail.student.register_number}</p>
                        <p><span className="font-semibold text-slate-700">ID Card No:</span> {studentDetail.student.id_card_number}</p>
                        <p><span className="font-semibold text-slate-700">Programme:</span> {studentDetail.student.programme}</p>
                        <p><span className="font-semibold text-slate-700">Phone:</span> {studentDetail.student.phone}</p>
                      </div>
                      <div>
                        <p><span className="font-semibold text-slate-700">Advisor Name:</span> {studentDetail.student.advisor_name}</p>
                        <p><span className="font-semibold text-slate-700">Advisor Email:</span> {studentDetail.student.advisor_email}</p>
                        <p><span className="font-semibold text-slate-700">Email:</span> {studentDetail.student.email}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 mb-2">Complete Borrow History</h4>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 font-bold text-slate-600">
                            <tr>
                              <th className="p-2">Book ID</th>
                              <th className="p-2">Title</th>
                              <th className="p-2">Issue Date</th>
                              <th className="p-2">Due Date</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentDetail.borrowHistory.map(b => (
                              <tr key={b.id}>
                                <td className="p-2 font-mono">{b.book_id}</td>
                                <td className="p-2 font-bold">{b.title}</td>
                                <td className="p-2">{b.issue_date}</td>
                                <td className="p-2">{b.due_date}</td>
                                <td className="p-2"><Badge>{b.status}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}
              </Modal>
            </div>
          )}

          {/* TAB 5: COMPLAINT TICKETS DESK */}
          {activeTab === 'complaints' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800">Support & Complaint Ticketing Resolution Desk</h3>
                <p className="text-xs text-slate-500">Review student ticket submissions, post official replies, and resolve cases</p>
              </div>

              <DataTable
                columns={[
                  { header: 'Ticket ID', accessor: 'complaint_id', cell: (r) => <span className="font-mono font-bold text-brand-600">{r.complaint_id}</span> },
                  { header: 'Student Reg', accessor: 'register_number', cell: (r) => <span className="font-mono font-semibold text-slate-800">{r.register_number}</span> },
                  { header: 'Student Name', accessor: 'student_name', cell: (r) => <span className="font-bold text-slate-900">{r.student_name}</span> },
                  { header: 'Category', accessor: 'category', cell: (r) => <span className="font-semibold text-slate-700">{r.category}</span> },
                  { header: 'Subject', accessor: 'title', cell: (r) => <span className="font-bold text-slate-800">{r.title}</span> },
                  { header: 'Priority', accessor: 'priority', cell: (r) => <span className={r.priority === 'High' ? 'font-bold text-red-600' : 'text-slate-600'}>{r.priority}</span> },
                  { header: 'Status', accessor: 'status', cell: (r) => <Badge>{r.status}</Badge> },
                  {
                    header: 'Actions',
                    cell: (r) => (
                      <button
                        onClick={() => {
                          setSelectedComplaint(r);
                          setReplyText(r.reply || '');
                          setTicketStatus(r.status || 'In Progress');
                          setShowReplyModal(true);
                        }}
                        className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-xs transition-colors"
                      >
                        Reply & Resolve
                      </button>
                    )
                  }
                ]}
                data={complaints}
                searchPlaceholder="Search complaints..."
              />

              <Modal isOpen={showReplyModal} onClose={() => setShowReplyModal(false)} title={`Resolve Ticket #${selectedComplaint?.complaint_id}`}>
                {selectedComplaint && (
                  <form onSubmit={handleUpdateTicket} className="space-y-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                      <p><span className="font-semibold text-slate-700">Student:</span> {selectedComplaint.student_name} ({selectedComplaint.register_number})</p>
                      <p><span className="font-semibold text-slate-700">Subject:</span> <strong>{selectedComplaint.title}</strong></p>
                      <p className="text-slate-600 mt-1">"{selectedComplaint.description}"</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Status</label>
                      <select
                        value={ticketStatus}
                        onChange={(e) => setTicketStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Response / Instructions *</label>
                      <textarea
                        rows={4}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                        placeholder="Enter response sent to student..."
                        required
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReplyModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs"
                      >
                        Submit Reply
                      </button>
                    </div>
                  </form>
                )}
              </Modal>
            </div>
          )}

          {/* TAB 6: ANNOUNCEMENTS MANAGEMENT */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              
              {/* Publisher Card */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-brand-600" />
                  <span>Publish New Institutional Announcement</span>
                </h3>

                <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Announcement Title *</label>
                    <input
                      type="text"
                      value={ancTitle}
                      onChange={(e) => setAncTitle(e.target.value)}
                      placeholder="e.g. Final Year No-Dues Deadline Extension"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description / Content *</label>
                    <textarea
                      rows={3}
                      value={ancDesc}
                      onChange={(e) => setAncDesc(e.target.value)}
                      placeholder="Detailed message..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        value={ancCategory}
                        onChange={(e) => setAncCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      >
                        <option value="No-Dues">No-Dues</option>
                        <option value="Library">Library</option>
                        <option value="Examination">Examination</option>
                        <option value="Placement">Placement</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                      <select
                        value={ancPriority}
                        onChange={(e) => setAncPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={ancPinned}
                          onChange={(e) => setAncPinned(e.target.checked)}
                          className="rounded text-brand-600 h-4 w-4"
                        />
                        <span>Pin to Top of Student Feed</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Publish Announcement
                  </button>
                </form>
              </div>

              {/* Announcements List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Published Announcements</h4>
                {announcements.map((anc) => (
                  <div key={anc.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {anc.is_pinned === 1 && <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">PINNED</span>}
                        <h5 className="text-xs font-bold text-slate-900">{anc.title}</h5>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{anc.description}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteAnnouncement(anc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 7: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <ReportsExporter />
          )}

          {/* TAB 8: STAFF SETTINGS */}
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
                  <span>Update Staff Account Password</span>
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

      {/* EDIT LIBRARY METRICS MODAL */}
      <Modal isOpen={showMetricsModal} onClose={() => setShowMetricsModal(false)} title="Edit Department Library Metric Statistics" maxWidth="max-w-md">
        <form onSubmit={handleSaveMetrics} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Configure custom metric counts for Department Library stat cards. Changes update the live dashboard in real-time.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Books Catalog *</label>
              <input
                type="number"
                min="0"
                value={editTotalBooks}
                onChange={(e) => setEditTotalBooks(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Books Available *</label>
              <input
                type="number"
                min="0"
                value={editAvailableBooks}
                onChange={(e) => setEditAvailableBooks(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Books Borrowed *</label>
              <input
                type="number"
                min="0"
                value={editBorrowedBooks}
                onChange={(e) => setEditBorrowedBooks(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pending Returns *</label>
              <input
                type="number"
                min="0"
                value={editPendingReturns}
                onChange={(e) => setEditPendingReturns(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
            <button
              type="button"
              onClick={handleResetMetrics}
              disabled={savingMetrics}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-200 text-[11px] transition-colors"
            >
              Reset to Auto
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMetricsModal(false)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingMetrics}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded shadow-2xs transition-colors"
              >
                {savingMetrics ? 'Saving...' : 'Save Metrics'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LibraryDashboard;
