import React, { useState } from 'react';
import { usePWA } from '../../context/PWAContext';
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  WifiOff,
  Eye,
  Sparkles
} from 'lucide-react';

export const InstallAppModal = () => {
  const { 
    showInstructionsModal, 
    closeInstructions, 
    promptInstall, 
    isInstallable, 
    isInstalled, 
    platform 
  } = usePWA();

  const [activePlatform, setActivePlatform] = useState(
    platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'desktop'
  );
  const [showPreview, setShowPreview] = useState(false);

  if (!showInstructionsModal) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeInstructions}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-5 sm:p-6 text-white relative flex-shrink-0">
          <button
            onClick={closeInstructions}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-4">
            <img 
              src="/pwa-192x192.png" 
              alt="SVCE Logo" 
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-lg border-2 border-white/30 bg-white p-1.5 object-contain" 
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Official Progressive Web App
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Install SVCE No-Dues
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Fast, reliable & standalone access on any device
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Key Advantages */}
          <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <div className="flex flex-col items-center">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mb-1" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-700">Instant Launch</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400">Desktop / Home</span>
            </div>
            <div className="flex flex-col items-center border-x border-slate-200">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mb-1" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-700">Standalone</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400">App Window</span>
            </div>
            <div className="flex flex-col items-center">
              <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mb-1" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-700">Offline Ready</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400">Smart Cache</span>
            </div>
          </div>

          {/* If already installed */}
          {isInstalled && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">App Already Installed!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  You can launch SVCE No-Dues directly from your Desktop, Taskbar, or App drawer.
                </p>
              </div>
            </div>
          )}

          {/* Platform Tabs */}
          {!isInstalled && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Your Device:
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showPreview ? 'Hide Preview' : 'View Preview'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActivePlatform('desktop')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activePlatform === 'desktop'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setActivePlatform('android')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activePlatform === 'android'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  onClick={() => setActivePlatform('ios')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activePlatform === 'ios'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iPhone / iPad</span>
                </button>
              </div>
            </div>
          )}

          {/* App Preview Screenshot Modal */}
          {showPreview && (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 p-2 text-center animate-in fade-in duration-150">
              <img
                src={activePlatform === 'desktop' ? '/screenshot-desktop.png' : '/screenshot-mobile.png'}
                alt="SVCE App Preview"
                className="max-h-48 mx-auto rounded-lg shadow-inner object-contain"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">
                {activePlatform === 'desktop' ? 'Desktop Standalone App Preview (1280x720)' : 'Mobile Progressive Web App Preview'}
              </p>
            </div>
          )}

          {/* Instructions Step-by-Step */}
          {!isInstalled && (
            <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
              {activePlatform === 'ios' ? (
                <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</span>
                    <span className="leading-snug">
                      In Apple Safari, tap the <strong className="text-slate-800">Share button <Share className="w-3.5 h-3.5 inline text-blue-600 -mt-0.5" /></strong> in the bottom toolbar.
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">2</span>
                    <span className="leading-snug">
                      Scroll down and tap <strong className="text-slate-800">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-blue-600 -mt-0.5" /></strong>.
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">3</span>
                    <span className="leading-snug">
                      Tap <strong className="text-slate-800">Add</strong> at top right. The SVCE emblem icon is now on your home screen!
                    </span>
                  </li>
                </ol>
              ) : activePlatform === 'android' ? (
                <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</span>
                    <span className="leading-snug">
                      Tap the <strong className="text-slate-800">three dots menu (⋮)</strong> at top right of Chrome.
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">2</span>
                    <span className="leading-snug">
                      Select <strong className="text-slate-800">Install app</strong> (or <strong className="text-slate-800">Add to Home screen</strong>).
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">3</span>
                    <span className="leading-snug">
                      Tap <strong className="text-slate-800">Install</strong> to confirm.
                    </span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</span>
                    <span className="leading-snug">
                      Click the <strong className="text-slate-800">"Install Now"</strong> button below or look for the install icon ⬇️ on the right of your address bar.
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">2</span>
                    <span className="leading-snug">
                      Confirm by clicking <strong className="text-slate-800">"Install"</strong> in the browser prompt.
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">3</span>
                    <span className="leading-snug">
                      A standalone app window opens with an SVCE icon placed on your Desktop and Start Menu.
                    </span>
                  </li>
                </ol>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3 flex-shrink-0">
            <button
              onClick={closeInstructions}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
            
            {isInstallable && !isInstalled && (
              <button
                onClick={promptInstall}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Install Application Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallAppModal;

