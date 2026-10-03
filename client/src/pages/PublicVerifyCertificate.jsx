import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, Award, Calendar, BookOpen, User, Hash, ArrowLeft } from 'lucide-react';
import SVCELogo from '../components/common/SVCELogo';

export const PublicVerifyCertificate = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState(null);

  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:5000/api`;
    }
    return 'http://localhost:5000/api';
  };

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${getApiBaseUrl()}/verify/${encodeURIComponent(token)}`);
        if (res.data && res.data.success) {
          setCertData(res.data.data);
        } else {
          setError(res.data.message || 'Unable to verify certificate.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Certificate verification failed or invalid token.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCertificate();
    } else {
      setError('Missing certificate verification token.');
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-8 px-4 sm:px-6 font-sans">
      
      {/* Top Header */}
      <div className="max-w-xl mx-auto w-full text-center">
        <div className="flex justify-center mb-3">
          <SVCELogo className="h-16 sm:h-20" />
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
          Sri Venkateswara College of Engineering
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Official Institutional Certificate Verification Portal
        </p>
      </div>

      {/* Main Content Area */}
      <div className="max-w-xl mx-auto w-full my-6">
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-700">Verifying Cryptographic Certificate Signature...</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">Querying HMAC and tamper-detection registry</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center shadow-lg">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Verification Failed</h2>
            <p className="text-xs text-red-600 mt-2 font-medium">{error}</p>
            <p className="text-xs text-slate-500 mt-2">
              This certificate record does not exist in the SVCE cryptographic registry or the verification link is invalid.
            </p>
            <div className="mt-6">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Portal
              </a>
            </div>
          </div>
        )}

        {!loading && certData && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            
            {/* Status Header Banner */}
            {certData.status === 'Valid' ? (
              <div className="bg-emerald-600 text-white p-5 text-center">
                <div className="inline-flex p-2 bg-emerald-700 rounded-full mb-2">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-lg font-extrabold tracking-wide uppercase">
                  Officially Verified Certificate
                </h2>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  Cryptographic HMAC-SHA256 signature verified against institutional registry
                </p>
              </div>
            ) : (
              <div className="bg-red-600 text-white p-5 text-center">
                <div className="inline-flex p-2 bg-red-700 rounded-full mb-2">
                  <ShieldAlert className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-lg font-extrabold tracking-wide uppercase">
                  Certificate Revoked
                </h2>
                <p className="text-xs text-red-100 font-medium mt-0.5">
                  This certificate has been revoked and is no longer valid for clearance or verification.
                </p>
              </div>
            )}

            {/* Sanitized Public Certificate Details */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Verification Status</span>
                <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                  certData.status === 'Valid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {certData.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Student Name</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{certData.student_name}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Register Number</span>
                  </div>
                  <p className="text-sm font-mono font-bold text-slate-800">{certData.register_number}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Department</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{certData.department}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Award className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Academic Batch</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{certData.batch || '2022-2026'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-semibold">Official Issue Date:</span>
                </div>
                <span className="font-mono font-bold text-slate-800">
                  {certData.issue_date ? new Date(certData.issue_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) : 'N/A'}
                </span>
              </div>

              {certData.version && certData.version > 1 && (
                <div className="text-right text-[11px] font-mono text-slate-400">
                  Certificate Revision: v{certData.version}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Portal Home
                </a>
                <span className="text-[10px] text-slate-400 font-mono">SVCE Trust & Verification Engine</span>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-xl mx-auto w-full text-center text-[10px] text-slate-400 space-y-0.5 border-t border-slate-200 pt-4">
        <p>Sri Venkateswara College of Engineering • Institutional Digital Verification System</p>
        <p>Pennalur, Sriperumbudur Tk, Tamil Nadu 602117</p>
      </div>

    </div>
  );
};

export default PublicVerifyCertificate;
