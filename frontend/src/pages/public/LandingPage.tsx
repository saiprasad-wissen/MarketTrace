import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Bot, Activity, ArrowRight, Zap, Target, Lock, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

export function LandingPage() {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: `${Math.random() * 100}%`,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5
    }))
  }, [])

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white flex-1 flex flex-col justify-center pt-8 pb-20 lg:pt-12 lg:pb-32">
        {/* Dynamic Background with SVG Pattern & Particles */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          
          {/* Floating Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute bg-amber-400 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.8)] z-10"
              style={{
                left: p.left,
                width: p.size * 1.5,
                height: p.size * 1.5,
                bottom: '-5%'
              }}
              animate={{
                y: ['0vh', '-120vh'],
                opacity: [0, 1, 0],
                rotate: [0, 180]
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          ))}

          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-600/10 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
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
              <Link to="/register" className="h-14 px-8 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-lg flex items-center gap-2 transition-all shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_rgba(79,70,229,0.7)] hover:-translate-y-1">
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="h-14 px-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg flex items-center transition-all backdrop-blur-md hover:-translate-y-1 shadow-lg shadow-black/20">
                Sign In
              </Link>
            </motion.div>
          </div>

          {/* Glowing 3D Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 80, rotateX: 30 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.5, type: 'spring', bounce: 0.4 }}
            style={{ perspective: 1200 }}
            className="mt-20 max-w-6xl w-full mx-auto relative group z-20"
          >
              {/* Backglow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500 rounded-2xl blur-3xl opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
              
              {/* Fake UI Window */}
              <div className="relative rounded-2xl border border-white/20 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden aspect-[16/9] flex flex-col transform-gpu group-hover:-translate-y-2 transition-all duration-500">
                {/* Window Header */}
                <div className="h-12 border-b border-white/10 flex items-center px-6 bg-slate-800/50">
                  <div className="flex gap-2 w-24">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-400 shadow-inner" />
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-inner" />
                    <div className="w-3.5 h-3.5 rounded-full bg-green-400 shadow-inner" />
                  </div>
                  <div className="flex-1 flex justify-center items-center text-sm text-slate-400 font-medium tracking-widest gap-2">
                    <Activity className="w-4 h-4" /> MARKETTRACE_ENGINE
                  </div>
                  <div className="w-24" /> {/* Spacer for perfect centering */}
                </div>
                {/* Window Body (Fake UI lines) */}
                <div className="flex-1 p-6 flex flex-col gap-4 bg-slate-900/50">
                  {/* Top Bar */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 bg-indigo-500/20 rounded border border-indigo-500/50 flex items-center justify-center">
                        <Target className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-wide">Live Surveillance Feed</h4>
                        <p className="text-xs text-slate-400">Processing 1.2M trades/sec • 3 Active Threats</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs font-bold text-red-400">CRITICAL ALERT</span>
                    </div>
                  </div>
                  
                  {/* Main Grid */}
                  <div className="flex gap-4 h-full">
                    {/* Sidebar: Recent Alerts */}
                    <div className="w-64 h-full bg-slate-800/40 rounded-xl border border-white/5 p-4 flex flex-col gap-3 overflow-hidden">
                      <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recent Flags</h5>
                      
                      {/* Alert Item 1 */}
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-red-400">SPOOFING</span>
                          <span className="text-[10px] text-slate-500">Just now</span>
                        </div>
                        <p className="text-xs text-slate-300">Trader_842 placed and cancelled 42,000 $AAPL orders.</p>
                      </div>

                      {/* Alert Item 2 */}
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-amber-400">WASH TRADE</span>
                          <span className="text-[10px] text-slate-500">2 min ago</span>
                        </div>
                        <p className="text-xs text-slate-300">Circular trading detected between 3 linked accounts.</p>
                      </div>

                      {/* Alert Item 3 */}
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-indigo-400">MOMENTUM</span>
                          <span className="text-[10px] text-slate-500">5 min ago</span>
                        </div>
                        <p className="text-xs text-slate-300">Unusual volume spike preceding $TSLA news.</p>
                      </div>
                    </div>
                    
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col gap-4">
                      {/* Chart Area */}
                      <div className="h-48 bg-slate-800/40 rounded-xl border border-white/5 relative overflow-hidden flex flex-col p-4">
                        <div className="flex justify-between mb-4 z-10">
                          <div>
                            <div className="text-xs text-slate-400">Symbol</div>
                            <div className="text-sm font-bold text-white">$AAPL - AAPL TICK DATA</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Manipulation Probability</div>
                            <div className="text-sm font-bold text-red-400">94.2%</div>
                          </div>
                        </div>
                        {/* Fake chart line */}
                        <svg className="absolute inset-0 h-full w-full opacity-60 mt-12" preserveAspectRatio="none">
                          <path d="M0,100 C50,80 100,120 150,60 C200,10 250,90 300,40 L300,200 L0,200 Z" fill="rgba(79, 70, 229, 0.15)" />
                          <path d="M0,100 C50,80 100,120 150,60 C200,10 250,90 300,40" fill="none" stroke="#818cf8" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                          <path d="M250,90 L250,200" stroke="#f87171" strokeWidth="1" strokeDasharray="4 4" />
                          <circle cx="250" cy="90" r="4" fill="#f87171" />
                        </svg>
                      </div>
                      
                      {/* Bottom Widgets */}
                      <div className="flex-1 flex gap-4">
                        {/* Fake Table */}
                        <div className="flex-1 bg-slate-800/40 rounded-xl border border-white/5 p-4 flex flex-col">
                          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Order Book Imbalance</h5>
                          <div className="space-y-2 flex-1">
                            <div className="flex justify-between text-xs text-slate-300"><span>BID: 45,200</span><span className="text-green-400">68%</span></div>
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full w-[68%] bg-green-500 rounded-full" />
                            </div>
                            <div className="flex justify-between text-xs text-slate-300 mt-4"><span>ASK: 21,400</span><span className="text-red-400">32%</span></div>
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full w-[32%] bg-red-500 rounded-full" />
                            </div>
                          </div>
                        </div>
                        {/* Fake AI Copilot */}
                        <div className="flex-1 bg-slate-800/40 rounded-xl border border-white/5 p-4 flex flex-col relative">
                          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5 text-blue-400" /> AI Investigator
                          </h5>
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs text-blue-200 leading-relaxed">
                            <strong className="text-blue-400 block mb-1">Analysis Complete:</strong>
                            Trader_842 has executed identical spoofing patterns across 4 other equities in the last 24 hours. Recommended action: <strong>Freeze account.</strong>
                          </div>
                          <div className="absolute bottom-4 left-4 right-4 h-8 bg-slate-900/80 rounded border border-white/10 flex items-center px-3 text-xs text-slate-500">
                            Ask AI to generate report...
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-slate-900 border-t border-white/5 relative overflow-hidden">
        {/* Subtle mesh behind features */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-900/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-extrabold text-white mb-6 tracking-tight">Enterprise-grade capabilities</h2>
            <p className="text-slate-400 text-xl leading-relaxed">Built for modern compliance teams to stay ahead of sophisticated market manipulation tactics with the power of artificial intelligence.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.03, rotateY: 5 }}
              style={{ perspective: 1000 }}
              className="bg-slate-800/40 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">AI Investigation Copilot</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Chat directly with your data. Ask the AI to explain complex trading patterns, summarize alerts, or automatically draft suspicious activity reports.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.03, rotateY: 5 }}
              style={{ perspective: 1000 }}
              className="bg-slate-800/40 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center mb-8 shadow-lg shadow-orange-500/30">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Pattern Detection</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Automatically detect Spoofing, Wash Trading, Layering, and Pump & Dump schemes across millions of rows of high-frequency tick data.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03, rotateY: -5 }}
              style={{ perspective: 1000 }}
              className="bg-slate-800/40 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-8 shadow-lg shadow-indigo-500/30">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Market Replay Engine</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Rewind the market and watch trades execute in real-time. Visualize exactly what happened leading up to a massive price spike or flash crash.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
