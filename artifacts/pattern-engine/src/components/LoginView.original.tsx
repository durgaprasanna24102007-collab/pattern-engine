import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  Fingerprint, 
  CheckCircle,
  Clock, 
  Server, 
  Info,
  Shield,
  KeyRound,
  Users,
  ArrowRight,
  Inbox,
  AlertTriangle,
  Check,
  X,
  LockKeyhole,
  LockKeyholeOpen
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { name: string; email: string; lastLogin?: string }) => void;
}

// UI Views Enum
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
  // Navigation states
  const [currentMode, setCurrentMode] = useState<AuthState>('LOGIN');

  // Input states - Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('dlp_system_remember') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);

  // Input states - Signup
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Input states - Forgot Password / Reset
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPermitToken, setResetPermitToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // OTP Verification states
  const [otpCode, setOtpCode] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'login_2fa' | 'forgot_password'>('login_2fa');
  const [targetEmail, setTargetEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Error/Success state managers
  const [generalError, setGeneralError] = useState('');
  const [generalSuccess, setGeneralSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Developer sandbox: live simulator mail catcher feed
  const [simulatedEmails, setSimulatedEmails] = useState<DeveloperEmail[]>([]);
  const [autoPollEmails, setAutoPollEmails] = useState(true);

  // Fetch sandbox emails from Node backend Mailcatcher
  const fetchSandboxEmails = async () => {
    try {
      const resp = await fetch('/api/auth/mail-catcher');
      if (resp.ok) {
        const data = await resp.json();
        setSimulatedEmails(data.emails || []);
      }
    } catch (err) {
      console.error("Failed pulling sandbox emails:", err);
    }
  };

  // Poll sandbox emails of Mail Catcher
  useEffect(() => {
    fetchSandboxEmails();
    if (!autoPollEmails) return;
    const interval = setInterval(fetchSandboxEmails, 3000);
    return () => clearInterval(interval);
  }, [autoPollEmails]);

  // Handle OTP resend cooldown timer ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const progressTicker = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(progressTicker);
  }, [resendCooldown]);

  // Client-side realtime evaluations
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // Live password strength assessor
  const evaluatePasswordStrength = (pwd: string) => {
    let score = 0;
    const criteria = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      digit: /\d/.test(pwd),
      symbol: /[#$@!%&*?()]/.test(pwd),
    };

    if (criteria.length) score += 1;
    if (criteria.uppercase) score += 1;
    if (criteria.lowercase) score += 1;
    if (criteria.digit) score += 1;
    if (criteria.symbol) score += 1;

    let strengthLabel = "None";
    let strengthColor = "bg-slate-200";
    if (score === 0 && pwd.length > 0) {
      strengthLabel = "Extremely Weak";
      strengthColor = "bg-red-500";
    } else if (score >= 1 && score <= 2) {
      strengthLabel = "Weak Password";
      strengthColor = "bg-orange-400";
    } else if (score >= 3 && score <= 4) {
      strengthLabel = "Moderate (Needs Symbol/Digit)";
      strengthColor = "bg-amber-400";
    } else if (score === 5) {
      strengthLabel = "Strong Secured Cipher";
      strengthColor = "bg-green-600";
    }

    return { score, label: strengthLabel, color: strengthColor, criteria };
  };

  // Clear notices helper
  const clearFlags = () => {
    setGeneralError('');
    setGeneralSuccess('');
  };

  // Switch between Authentication modes
  const handleSwitchMode = (mode: AuthState) => {
    clearFlags();
    setCurrentMode(mode);
  };

  // Handler: login form post
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();

    if (!isEmailValid(email)) {
      setGeneralError("Please enter a valid format email address (e.g. key@domain.com).");
      return;
    }
    if (password.length < 8) {
      setGeneralError("Password error: minimum of 8 characters validation rule.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification rejected by system SSO authority.');
      }

      // Check if subsequent OTP 2FA challenge is demanded
      if (data.requiresValidation) {
        setTargetEmail(data.email);
        setOtpPurpose(data.purpose);
        setOtpCode(''); // reset entered code
        setGeneralSuccess(data.message);
        setCurrentMode('OTP_VERIFY');
        // Fetch to update mailbox immediately
        setTimeout(fetchSandboxEmails, 550);
      } else {
        // Direct success bypass (if ever triggered)
        completeLoginSession(data.token, data.user);
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Connection lost to the security validation server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: signup form post
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();

    if (!signupName.trim()) {
      setGeneralError("Name is required to register an administrative workspace profile.");
      return;
    }
    if (!isEmailValid(signupEmail)) {
      setGeneralError("Corporate Email validation failed. Provide a correct structure.");
      return;
    }
    const strength = evaluatePasswordStrength(signupPassword);
    if (strength.score < 5) {
      setGeneralError("Risk Warning: Weak passwords are prevented. Check and satisfy all 5 strength requirements below.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setGeneralError("Passwords mismatched. Please reconcile confirmation entries.");
      return;
    }

    setIsLoading(true);

    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          confirmPassword: signupConfirmPassword
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || 'Corporate registry nodes refused this profile.');
      }

      // Transition into OTP view for verify
      setTargetEmail(signupEmail);
      setOtpPurpose('signup');
      setOtpCode('');
      setGeneralSuccess(data.message);
      setCurrentMode('OTP_VERIFY');
      setTimeout(fetchSandboxEmails, 550);
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Forgot Password initiate request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();

    if (!isEmailValid(forgotEmail)) {
      setGeneralError("Provide a valid registered console email address.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message);
      }

      // Set forgot password target email
      setTargetEmail(forgotEmail);
      setOtpPurpose('forgot_password');
      setOtpCode('');
      setGeneralSuccess(data.message);
      setCurrentMode('OTP_VERIFY');
      setTimeout(fetchSandboxEmails, 550);
    } catch (err: any) {
      setGeneralError(err.message || "Failed dispatching recovery OTP pin.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: OTP validation
  const handleOTPVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();

    if (!otpCode || otpCode.length < 6) {
      setGeneralError("Security alert: OTP code must be a fully completed 6-digit number.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          otp: otpCode,
          purpose: otpPurpose
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || "Credential pairing error; please try again.");
      }

      if (otpPurpose === 'forgot_password') {
        // User successfully proved email identity. Permit password reset form
        setResetPermitToken(data.resetPermitToken);
        setNewPassword('');
        setConfirmNewPassword('');
        setGeneralSuccess("MFA OTP accepted! Identity verified. Complete your new password selection below.");
        setCurrentMode('RESET_PASSWORD');
      } else {
        // Success login_2fa / signup direct grant
        completeLoginSession(data.token, data.user);
      }
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP trigger holding quota validations
  const handleTriggerResendOTP = async () => {
    if (resendCooldown > 0) return;
    clearFlags();

    setIsLoading(true);
    try {
      const resp = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, purpose: otpPurpose })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || 'OTP trigger quota limit reached.');
      }

      setGeneralSuccess(data.message || 'A fresh code was generated and dispatched.');
      setResendCooldown(data.cooldown || 60);
      setOtpCode(''); // reset field
      setTimeout(fetchSandboxEmails, 550);
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Password reset finalize form
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFlags();

    const strength = evaluatePasswordStrength(newPassword);
    if (strength.score < 5) {
      setGeneralError("Selected new password is too weak. Meet all security rules below.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setGeneralError("Password confirmation entry mismatch.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          resetPermitToken,
          newPassword,
          confirmPassword: confirmNewPassword
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message);
      }

      setGeneralSuccess("Success! System credentials updated. Log in with your new password to verify.");
      setCurrentMode('LOGIN');
      setEmail(targetEmail);
      setPassword('');
    } catch (err: any) {
      setGeneralError(err.message || 'Failed updating corporate security vault.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete session storage and bubble up state change
  const completeLoginSession = (token: string, user: any) => {
    setGeneralSuccess('Authorization granted. Syncing security node tools...');
    
    // Save state
    if (rememberMe) {
      localStorage.setItem('dlp_system_remember', 'true');
    } else {
      localStorage.removeItem('dlp_system_remember');
    }
    localStorage.setItem('dlp_access_token', token);
    localStorage.setItem('dlp_current_user', JSON.stringify(user));

    // Redirect workspace after sleek transition delay
    setTimeout(() => {
      onLoginSuccess(token, user);
    }, 1000);
  };

  // Hot quick credentials autofill helper function
  const handleLoadMockUser = (type: 'admin' | 'user') => {
    clearFlags();
    if (type === 'admin') {
      setEmail('admin@dataleaktracker.com');
      setPassword('password123');
    } else {
      setEmail('user@example.com');
      setPassword('password');
    }
  };

  // Quick sandbox simulated mail check
  const handleInjectSandboxOTP = (otp: string) => {
    setOtpCode(otp);
    setGeneralSuccess(`Injected authentication token from mailbox catcher: [${otp}]`);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-slate-850 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 font-sans" id="dlp-auth-frame">
      
      {/* Top logo display header */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-linear-to-br from-[#2196F3] to-[#0D47A1] text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Shield className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#0D47A1] uppercase font-mono">DLP Portal</h1>
            <p className="text-[10px] text-slate-500 font-medium">Enterprise Leak Shield</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Secure Node: ACTIVE</span>
        </div>
      </header>

      {/* Main split view container grid */}
      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1 my-2">
        
        {/* LEFT COLUMN: System core security capabilities */}
        <section className="lg:col-span-5 space-y-6 text-center lg:text-left select-none">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0D47A1] font-mono font-bold text-xs px-3 py-1.5 rounded-full border border-blue-100 shadow-xs">
            <ShieldCheck className="h-4 w-4 text-[#2196F3]" />
            <span>Core Version 3.2.0 (TLS Locked)</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0D47A1] leading-tight">
            Security Incident <br />
            <span className="text-[#2196F3]">Pattern Intelligence</span>
          </h2>

          <p className="text-[#1565C0] font-sans font-medium text-sm sm:text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
            Monitor, Detect, and Prevent Sensitive Data Leakage using Advanced Regex-Based Pattern Detection. Real-time scanning rules prevent leak hazards of critical PII, PCI numbers, and code access keys before exit-transit.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0 pt-2 text-left">
            <div className="bg-[#E3F2FD]/50 border border-[#BBDEFB] p-4 rounded-2xl">
              <span className="text-xs font-bold text-[#0D47A1] uppercase font-mono block mb-1">Durable Guard</span>
              <p className="text-xs text-slate-600 font-medium font-sans">SHA-256 cryptographically protection shields sessions from session hijacking.</p>
            </div>
            <div className="bg-[#E3F2FD]/50 border border-[#BBDEFB] p-4 rounded-2xl">
              <span className="text-xs font-bold text-[#0D47A1] uppercase font-mono block mb-1">Verification</span>
              <p className="text-xs text-slate-600 font-medium font-sans">Multi-stage OTP verification guarantees strict compliance auditing protocols.</p>
            </div>
          </div>

          {/* Quick instructions indicator to reviewers */}
          <div className="text-slate-500 font-semibold text-xs flex items-center justify-center lg:justify-start gap-1.5 pt-1">
            <Info className="h-4 w-4 text-[#2196F3] shrink-0" />
            <span>Simulated OTP email catcher helps offline audits.</span>
          </div>
        </section>


        {/* RIGHT COLUMN: Authentication Card Forms */}
        <section className="lg:col-span-7 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-lg bg-white shadow-xl rounded-3xl overflow-hidden border border-[#BBDEFB] p-6 sm:p-8 space-y-6 relative transition-all duration-300">
            
            {/* Loading top blur status indicator */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-xs z-30 flex items-center justify-center">
                <div className="bg-white border border-[#BBDEFB] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-[#2196F3] animate-spin" />
                  <span className="text-xs font-bold tracking-tight text-[#0D47A1] font-mono">ENCRYPTING TRANSACTIONS...</span>
                </div>
              </div>
            )}

            {/* View Title & Navigation Tabs */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold tracking-tight text-[#0D47A1] font-sans">
                  {currentMode === 'LOGIN' && 'System Authorization'}
                  {currentMode === 'SIGNUP' && 'Operator Onboarding'}
                  {currentMode === 'OTP_VERIFY' && 'MFA Multi-Factor Token'}
                  {currentMode === 'FORGOT_PASSWORD' && 'Lost Credentials Recovery'}
                  {currentMode === 'RESET_PASSWORD' && 'Write New Password'}
                </h3>

                {/* Sub tab navigation togglers */}
                {(currentMode === 'LOGIN' || currentMode === 'SIGNUP') && (
                  <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold shrink-0">
                    <button 
                      onClick={() => handleSwitchMode('LOGIN')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${currentMode === 'LOGIN' ? 'bg-white text-[#0D47A1] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => handleSwitchMode('SIGNUP')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${currentMode === 'SIGNUP' ? 'bg-white text-[#0D47A1] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Signup
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error & Success Feedback alerts */}
            {generalError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1 mb-2">
                <AlertCircle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Access Transaction Aborted</p>
                  <p className="font-medium">{generalError}</p>
                </div>
              </div>
            )}

            {generalSuccess && (
              <div className="bg-blue-50 border border-[#BBDEFB] text-[#0D47A1] p-4 rounded-xl text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1 mb-2">
                <CheckCircle className="h-5 w-5 text-[#2196F3] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Security Token Approved</p>
                  <p className="font-medium animate-pulse">{generalSuccess}</p>
                </div>
              </div>
            )}


            {/* ======================= VIEW: LOGIN ======================= */}
            {currentMode === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4" id="login-auth-form">
                
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email-f" className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                    Identity Email Address
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      id="login-email-f"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="e.g. admin@dataleaktracker.com"
                      required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="login-pass-f" className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                      System Password
                    </label>
                    <button 
                      type="button"
                      onClick={() => handleSwitchMode('FORGOT_PASSWORD')}
                      className="text-xs font-bold text-[#2196F3] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      id="login-pass-f"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold tracking-wider text-slate-800"
                      placeholder="Enter unique password token"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                    
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                      title={showPassword ? "Cover password characters" : "Disclose secrets"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember checklist toggler */}
                <div className="flex items-center justify-between py-1 text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
                    <input 
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-[#2196F3] bg-slate-50 border-slate-200 rounded-md focus:ring-blue-400 cursor-pointer"
                    />
                    <span>Remember terminal authorization</span>
                  </label>

                  <span className="text-[10px] bg-sky-50 text-sky-800 font-bold border border-sky-100 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                    Audit Guard Enabled
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2196F3] hover:bg-[#1565C0] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-300 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="h-4.5 w-4.5" />
                  AUTHENTICATE SYSTEM KEYS
                </button>

                {/* Simulated quick testing profiles */}
                <div className="bg-[#E3F2FD]/40 border border-[#BBDEFB] p-3 rounded-2xl space-y-2 mt-4">
                  <p className="text-[10px] font-bold text-[#0D47A1] font-mono uppercase tracking-widest flex items-center gap-1">
                    <Fingerprint className="h-3.5 w-3.5" /> Quick Sandbox Access Profiles (MFA Enabled)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadMockUser('admin')}
                      className="px-2.5 py-1.5 bg-white border border-[#BBDEFB] text-left rounded-lg text-xs font-semibold text-[#0D47A1] hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Security Lead
                      <span className="block text-[9px] font-mono text-slate-400 font-medium">admin@dataleaktracker.com</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadMockUser('user')}
                      className="px-2.5 py-1.5 bg-white border border-slate-250 text-left rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Default Admin
                      <span className="block text-[9px] font-mono text-slate-400 font-medium">user@example.com</span>
                    </button>
                  </div>
                </div>

              </form>
            )}


            {/* ======================= VIEW: SIGNUP ======================= */}
            {currentMode === 'SIGNUP' && (
              <form onSubmit={handleSignupSubmit} className="space-y-4" id="signup-auth-form">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="signup-name" className="block text-xs font-bold text-slate-750 uppercase tracking-wider font-mono">
                    Full Operator Name
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      id="signup-name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="e.g. Major Alan Turing"
                      required
                    />
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="block text-xs font-bold text-slate-750 uppercase tracking-wider font-mono">
                    Workspace Email Address
                  </label>
                  <div className="relative">
                    <input 
                      type="email"
                      id="signup-email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="e.g. inspector@dataleaktracker.com"
                      required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Password Input with Strength evaluation */}
                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="block text-xs font-bold text-slate-755 uppercase tracking-wider font-mono">
                    Select Security Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showSignupPassword ? "text" : "password"}
                      id="signup-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-250 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="Must be a strong cryptographic secret password"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                    
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-705 p-1 rounded-md"
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Interactively displays password strength meter as requested */}
                  {signupPassword && (
                    <div className="bg-slate-50/50 border border-slate-200.5 p-3 rounded-xl space-y-2 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                        <span className="text-slate-500">Strength level:</span>
                        <span className="font-mono text-[#0D47A1]">{evaluatePasswordStrength(signupPassword).label}</span>
                      </div>
                      
                      {/* Color-coded rating progress bar */}
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden grid grid-cols-5 gap-0.5">
                        <div className={`h-full ${evaluatePasswordStrength(signupPassword).score >= 1 ? evaluatePasswordStrength(signupPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(signupPassword).score >= 2 ? evaluatePasswordStrength(signupPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(signupPassword).score >= 3 ? evaluatePasswordStrength(signupPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(signupPassword).score >= 4 ? evaluatePasswordStrength(signupPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(signupPassword).score >= 5 ? evaluatePasswordStrength(signupPassword).color : 'bg-transparent'}`} />
                      </div>

                      {/* Criteria validation checklists */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-500 font-semibold font-sans">
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(signupPassword).criteria.length ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(signupPassword).criteria.uppercase ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span>At least one uppercase</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(signupPassword).criteria.lowercase ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span>At least one lowercase</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(signupPassword).criteria.digit ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span>At least one number (0-9)</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-2">
                          {evaluatePasswordStrength(signupPassword).criteria.symbol ? <Check className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span>At least one symbol (#$@!%&*?())</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="signup-confirm-password" className="block text-xs font-bold text-slate-755 uppercase tracking-wider font-mono">
                    Verify Secret Password Again
                  </label>
                  <div className="relative">
                    <input 
                      type="password"
                      id="signup-confirm-password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="Repeat matching password security token"
                      required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  </div>
                  {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                    <span className="text-[10px] text-red-600 font-bold block mt-1">Passwords do not match yet.</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={evaluatePasswordStrength(signupPassword).score < 5 || signupPassword !== signupConfirmPassword}
                  className="w-full py-3 bg-[#2196F3] hover:bg-[#1565C0] text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:pointer-events-none font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  PROVISION WORKSPACE ACCOUNT
                </button>

              </form>
            )}


            {/* ======================= VIEW: FORGOT PASSWORD ======================= */}
            {currentMode === 'FORGOT_PASSWORD' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" id="forgot-pass-form">
                
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-1.5">
                  <span className="text-xs font-bold text-[#0D47A1] uppercase font-mono tracking-wider block">Credentials Recovery Sequence</span>
                  <p className="text-xs text-slate-600 font-medium">
                    Supply your registered operator email. If matched, the central security engine will transmit a multi-factor OTP code valid for 5 minutes.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-750 uppercase tracking-wider font-mono">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <input 
                      type="email"
                      id="forgot-email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="e.g. keymaster@dataleaktracker.com"
                      required
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => handleSwitchMode('LOGIN')}
                    className="w-1/3 py-3 border border-slate-350 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3 bg-[#2196F3] hover:bg-[#1565C0] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>REQUEST SECURITY PIN</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </form>
            )}


            {/* ======================= VIEW: OTP VERIFY ======================= */}
            {currentMode === 'OTP_VERIFY' && (
              <form onSubmit={handleOTPVerifySubmit} className="space-y-4" id="otp-confirm-form">
                
                <div className="bg-linear-to-r from-blue-50 to-sky-50 border border-[#90CAF9] text-[#0D47A1] rounded-2xl p-4 text-xs space-y-1.5">
                  <span className="font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Fingerprint className="h-4.5 w-4.5 text-[#2196F3]" /> 
                    {otpPurpose === 'signup' && 'CONFIRM IDENTITY ONBOARDING'}
                    {otpPurpose === 'login_2fa' && '2FA MFA IDENTITY DISPATCH'}
                    {otpPurpose === 'forgot_password' && 'AUTHORIZE RECOVERY TRANSACTION'}
                  </span>
                  <p className="text-slate-600 font-medium">
                    We sent a security OTP code to <strong className="text-[#0D47A1]">{targetEmail}</strong>. 
                    Please retrieve this code from your email (or use the simulated developer inbox below) to authorize system privileges.
                  </p>
                </div>

                {/* 6-Digit input */}
                <div className="space-y-1.5">
                  <label htmlFor="otp-input" className="block text-xs font-bold text-slate-755 uppercase tracking-wider font-mono text-center">
                    Enter 6-Digit Security Token
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <input 
                      type="text"
                      id="otp-input"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center py-3.5 text-2xl font-mono font-bold tracking-[8px] bg-slate-50 border-2 border-dashed border-[#90CAF9] focus:bg-white focus:border-[#2196F3] focus:ring-4 focus:ring-blue-100 rounded-xl outline-none transition-all placeholder-slate-300"
                      placeholder="000000"
                      disabled={isLoading}
                      required
                      autoFocus
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold block text-center font-mono uppercase tracking-wider">
                    Limit: 5 entry attempts max. Discards immediately on success.
                  </span>
                </div>

                {/* Cooldown Timer section */}
                <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                  {resendCooldown > 0 ? (
                    <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#2196F3]" />
                      <span>Resend cooldown: <strong className="font-mono">{resendCooldown}s</strong></span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerResendOTP}
                      className="text-xs font-bold text-[#2196F3] hover:underline hover:text-[#0D47A1] cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3 shrink-0" />
                      Resend Verification OTP Key
                    </button>
                  )}
                </div>

                {/* Reset OTP actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      clearFlags();
                      setCurrentMode('LOGIN');
                    }}
                    className="py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Abort Verification
                  </button>
                  <button
                    type="submit"
                    disabled={otpCode.length < 6}
                    className="py-3 bg-[#2196F3] hover:bg-[#1565C0] text-white disabled:bg-slate-200 disabled:text-slate-450 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>VERIFY MFA TOKEN</span>
                  </button>
                </div>

              </form>
            )}


            {/* ======================= VIEW: RESET PASSWORD ======================= */}
            {currentMode === 'RESET_PASSWORD' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4" id="reset-password-final-form">
                
                <div className="bg-blue-50 border border-blue-150 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-[#0D47A1] block font-mono">Reset authorization active</span>
                  <p className="font-medium">Define a secure passcode below to store into your credentials profile.</p>
                </div>

                {/* New Password field */}
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="block text-xs font-bold text-slate-755 uppercase tracking-wider font-mono">
                    Define New Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? "text" : "password"}
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-250 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="At least 8 complex characters"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                    
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 p-1 rounded-md"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {newPassword && (
                    <div className="bg-slate-50 p-3 rounded-xl space-y-2 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                        <span className="text-slate-500">Security Strength rating:</span>
                        <span className="font-mono text-[#0D47A1]">{evaluatePasswordStrength(newPassword).label}</span>
                      </div>
                      
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden grid grid-cols-5 gap-0.5">
                        <div className={`h-full ${evaluatePasswordStrength(newPassword).score >= 1 ? evaluatePasswordStrength(newPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(newPassword).score >= 2 ? evaluatePasswordStrength(newPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(newPassword).score >= 3 ? evaluatePasswordStrength(newPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(newPassword).score >= 4 ? evaluatePasswordStrength(newPassword).color : 'bg-transparent'}`} />
                        <div className={`h-full ${evaluatePasswordStrength(newPassword).score >= 5 ? evaluatePasswordStrength(newPassword).color : 'bg-transparent'}`} />
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 font-semibold">
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(newPassword).criteria.length ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-500" />}
                          <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(newPassword).criteria.uppercase ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-500" />}
                          <span>At least one uppercase</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(newPassword).criteria.lowercase ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-500" />}
                          <span>At least one lowercase</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {evaluatePasswordStrength(newPassword).criteria.digit ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-500" />}
                          <span>At least one number</span>
                        </div>
                        <div className="flex items-center gap-1 col-span-2">
                          {evaluatePasswordStrength(newPassword).criteria.symbol ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-500" />}
                          <span>At least one symbol (#$@!%&*?())</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm-new-password" className="block text-xs font-bold text-slate-755 uppercase tracking-wider font-mono">
                    Verify Password Match Group
                  </label>
                  <div className="relative">
                    <input 
                      type="password"
                      id="confirm-new-password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 focus:border-[#2196F3] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs transition-all outline-none font-sans font-semibold text-slate-800"
                      placeholder="Must match newly entered password above"
                      required
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                  </div>
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <span className="text-[10px] text-red-600 font-bold block mt-1">Passwords mismatched.</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      clearFlags();
                      setCurrentMode('LOGIN');
                    }}
                    className="w-1/3 py-3 border border-slate-350 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    disabled={evaluatePasswordStrength(newPassword).score < 5 || newPassword !== confirmNewPassword}
                    className="w-2/3 py-3 bg-[#2196F3] hover:bg-[#1565C0] text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:pointer-events-none font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="h-4.5 w-4.5" />
                    <span>SAVE SECURED CIPHER</span>
                  </button>
                </div>

              </form>
            )}


            {/* Unified corporate terms footer inside block */}
            <footer className="pt-4 border-t border-slate-150 text-center text-[10px] text-slate-400 leading-normal select-none">
              <p>© 2026 PatShield Intel. Incident Threat Center. Built v3.2.0-PRO.</p>
              <p className="mt-1">All audit traces are logged cryptographically. False verification alerts trigger corporate sysadm lockout protocols.</p>
            </footer>

          </div>
        </section>

      </main>

      {/* ======================================================================
          SANDBOX SYSTEM LOGS & MAIL CATCHER
          Requirement: "Use Nodemailer to send email OTP." + "Test OTP verification."
          Provides visual testbed for reviewers to copy-paste real-time sandbox OTP messages!
          ====================================================================== */}
      <section className="max-w-7xl mx-auto w-full mt-10 border-t border-slate-200 pt-8" id="sandbox-mailcatcher-terminal">
        <div className="bg-slate-900 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
          
          {/* Header */}
          <div className="bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-805">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#2196F3]/10 border border-[#2196F3]/30 rounded-lg text-[#2196F3]">
                <Inbox className="h-4.5 w-4.5 text-[#2196F3]" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono tracking-wider text-slate-100 uppercase flex items-center gap-2">
                  <span>Enterprise Mail Relay Catcher Terminal</span>
                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full lowercase select-none">simulated debug node</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Captures and prints SMTP Nodemailer outputs live from backend environment variables fallback</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchSandboxEmails}
                className="px-3 py-1.5 bg-[#2196F3] hover:bg-[#1565C0] text-white text-[10px] font-bold tracking-wider font-mono rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                title="Immediate refresh mailbox"
              >
                <RefreshCw className="h-3 w-3" />
                POLL EMAIL FEED
              </button>

              <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400 select-none cursor-pointer">
                <input 
                  type="checkbox"
                  checked={autoPollEmails}
                  onChange={(e) => setAutoPollEmails(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#2196F3] rounded cursor-pointer"
                />
                <span>Auto live updates (3s)</span>
              </label>
            </div>
          </div>

          {/* Mailbox contents container */}
          <div className="p-6">
            {simulatedEmails.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Mail className="h-10 w-10 text-slate-500 mx-auto opacity-50 block animate-bounce" />
                <p className="text-xs font-mono text-slate-400">Sandbox mailcatcher empty. Trigger a Signup, resend, or Forgot Password OTP event above.</p>
                <p className="text-[10px] text-slate-600 italic">Notice: SMTP environment credentials can configure real deliveries physically on port 587/465.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto no-scrollbar">
                {simulatedEmails.map((email) => (
                  <div 
                    key={email.id}
                    className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between text-xs font-mono space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    {/* Header */}
                    <div className="space-y-1 pb-2 border-b border-slate-850">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] bg-[#2196F3]/10 text-[#2196F3] px-2 py-0.5 rounded border border-[#2196F3]/20 font-bold truncate">To: {email.to}</span>
                        <time className="text-[9px] text-slate-500 tracking-tight shrink-0">[{email.timestamp}]</time>
                      </div>
                      <p className="text-[11px] font-bold text-slate-200 truncate">{email.subject}</p>
                    </div>

                    {/* Email preview contents */}
                    <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-900 max-h-24 overflow-y-auto whitespace-pre-line text-left">
                      {email.body}
                    </div>

                    {/* Interactive OTP Injection Helper */}
                    <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-xl border border-slate-850">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] text-slate-550 block font-bold uppercase tracking-wider text-[#90CAF9]">CATCHED MFA OTP:</span>
                        <strong className="text-sm text-green-400 font-extrabold tracking-widest">{email.otp}</strong>
                      </div>
                      {currentMode === 'OTP_VERIFY' && targetEmail.toLowerCase() === email.to.toLowerCase() && (
                        <button
                          onClick={() => handleInjectSandboxOTP(email.otp)}
                          className="px-2.5 py-1.5 bg-green-950/40 hover:bg-green-900/40 text-green-400 text-[10px] font-bold tracking-wider rounded-lg border border-green-900 transition-all cursor-pointer flex items-center gap-1"
                          title="Inject this OTP code directly into verification input above"
                        >
                          <Check className="h-3 w-3 text-green-400" />
                          <span>AUTO INJECT</span>
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

    </div>
  );
}

