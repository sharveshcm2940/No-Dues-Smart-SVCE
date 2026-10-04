import React, { useState, useEffect } from 'react';
import { hasLocationConsent, setLocationConsent } from '../services/locationService';

export default function PrivacyNoticePage() {
  const [gpsConsent, setGpsConsent] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setGpsConsent(hasLocationConsent());
  }, []);

  const handleToggleConsent = () => {
    const nextState = !gpsConsent;
    setLocationConsent(nextState);
    setGpsConsent(nextState);

    // If authenticated, sync with server consent API
    const token = localStorage.getItem('nodues_jwt_token') || sessionStorage.getItem('nodues_jwt_token');
    if (token) {
      fetch('/api/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          purpose: 'GEOLOCATION_AUDIT',
          status: nextState ? 'Granted' : 'Revoked',
          policyVersion: 'v1.0'
        })
      }).catch(() => {});
    }

    setSaveMessage(nextState ? 'Coarse GPS location auditing enabled.' : 'GPS location auditing disabled. Only standard IP and User-Agent will be logged.');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-700/80 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/30">
                DPDP Act 2023 Compliant
              </span>
              <span className="text-xs text-slate-400">Policy Version 1.0 (Oct 2026)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-2 text-white">
              Institutional Privacy & Data Protection Notice
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Sri Venkateswara College of Engineering (Autonomous) — Information Technology Department
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="self-start md:self-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition"
          >
            ← Return to ERP Portal
          </button>
        </div>

        {/* Dynamic Consent Management Card */}
        <div className="my-8 bg-slate-900/80 border border-emerald-500/30 rounded-xl p-5 md:p-6 shadow-inner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h3 className="font-semibold text-white text-base">
                  Geolocation Auditing Preference (Opt-in)
                </h3>
              </div>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                By default, your logins are audited using IP address and User-Agent only. When opted in, GPS is coarse-rounded to ~2 decimal places (~1.1 km radius) solely for campus login anomaly detection. GPS is never shared with third parties.
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <button
                onClick={handleToggleConsent}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md ${
                  gpsConsent 
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {gpsConsent ? 'Disable GPS Auditing' : 'Enable Coarse GPS Auditing'}
              </button>
              <span className="text-xs text-slate-400">
                Current Status: <strong className={gpsConsent ? 'text-emerald-400' : 'text-slate-400'}>{gpsConsent ? 'OPTED IN (Coarse ~1km)' : 'OPTED OUT (IP Only)'}</strong>
              </span>
            </div>
          </div>
          {saveMessage && (
            <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs animate-fade-in">
              {saveMessage}
            </div>
          )}
        </div>

        {/* Notice Content */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Data Fiduciary Information
            </h2>
            <p>
              Sri Venkateswara College of Engineering (SVCE), Post Bag No. 1, Pennalur, Sriperumbudur, Tamil Nadu 602117, operates as the Data Fiduciary under the Digital Personal Data Protection Act, 2023 for all clearance workflows processed through the Smart No-Dues ERP system.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">2.</span> Purpose of Data Processing
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li><strong>Academic Clearance:</strong> Verification of library books, laboratory equipment, departmental dues, and examination fee settlements.</li>
              <li><strong>Institutional Accountability:</strong> Issuance of cryptographically signed Digital No-Dues Certificates and university hall tickets.</li>
              <li><strong>Security & Anomaly Prevention:</strong> Login session verification using IP address and device signatures to detect account hijacking.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">3.</span> Categories of Data Processed & Masking Rules
            </h2>
            <p className="mb-2">
              The ERP enforces strict role-based data minimization. Roles without a legitimate academic necessity have sensitive personal data masked:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg">
                <span className="font-semibold text-emerald-400">Personal Contact Data:</span>
                <p className="mt-1 text-slate-400">Student phone numbers and personal emails are masked for library officers and finance staff, and accessible only by assigned Faculty Advisors and HOD.</p>
              </div>
              <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg">
                <span className="font-semibold text-emerald-400">Placement & CTC Package:</span>
                <p className="mt-1 text-slate-400">Compensation packages and career pathway offer letters are confidential and viewable solely by the student, DPC, and HOD.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">4.</span> Append-Only Cryptographic Audit Logs & Retention
            </h2>
            <p>
              All workflow approvals and administrative actions are committed to an append-only cryptographic ledger using SHA-256 hash chaining. In compliance with the principle of storage limitation, transient login logs are scheduled for automated purging after 90 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Your Rights under DPDP Act 2023
            </h2>
            <p>
              As a Data Principal, you possess the right to access summaries of personal data processed, request correction of inaccurate records, withdraw consent for optional processing (e.g. coarse GPS auditing) at any time, and seek grievance redressal via the IT Department Grievance Cell at <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">hodit@svce.ac.in</code>.
            </p>
          </section>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-500">
        © 2026 Sri Venkateswara College of Engineering. All rights reserved. Automated DPDP Compliance Suite.
      </footer>
    </div>
  );
}
