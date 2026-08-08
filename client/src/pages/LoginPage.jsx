import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SVCELogo from '../components/common/SVCELogo';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles,
  User,
  Crown,
  BookOpen,
  Award,
  KeyRound,
  Lock,
  Building2,
  CheckCircle2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import Modal from '../components/common/Modal';

export const LoginPage = () => {
  const { login, loading, authError } = useAuth();
  
  const [username, setUsername] = useState('IT2024001');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [formError, setFormError] = useState('');

  const handlePresetSelect = (presetUser) => {
    setUsername(presetUser);
    setPassword('password123');
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setFormError('Please enter both Register Number / Employee ID and Password.');
      return;
    }

    setFormError('');
    const res = await login(username, password);
    if (!res.success) {
      setFormError(res.message);
    }
  };

  const quickPresets = [
    { title: 'Dr V Vidhya', subtitle: 'Head of Department (HOD)', id: 'EMP-HOD-IT-01', role: 'HOD', icon: Crown, color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
    { title: 'Dr. R. Placement Coordinator', subtitle: 'Placement Coordinator (DPC)', id: 'EMP-DPC-IT-01', role: 'DPC', icon: Building2, color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100' },
    { title: 'Gurusamy M', subtitle: 'Finance Clearance Officer', id: 'EMP-FIN-IT-01', role: 'Finance', icon: ShieldCheck, color: 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100' },
    { title: 'Mohan Kumar S', subtitle: 'Central Library Officer', id: 'EMP-MLIB-IT-01', role: 'Central Lib', icon: BookOpen, color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100' },
    { title: 'Sivakumar E', subtitle: 'Dept Library In-Charge', id: 'EMP-LIB-IT-01', role: 'Dept Lib', icon: BookOpen, color: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100' },
    { title: '101-Aadhityan K', subtitle: '4th Yr Placement (4-IT-A)', id: 'IT2024001', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
    { title: '102-Bhavani S', subtitle: '4th Yr Higher Studies (4-IT-A)', id: 'IT2024002', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
    { title: 'S.Kavishree', subtitle: 'FA (3rd Yr IT-A Incharge)', id: 'EMP-FA-IT-04', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: 'V.Ranjith', subtitle: 'FA (3rd Yr IT-A Incharge)', id: 'EMP-FA-IT-03', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: 'V.Praveen Kumar', subtitle: 'FA (3rd Yr IT-B Incharge)', id: 'EMP-FA-IT-01', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: 'N.Selvaganesh', subtitle: 'FA (3rd Yr IT-B Incharge)', id: 'EMP-FA-IT-02', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: '25-Harshul', subtitle: 'Kavishree Advisee (3-IT-A)', id: 'IT2025025', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
    { title: '1-Abinaya', subtitle: 'Ranjith Advisee (3-IT-A)', id: 'IT2025001', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#1d4ed8] selection:text-white">
      
      {/* Top SVCE College Branding Header with SVCE Blue & Orange Accents */}
      <div className="max-w-4xl mx-auto w-full text-center">
        <div className="flex justify-center mb-4">
          <SVCELogo className="h-24 sm:h-28" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-l-4 border-l-svceOrange border border-slate-200 rounded-r-full text-brand-700 text-xs font-bold uppercase tracking-wider mb-2 shadow-2xs">
          <Building2 className="w-3.5 h-3.5 text-svceOrange" />
          <span>DEPARTMENT OF INFORMATION TECHNOLOGY</span>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
          No-Dues Clearance Management & Institutional ERP Portal
        </h2>
      </div>

      {/* Main Single Login Split Container */}
      <div className="max-w-4xl mx-auto w-full my-6">
        <div className="bg-white shadow-xs rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Unified Login Form (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-svceOrange rounded-full"></span>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Sign In to SVCE ERP</h3>
                </div>
                <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                  Single Login
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed pl-3.5">
                Enter your credentials below. The system will automatically route you to your assigned dashboard.
              </p>
            </div>

            {/* Error Alert Box */}
            {(formError || authError) && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{formError || authError}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {/* Register Number / Employee ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Register Number / Employee ID *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. IT2024001 or EMP-HOD-IT-01"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Security */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-600 h-4 w-4"
                  />
                  <span className="text-slate-600 font-medium">Keep session logged in</span>
                </label>

                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  SVCE Auth
                </span>
              </div>

              {/* Submit Button in SVCE Royal Blue */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg shadow-xs text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 transition-all disabled:opacity-60 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-svceOrange" />
                <span>{loading ? 'Authenticating Credentials...' : 'Sign In to SVCE ERP Portal'}</span>
              </button>

            </form>
          </div>

          {/* Right Column: Quick Test Presets Grid (5 Cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-svceOrange" />
                <span>Test Account Quick Fill</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Click to select</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Select any account below to test its role-specific dashboard access:
            </p>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {quickPresets.map((p) => {
                const Icon = p.icon;
                const isSelected = username === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p.id)}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-brand-600 bg-white ring-2 ring-brand-200 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs leading-tight">{p.title}</p>
                        <p className="text-[11px] text-slate-500 leading-tight">{p.subtitle}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${p.color}`}>
                      {p.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Footer Accreditation Text */}
      <div className="max-w-4xl mx-auto w-full text-center text-[11px] text-slate-500 space-y-0.5 border-t border-slate-200 pt-4">
        <p className="font-semibold text-slate-700">
          Autonomous Institution, Affiliated to Anna University, Chennai | Approved by the AICTE, Accredited by NAAC
        </p>
        <p className="text-[10px] text-slate-400 font-mono">
          Sri Venkateswara College of Engineering • IT Department Clearance System © 2026
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} title="Reset SVCE ERP Account Password">
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            Password reset requests for Sri Venkateswara College of Engineering ERP System are handled by the IT Department Administrator.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-800">Support Contacts:</p>
            <p>• Visit Administrator Office (Room IT-204)</p>
            <p>• Email support from college domain: <strong>it.admin@svce.ac.in</strong></p>
          </div>
          <div className="pt-2 text-right">
            <button
              onClick={() => setShowForgotModal(false)}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg font-semibold"
            >
              Understood
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default LoginPage;
