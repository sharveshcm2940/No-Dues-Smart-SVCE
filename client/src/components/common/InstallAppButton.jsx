import React from 'react';
import { usePWA } from '../../context/PWAContext';
import { Download, CheckCircle, Smartphone } from 'lucide-react';

export const InstallAppButton = ({ variant = 'default', className = '' }) => {
  const { isInstalled, promptInstall } = usePWA();

  if (isInstalled) {
    if (variant === 'header') {
      return (
        <div className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Desktop App</span>
        </div>
      );
    }
    return null;
  }

  if (variant === 'header') {
    return (
      <button
        onClick={promptInstall}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 shadow-sm transition-all duration-150 active:scale-95 group ${className}`}
        title="Download / Install SVCE No-Dues on your Desktop or Phone"
      >
        <Download className="w-3.5 h-3.5 text-blue-600 group-hover:-translate-y-0.5 transition-transform" />
        <span>Download App</span>
      </button>
    );
  }

  if (variant === 'login') {
    return (
      <button
        onClick={promptInstall}
        type="button"
        className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 group ${className}`}
      >
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
          <Download className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-slate-800">Download SVCE App</div>
          <div className="text-[10px] text-slate-500">Install on Windows, Mac, iOS or Android</div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={promptInstall}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>Download Web App</span>
    </button>
  );
};

export default InstallAppButton;
