import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ShieldCheck, AlertOctagon, CheckCircle2, XCircle, Clock, BookOpen, IndianRupee, Plus, DollarSign, Check } from 'lucide-react';
import Badge from '../common/Badge';
import api from '../../services/api';
import { useAlert } from '../../context/AlertContext';

export const ApprovalDialog = ({ isOpen, onClose, requestItem, onProcessAction, onRefresh }) => {
  const { showAlert } = useAlert();
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Add Fine Form State
  const [showAddFine, setShowAddFine] = useState(false);
  const [fineAmountInput, setFineAmountInput] = useState('');
  const [fineReasonInput, setFineReasonInput] = useState('');
  const [addingFine, setAddingFine] = useState(false);
  const [fineSuccessMsg, setFineSuccessMsg] = useState('');

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

  const handleAddFineSubmit = async (e) => {
    e.preventDefault();
    if (!fineAmountInput || parseFloat(fineAmountInput) <= 0) {
      showAlert('Please enter a valid fine amount in Rupees (₹).', 'danger');
      return;
    }

    setAddingFine(true);
    setFineSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.post('/library/add-fine', {
        register_number: requestItem.register_number,
        amount: fineAmountInput,
        reason: fineReasonInput
      });

      if (res.data.success) {
        setFineSuccessMsg(res.data.message);
        // Dynamically update local fine amount on requestItem
        requestItem.fine_amount = (parseFloat(requestItem.fine_amount || 0) + parseFloat(fineAmountInput));
        setFineAmountInput('');
        setFineReasonInput('');
        setShowAddFine(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error imposing fine on student.');
    } finally {
      setAddingFine(false);
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

        {/* Fine Success Message */}
        {fineSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{fineSuccessMsg}</span>
          </div>
        )}

        {/* STRICT RULES CHECK WARNING BANNER */}
        {isApprovalBlocked ? (
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3 text-red-900">
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
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

        {/* Student & Department Library Dues Audit Card */}
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
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider text-slate-500">
                Department Library Dues Audit
              </h5>

              {/* ACTION DRAWER FINE BUTTON */}
              <button
                type="button"
                onClick={() => setShowAddFine(!showAddFine)}
                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-amber-600" />
                <span>Add Fine</span>
              </button>
            </div>

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

        {/* EXPANDABLE FINE IMPOSITION FORM */}
        {showAddFine && (
          <form onSubmit={handleAddFineSubmit} className="bg-amber-50/60 p-4 rounded-lg border border-amber-200 space-y-3 text-xs">
            <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-amber-600" />
              <span>Impose New Library Fine on Student ({requestItem.student_name})</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fine Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={fineAmountInput}
                  onChange={(e) => setFineAmountInput(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Fine Reason / Remarks *</label>
                <input
                  type="text"
                  value={fineReasonInput}
                  onChange={(e) => setFineReasonInput(e.target.value)}
                  placeholder="e.g. Damaged lab manual / Late book return penalty"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddFine(false)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingFine}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded shadow-2xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingFine ? 'Applying...' : 'Confirm & Apply Fine'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Remarks Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Department Officer Remarks {isApprovalBlocked && <span className="text-red-500 font-normal">(Required if rejecting)</span>}
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter verification notes or reason for hold/rejection (will be sent to student as notification)..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span>If Rejected or Put On Hold, this message will be sent as a real-time notification to <strong>the Student and their Faculty Advisor</strong>.</span>
          </p>
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
