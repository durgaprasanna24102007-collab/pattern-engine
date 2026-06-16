import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff, RefreshCw, AlertCircle,
  Fingerprint, CheckCircle, Clock, Info, Shield, KeyRound,
  ArrowRight, Inbox, Check, X, LockKeyhole
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { name: string; email: string }) => void;
}

type AuthState = 'LOGIN' | 'SIGNUP' | 'OTP_VERIFY' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

interface DeveloperEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  otp: string;
  timestamp: string;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [currentMode, setCurrentMode] = useState<AuthState>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('dlp_system_remember') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPermitToken, setResetPermitToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'login_2fa' | 'forgot_password'>('login_2fa');
  const [targetEmail, setTargetEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [generalError, setGeneralError] = useState('');
  const [generalSuccess, setGeneralSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [simulatedEmails, setSimulatedEmails] = useState<DeveloperEmail[]>([]);

  const fetchSandboxEmails = async () => {
    try {
      const resp = await fetch('/api/auth/mail-catcher');
      if (resp.ok) {
        const data = await resp.json();
        setSimulatedEmails(data.emails || []);
      }
    } catch { }
  };

  useEffect(() => {
    fetchSandboxEmails();
    const interval = setInterval(fetchSandboxEmails, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const ticker = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearInterval(ticker);
  }, [resendCooldown]);

  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const evaluatePasswordStrength = (pwd: string) => {
    const criteria = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      digit: /\d/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd),
    };
    const score = Object.values(criteria).filter(Boolean).length;
    let label = 'None';
    let color = 'bg-slate-200';
    if (score === 0 && pwd.length > 0) { label = 'Extremely Weak'; color = 'bg-red-500'; }
    else if (score >= 1 && score <= 2) { label = 'Weak'; color = 'bg-orange-400'; }
    else if (score >= 3 && score <= 4) { label = 'Moderate'; color = 'bg-amber-400'; }
    else if (score === 5) { label = 'Strong'; color = 'bg-green-600'; }
    return { score, label, color, criteria };
  };

  const clearFlags = () => { setGeneralError(''); setGeneralSuccess(''); };

  const handleSwitchMode = (mode: AuthState) => { clearFlags(); setCurrentMode(mode); };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();
    if (!isEmailValid(email)) { setGeneralError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setGeneralError('Password must be at least 8 characters.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed.');
      if (data.requiresValidation) {
        setTargetEmail(data.email);
        setOtpPurpose(data.purpose);
        setOtpCode('');
        setGeneralSuccess(data.message);
        setCurrentMode('OTP_VERIFY');
        setTimeout(fetchSandboxEmails, 600);
      } else {
        completeSession(data.token, data.user);
      }
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();
    if (!signupName.trim()) { setGeneralError('Name is required.'); return; }
    if (!isEmailValid(signupEmail)) { setGeneralError('Enter a valid email address.'); return; }
    if (evaluatePasswordStrength(signupPassword).score < 5) {
      setGeneralError('Password must meet all 5 strength requirements.'); return;
    }
    if (signupPassword !== signupConfirmPassword) { setGeneralError('Passwords do not match.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName, email: signupEmail, password: signupPassword, confirmPassword: signupConfirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed.');
      setTargetEmail(signupEmail);
      setOtpPurpose('signup');
      setOtpCode('');
      setGeneralSuccess(data.message);
      setCurrentMode('OTP_VERIFY');
      setTimeout(fetchSandboxEmails, 600);
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();
    if (!isEmailValid(forgotEmail)) { setGeneralError('Enter a valid registered email address.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTargetEmail(forgotEmail);
      setOtpPurpose('forgot_password');
      setOtpCode('');
      setGeneralSuccess(data.message);
      setCurrentMode('OTP_VERIFY');
      setTimeout(fetchSandboxEmails, 600);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to send recovery OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();
    if (!otpCode || otpCode.length < 6) { setGeneralError('Enter the full 6-digit OTP code.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, otp: otpCode, purpose: otpPurpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP verification failed.');
      if (otpPurpose === 'forgot_password') {
        setResetPermitToken(data.resetPermitToken);
        setNewPassword('');
        setConfirmNewPassword('');
        setGeneralSuccess('OTP verified. Set your new password below.');
        setCurrentMode('RESET_PASSWORD');
      } else {
        completeSession(data.token, data.user);
      }
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    clearFlags();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, purpose: otpPurpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rate limited.');
      setGeneralSuccess(data.message || 'New OTP sent.');
      setResendCooldown(data.cooldown || 60);
      setOtpCode('');
      setTimeout(fetchSandboxEmails, 600);
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();
    if (evaluatePasswordStrength(newPassword).score < 5) {
      setGeneralError('New password must meet all 5 strength requirements.'); return;
    }
    if (newPassword !== confirmNewPassword) { setGeneralError('Passwords do not match.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, resetPermitToken, newPassword, confirmPassword: confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setGeneralSuccess('Password updated! Log in with your new credentials.');
      setCurrentMode('LOGIN');
      setEmail(targetEmail);
      setPassword('');
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const completeSession = (token: string, user: any) => {
    setGeneralSuccess('Access granted. Loading workspace...');
    if (rememberMe) localStorage.setItem('dlp_system_remember', 'true');
    else localStorage.removeItem('dlp_system_remember');
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setTimeout(() => onLoginSuccess(token, user), 800);
  };

  const handleInjectOTP = (otp: string) => {
    setOtpCode(otp);
    setGeneralSuccess(`OTP injected from mail catcher: [${otp}]`);
  };

  const pwdStrength = evaluatePasswordStrength(currentMode === 'SIGNUP' ? signupPassword : newPassword);
  const activePwd = currentMode === 'SIGNUP' ? signupPassword : newPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-blue-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-blue-900 uppercase font-mono">DLP Portal</div>
            <div className="text-[10px] text-slate-500 font-medium">Enterprise Leak Shield</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono hidden sm:block">SECURE NODE: ACTIVE</span>
        </div>
      </header>

      {/* Main grid */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: branding */}
        <section className="lg:col-span-5 space-y-6 text-center lg:text-left select-none hidden lg:block">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 font-mono font-bold text-xs px-3 py-1.5 rounded-full border border-blue-100">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            <span>Core v3.2.0 — TLS Secured</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-blue-900 leading-tight">
            Security Incident <br />
            <span className="text-blue-500">Pattern Intelligence</span>
          </h2>
          <p className="text-blue-800/70 font-medium text-sm leading-relaxed max-w-lg">
            Monitor, detect, and prevent sensitive data leakage using advanced regex-based pattern detection. Real-time scanning prevents PII, PCI, and credential exfiltration.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md text-left">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <span className="text-xs font-bold text-blue-900 uppercase font-mono block mb-1">SHA-256 Guard</span>
              <p className="text-xs text-slate-600 font-medium">Cryptographically protected sessions prevent hijacking.</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <span className="text-xs font-bold text-blue-900 uppercase font-mono block mb-1">MFA / OTP</span>
              <p className="text-xs text-slate-600 font-medium">Multi-stage OTP verification for strict compliance.</p>
            </div>
          </div>
          <div className="text-slate-500 text-xs flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-400 shrink-0" />
            <span>Developer mail catcher shows OTPs instantly below the login form.</span>
          </div>
        </section>

        {/* Right: auth card */}
        <section className="lg:col-span-7 flex flex-col gap-4 items-center">
          <div className="w-full max-w-lg">
            {/* Auth Card */}
            <div className="bg-white shadow-xl rounded-3xl border border-blue-100 overflow-hidden relative">
              {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex items-center justify-center">
                  <div className="bg-white border border-blue-100 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                    <span className="text-xs font-bold text-blue-900 font-mono">PROCESSING...</span>
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-5">
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-bold text-blue-900 font-sans">
                    {currentMode === 'LOGIN' && 'System Authorization'}
                    {currentMode === 'SIGNUP' && 'Operator Onboarding'}
                    {currentMode === 'OTP_VERIFY' && 'MFA Token Verification'}
                    {currentMode === 'FORGOT_PASSWORD' && 'Credential Recovery'}
                    {currentMode === 'RESET_PASSWORD' && 'Set New Password'}
                  </h3>
                  {(currentMode === 'LOGIN' || currentMode === 'SIGNUP') && (
                    <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
                      <button onClick={() => handleSwitchMode('LOGIN')} className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${currentMode === 'LOGIN' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Login</button>
                      <button onClick={() => handleSwitchMode('SIGNUP')} className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${currentMode === 'SIGNUP' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Signup</button>
                    </div>
                  )}
                </div>

                {/* Error/Success */}
                {generalError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div><p className="font-bold">Access Denied</p><p>{generalError}</p></div>
                  </div>
                )}
                {generalSuccess && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div><p className="font-bold">Status</p><p>{generalSuccess}</p></div>
                  </div>
                )}

                {/* LOGIN FORM */}
                {currentMode === 'LOGIN' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                          placeholder="admin@dataleaktracker.com" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Password</label>
                        <button type="button" onClick={() => handleSwitchMode('FORGOT_PASSWORD')} className="text-xs text-blue-600 hover:underline cursor-pointer">Forgot password?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                          placeholder="Your password" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400" />
                      <span className="text-xs text-slate-600 font-medium">Remember me on this device</span>
                    </label>
                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all active:scale-[.98] disabled:opacity-60 cursor-pointer shadow-md shadow-blue-500/20">
                      Authorize Access
                    </button>
                  </form>
                )}

                {/* SIGNUP FORM */}
                {currentMode === 'SIGNUP' && (
                  <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Full Name</label>
                      <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                        placeholder="Your full name" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                          placeholder="you@company.com" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input type={showSignupPassword ? 'text' : 'password'} value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                          placeholder="Create a strong password" required />
                        <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signupPassword.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= pwdStrength.score ? pwdStrength.color : 'bg-slate-200'}`} />
                            ))}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">{pwdStrength.label}</div>
                          <div className="grid grid-cols-2 gap-1">
                            {Object.entries(pwdStrength.criteria).map(([key, met]) => (
                              <div key={key} className={`flex items-center gap-1 text-[10px] font-mono ${met ? 'text-green-700' : 'text-slate-400'}`}>
                                {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {key === 'length' ? '8+ chars' : key === 'uppercase' ? 'Uppercase' : key === 'lowercase' ? 'Lowercase' : key === 'digit' ? 'Number' : 'Special char'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Confirm Password</label>
                      <input type="password" value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 ${signupConfirmPassword && signupConfirmPassword !== signupPassword ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
                        placeholder="Repeat your password" required />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all active:scale-[.98] disabled:opacity-60 cursor-pointer shadow-md shadow-blue-500/20">
                      Create Account
                    </button>
                  </form>
                )}

                {/* OTP VERIFY FORM */}
                {currentMode === 'OTP_VERIFY' && (
                  <form onSubmit={handleOTPVerifySubmit} className="space-y-5">
                    <div className="text-center py-2">
                      <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
                        <Fingerprint className="h-7 w-7 text-blue-600" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        OTP sent to <span className="font-bold text-blue-800">{targetEmail}</span>
                        <br />Purpose: <span className="font-mono font-bold uppercase text-[10px]">{otpPurpose.replace('_', ' ')}</span>
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono text-center">6-Digit OTP Code</label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full text-center px-4 py-4 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-2xl font-mono tracking-[0.5em] outline-none transition-all"
                        placeholder="------"
                        maxLength={6}
                        required
                      />
                    </div>
                    <button type="submit" disabled={isLoading || otpCode.length < 6} className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 cursor-pointer">
                      Verify OTP
                    </button>
                    <div className="flex items-center justify-between text-xs">
                      <button type="button" onClick={() => handleSwitchMode('LOGIN')} className="text-slate-400 hover:text-slate-600 cursor-pointer">Back to login</button>
                      <button type="button" onClick={handleResendOTP} disabled={resendCooldown > 0 || isLoading} className={`font-bold cursor-pointer ${resendCooldown > 0 ? 'text-slate-400' : 'text-blue-600 hover:underline'}`}>
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </form>
                )}

                {/* FORGOT PASSWORD FORM */}
                {currentMode === 'FORGOT_PASSWORD' && (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500">Enter your registered email and we'll send an OTP to reset your password.</p>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Registered Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                          placeholder="your@email.com" required />
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 cursor-pointer">
                      Send Recovery OTP
                    </button>
                    <button type="button" onClick={() => handleSwitchMode('LOGIN')} className="w-full text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                      Back to login
                    </button>
                  </form>
                )}

                {/* RESET PASSWORD FORM */}
                {currentMode === 'RESET_PASSWORD' && (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                          placeholder="Choose a strong new password" required />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {newPassword.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= pwdStrength.score ? pwdStrength.color : 'bg-slate-200'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Confirm New Password</label>
                      <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all"
                        placeholder="Repeat new password" required />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 cursor-pointer">
                      Update Password
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Developer Mail Catcher */}
            <div className="mt-4 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-bold text-blue-900 font-mono uppercase">Dev Mail Catcher</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{simulatedEmails.length} email(s)</span>
              </div>
              {simulatedEmails.length === 0 ? (
                <div className="px-4 py-5 text-center text-xs text-slate-400 font-mono">
                  No emails yet. OTPs appear here after login/signup.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {simulatedEmails.slice(0, 5).map(em => (
                    <div key={em.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{em.subject}</p>
                        <p className="text-[10px] text-slate-400 font-mono">To: {em.to}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <code className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{em.otp}</code>
                        {currentMode === 'OTP_VERIFY' && (
                          <button onClick={() => handleInjectOTP(em.otp)} className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded cursor-pointer transition-colors">
                            Auto-Fill
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
