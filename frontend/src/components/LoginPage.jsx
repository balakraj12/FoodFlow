import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/index.js';
import { Lock, Mail, Phone, ShieldAlert, Award, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ setAuthView }) {
  const dispatch = useDispatch();
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  
  // Email states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone states
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('foodflow_token', data.token);
        dispatch(setUser(data.user));
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch (err) {
      setError('Connection failed. Ensure the server is online.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtpCode('123456'); // Populating dummy otp for seamless review
        setInfoMessage("Verification OTP code '123456' generated.");
      } else {
        setError(data.error || 'Failed sending OTP.');
      }
    } catch {
      setError('Connection failure.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setError('Verification code is required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpCode }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('foodflow_token', data.token);
        dispatch(setUser(data.user));
      } else {
        setError(data.error || 'Incorrect OTP code.');
      }
    } catch {
      setError('OTP verification connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white font-black text-2xl mb-4">
            FF
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to order freshly baked custom pizzas</p>
        </div>

        {/* Auth Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => {
              setLoginMethod('email');
              setError('');
              setInfoMessage('');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginMethod === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Email & Password
          </button>
          <button
            onClick={() => {
              setLoginMethod('phone');
              setError('');
              setInfoMessage('');
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              loginMethod === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Phone & OTP
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-100 text-xs flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-100 text-xs font-semibold text-center">
            {infoMessage}
          </div>
        )}

        {loginMethod === 'email' ? (
          /* Email Auth Form */
          <form onSubmit={handleEmailLogin} className="space-y-4">
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

            <div className="space-y-1 text-left">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => setAuthView('forgot')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="🔑 Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-11 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Logging in...' : 'Sign In with Password'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          /* Phone OTP Form */
          <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="+919999988888"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-[11px] text-amber-800 flex items-start space-x-2">
                  <Award className="w-4 h-4 text-amber-500 shrink-0 animate-bounce" />
                  <span>
                    <strong>Sandbox Notice:</strong> Requesting OTP will automatically supply code <strong>123456</strong> for immediate testing.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-1 text-left text-center">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Enter Verification OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-40 mx-auto text-center font-mono font-black text-2xl tracking-[0.4em] py-2 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                  />
                </div>

                <div className="flex space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setInfoMessage('');
                    }}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl text-sm transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Confirming...' : 'Verify Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={() => setAuthView('signup')}
              className="font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Sign Up Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
