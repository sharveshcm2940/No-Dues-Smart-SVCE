import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Building2, 
  UserCheck, 
  FileSpreadsheet, 
  ShieldCheck, 
  Award,
  ArrowRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

export const NoDuesTracker = ({ activeRequest, stages = [], onSubmitRequest, onCancelRequest, profile }) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [declared, setDeclared] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!declared) {
      alert('Please accept the student declaration before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitRequest({ forceNew: true, remarks });
      setShowSubmitModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeRequest) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 mx-auto mb-4 border border-brand-200">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">No Active Clearance Request</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
          Submit your online No-Dues clearance application to initiate multi-department verification across Finance, Central Library, IT Department Library, Faculty Advisor, DPC, and HOD.
        </p>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 mx-auto"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Submit Online No-Dues Application</span>
        </button>

        {/* Submission Form Modal */}
        <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit New No-Dues Clearance Application">
          <form onSubmit={handleModalSubmit} className="space-y-4 text-xs text-left">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
              <p><span className="font-semibold text-slate-700">Student Name:</span> {profile?.full_name}</p>
              <p><span className="font-semibold text-slate-700">Register Number:</span> {profile?.register_number}</p>
              <p><span className="font-semibold text-slate-700">Department:</span> {profile?.department || 'Information Technology'}</p>
              <p><span className="font-semibold text-slate-700">Academic Term:</span> Academic Year 2025 - 2026 ({profile?.year || 'IV Year'})</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Additional Student Remarks (Optional)</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any relevant note for department officers..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 h-4 w-4"
                  required
                />
                <span className="text-[11px] leading-relaxed">
                  I hereby declare that I am applying for official No-Dues clearance for the current academic term and that all information provided is accurate.
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Confirm & Submit Application'}</span>
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  const getStageIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'Hold':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Request Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Request Application #{activeRequest.request_number}
            </h3>
            <Badge>{activeRequest.overall_status}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submitted Date: {new Date(activeRequest.request_date).toLocaleDateString()} | Department: {activeRequest.department}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Request</span>
          </button>

          {activeRequest.overall_status === 'In Progress' && (
            <button
              onClick={() => onCancelRequest(activeRequest.id)}
              className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel Request
            </button>
          )}

          {activeRequest.overall_status === 'Approved' && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold">
              <Award className="w-4 h-4" />
              <span>Digital Certificate Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Percentage Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
          <span>Multi-Department Clearance Progress</span>
          <span className="text-brand-600">{activeRequest.progress_percentage}% Completed</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
          <div 
            className="bg-brand-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${activeRequest.progress_percentage}%` }}
          ></div>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 font-medium">
          Current Processing Stage: <strong className="text-slate-800">{activeRequest.current_stage}</strong>
        </p>
      </div>

      {/* Live Stage Timeline (Real-Time Department Approvals) */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-6 tracking-tight flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-600" />
          <span>Real-Time Stage-by-Stage Department Approvals</span>
        </h4>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {stages.map((st) => {
            const isFinished = st.status === 'Approved';
            const isCurrent = activeRequest.current_stage.includes(st.department_name);

            return (
              <div key={st.id} className="relative flex items-start group">
                
                {/* Node Bullet */}
                <div className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center z-10">
                  {getStageIcon(st.status)}
                </div>

                {/* Stage Content */}
                <div className={`flex-1 ml-4 p-4 rounded-lg border transition-all ${
                  isCurrent 
                    ? 'border-brand-500 bg-brand-50/20 shadow-xs' 
                    : isFinished 
                    ? 'border-slate-200 bg-slate-50/50' 
                    : 'border-slate-100 bg-white opacity-80'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Stage {st.stage_order}
                      </span>
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {st.department_name}
                        {st.department_name === 'Department Library' && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold border border-blue-200">
                            Focus IT Module
                          </span>
                        )}
                      </h5>
                    </div>

                    <Badge>{st.status}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Verified / Approved By:</span>{' '}
                      {st.approved_by || 'Pending Officer Review'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Timestamp:</span>{' '}
                      {st.updated_at ? new Date(st.updated_at).toLocaleString() : 'Waiting'}
                    </div>
                  </div>

                  {st.remarks && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs text-slate-600 italic">
                      <span className="font-semibold not-italic text-slate-700">Official Remarks:</span> "{st.remarks}"
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Submission Form Modal */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit New No-Dues Clearance Application">
        <form onSubmit={handleModalSubmit} className="space-y-4 text-xs text-left">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <p><span className="font-semibold text-slate-700">Student Name:</span> {profile?.full_name}</p>
            <p><span className="font-semibold text-slate-700">Register Number:</span> {profile?.register_number}</p>
            <p><span className="font-semibold text-slate-700">Department:</span> {profile?.department || 'Information Technology'}</p>
            <p><span className="font-semibold text-slate-700">Academic Term:</span> Academic Year 2025 - 2026 ({profile?.year || 'IV Year'})</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Additional Student Remarks (Optional)</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any relevant note for department officers..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={declared}
                onChange={(e) => setDeclared(e.target.checked)}
                className="mt-0.5 rounded text-brand-600 h-4 w-4"
                required
              />
              <span className="text-[11px] leading-relaxed">
                I hereby declare that I am applying for official No-Dues clearance for the current academic term and that all information provided is accurate.
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Confirm & Submit Application'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default NoDuesTracker;
