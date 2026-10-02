import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { WifiOff, RefreshCw, X, Sparkles } from 'lucide-react';

export const PWAStatusBanners = () => {
  const { isOnline, needRefresh, reloadAppForUpdate, dismissRefresh } = usePWA();

  return (
    <>
      {/* Offline Alert Ribbon */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300">
          <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>You are currently offline. Viewing cached portal pages. Actions requiring live servers will sync when reconnected.</span>
        </div>
      )}

      {/* New Version Available Toast */}
      {needRefresh && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">Update Available</p>
            <p className="text-[11px] text-slate-300">A newer version of SVCE Portal is ready.</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={reloadAppForUpdate}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow-sm transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Update</span>
            </button>
            <button
              onClick={dismissRefresh}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Dismiss update notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAStatusBanners;
