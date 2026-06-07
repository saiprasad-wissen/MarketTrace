import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogoIcon } from '@/components/ui/LogoIcon'
import { authApi } from '@/services/api'

export function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const navigate = useNavigate()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setStep(2)
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.verifyOtp(email, otp.join(''))
      setStep(3)
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.resetPassword({ email, otp: otp.join(''), new_password: newPassword })
      navigate('/login')
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background with SVG Pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/30 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
        className="max-w-md w-full space-y-8 bg-slate-900/50 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/10 relative z-10"
      >
        <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_0_80px_rgba(255,255,255,0.02)] pointer-events-none" />
        
        <div className="relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <LogoIcon className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {step === 1 ? 'Reset password' : step === 2 ? 'Enter OTP' : 'New password'}
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            {step === 1 ? "Enter your email and we'll send a code" : step === 2 ? `We sent a 6-digit code to ${email}` : "Enter your new secure password"}
          </p>
        </div>
        
        {step === 1 && (
          <motion.form initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 mt-8 space-y-6" onSubmit={handleSendOtp}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-11 pr-3 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500 transition-all shadow-inner"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !email}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 disabled:opacity-70 transition-all mt-8"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Code'}
            </motion.button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 mt-8 space-y-6" onSubmit={handleVerifyOtp}>
            <div className="flex justify-between gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  className="w-12 h-14 text-center text-xl font-bold bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white transition-all shadow-inner"
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '')
                    const newOtp = [...otp]
                    newOtp[i] = val
                    setOtp(newOtp)
                    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                      document.getElementById(`otp-${i-1}`)?.focus()
                    }
                  }}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 disabled:opacity-70 transition-all mt-8"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Code'}
            </motion.button>
          </motion.form>
        )}

        {step === 3 && (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !newPassword}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 disabled:opacity-70 transition-all mt-8"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reset Password'}
            </motion.button>
          </motion.form>
        )}

        <div className="mt-8 text-center relative z-10">
          <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
