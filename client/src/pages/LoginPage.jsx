import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { initLocationDetection } from '../services/api';
import SVCELogo from '../components/common/SVCELogo';
import { 
  ShieldCheck, 
  ShieldAlert,
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
  ArrowRight,
  Check
} from 'lucide-react';
import Modal from '../components/common/Modal';
import InstallAppButton from '../components/common/InstallAppButton';

const isDev = import.meta.env.DEV;

export const LoginPage = () => {
  const { login, loading, authError, user, updateUserData } = useAuth();
  
  const [username, setUsername] = useState(isDev ? 'admin' : '');
  const [password, setPassword] = useState(isDev ? 'Svce@2026!' : '');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [mobileTab, setMobileTab] = useState('login');
  const [lastSelectedPreset, setLastSelectedPreset] = useState('');

  // Forced Password Change State
  const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Forgot Password Request State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');

  // Proactively acquire high-accuracy location on login page mount
  useEffect(() => {
    initLocationDetection();
  }, []);

  // Listen for forced password change requirements from API
  useEffect(() => {
    const handlePasswordChangeRequired = () => {
      setMustChangePasswordModal(true);
    };
    window.addEventListener('auth:password_change_required', handlePasswordChangeRequired);
    return () => window.removeEventListener('auth:password_change_required', handlePasswordChangeRequired);
  }, []);

  const handlePresetSelect = (presetUser, presetTitle) => {
    setUsername(presetUser);
    setPassword('Svce@2026!');
    setFormError('');
    setLastSelectedPreset(presetTitle || presetUser);
    setMobileTab('login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setFormError('Please enter both Register Number / Employee ID and Password.');
      return;
    }

    setFormError('');
    const res = await login(username.trim(), password);
    if (!res.success) {
      setFormError(res.message);
    } else {
      if (res.user?.must_change_password) {
        setMustChangePasswordModal(true);
      }
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotErrorMsg('Please enter your Register Number or Employee ID.');
      return;
    }

    setForgotLoading(true);
    setForgotErrorMsg('');
    setForgotSuccessMsg('');

    try {
      const res = await api.post('/auth/forgot-password', { username: forgotIdentifier.trim() });
      if (res.data?.success) {
        setForgotSuccessMsg(res.data.message || 'If an account matches, a 15-minute reset link has been dispatched to your email.');
      } else {
        setForgotErrorMsg(res.data.message || 'Unable to process password reset request.');
      }
    } catch (err) {
      setForgotErrorMsg(err.response?.data?.message || 'Error processing request. Please contact the IT admin.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForcedPasswordChange = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (newPassword.length < 10) {
      setChangePasswordError('Password must be at least 10 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('Passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/auth/password', {
        newPassword
      });

      if (res.data?.success) {
        setChangePasswordSuccess('Password updated successfully! Redirecting...');
        if (user) {
          updateUserData({ must_change_password: false });
        }
        setTimeout(() => {
          setMustChangePasswordModal(false);
          window.location.reload();
        }, 1200);
      } else {
        setChangePasswordError(res.data.message || 'Failed to update password.');
      }
    } catch (err) {
      setChangePasswordError(err.response?.data?.message || 'Password does not meet institutional complexity or security policy.');
    } finally {
      setChangingPassword(false);
    }
  };

  const quickPresets = [
    { title: 'System Administrator', subtitle: 'Institutional Superuser (Admin)', id: 'admin', role: 'Admin', icon: ShieldCheck, color: 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100' },
    { title: 'Dr V Vidhya', subtitle: 'Head of Department (HOD)', id: 'EMP-HOD-IT-01', role: 'HOD', icon: Crown, color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
    { title: 'Dr. R. Placement Coordinator', subtitle: 'Placement Coordinator (DPC)', id: 'EMP-DPC-IT-01', role: 'DPC', icon: Building2, color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100' },
    { title: 'Gurusamy M', subtitle: 'Finance Clearance Officer', id: 'EMP-FIN-IT-01', role: 'Finance', icon: ShieldCheck, color: 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100' },
    { title: 'Mohan Kumar S', subtitle: 'Central Library Officer', id: 'EMP-MLIB-IT-01', role: 'Central Lib', icon: BookOpen, color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100' },
    { title: 'Sivakumar E', subtitle: 'Dept Library In-Charge', id: 'EMP-LIB-IT-01', role: 'Dept Lib', icon: BookOpen, color: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100' },
    { title: '101-Aadhityan K', subtitle: '4th Yr Placement (4-IT-A)', id: 'IT2024001', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
    { title: '102-Bhavani S', subtitle: '4th Yr Higher Studies (4-IT-A)', id: 'IT2024002', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
    { title: 'S.Kavishree', subtitle: 'FA (3rd Yr IT-A Incharge)', id: 'EMP-FA-IT-04', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: 'V.Ranjith', subtitle: 'FA (3rd Yr IT-A Incharge)', id: 'EMP-FA-IT-03', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: 'V Praveenkumar', subtitle: 'FA (3rd Yr IT-B Incharge)', id: 'EMP-FA-IT-01', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: 'N.Selvaganesh', subtitle: 'FA (3rd Yr IT-B Incharge)', id: 'EMP-FA-IT-02', role: 'FA', icon: Award, color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
    { title: '25-Harshul', subtitle: 'Kavishree Advisee (3-IT-A)', id: 'IT2025025', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
    { title: '1-Abinaya', subtitle: 'Ranjith Advisee (3-IT-A)', id: 'IT2025001', role: 'Student', icon: User, color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6 px-3 sm:py-8 sm:px-6 lg:px-8 font-sans selection:bg-[#1d4ed8] selection:text-white">
      
      {/* Top SVCE College Branding Header */}
      <div className="max-w-4xl mx-auto w-full text-center">
        <div className="flex justify-center mb-2 sm:mb-4">
          <SVCELogo className="h-16 sm:h-24 md:h-28 transition-all" />
        </div>

        <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 tracking-tight max-w-xl mx-auto px-2 mt-2">
          No-Dues Clearance Management
        </h2>
      </div>

      {/* Main Single Login Split Container */}
      <div className={`max-w-4xl mx-auto w-full my-3 sm:my-6 ${!isDev ? 'max-w-xl' : ''}`}>
        
        {/* Mobile Segmented Switch (< lg) - Only shown in Dev mode with Presets */}
        {isDev && (
          <div className="lg:hidden flex p-1 bg-slate-200/80 rounded-2xl mb-3 shadow-inner text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileTab('login')}
              className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'login' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('demo')}
              className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'demo' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-svceOrange" />
              <span>Demo Accounts ({quickPresets.length})</span>
            </button>
          </div>
        )}

        {/* Selected Preset Confirmation Banner (visible when preset chosen on mobile in dev) */}
        {isDev && lastSelectedPreset && mobileTab === 'login' && (
          <div className="lg:hidden mb-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Loaded: <strong>{lastSelectedPreset}</strong></span>
            </div>
            <button 
              type="button"
              onClick={() => setLastSelectedPreset('')} 
              className="text-blue-500 hover:text-blue-800 text-[10px] font-bold underline"
            >
              Clear
            </button>
          </div>
        )}

        <div className={`bg-white shadow-xl shadow-slate-200/60 rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden ${
          isDev ? 'grid grid-cols-1 lg:grid-cols-12' : 'block'
        }`}>
          
          {/* Main Login Form Column */}
          <div className={`p-5 sm:p-8 space-y-5 ${
            isDev 
              ? `lg:col-span-7 border-b lg:border-b-0 lg:border-r border-slate-200/80 ${mobileTab === 'demo' ? 'hidden lg:block' : 'block'}`
              : 'w-full'
          }`}>
            
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-svceOrange rounded-full"></span>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Sign In to SVCE ERP
                  </h3>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                  Single Login
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed pl-3.5">
                Enter your credentials below. The system will automatically route you to your assigned dashboard.
              </p>
            </div>

            {/* Error Alert Box */}
            {(formError || authError) && (
              <div role="alert" aria-live="polite" className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-semibold">{formError || authError}</span>
              </div>
            )}

            {/* Standard Credentials Form */}
            <form className="space-y-4" onSubmit={handleSubmit} aria-label="SVCE ERP Login Form">
                
                {/* Register Number / Employee ID */}
                <div>
                  <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Register Number / Employee ID <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="login-username"
                      name="username"
                      autoComplete="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. IT2024001 or EMP-HOD-IT-01"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                      Password <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotIdentifier(username);
                        setForgotSuccessMsg('');
                        setForgotErrorMsg('');
                      }}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all"
                      required
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Security */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="login-remember-me"
                      name="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-600 h-4 w-4"
                    />
                    <span className="text-slate-600 font-medium text-xs">Keep session logged in</span>
                  </label>

                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    SVCE Hardened Auth
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-600/20 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-svceOrange" />
                  <span>{loading ? 'Authenticating Credentials...' : 'Sign In to SVCE ERP Portal'}</span>
                </button>

                {/* Install / Download App CTA */}
                <div className="pt-2 border-t border-slate-100">
                  <InstallAppButton variant="login" />
                </div>

              </form>

          </div>

          {/* Right Column: Quick Test Presets Grid - ONLY IN DEV MODE */}
          {isDev && (
            <div className={`lg:col-span-5 p-5 sm:p-8 bg-slate-50/70 space-y-4 ${
              mobileTab === 'login' ? 'hidden lg:block' : 'block'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-svceOrange" />
                  <span>Test Account Quick Fill</span>
                </div>
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">DEV ONLY</span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Select any test account below to populate credentials in development mode:
              </p>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {quickPresets.map((p) => {
                  const Icon = p.icon;
                  const isSelected = username === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetSelect(p.id, `${p.title} (${p.role})`)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'border-brand-600 bg-white ring-2 ring-brand-200 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs leading-tight truncate">{p.title}</p>
                          <p className="text-[10px] text-slate-500 leading-tight truncate">{p.subtitle}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex-shrink-0 ${p.color}`}>
                        {p.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

      {/* Forgot Password Interactive Modal */}
      <Modal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} title="Reset SVCE ERP Account Password">
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            Enter your Register Number or Employee ID. If registered with an email address on file, a single-use, 15-minute secure reset link will be dispatched.
          </p>

          {forgotSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
              {forgotSuccessMsg}
            </div>
          )}

          {forgotErrorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
              {forgotErrorMsg}
            </div>
          )}

          {!forgotSuccessMsg && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Register Number / Employee ID
                </label>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="e.g. IT2024001 or EMP-HOD-IT-01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg font-semibold disabled:opacity-60"
                >
                  {forgotLoading ? 'Dispatching...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}

          {forgotSuccessMsg && (
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg font-semibold"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Mandatory Password Change Modal (Policy Enforcement) */}
      <Modal isOpen={mustChangePasswordModal} onClose={() => {}} title="Security Policy: Password Change Required">
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Initial Login Password Policy</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                You must change your default password before accessing your institutional dashboard.
                Passwords must be at least 10 characters and contain a mix of uppercase, lowercase, numbers, and symbols.
              </p>
            </div>
          </div>

          {changePasswordError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
              {changePasswordError}
            </div>
          )}

          {changePasswordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
              {changePasswordSuccess}
            </div>
          )}

          <form onSubmit={handleForcedPasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (minimum 10 characters) *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter secure new password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>

            <div className="pt-2 text-right">
              <button
                type="submit"
                disabled={changingPassword || newPassword.length < 10}
                className="px-5 py-2.5 bg-brand-600 text-white rounded-lg font-bold shadow hover:bg-brand-700 disabled:opacity-60"
              >
                {changingPassword ? 'Updating Password...' : 'Save Password & Continue'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <footer className="text-center py-4 text-xs text-slate-500">
        <a href="/privacy" className="hover:text-blue-600 underline font-medium">
          🔒 DPDP Act 2023 Privacy Notice & Consent Preferences
        </a>
      </footer>

    </div>
  );
};

export default LoginPage;
