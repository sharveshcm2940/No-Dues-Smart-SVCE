import React, { useState } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { 
  AlertTriangle, 
  Upload, 
  FileText, 
  Send, 
  CheckCircle2, 
  X,
  FileCheck,
  Info
} from 'lucide-react';

export const ResubmitModal = ({ 
  isOpen, 
  onClose, 
  requestItem, 
  rejectedStageName, 
  rejectionReason, 
  onSuccess 
}) => {
  const [comment, setComment] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [serverError, setServerError] = useState('');

  if (!isOpen || !requestItem) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setValidationError('Only PDF, JPG, JPEG, and PNG files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setValidationError('File size must not exceed 5MB.');
      return;
    }

    setValidationError('');
    setDocumentFile(file);

    // Create local object URL for preview/demo upload
    const mockUrl = URL.createObjectURL(file);
    setDocumentUrl(mockUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setServerError('');

    if (!comment || comment.trim() === '') {
      setValidationError('Please enter a comment before submitting the re-request.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/student/resubmit-nodues', {
        requestId: requestItem.id,
        departmentName: rejectedStageName,
        comment: comment.trim(),
        documentUrl: documentUrl || null
      });

      if (res.data.success) {
        setComment('');
        setDocumentFile(null);
        setDocumentUrl('');
        if (onSuccess) onSuccess(res.data.message);
        onClose();
      } else {
        setServerError(res.data.message || 'Failed to submit re-request.');
      }
    } catch (err) {
      console.error('Resubmit Error:', err);
      setServerError(err.response?.data?.message || 'Please enter a comment before submitting the re-request.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = comment && comment.trim().length > 0;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Re-submit Clearance Request #${requestItem.request_number}`} 
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Rejection Details Warning Banner */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 uppercase tracking-wider">
                Rejected By: {rejectedStageName}
              </span>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold text-[10px]">
                Targeted Re-submission
              </span>
            </div>
            <p className="text-amber-800">
              <strong className="font-semibold text-amber-950">Official Rejection Reason:</strong>{" "}
              {rejectionReason || 'No specific reason remarks provided by department staff.'}
            </p>
            <p className="text-[11px] text-amber-700 italic pt-1 border-t border-amber-200/60 mt-1">
              Note: This re-request will be sent ONLY to {rejectedStageName}. Previously approved departments will NOT receive this request again.
            </p>
          </div>
        </div>

        {/* Validation Error Box */}
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Server Error Box */}
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Mandatory Student Comment Box */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
            <span>
              Mandatory Explanation / Resolution Comment <span className="text-red-600">*</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              Required
            </span>
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (validationError) setValidationError('');
            }}
            placeholder={`Explain how the issue was resolved or provide details for ${rejectedStageName}... (e.g. "Fee dues cleared via GPay UTR 9918231" or "Returned missing library book")`}
            className={`w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border ${
              !isFormValid && comment !== '' ? 'border-red-300 focus:ring-red-400' : 'border-slate-300 focus:ring-brand-500'
            } rounded-lg shadow-xs focus:outline-none focus:ring-2 transition-all`}
          />
          {!isFormValid && (
            <p className="text-[11px] text-red-500 mt-1 font-medium flex items-center gap-1">
              <Info className="w-3 h-3" />
              Please enter a comment before submitting the re-request.
            </p>
          )}
        </div>

        {/* Optional Document Upload Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-brand-600" />
              Optional Supporting Proof Document
            </label>
            <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded font-medium">
              PDF, JPG, JPEG, PNG (Max 5MB)
            </span>
          </div>

          {!documentFile ? (
            <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 bg-white rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <FileText className="w-6 h-6 text-slate-400 group-hover:text-brand-600 mb-1 transition-colors" />
              <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-700">
                Click to attach fee receipt, library proof, or payment confirmation
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Visible ONLY to {rejectedStageName} and authorized administrators
              </span>
              <input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden" 
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-emerald-800">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900 truncate max-w-[320px]">
                    {documentFile.name}
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    {(documentFile.size / 1024).toFixed(1)} KB • Attached Proof
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocumentFile(null);
                  setDocumentUrl('');
                }}
                className="p-1 hover:bg-emerald-200/60 text-emerald-700 rounded-md transition-colors"
                title="Remove attached file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || submitting}
            className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-2 shadow-xs transition-all ${
              isFormValid && !submitting
                ? 'bg-brand-600 hover:bg-brand-700 active:scale-95'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Submitting Re-request...' : `Re-submit to ${rejectedStageName}`}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default ResubmitModal;
