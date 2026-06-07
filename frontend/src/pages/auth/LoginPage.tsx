import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Activity, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { LogoIcon } from '@/components/ui/LogoIcon'
import { useAuthStore } from '@/store/useAuthStore'
import { authApi } from '@/services/api'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password.')
      }
      
      const response = await authApi.login({ email, password })
      login(response.user, response.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background with SVG Pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E')] opacity-20" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/30 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
        className="max-w-[400px] w-full space-y-6 bg-slate-900/50 backdrop-blur-2xl p-8 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/10 relative z-10"
      >
        {/* Decorative inner glow */}
        <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_0_80px_rgba(255,255,255,0.02)] pointer-events-none" />
        
        <div className="relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <LogoIcon className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome back</h2>
          <p className="mt-3 text-sm text-slate-400">
            Sign in to your MarketTrace account
          </p>
        </div>
        
        <form className="relative z-10 mt-6 space-y-5" onSubmit={handleLogin}>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-11 pr-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500 transition-all shadow-inner"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="block w-full pl-11 pr-11 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500 transition-all shadow-inner"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-500 focus:ring-primary-500 bg-slate-900/50 border-slate-700/50 rounded transition-colors"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
              Remember me
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 disabled:opacity-70 transition-all mt-6"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign in'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400 relative z-10">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
            Sign up now
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
