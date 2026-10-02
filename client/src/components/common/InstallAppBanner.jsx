import React, { useState, useEffect } from 'react';
import { usePWA } from '../../context/PWAContext';
import { Download, X, Sparkles, Smartphone, Monitor } from 'lucide-react';

export const InstallAppBanner = () => {
  const { isInstalled, promptInstall, isInstallable } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  if (isInstalled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-md border border-slate-700/50">
          <img src="/pwa-192x192.png" alt="SVCE App" className="w-full h-full object-contain rounded-lg" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-white tracking-wide">
              Install SVCE App
            </p>
            <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[10px] font-semibold rounded">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-slate-300 truncate">
            Add to Desktop / Mobile for quick access
          </p>
        </div>
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={promptInstall}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
          >
            Download
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppBanner;
