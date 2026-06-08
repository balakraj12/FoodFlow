import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, Award, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage({ setAuthView }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setCodeRequested(true);
        setSecurityCode('654321'); // Populating dummy security code
        setInfoMessage("Reset verification code '654321' generated.");
      } else {
        setError(data.error || 'Email was not found.');
      }
    } catch {
      setError('Could not connect to database.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !securityCode) {
      setError('Please fill in both the verification code and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, securityCode }),
      });
      const data = await res.json();
      if (data.success) {
        setInfoMessage('Success! Password updated safely.');
        setTimeout(() => {
          setAuthView('login');
        }, 1500);
      } else {
        setError(data.error || 'Failed to update password.');
      }
    } catch {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recovery</h2>
          <p className="mt-1 text-sm text-slate-500">Reset your password to resume ordering pizza</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-100 text-xs flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-100 text-xs font-semibold text-center leading-relaxed">
            {infoMessage}
          </div>
        )}

        {!codeRequested ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : 'Send Recovery Code'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Enter Reset Security Code (Use 654321)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="654321"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-[11px] text-amber-800 flex items-start space-x-2">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Tip:</strong> Complete security verification with dummy code <strong>654321</strong> to dynamically rewrite your MongoDB login parameters.
              </span>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setCodeRequested(false);
                  setInfoMessage('');
                }}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Resetting...' : 'Confirm New Password'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 font-semibold">
            Remember Password?{' '}
            <button
              onClick={() => setAuthView('login')}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
