import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Building2, 
  ShieldCheck, 
  Award,
  Plus,
  Briefcase,
  GraduationCap,
  FileSpreadsheet,
  Lightbulb,
  Upload,
  FileText,
  X
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

export const NoDuesTracker = ({ activeRequest, stages = [], onSubmitRequest, onCancelRequest, profile }) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [declared, setDeclared] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 4th Year Career Pathway Form State
  const [careerOption, setCareerOption] = useState('Placements');

  // Option A - Placements
  const [companyName, setCompanyName] = useState('');
  const [jobDesignation, setJobDesignation] = useState('');
  const [ctcPackage, setCtcPackage] = useState('');
  const [offerLetterUrl, setOfferLetterUrl] = useState('');
  const [offerLetterName, setOfferLetterName] = useState('');

  // Option B - Higher Studies
  const [higherCollegeName, setHigherCollegeName] = useState('');
  const [higherDegree, setHigherDegree] = useState('');
  const [higherAppFormUrl, setHigherAppFormUrl] = useState('');
  const [higherAppFormName, setHigherAppFormName] = useState('');
  const [higherScorecardUrl, setHigherScorecardUrl] = useState('');
  const [higherScorecardName, setHigherScorecardName] = useState('');
  const [higherContact, setHigherContact] = useState('');

  // Option C - Competitive Exams
  const [examName, setExamName] = useState('');
  const [examRegNo, setExamRegNo] = useState('');
  const [admitCardUrl, setAdmitCardUrl] = useState('');
  const [admitCardName, setAdmitCardName] = useState('');
  const [examDetails, setExamDetails] = useState('');

  // Option E - Entrepreneurship
  const [startupName, setStartupName] = useState('');
  const [businessIdea, setBusinessIdea] = useState('');
  const [businessDetails, setBusinessDetails] = useState('');
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [pitchDeckName, setPitchDeckName] = useState('');

  // File Upload Reader Handler (Converts file to base64 data URL)
  const handleFileUpload = (e, setUrlState, setFileNameState) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit. Please upload a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUrlState(reader.result);
      if (setFileNameState) setFileNameState(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!declared) {
      alert('Please accept the student declaration before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        forceNew: true,
        remarks,
        career_option: careerOption,
        // Option A
        company_name: companyName,
        job_designation: jobDesignation,
        ctc_package: ctcPackage,
        offer_letter_url: offerLetterUrl,
        // Option B
        higher_college_name: higherCollegeName,
        higher_degree: higherDegree,
        higher_app_form_url: higherAppFormUrl,
        higher_scorecard_url: higherScorecardUrl,
        higher_contact: higherContact,
        // Option C
        exam_name: examName,
        exam_reg_no: examRegNo,
        admit_card_url: admitCardUrl,
        exam_details: examDetails,
        // Option E
        startup_name: startupName,
        business_idea: businessIdea,
        business_details: businessDetails,
        pitch_deck_url: pitchDeckUrl
      };

      await onSubmitRequest(payload);
      setShowSubmitModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeRequest) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 mx-auto mb-4 border border-brand-200">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">No Active Clearance Request</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
          Submit your online No-Dues clearance application with document uploads to initiate multi-department verification across Finance, Central Library, IT Department Library, Faculty Advisor, DPC, and HOD.
        </p>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 mx-auto"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Submit Online No-Dues Application</span>
        </button>

        {/* Submission Form Modal */}
        <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit New No-Dues Clearance Application with Document Upload">
          <form onSubmit={handleModalSubmit} className="space-y-4 text-xs text-left max-h-[80vh] overflow-y-auto pr-1">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
              <p><span className="font-semibold text-slate-700">Student Name:</span> {profile?.full_name}</p>
              <p><span className="font-semibold text-slate-700">Register Number:</span> {profile?.register_number}</p>
              <p><span className="font-semibold text-slate-700">Department:</span> {profile?.department || 'Information Technology'}</p>
              <p><span className="font-semibold text-slate-700">Academic Term:</span> Academic Year 2025 - 2026 ({profile?.year || 'IV Year'})</p>
            </div>

            {/* CAREER PATHWAY SELECTION FOR 4TH YEAR STUDENTS */}
            <div className="space-y-3 bg-brand-50/40 p-4 rounded-lg border border-brand-200">
              <label className="block font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-brand-600" />
                <span>Select Career Pathway & Upload Required Documents *</span>
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                
                {/* Option A */}
                <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                  careerOption === 'Placements' ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="careerOption"
                    value="Placements"
                    checked={careerOption === 'Placements'}
                    onChange={(e) => setCareerOption(e.target.value)}
                    className="text-blue-600"
                  />
                  <span>Option A: Placements</span>
                </label>

                {/* Option B */}
                <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                  careerOption === 'Higher Studies' ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="careerOption"
                    value="Higher Studies"
                    checked={careerOption === 'Higher Studies'}
                    onChange={(e) => setCareerOption(e.target.value)}
                    className="text-purple-600"
                  />
                  <span>Option B: Higher Studies</span>
                </label>

                {/* Option C */}
                <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                  careerOption === 'Competitive Exams' ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="careerOption"
                    value="Competitive Exams"
                    checked={careerOption === 'Competitive Exams'}
                    onChange={(e) => setCareerOption(e.target.value)}
                    className="text-amber-600"
                  />
                  <span>Option C: Competitive Exams</span>
                </label>

                {/* Option E */}
                <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                  careerOption === 'Entrepreneurship' ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="careerOption"
                    value="Entrepreneurship"
                    checked={careerOption === 'Entrepreneurship'}
                    onChange={(e) => setCareerOption(e.target.value)}
                    className="text-emerald-600"
                  />
                  <span>Option E: Entrepreneurship</span>
                </label>

              </div>

              {/* DYNAMIC FORM FIELDS BASED ON CAREER OPTION */}
              
              {/* Option A: Placements Form */}
              {careerOption === 'Placements' && (
                <div className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-3 mt-2">
                  <h5 className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Option A: Campus Placement Details & Document Upload</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Zoho Corporation / TCS / Cognizant"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Job Designation *</label>
                      <input
                        type="text"
                        value={jobDesignation}
                        onChange={(e) => setJobDesignation(e.target.value)}
                        placeholder="e.g. Software Engineer / Product Analyst"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CTC Package (LPA) *</label>
                      <input
                        type="text"
                        value={ctcPackage}
                        onChange={(e) => setCtcPackage(e.target.value)}
                        placeholder="e.g. 8.5 LPA"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    
                    {/* FILE UPLOAD: OFFER LETTER */}
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Upload Offer Letter Document (PDF/Image) *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, setOfferLetterUrl, setOfferLetterName)}
                          className="hidden"
                          id="offer-letter-file"
                        />
                        <label
                          htmlFor="offer-letter-file"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold border border-blue-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          <span>Upload File...</span>
                        </label>
                        {offerLetterName ? (
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span className="truncate max-w-[130px]">{offerLetterName}</span>
                            <button
                              type="button"
                              onClick={() => { setOfferLetterUrl(''); setOfferLetterName(''); }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No file selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Option B: Higher Studies Form */}
              {careerOption === 'Higher Studies' && (
                <div className="bg-white p-3.5 rounded-lg border border-purple-200 space-y-3 mt-2">
                  <h5 className="font-bold text-purple-900 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span>Option B: Higher Studies Admission Details & Document Upload</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Target University / College Details *</label>
                      <input
                        type="text"
                        value={higherCollegeName}
                        onChange={(e) => setHigherCollegeName(e.target.value)}
                        placeholder="e.g. Carnegie Mellon University / IIT Madras"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Degree & Program *</label>
                      <input
                        type="text"
                        value={higherDegree}
                        onChange={(e) => setHigherDegree(e.target.value)}
                        placeholder="e.g. MS in Computer Science"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    
                    {/* FILE UPLOAD: APPLICATION FORM */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Upload Application Form *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, setHigherAppFormUrl, setHigherAppFormName)}
                          className="hidden"
                          id="higher-app-file"
                        />
                        <label
                          htmlFor="higher-app-file"
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold border border-purple-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-purple-600" />
                          <span>Upload App File...</span>
                        </label>
                        {higherAppFormName ? (
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                            <span className="truncate max-w-[120px]">{higherAppFormName}</span>
                            <button
                              type="button"
                              onClick={() => { setHigherAppFormUrl(''); setHigherAppFormName(''); }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No file</span>
                        )}
                      </div>
                    </div>

                    {/* FILE UPLOAD: SCORECARD */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Upload GRE/GATE/TOEFL Scorecard *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, setHigherScorecardUrl, setHigherScorecardName)}
                          className="hidden"
                          id="higher-score-file"
                        />
                        <label
                          htmlFor="higher-score-file"
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold border border-purple-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-purple-600" />
                          <span>Upload Scorecard...</span>
                        </label>
                        {higherScorecardName ? (
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                            <span className="truncate max-w-[120px]">{higherScorecardName}</span>
                            <button
                              type="button"
                              onClick={() => { setHigherScorecardUrl(''); setHigherScorecardName(''); }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No file</span>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Contact / Admission Reference Info *</label>
                      <input
                        type="text"
                        value={higherContact}
                        onChange={(e) => setHigherContact(e.target.value)}
                        placeholder="e.g. App ID: CMU-2026-9901 | Contact: admissions@cmu.edu"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Option C: Competitive Exams Form */}
              {careerOption === 'Competitive Exams' && (
                <div className="bg-white p-3.5 rounded-lg border border-amber-200 space-y-3 mt-2">
                  <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    <span>Option C: Competitive Exam Details & Admit Card Upload</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Exam Name *</label>
                      <input
                        type="text"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        placeholder="e.g. GATE 2026 CS/IT / CAT 2025 / UPSC"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Registration / Roll Details *</label>
                      <input
                        type="text"
                        value={examRegNo}
                        onChange={(e) => setExamRegNo(e.target.value)}
                        placeholder="e.g. CS26S33012901"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    
                    {/* FILE UPLOAD: ADMIT CARD */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Upload Admit Card / Scorecard Document *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, setAdmitCardUrl, setAdmitCardName)}
                          className="hidden"
                          id="admit-card-file"
                        />
                        <label
                          htmlFor="admit-card-file"
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-600" />
                          <span>Upload Admit Card...</span>
                        </label>
                        {admitCardName ? (
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span className="truncate max-w-[130px]">{admitCardName}</span>
                            <button
                              type="button"
                              onClick={() => { setAdmitCardUrl(''); setAdmitCardName(''); }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No file</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Exam Score / Percentile *</label>
                      <input
                        type="text"
                        value={examDetails}
                        onChange={(e) => setExamDetails(e.target.value)}
                        placeholder="e.g. Scored 99.4 percentile in GATE CS"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Option E: Entrepreneurship Form */}
              {careerOption === 'Entrepreneurship' && (
                <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-3 mt-2">
                  <h5 className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                    <span>Option E: Entrepreneurship Details & Pitch Deck Upload</span>
                  </h5>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Startup / Business Name *</label>
                        <input
                          type="text"
                          value={startupName}
                          onChange={(e) => setStartupName(e.target.value)}
                          placeholder="e.g. Nexus AI Solutions Pvt Ltd"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                          required
                        />
                      </div>
                      
                      {/* FILE UPLOAD: PITCH DECK */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Upload Pitch Deck / Incubation Document *</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
                            onChange={(e) => handleFileUpload(e, setPitchDeckUrl, setPitchDeckName)}
                            className="hidden"
                            id="pitch-deck-file"
                          />
                          <label
                            htmlFor="pitch-deck-file"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Upload Pitch Deck...</span>
                          </label>
                          {pitchDeckName ? (
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="truncate max-w-[130px]">{pitchDeckName}</span>
                              <button
                                type="button"
                                onClick={() => { setPitchDeckUrl(''); setPitchDeckName(''); }}
                                className="text-red-500 hover:text-red-700 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No file</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Business Idea / Executive Summary *</label>
                      <textarea
                        rows={2}
                        value={businessIdea}
                        onChange={(e) => setBusinessIdea(e.target.value)}
                        placeholder="Describe your business idea and venture product summary..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Additional Student Remarks (Optional)</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any relevant note for DPC placement officer..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 h-4 w-4"
                  required
                />
                <span className="text-[11px] leading-relaxed">
                  I hereby declare that I am submitting verified career pathway documentation to the Department Placement Coordinator (DPC) for official No-Dues clearance.
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Confirm & Submit Application'}</span>
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  const getStageIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'Hold':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Request Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Request Application #{activeRequest.request_number}
            </h3>
            <Badge>{activeRequest.overall_status}</Badge>
            {activeRequest.career_option && (
              <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-800 font-bold border border-blue-200 rounded">
                Career: {activeRequest.career_option}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submitted Date: {new Date(activeRequest.request_date).toLocaleDateString()} | Department: {activeRequest.department}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Request</span>
          </button>

          {activeRequest.overall_status === 'In Progress' && (
            <button
              onClick={() => onCancelRequest(activeRequest.id)}
              className="px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel Request
            </button>
          )}

          {activeRequest.overall_status === 'Approved' && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold">
              <Award className="w-4 h-4" />
              <span>Digital Certificate Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Percentage Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
          <span>Multi-Department Clearance Progress</span>
          <span className="text-brand-600">{activeRequest.progress_percentage}% Completed</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
          <div 
            className="bg-brand-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${activeRequest.progress_percentage}%` }}
          ></div>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 font-medium">
          Current Processing Stage: <strong className="text-slate-800">{activeRequest.current_stage}</strong>
        </p>
      </div>

      {/* Live Stage Timeline (Real-Time Department Approvals) */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-6 tracking-tight flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-600" />
          <span>Real-Time Stage-by-Stage Department Approvals</span>
        </h4>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {stages.map((st) => {
            const isFinished = st.status === 'Approved';
            const isCurrent = activeRequest.current_stage.includes(st.department_name);

            return (
              <div key={st.id} className="relative flex items-start group">
                
                {/* Node Bullet */}
                <div className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center z-10">
                  {getStageIcon(st.status)}
                </div>

                {/* Stage Content */}
                <div className={`flex-1 ml-4 p-4 rounded-lg border transition-all ${
                  isCurrent 
                    ? 'border-brand-500 bg-brand-50/20 shadow-xs' 
                    : isFinished 
                    ? 'border-slate-200 bg-slate-50/50' 
                    : 'border-slate-100 bg-white opacity-80'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Stage {st.stage_order}
                      </span>
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {st.department_name}
                        {st.department_name === 'DPC' && (
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold border border-indigo-200">
                            Placement Officer Verification
                          </span>
                        )}
                      </h5>
                    </div>

                    <Badge>{st.status}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Verified / Approved By:</span>{' '}
                      {st.approved_by || 'Pending Officer Review'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Timestamp:</span>{' '}
                      {st.updated_at ? new Date(st.updated_at).toLocaleString() : 'Waiting'}
                    </div>
                  </div>

                  {st.remarks && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs text-slate-600 italic">
                      <span className="font-semibold not-italic text-slate-700">Official Remarks:</span> "{st.remarks}"
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Submission Form Modal */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit New No-Dues Clearance Application with Document Upload">
        <form onSubmit={handleModalSubmit} className="space-y-4 text-xs text-left max-h-[80vh] overflow-y-auto pr-1">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
            <p><span className="font-semibold text-slate-700">Student Name:</span> {profile?.full_name}</p>
            <p><span className="font-semibold text-slate-700">Register Number:</span> {profile?.register_number}</p>
            <p><span className="font-semibold text-slate-700">Department:</span> {profile?.department || 'Information Technology'}</p>
            <p><span className="font-semibold text-slate-700">Academic Term:</span> Academic Year 2025 - 2026 ({profile?.year || 'IV Year'})</p>
          </div>

          {/* CAREER PATHWAY SELECTION FOR 4TH YEAR STUDENTS */}
          <div className="space-y-3 bg-brand-50/40 p-4 rounded-lg border border-brand-200">
            <label className="block font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-brand-600" />
              <span>Select Career Pathway & Upload Required Documents *</span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              
              {/* Option A */}
              <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                careerOption === 'Placements' ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="careerOption"
                  value="Placements"
                  checked={careerOption === 'Placements'}
                  onChange={(e) => setCareerOption(e.target.value)}
                  className="text-blue-600"
                />
                <span>Option A: Placements</span>
              </label>

              {/* Option B */}
              <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                careerOption === 'Higher Studies' ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="careerOption"
                  value="Higher Studies"
                  checked={careerOption === 'Higher Studies'}
                  onChange={(e) => setCareerOption(e.target.value)}
                  className="text-purple-600"
                />
                <span>Option B: Higher Studies</span>
              </label>

              {/* Option C */}
              <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                careerOption === 'Competitive Exams' ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="careerOption"
                  value="Competitive Exams"
                  checked={careerOption === 'Competitive Exams'}
                  onChange={(e) => setCareerOption(e.target.value)}
                  className="text-amber-600"
                />
                <span>Option C: Competitive Exams</span>
              </label>

              {/* Option E */}
              <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                careerOption === 'Entrepreneurship' ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="careerOption"
                  value="Entrepreneurship"
                  checked={careerOption === 'Entrepreneurship'}
                  onChange={(e) => setCareerOption(e.target.value)}
                  className="text-emerald-600"
                />
                <span>Option E: Entrepreneurship</span>
              </label>

            </div>

            {/* DYNAMIC FORM FIELDS BASED ON CAREER OPTION */}
            
            {/* Option A: Placements Form */}
            {careerOption === 'Placements' && (
              <div className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-3 mt-2">
                <h5 className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Option A: Campus Placement Details & Document Upload</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Zoho Corporation / TCS / Cognizant"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Job Designation *</label>
                    <input
                      type="text"
                      value={jobDesignation}
                      onChange={(e) => setJobDesignation(e.target.value)}
                      placeholder="e.g. Software Engineer / Product Analyst"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CTC Package (LPA) *</label>
                    <input
                      type="text"
                      value={ctcPackage}
                      onChange={(e) => setCtcPackage(e.target.value)}
                      placeholder="e.g. 8.5 LPA"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>

                  {/* FILE UPLOAD: OFFER LETTER */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">Upload Offer Letter Document (PDF/Image) *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, setOfferLetterUrl, setOfferLetterName)}
                        className="hidden"
                        id="offer-letter-file"
                      />
                      <label
                        htmlFor="offer-letter-file"
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold border border-blue-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload File...</span>
                      </label>
                      {offerLetterName ? (
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span className="truncate max-w-[130px]">{offerLetterName}</span>
                          <button
                            type="button"
                            onClick={() => { setOfferLetterUrl(''); setOfferLetterName(''); }}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Option B: Higher Studies Form */}
            {careerOption === 'Higher Studies' && (
              <div className="bg-white p-3.5 rounded-lg border border-purple-200 space-y-3 mt-2">
                <h5 className="font-bold text-purple-900 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span>Option B: Higher Studies Admission Details & Document Upload</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target University / College Details *</label>
                    <input
                      type="text"
                      value={higherCollegeName}
                      onChange={(e) => setHigherCollegeName(e.target.value)}
                      placeholder="e.g. Carnegie Mellon University / IIT Madras"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Degree & Program *</label>
                    <input
                      type="text"
                      value={higherDegree}
                      onChange={(e) => setHigherDegree(e.target.value)}
                      placeholder="e.g. MS in Computer Science"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                  
                  {/* FILE UPLOAD: APPLICATION FORM */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Upload Application Form *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, setHigherAppFormUrl, setHigherAppFormName)}
                        className="hidden"
                        id="higher-app-file"
                      />
                      <label
                        htmlFor="higher-app-file"
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold border border-purple-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-purple-600" />
                        <span>Upload App File...</span>
                      </label>
                      {higherAppFormName ? (
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span className="truncate max-w-[120px]">{higherAppFormName}</span>
                          <button
                            type="button"
                            onClick={() => { setHigherAppFormUrl(''); setHigherAppFormName(''); }}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file</span>
                      )}
                    </div>
                  </div>

                  {/* FILE UPLOAD: SCORECARD */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Upload GRE/GATE/TOEFL Scorecard *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, setHigherScorecardUrl, setHigherScorecardName)}
                        className="hidden"
                        id="higher-score-file"
                      />
                      <label
                        htmlFor="higher-score-file"
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold border border-purple-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-purple-600" />
                        <span>Upload Scorecard...</span>
                      </label>
                      {higherScorecardName ? (
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span className="truncate max-w-[120px]">{higherScorecardName}</span>
                          <button
                            type="button"
                            onClick={() => { setHigherScorecardUrl(''); setHigherScorecardName(''); }}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file</span>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Contact / Admission Reference Info *</label>
                    <input
                      type="text"
                      value={higherContact}
                      onChange={(e) => setHigherContact(e.target.value)}
                      placeholder="e.g. App ID: CMU-2026-9901 | Contact: admissions@cmu.edu"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Option C: Competitive Exams Form */}
            {careerOption === 'Competitive Exams' && (
              <div className="bg-white p-3.5 rounded-lg border border-amber-200 space-y-3 mt-2">
                <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>Option C: Competitive Exam Details & Admit Card Upload</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Exam Name *</label>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      placeholder="e.g. GATE 2026 CS/IT / CAT 2025 / UPSC"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Registration / Roll Details *</label>
                    <input
                      type="text"
                      value={examRegNo}
                      onChange={(e) => setExamRegNo(e.target.value)}
                      placeholder="e.g. CS26S33012901"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                  
                  {/* FILE UPLOAD: ADMIT CARD */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Upload Admit Card / Scorecard Document *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, setAdmitCardUrl, setAdmitCardName)}
                        className="hidden"
                        id="admit-card-file"
                      />
                      <label
                        htmlFor="admit-card-file"
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-600" />
                        <span>Upload Admit Card...</span>
                      </label>
                      {admitCardName ? (
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span className="truncate max-w-[130px]">{admitCardName}</span>
                          <button
                            type="button"
                            onClick={() => { setAdmitCardUrl(''); setAdmitCardName(''); }}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No file</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Exam Score / Percentile *</label>
                    <input
                      type="text"
                      value={examDetails}
                      onChange={(e) => setExamDetails(e.target.value)}
                      placeholder="e.g. Scored 99.4 percentile in GATE CS"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Option E: Entrepreneurship Form */}
            {careerOption === 'Entrepreneurship' && (
              <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-3 mt-2">
                <h5 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-emerald-600" />
                  <span>Option E: Entrepreneurship Details & Pitch Deck Upload</span>
                </h5>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Startup / Business Name *</label>
                      <input
                        type="text"
                        value={startupName}
                        onChange={(e) => setStartupName(e.target.value)}
                        placeholder="e.g. Nexus AI Solutions Pvt Ltd"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                        required
                      />
                    </div>
                    
                    {/* FILE UPLOAD: PITCH DECK */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Upload Pitch Deck / Incubation Document *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => handleFileUpload(e, setPitchDeckUrl, setPitchDeckName)}
                          className="hidden"
                          id="pitch-deck-file"
                        />
                        <label
                          htmlFor="pitch-deck-file"
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Upload Pitch Deck...</span>
                        </label>
                        {pitchDeckName ? (
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border text-[11px] font-mono text-slate-800">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="truncate max-w-[130px]">{pitchDeckName}</span>
                            <button
                              type="button"
                              onClick={() => { setPitchDeckUrl(''); setPitchDeckName(''); }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No file</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Business Idea / Executive Summary *</label>
                    <textarea
                      rows={2}
                      value={businessIdea}
                      onChange={(e) => setBusinessIdea(e.target.value)}
                      placeholder="Describe your business idea and venture product summary..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Additional Student Remarks (Optional)</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any relevant note for DPC placement officer..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={declared}
                onChange={(e) => setDeclared(e.target.checked)}
                className="mt-0.5 rounded text-brand-600 h-4 w-4"
                required
              />
              <span className="text-[11px] leading-relaxed">
                I hereby declare that I am submitting verified career pathway documentation to the Department Placement Coordinator (DPC) for official No-Dues clearance.
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Confirm & Submit Application'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NoDuesTracker;
