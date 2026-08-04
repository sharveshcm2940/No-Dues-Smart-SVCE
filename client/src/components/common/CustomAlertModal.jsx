import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Info,
  X,
  HelpCircle
} from 'lucide-react';

export const CustomAlertModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  title, 
  message, 
  type = 'warning',
  isConfirm = false,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  buttonText = 'Understood' 
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (isConfirm && onConfirm) {
          onConfirm();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm, isConfirm]);

  if (!isOpen) return null;

  const getTypeConfig = () => {
    if (isConfirm) {
      return {
        icon: HelpCircle,
        iconBg: 'bg-slate-50 text-slate-700 border-slate-200',
        btnBg: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
        defaultTitle: 'Confirmation Required'
      };
    }

    switch (type) {
      case 'danger':
      case 'error':
        return {
          icon: XCircle,
          iconBg: 'bg-red-50 text-red-600 border-red-200',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-xs',
          defaultTitle: 'Action Error'
        };
      case 'success':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          btnBg: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
          defaultTitle: 'Action Successful'
        };
      case 'info':
        return {
          icon: Info,
          iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
          btnBg: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
          defaultTitle: 'Notice'
        };
      case 'warning':
      default:
        return {
          icon: AlertTriangle,
          iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
          btnBg: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
          defaultTitle: 'Notice'
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 transition-opacity">
      
      {/* Backdrop Click Dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Clean Modern Card Dialog matching user design */}
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150 z-10 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Close Cross Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          
          {/* Circular Icon Badge */}
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${config.iconBg}`}>
            <IconComponent className="w-5 h-5" />
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
              {title || config.defaultTitle}
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1.5 whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-full transition-colors"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className={`px-6 py-2 font-bold text-xs rounded-full transition-all ${config.btnBg}`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2 font-bold text-xs rounded-full transition-all ${config.btnBg}`}
            >
              {buttonText}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default CustomAlertModal;
