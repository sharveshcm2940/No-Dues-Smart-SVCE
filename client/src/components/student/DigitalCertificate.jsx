import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Share2, Award, ShieldCheck, CheckCircle2, History, ChevronRight } from 'lucide-react';
import SVCELogo from '../common/SVCELogo';
import { useAlert } from '../../context/AlertContext';

export const DigitalCertificate = ({ activeRequest, profile, approvedCertificates = [] }) => {
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
          The Official SVCE Digital No-Dues Certificate will be generated automatically once all 6 institutional departments (Finance, Central Library, Dept Library - Sivakumar E, Faculty Advisor, DPC, HOD - Dr V Vidhya) approve your clearance application.
        </p>
      </div>
    );
  }

  const certNumber = selectedCert.certificate_number || `CERT-SVCE-IT-2026-${String(selectedCert.id).padStart(4, '0')}`;
  const certDate = selectedCert.completion_date ? new Date(selectedCert.completion_date).toLocaleDateString() : new Date(selectedCert.updated_at || selectedCert.request_date).toLocaleDateString();

  const qrPayload = JSON.stringify({
    institution: 'Sri Venkateswara College of Engineering (SVCE)',
    department: 'Information Technology',
    certificateNumber: certNumber,
    studentName: profile?.full_name || selectedCert.student_name,
    registerNumber: selectedCert.register_number,
    idCardNumber: selectedCert.id_card_number,
    status: 'VERIFIED_CLEARED_NO_DUES',
    dateOfIssue: certDate
  });

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'SVCE Digital No-Dues Clearance Certificate',
        text: `No-Dues Certificate ${certNumber} for ${profile?.full_name}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`Certificate No: ${certNumber}`).then(() => {
        showAlert(`Certificate No. ${certNumber} copied to clipboard!`, 'success');
      }).catch(() => {
        showAlert(`Certificate No: ${certNumber}`, 'info');
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HISTORICAL CERTIFICATES SELECTOR BAR (FOR PREVIOUS ISSUED CERTIFICATES) */}
      {certList.length > 1 && (
        <div className="bg-gradient-to-r from-slate-900 to-brand-950 p-4 rounded-lg text-white shadow-md flex flex-wrap items-center justify-between gap-3">
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Verified SVCE Institutional Clearance Certificate {selectedCert.id !== certList[0].id && '(Previously Issued)'}
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Certificate ID: <span className="font-mono font-bold text-slate-700">{certNumber}</span> | Issued Date: {certDate}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Certificate</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Save PDF Document</span>
          </button>
          <button
            onClick={handleShare}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
            title="Share Verification"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Official Certificate Paper Document (Printable Target) */}
      <div className="overflow-x-auto pb-2">
        <div 
          id="printable-certificate"
          ref={certificateRef}
          className="bg-white rounded-lg border-2 sm:border-4 border-slate-800 p-4 sm:p-12 shadow-md relative overflow-hidden text-slate-900 font-serif max-w-4xl mx-auto min-w-[320px]"
        >
          
          {/* Subtle Watermark BG */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none font-sans font-black text-6xl sm:text-8xl tracking-widest text-slate-900">
            CLEARED
          </div>

          {/* Outer ERP Border frame */}
          <div className="border border-slate-300 p-4 sm:p-8 relative z-10 bg-white/95">
          
          {/* Header Seal & Title */}
          <div className="text-center pb-6 border-b border-slate-300">
            <div className="flex justify-center mb-3">
              <SVCELogo className="h-16 sm:h-20" />
            </div>
            
            <div className="inline-block mt-2 px-6 py-1.5 bg-slate-900 text-white font-sans font-bold text-xs uppercase tracking-widest rounded-sm">
              OFFICIAL NO-DUES CLEARANCE CERTIFICATE
            </div>
          </div>

          {/* Body Statement */}
          <div className="py-8 font-sans text-xs leading-relaxed text-slate-800 space-y-4">
            <div className="flex justify-between items-center text-xs font-mono text-slate-600 border-b border-slate-100 pb-2">
              <span>CERTIFICATE NO: <strong>{certNumber}</strong></span>
              <span>ISSUANCE DATE: <strong>{certDate}</strong></span>
            </div>

            <p className="text-sm text-slate-800 leading-relaxed font-serif pt-2">
              This is to certify that student <strong>{profile?.full_name || selectedCert.student_name}</strong> bearing 
              Register Number <strong>{selectedCert.register_number}</strong> (ID Card No: <strong>{selectedCert.id_card_number}</strong>) 
              enrolled in <strong>{profile?.programme || 'B.Tech IT'}</strong>, Batch <strong>{profile?.batch || '2022-2026'}</strong> has 
              satisfactorily cleared all non-academic, financial, central library, IT department library (Sivakumar E), faculty advisor, DPC, and HOD (Dr V Vidhya) clearance requirements across Sri Venkateswara College of Engineering.
            </p>

            {/* Department Sign-Off Grid */}
            <div className="my-6 bg-slate-50 border border-slate-200 rounded p-4 font-sans text-xs">
              <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider text-slate-500">
                VERIFIED & APPROVED INSTITUTIONAL SECTORS
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>1. SVCE Finance Office</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>2. Central Library</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-brand-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>3. IT Dept Library (Sivakumar E)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>4. Faculty Advisor ({profile?.advisor_name || 'V Praveenkumar'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>5. DPC Committee</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>6. HOD (Dr V Vidhya)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Digital Signatures & QR Stamp */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 items-end gap-6 font-sans">
            
            {/* QR Code Verification Stamp */}
            <div className="text-center sm:text-left">
              <div className="bg-white p-2 border border-slate-200 inline-block rounded shadow-xs">
                <QRCodeSVG value={qrPayload} size={85} level="H" />
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Scan to Verify Authenticity</p>
            </div>

            {/* Digital Signature 1 */}
            <div className="text-center">
              <div className="h-10 flex items-center justify-center font-serif text-slate-600 text-xs italic">
                [ Digitally Signed ]
              </div>
              <div className="border-t border-slate-400 pt-1">
                <p className="font-bold text-xs text-slate-800">{profile?.advisor_name || 'V Praveenkumar'}</p>
                <p className="text-[11px] text-slate-500">Assigned Faculty Advisor</p>
              </div>
            </div>

            {/* Digital Signature 2 */}
            <div className="text-center sm:text-right">
              <div className="h-10 flex items-center justify-center font-serif text-slate-600 text-xs italic">
                [ Digitally Signed ]
              </div>
              <div className="border-t border-slate-400 pt-1">
                <p className="font-bold text-xs text-slate-800">Dr V Vidhya</p>
                <p className="text-[11px] text-slate-500">Head of Department (IT)</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
    </div>
  );
};

export default DigitalCertificate;
