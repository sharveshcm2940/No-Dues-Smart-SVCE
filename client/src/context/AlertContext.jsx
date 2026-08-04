import React, { createContext, useState, useContext, useEffect } from 'react';
import CustomAlertModal from '../components/common/CustomAlertModal';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    isConfirm: false,
    buttonText: 'Understood',
    confirmText: 'Confirm Action',
    cancelText: 'Cancel',
    onConfirm: null
  });

  const showAlert = (messageOrConfig, type = 'warning', title = '') => {
    if (typeof messageOrConfig === 'object' && messageOrConfig !== null) {
      setModalConfig({
        isOpen: true,
        title: messageOrConfig.title || '',
        message: messageOrConfig.message || '',
        type: messageOrConfig.type || 'warning',
        isConfirm: false,
        buttonText: messageOrConfig.buttonText || 'Understood',
        onConfirm: null
      });
    } else {
      let inferredType = type;
      const lower = String(messageOrConfig).toLowerCase();

      if (lower.includes('submitted') || lower.includes('success') || lower.includes('completed') || lower.includes('approved') || lower.includes('granted') || lower.includes('updated') || lower.includes('cleared')) {
        inferredType = 'success';
      } else if (lower.includes('error') || lower.includes('failed') || lower.includes('blocked') || lower.includes('mandatory') || lower.includes('invalid') || lower.includes('incorrect') || lower.includes('cannot') || lower.includes('rejected')) {
        inferredType = 'danger';
      } else if (lower.includes('already have an active') || lower.includes('in progress') || lower.includes('limit') || lower.includes('warning') || lower.includes('notice')) {
        inferredType = 'warning';
      }

      const inferredTitle = title || (
        inferredType === 'success' ? 'Action Successful' :
        inferredType === 'danger' ? 'Unable to proceed' :
        'Notice'
      );

      setModalConfig({
        isOpen: true,
        title: inferredTitle,
        message: String(messageOrConfig),
        type: inferredType,
        isConfirm: false,
        buttonText: 'Understood',
        onConfirm: null
      });
    }
  };

  const showConfirm = (message, onConfirmCallback, title = 'Confirmation Required') => {
    setModalConfig({
      isOpen: true,
      title: title || 'Confirmation Required',
      message: String(message),
      type: 'warning',
      isConfirm: true,
      confirmText: 'Confirm Action',
      cancelText: 'Cancel',
      onConfirm: () => {
        if (onConfirmCallback) onConfirmCallback();
      }
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Intercept window.alert globally to present custom alert modal
  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (msg) => {
      showAlert(msg);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}
      <CustomAlertModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        isConfirm={modalConfig.isConfirm}
        buttonText={modalConfig.buttonText}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
