import { Link } from 'react-router-dom'
import { ShieldAlert, Bot, Activity, ArrowRight, Zap, Target, Lock, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

export function LandingPage() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white flex-1 flex flex-col justify-center pt-8 pb-20 lg:pt-12 lg:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 to-slate-900/90" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary-300 mb-8 backdrop-blur-md shadow-xl"
            >
              <Zap className="w-4 h-4 text-yellow-400" /> Next-Gen AI Trade Surveillance
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
            >
              Detect Market Abuse with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient">Superhuman Precision</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              MarketTrace is an enterprise-grade surveillance platform powered by AI. Analyze millions of trades instantly, visualize complex trader networks, and automate compliance investigations.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-6"
            >
              <Link to="/register" className="h-14 px-8 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-lg flex items-center gap-2 transition-all shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)] hover:-translate-y-1">
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="h-14 px-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg flex items-center transition-all backdrop-blur-md hover:-translate-y-1">
                Sign In
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Enterprise-grade capabilities</h2>
            <p className="text-slate-600 text-lg">Built for modern compliance teams to stay ahead of sophisticated market manipulation tactics.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Investigation Copilot</h3>
              <p className="text-slate-600 leading-relaxed">
                Chat directly with your data. Ask the AI to explain complex trading patterns, summarize alerts, or automatically draft suspicious activity reports.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 ring-8 ring-orange-50/50">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Pattern Detection</h3>
              <p className="text-slate-600 leading-relaxed">
                Automatically detect Spoofing, Wash Trading, Layering, and Pump & Dump schemes across millions of rows of high-frequency tick data.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 ring-8 ring-indigo-50/50">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Market Replay Engine</h3>
              <p className="text-slate-600 leading-relaxed">
                Rewind the market and watch trades execute in real-time. Visualize exactly what happened leading up to a massive price spike or flash crash.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
