import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ShieldCheck, AlertOctagon, CheckCircle2, XCircle, Clock, BookOpen, IndianRupee } from 'lucide-react';
import Badge from '../common/Badge';

export const ApprovalDialog = ({ isOpen, onClose, requestItem, onProcessAction }) => {
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!requestItem) return null;

  const hasPendingBooks = (requestItem.pending_books || 0) > 0;
  const hasPendingFine = (requestItem.fine_amount || 0) > 0;
  const isApprovalBlocked = hasPendingBooks || hasPendingFine;

  const handleAction = async (action) => {
    if (action === 'Reject' && (!remarks || remarks.trim() === '')) {
      setErrorMsg('Mandatory Remarks Required: Please enter the official reason for rejecting this No-Dues application.');
      return;
    }

    if (action === 'Approve' && isApprovalBlocked) {
      setErrorMsg('Approval Blocked: Student has pending library dues (Outstanding books or unpaid fine).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await onProcessAction(requestItem.request_id, action, remarks);
      setRemarks('');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error processing request action.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`No-Dues Application Verification #${requestItem.request_number}`} maxWidth="max-w-3xl">
      <div className="space-y-5">
        
        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* STRICT RULES CHECK WARNING BANNER */}
        {isApprovalBlocked ? (
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3 text-red-900">
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-700">STRICT ELIGIBILITY VIOLATION</h4>
              <p className="text-xs font-bold text-red-800 mt-0.5">
                Student has pending library dues. Automated verification has BLOCKED approval.
              </p>
              <ul className="text-xs text-red-700 mt-1 list-disc list-inside space-y-0.5">
                {hasPendingBooks && (
                  <li>Outstanding Borrowed Books: <strong>{requestItem.pending_books} Book(s)</strong></li>
                )}
                {hasPendingFine && (
                  <li>Unpaid Library Fine: <strong>₹{requestItem.fine_amount}</strong></li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">Eligible for Department Clearance</h4>
              <p className="text-xs text-emerald-700">0 Outstanding Books | ₹0 Unpaid Fine. System ready for approval.</p>
            </div>
          </div>
        )}

        {/* Student & Faculty Advisor Details Card */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider text-slate-500 mb-2">
              Student Details
            </h5>
            <div className="space-y-1">
              <p><span className="font-semibold text-slate-700">Name:</span> {requestItem.student_name}</p>
              <p><span className="font-semibold text-slate-700">Register No:</span> {requestItem.register_number}</p>
              <p><span className="font-semibold text-slate-700">ID Card No:</span> {requestItem.id_card_number}</p>
              <p><span className="font-semibold text-slate-700">Program / Year:</span> {requestItem.department} ({requestItem.year})</p>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider text-slate-500 mb-2">
              Department Library Dues Audit
            </h5>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Borrowed Books:</span>{' '}
                <span className={hasPendingBooks ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>
                  {requestItem.pending_books} Active
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Unpaid Fine Amount:</span>{' '}
                <span className={hasPendingFine ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>
                  ₹{requestItem.fine_amount}
                </span>
              </p>
              <p><span className="font-semibold text-slate-700">Current Request Stage:</span> {requestItem.current_stage || 'Department Library'}</p>
            </div>
          </div>
        </div>

        {/* Remarks Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Department Officer Remarks {isApprovalBlocked && <span className="text-red-500 font-normal">(Required if rejecting)</span>}
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter verification notes or instructions for the student..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAction('Hold')}
              disabled={submitting}
              className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Put On Hold</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction('Reject')}
              disabled={submitting}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Request</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction('Approve')}
              disabled={submitting || isApprovalBlocked}
              title={isApprovalBlocked ? "Disabled: Student has pending library dues." : "Approve No-Dues Application"}
              className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 ${
                isApprovalBlocked 
                  ? 'bg-slate-300 cursor-not-allowed opacity-60' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve No-Dues</span>
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default ApprovalDialog;
