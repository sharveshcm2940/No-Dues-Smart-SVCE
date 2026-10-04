import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Share2, Award, ShieldCheck, CheckCircle2, History, ExternalLink } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';

export const DigitalCertificate = ({ activeRequest, profile, stages = [], approvedCertificates = [] }) => {
  const { showAlert } = useAlert();
  const certificateRef = useRef(null);

  // Combine and deduplicate approved requests
  const certList = React.useMemo(() => {
    const map = new Map();
    if (activeRequest && activeRequest.overall_status === 'Approved') {
      map.set(activeRequest.id, activeRequest);
    }
    approvedCertificates.forEach(cert => {
      if (cert.overall_status === 'Approved') {
        map.set(cert.id, cert);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.id - a.id);
  }, [activeRequest, approvedCertificates]);

  const [selectedCertId, setSelectedCertId] = useState(certList.length > 0 ? certList[0].id : null);

  useEffect(() => {
    if (certList.length > 0 && !selectedCertId) {
      setSelectedCertId(certList[0].id);
    }
  }, [certList, selectedCertId]);

  const selectedCert = certList.find(c => c.id === selectedCertId) || certList[0];

  if (!selectedCert) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4 border border-amber-200">
          <Award className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">No Certificates Issued Yet</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          The Official SVCE Digital No-Dues Certificate will be generated automatically once all institutional departments (Dept Library, Faculty Advisor, HOD, Accounts Section, and Central Library) approve your clearance application.
        </p>
      </div>
    );
  }

  const certNumber = selectedCert.certificate_number || `CERT-SVCE-IT-2026-${String(selectedCert.id).padStart(4, '0')}`;
  const certDate = selectedCert.completion_date ? new Date(selectedCert.completion_date).toLocaleDateString() : new Date(selectedCert.updated_at || selectedCert.request_date).toLocaleDateString();
  const certToken = selectedCert.certificate_token || selectedCert.verification_code || String(selectedCert.id);
  const publicBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const verifyUrl = `${publicBaseUrl}/verify/${certToken}`;

  // Stage lookup helpers
  const getStageInfo = (namePattern) => {
    const stage = stages.find(s => s.department_name && s.department_name.toLowerCase().includes(namePattern.toLowerCase()));
    if (!stage) return { status: 'Approved', approver: '', date: certDate };
    return {
      status: stage.status,
      approver: stage.approved_by || '',
      date: stage.updated_at ? new Date(stage.updated_at).toLocaleDateString() : certDate
    };
  };

  const deptLib = getStageInfo('Department Library');
  const fa = getStageInfo('Faculty Advisor');
  const hod = getStageInfo('Head of Department');
  const accounts = getStageInfo('Finance') || getStageInfo('Accounts');
  const centralLib = getStageInfo('Central Library');

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'SVCE Digital No-Dues Clearance Certificate',
        text: `No-Dues Certificate ${certNumber} for ${profile?.full_name}`,
        url: verifyUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(verifyUrl).then(() => {
        showAlert(`Verification Link copied to clipboard!`, 'success');
      }).catch(() => {
        showAlert(`Certificate No: ${certNumber}`, 'info');
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HISTORICAL CERTIFICATES SELECTOR BAR (FOR PREVIOUS ISSUED CERTIFICATES) */}
      {certList.length > 1 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-lg text-white shadow-md flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-tight text-white">Issued Certificates Vault ({certList.length} Certificates Available)</h4>
              <p className="text-[11px] text-slate-300">Select any previously issued No-Dues clearance certificate to view or print</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCert?.id || ''}
              onChange={(e) => setSelectedCertId(Number(e.target.value))}
              className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {certList.map((cert, index) => (
                <option key={cert.id} value={cert.id}>
                  {index === 0 ? 'Latest Certificate' : `Previous Certificate #${certList.length - index}`} ({cert.certificate_number || `CERT-${cert.id}`}) - {new Date(cert.request_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Official SVCE No Due Certificate {selectedCert.id !== certList[0].id && '(Previously Issued)'}
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Form Ref: <span className="font-mono font-bold text-slate-700">FT/GN/51/01/08.04.15</span> | Cert ID: <span className="font-mono font-bold text-slate-700">{certNumber}</span> | Issued: {certDate}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Official Form</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Save PDF Document</span>
          </button>
          <button
            onClick={handleShare}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
            title="Share Verification Link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-brand-600 rounded-lg transition-colors"
            title="Open Public Verification"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Official Certificate Paper Document (Matching Exact Institutional Screenshot) */}
      <div className="overflow-x-auto pb-4">
        <div 
          id="printable-certificate"
          ref={certificateRef}
          className="bg-white p-6 sm:p-10 shadow-lg border border-slate-300 max-w-[950px] mx-auto min-w-[700px] text-black font-sans relative"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >

          {/* ========================================================================= */}
          {/* HEADER SECTION (SVCE SEAL, COLLEGE NAME, FORM NUMBER & TITLE)             */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between gap-4 mb-2">
            
            {/* SVCE Official Circular Emblem */}
            <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <img 
                src="/svce_seal.png" 
                alt="SVCE Seal" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Institution Title & Document Reference Code */}
            <div className="grow text-center">
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-normal uppercase leading-tight">
                SRI VENKATESWARA COLLEGE OF ENGINEERING
              </h1>
              
              <div className="text-right text-xs sm:text-sm font-semibold text-black mt-1">
                FT/<span className="italic font-bold">GN</span>/51/01/08.04.15
              </div>
            </div>

          </div>

          {/* Centered Document Title */}
          <div className="text-center my-3">
            <h2 className="text-sm sm:text-base font-bold text-black uppercase tracking-normal">
              NO DUE CERTIFICATE– III V VII sem UG &amp; III sem  PG ( AY 2026 – 2027)
            </h2>
          </div>

          {/* ========================================================================= */}
          {/* MAIN INSTITUTIONAL CLEARANCE GRID (EXACT SCREENSHOT LAYOUT)               */}
          {/* ========================================================================= */}
          <table 
            className="w-full border-collapse border-[2.5px] border-black text-black text-xs sm:text-sm"
            style={{ border: '2.5px solid black' }}
          >
            <tbody>

              {/* ROW 1: Student Name, Reg.No, Admission NO */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 sm:p-2.5 w-[42%]">
                  <span className="font-normal text-black">Student Name: </span>
                  <span className="font-bold uppercase text-black ml-1">
                    {profile?.full_name || selectedCert.student_name}
                  </span>
                </td>
                <td className="border-r border-black p-2 sm:p-2.5 w-[28%]">
                  <span className="font-normal text-black">Reg.No: </span>
                  <span className="font-bold text-black ml-1">
                    {selectedCert.register_number || profile?.register_number}
                  </span>
                </td>
                <td className="p-2 sm:p-2.5 w-[30%]">
                  <span className="font-normal text-black">Admission NO </span>
                  <span className="font-bold text-black ml-1">
                    {profile?.admission_no || profile?.id_card_number || selectedCert.id_card_number || 'ADM-' + (selectedCert.register_number || '2022')}
                  </span>
                </td>
              </tr>

              {/* ROW 2: Branch, Section & Roll No */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 sm:p-2.5">
                  <span className="font-normal text-black">Branch: </span>
                  <span className="font-bold text-black ml-1">
                    {profile?.department || profile?.branch || 'Information Technology'}
                  </span>
                </td>
                <td colSpan={2} className="p-2 sm:p-2.5">
                  <span className="font-normal text-black">Section &amp; Roll No: </span>
                  <span className="font-bold text-black ml-1">
                    {profile?.section || 'A'} &amp; {profile?.roll_no || selectedCert.register_number}
                  </span>
                </td>
              </tr>

              {/* ROW 3: Department Library */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 sm:p-2.5 font-normal text-black">
                  Department Library
                </td>
                <td colSpan={2} className="p-2 sm:p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-xs sm:text-sm tracking-wide">
                      CLEARED / NIL DUES
                    </span>
                    <span className="text-[11px] text-slate-700 italic font-medium">
                      {deptLib.approver || 'Sivakumar E (IT Dept Library)'} • {deptLib.date}
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 4: Faculty Advisor */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 sm:p-2.5 font-normal text-black">
                  Faculty Advisor
                </td>
                <td colSpan={2} className="p-2 sm:p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-xs sm:text-sm tracking-wide">
                      RECOMMENDED &amp; APPROVED
                    </span>
                    <span className="text-[11px] text-slate-700 italic font-medium">
                      {fa.approver || profile?.advisor_name || 'V Praveenkumar'} • {fa.date}
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 5: Signature of HOD (FULL WIDTH BANNER) */}
              <tr className="border-b border-black">
                <td colSpan={3} className="p-2 sm:p-2.5 text-center">
                  <div className="font-bold text-black text-sm tracking-wide">
                    Signature of HOD
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-3">
                    <span className="inline-block px-2.5 py-0.5 border border-emerald-700 rounded text-emerald-800 text-xs font-bold bg-emerald-50/50">
                      Digitally Approved &amp; Signed
                    </span>
                    <span className="text-xs text-slate-800 font-semibold">
                      {hod.approver || 'Dr. V. Vidhya, Professor & HOD (IT)'} • {hod.date}
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 6: Office - Accounts section */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 sm:p-2.5 font-normal text-black">
                  Office - &nbsp;Accounts section
                </td>
                <td colSpan={2} className="p-2 sm:p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-xs sm:text-sm tracking-wide">
                      CLEARED / NO DUES PENDING
                    </span>
                    <span className="text-[11px] text-slate-700 italic font-medium">
                      {accounts.approver || 'Finance & Accounts Officer'} • {accounts.date}
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 7: Central Library */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 sm:p-2.5 font-normal text-black">
                  Central Library
                </td>
                <td colSpan={2} className="p-2 sm:p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-xs sm:text-sm tracking-wide">
                      CLEARED / NIL DUES
                    </span>
                    <span className="text-[11px] text-slate-700 italic font-medium">
                      {centralLib.approver || 'Central Library Staff'} • {centralLib.date}
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 8: Signature of the student */}
              <tr>
                <td colSpan={3} className="p-2.5 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-normal text-black">Signature of the student :: </span>
                      <span className="font-serif italic font-bold text-slate-800 text-sm sm:text-base ml-2">
                        {profile?.full_name || selectedCert.student_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Digitally Signed Upon Application)
                    </span>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>

          {/* ========================================================================= */}
          {/* FOOTER NOTICE (MANDATORY INSTITUTIONAL NOTICE)                             */}
          {/* ========================================================================= */}
          <div className="text-center font-bold text-black text-xs sm:text-sm mt-3 tracking-normal">
            &quot;DUES, IF ANY ARISES, WILL BE COMMUNICATED AT THE APPROPRIATE TIME&quot;
          </div>

          {/* ========================================================================= */}
          {/* DIGITAL AUTHENTICITY STAMP & VERIFICATION QR STRIP                         */}
          {/* ========================================================================= */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-slate-600 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white border border-slate-300 rounded shadow-2xs">
                <QRCodeSVG value={verifyUrl} size={68} level="H" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Official Digital Verification</p>
                <p className="text-[10px] text-slate-500 font-mono">Scan QR or visit <span className="underline">{publicBaseUrl}/verify/...</span></p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Cert No: <strong className="text-slate-800">{certNumber}</strong></p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>HMAC-SHA256 Cryptographically Secured</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Sri Venkateswara College of Engineering (Autonomous)</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default DigitalCertificate;
