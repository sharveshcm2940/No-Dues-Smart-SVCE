import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [platform, setPlatform] = useState('desktop');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSWFn, setUpdateSWFn] = useState(null);

  // Initialize Service Worker registration with update hooks
  useEffect(() => {
    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New version of SVCE No-Dues portal is available.');
          setNeedRefresh(true);
        },
        onOfflineReady() {
          console.log('[PWA] SVCE No-Dues portal is cached and ready for offline usage.');
          setOfflineReady(true);
        },
        onRegistered(registration) {
          console.log('[PWA] Service worker registered successfully:', registration?.scope);
        },
        onRegisterError(error) {
          console.warn('[PWA] Service worker registration error:', error);
        }
      });
      setUpdateSWFn(() => updateSW);
    } catch (err) {
      console.warn('[PWA] registerSW init failed:', err);
    }
  }, []);

  // Online / Offline status tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Standalone mode & platform detection
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e) => {
      setIsInstalled(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayChange);
    }

    // Detect user platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else if (/win/.test(userAgent)) {
      setPlatform('windows');
    } else if (/mac/.test(userAgent)) {
      setPlatform('mac');
    } else {
      setPlatform('desktop');
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Capture appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstructionsModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayChange);
      }
    };
  }, []);

  // Trigger browser install prompt
  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (err) {
        console.error('Error prompting PWA install:', err);
        setShowInstructionsModal(true);
      }
    } else {
      // Fallback modal with step-by-step guidance for iOS/Safari, Edge, or manual installs
      setShowInstructionsModal(true);
    }
  }, [deferredPrompt]);

  // Update Service Worker callback
  const reloadAppForUpdate = useCallback(async () => {
    if (updateSWFn) {
      await updateSWFn(true);
    } else {
      window.location.reload();
    }
  }, [updateSWFn]);

  const closeInstructions = () => {
    setShowInstructionsModal(false);
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        promptInstall,
        showInstructionsModal,
        closeInstructions,
        openInstructions: () => setShowInstructionsModal(true),
        platform,
        isOnline,
        needRefresh,
        offlineReady,
        reloadAppForUpdate,
        dismissRefresh: () => setNeedRefresh(false)
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAContext;

