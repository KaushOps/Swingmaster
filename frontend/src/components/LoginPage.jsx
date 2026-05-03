import { useState, useEffect, useRef } from 'react';

/* ── Ticker data ─────────────────────────────────────────── */
const TICKERS = [
  { sym: 'RELIANCE', price: '2,918.45', chg: '+1.24%', up: true },
  { sym: 'TCS', price: '3,782.10', chg: '-0.38%', up: false },
  { sym: 'INFY', price: '1,452.75', chg: '+0.87%', up: true },
  { sym: 'HDFCBANK', price: '1,678.20', chg: '+0.55%', up: true },
  { sym: 'BAJFINANCE', price: '7,234.60', chg: '-1.02%', up: false },
  { sym: 'WIPRO', price: '487.35', chg: '+0.29%', up: true },
  { sym: 'NIFTY50', price: '22,450.30', chg: '+0.63%', up: true },
  { sym: 'SENSEX', price: '73,814.85', chg: '+0.51%', up: true },
  { sym: 'AXISBANK', price: '1,087.50', chg: '-0.44%', up: false },
  { sym: 'LT', price: '3,521.90', chg: '+1.08%', up: true },
];

const PARTICLES = ['+2.3%', '-0.8%', '+1.1%', 'NIFTY', 'BUY', '▲', '▼', '+0.5%', '-1.2%', 'TARGET'];

/* ── Floating Particle ────────────────────────────────────── */
function Particle({ text, left, delay, speed, up, isDark }) {
  const color = up 
    ? (isDark ? 'rgba(74,222,128,0.35)' : 'rgba(5, 150, 105, 0.6)') 
    : (isDark ? 'rgba(248,113,113,0.25)' : 'rgba(220, 38, 38, 0.55)');

  return (
    <div style={{
      position: 'absolute', left: `${left}vw`, bottom: '-30px',
      fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em',
      color: color,
      animation: `tf-rise ${speed}s linear ${delay}s infinite`,
      pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5
    }}>
      {text}
    </div>
  );
}

/* ── Main Login Component ─────────────────────────────────── */
export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [pointer, setPointer] = useState({ x: 52, y: 34 });
  const [particles, setParticles] = useState([]);
  const pidRef = useRef(0);

  /* Set dark mode initially and inject Tailwind CDN */
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  /* Spawn particles */
  useEffect(() => {
    const spawn = () => {
      const id = ++pidRef.current;
      const p = {
        id, text: PARTICLES[Math.floor(Math.random() * PARTICLES.length)],
        left: Math.random() * 100, delay: 0,
        speed: 7 + Math.random() * 8,
        up: Math.random() > 0.4,
      };
      setParticles(prev => [...prev, p]);
      setTimeout(() => setParticles(prev => prev.filter(x => x.id !== id)), 16000);
    };
    for (let i = 0; i < 8; i++) setTimeout(spawn, i * 300);
    const iv = setInterval(spawn, 900);
    return () => clearInterval(iv);
  }, []);

  /* Handle Pointer Move */
  function handlePointerMove(e) {
    const x = Math.min(100, Math.max(0, (e.clientX / window.innerWidth) * 100));
    const y = Math.min(100, Math.max(0, (e.clientY / window.innerHeight) * 100));
    setPointer({ x, y });
  }

  function handlePointerLeave() {
    setPointer({ x: 52, y: 34 });
  }

  /* Login handler */
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (username !== 'Kaushik' || password !== 'TradeFlex@1018') {
      setLoading(false);
      triggerError('Invalid credentials. Please try again.');
      return;
    }

    setSuccess(true);
    setTimeout(() => onLogin(), 900);
    setLoading(false);
  }

  function triggerError(msg) {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  }

  /* Compute dynamic background */
  const pointerBgStyle = isDark 
    ? { background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(99,102,241,0.15) 0%, transparent 40%), radial-gradient(circle at 18% 20%, rgba(99,102,241,0.1), transparent 30%), radial-gradient(circle at 82% 80%, rgba(74,222,128,0.08), transparent 26%)` }
    : { background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.5), transparent 18%), radial-gradient(circle at 18% 20%, rgba(219,74,43,0.25), transparent 30%), radial-gradient(circle at 82% 80%, rgba(248,163,72,0.22), transparent 26%)` };

  return (
    <div 
      className="fixed inset-0 overflow-hidden bg-[#e7dfd1] text-[#1d140f] dark:bg-black dark:text-[#fafafa] font-sans antialiased transition-colors duration-500"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <style>{`
        .grain {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
          background-size: 24px 24px;
          mask-image: radial-gradient(circle at center, black, transparent 82%);
          opacity: 0.3;
        }
        .dark .grain {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        }
        .mesh {
          background-image:
            radial-gradient(circle at 20% 20%, rgba(219, 74, 43, 0.18), transparent 0 30%),
            radial-gradient(circle at 80% 18%, rgba(248, 163, 72, 0.18), transparent 0 28%),
            radial-gradient(circle at 75% 82%, rgba(141, 87, 56, 0.12), transparent 0 26%),
            linear-gradient(135deg, rgba(231, 225, 215, 0.96), rgba(244, 239, 231, 0.86));
        }
        .dark .mesh {
          background-image:
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15), transparent 0 30%),
            radial-gradient(circle at 80% 18%, rgba(74, 222, 128, 0.1), transparent 0 28%),
            radial-gradient(circle at 75% 82%, rgba(129, 140, 248, 0.1), transparent 0 26%),
            linear-gradient(135deg, #050505, #000000);
        }
        .animate-float-slow { animation: float-slow 14s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 10s ease-in-out infinite; }
        .animate-drift { animation: drift 18s linear infinite; }
        .animate-rise { animation: rise 900ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-sheen { animation: sheen 2.8s ease-in-out infinite; }
        @keyframes float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -22px, 0) scale(1.06); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-26px, 18px, 0) rotate(6deg); }
        }
        @keyframes drift {
          from { transform: translateX(-4%) translateY(0); }
          to { transform: translateX(4%) translateY(-2%); }
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(22px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sheen {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes tf-rise {
          0%   { opacity:0; transform:translateY(0); }
          10%  { opacity:1; }
          90%  { opacity:0.4; }
          100% { opacity:0; transform:translateY(-110vh); }
        }
        @keyframes tf-ticker {
          0%   { transform:translateX(0); }
          100% { transform:translateX(-50%); }
        }
        @keyframes tf-spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* Theme Toggle */}
      <button 
        onClick={() => setIsDark(!isDark)} 
        className="fixed top-6 right-6 z-50 rounded-full p-3 bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 backdrop-blur-md transition-all hover:scale-110 cursor-pointer"
      >
        {isDark ? (
          <svg className="w-5 h-5 text-yellow-500 block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        ) : (
          <svg className="w-5 h-5 text-slate-800 block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        )}
      </button>

      {/* Pointer tracking background */}
      <div className="fixed inset-0 transition-[background] duration-300 z-0" style={pointerBgStyle} />
      <div className="fixed inset-0 mesh opacity-95 z-0" />
      <div className="fixed inset-0 grain mix-blend-soft-light z-0" />
      
      {/* Floating Orbs */}
      <div className="fixed -left-28 top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#db4a2b]/35 dark:bg-[#6366f1]/25 blur-3xl animate-float-slow z-0 transition-colors duration-500" />
      <div className="fixed right-[-10rem] top-[8%] h-[26rem] w-[26rem] rounded-full bg-[#f8a348]/35 dark:bg-[#4ade80]/15 blur-3xl animate-float-medium z-0 transition-colors duration-500" />
      <div className="fixed bottom-[-8rem] left-[20%] h-[22rem] w-[22rem] rounded-full bg-[#8d5738]/20 dark:bg-[#818cf8]/20 blur-3xl animate-drift z-0 transition-colors duration-500" />
      
      {/* Accent Lines */}
      <div className="fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/70 to-transparent z-0 transition-colors duration-500" />
      <div className="fixed inset-y-0 left-[58%] hidden w-px bg-gradient-to-b from-transparent via-[#c97b53]/35 dark:via-white/10 to-transparent lg:block z-0 transition-colors duration-500" />

      {/* Particles Container */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
        {particles.map(p => <Particle key={p.id} {...p} isDark={isDark} />)}
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 sm:px-6 py-6 sm:py-10 lg:px-12 pb-24">
        <div className="grid w-full gap-8 lg:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          
          {/* Left Side */}
          <section className="max-w-2xl animate-rise text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] overflow-hidden shadow-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#111] transition-colors duration-500">
                <img src="/logo.png" alt="TradeFlex Logo" className="w-full h-full object-cover" />
              </div>
              <div className="text-lg sm:text-2xl font-bold tracking-tight flex items-center bg-black dark:bg-[#111] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-inner border border-black/10 dark:border-white/5 transition-colors duration-500">
                 <span className="text-[#E6CFB3]">Trade</span><span className="text-[#F37B03]">Flex</span><span className="text-[#FEC104]">.in</span>
              </div>
            </div>
            
            <h1 className="mt-6 sm:mt-10 text-4xl sm:text-5xl md:text-6xl font-bold leading-[0.92] sm:leading-[0.88] tracking-[-0.04em] text-[#1d140f] dark:text-[#E6CFB3] transition-colors duration-500">
              Trading through a warmer lens.
            </h1>
            <p className="mt-4 sm:mt-8 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg leading-7 sm:leading-8 text-[#5c4b40] dark:text-[#E6CFB3] font-medium transition-colors duration-500">
              A fluid, editorial interface for AI-powered swing trading. Precision analytics wrapped in an elegant, calming workspace.
            </p>
            <p className="mt-4 sm:mt-8 max-w-lg mx-auto lg:mx-0 text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.28em] text-[#8b6f60] dark:text-[#E6CFB3] font-bold transition-colors duration-500">
              Calm motion. Quiet contrast. Immediate focus.
            </p>
          </section>

          {/* Right Side (Card) */}
          <section className="relative lg:justify-self-end w-full max-w-sm sm:max-w-md mx-auto lg:mx-0">
            <div className="absolute -inset-4 sm:-inset-8 rounded-[2rem] sm:rounded-[2.75rem] bg-white/30 dark:bg-black/40 blur-3xl transition-colors duration-500" />
            <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.25rem] border border-white/60 dark:border-white/10 bg-[rgba(255,250,244,0.65)] dark:bg-[rgba(17,17,17,0.82)] p-6 sm:p-8 lg:p-10 shadow-[0_30px_120px_rgba(56,30,14,0.18)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.7)] backdrop-blur-3xl animate-rise [animation-delay:140ms] transition-colors duration-500">
              
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] sm:tracking-[0.45em] text-[#8a6a5c] dark:text-gray-500 font-bold transition-colors duration-500">Secure access</p>
                  <h2 className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold tracking-[-0.04em] text-[#1e1612] dark:text-[#fafafa] transition-colors duration-500">
                    Welcome back
                  </h2>
                </div>
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-[#d6b9a6]/60 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-sm text-[#a86a50] dark:text-gray-300 transition-colors duration-500">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="10" width="14" height="10" rx="3" />
                    <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                  </svg>
                </div>
              </div>

              {error && (
                <div className="mt-4 sm:mt-6 text-[0.74rem] text-red-600 dark:text-[#f87171] bg-red-100/50 dark:bg-[#f87171]/10 border border-red-200 dark:border-[#f87171]/25 rounded-lg p-2 px-3 animate-pulse">
                  {error}
                </div>
              )}

              <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-7" onSubmit={handleSubmit}>
                <div className="space-y-2 sm:space-y-3">
                  <label htmlFor="username" className="text-xs sm:text-sm font-bold text-[#4f3f36] dark:text-[rgba(255,255,255,0.6)] transition-colors duration-500">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#8b6f60] dark:text-[#52525b] pl-1 transition-colors duration-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </span>
                    <input 
                      id="username" name="username" type="text" autoComplete="username" 
                      placeholder="Enter username" required
                      value={username} onChange={e => setUsername(e.target.value)}
                      className="w-full border-b-2 border-[#c9ac98]/70 dark:border-white/10 bg-transparent py-2.5 sm:py-3 pl-9 text-sm sm:text-base text-[#1e1612] dark:text-[#fafafa] placeholder:text-[#8b6f60]/60 dark:placeholder:text-[#71717a] outline-none transition-colors duration-300 focus:border-[#d95d31] dark:focus:border-[#6366f1] font-semibold" 
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-end justify-between gap-4">
                    <label htmlFor="password" className="text-xs sm:text-sm font-bold text-[#4f3f36] dark:text-[rgba(255,255,255,0.6)] transition-colors duration-500">
                      Password
                    </label>
                    <a href="mailto:kaushikspoojari@gmail.com" className="text-xs sm:text-sm font-bold text-[#8b6f60] dark:text-[#52525b] transition-colors duration-300 hover:text-[#d95d31] dark:hover:text-[#fafafa]">
                      Forgot?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#8b6f60] dark:text-[#52525b] pl-1 transition-colors duration-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input 
                      id="password" name="password" autoComplete="current-password" 
                      type={showPwd ? 'text' : 'password'} 
                      placeholder="••••••••" required
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full border-b-2 border-[#c9ac98]/70 dark:border-white/10 bg-transparent py-2.5 sm:py-3 pl-9 text-sm sm:text-base text-[#1e1612] dark:text-[#fafafa] placeholder:text-[#8b6f60]/60 dark:placeholder:text-[#71717a] outline-none transition-colors duration-300 focus:border-[#d95d31] dark:focus:border-[#6366f1] font-bold" 
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#8b6f60] dark:text-[#52525b] hover:text-[#d95d31] dark:hover:text-white pr-2">
                      {showPwd ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="group relative inline-flex w-full mt-4 sm:mt-6 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(120deg,#1e1612_10%,#b94a2c_46%,#ef9d44_86%)] dark:bg-[linear-gradient(135deg,#4f46e5,#6366f1_50%,#818cf8)] bg-[length:200%_200%] px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[#fff8f1] shadow-[0_16px_40px_rgba(146,66,33,0.3)] dark:shadow-[0_4px_20px_rgba(99,102,241,0.4)] transition-all duration-300 hover:-translate-y-0.5 animate-sheen disabled:opacity-80 disabled:cursor-not-allowed">
                  <span className="relative z-10 flex items-center">
                    {loading && <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-[tf-spin_0.7s_linear_infinite] mr-2" />}
                    {success ? '✓ Authenticated' : 'Sign In'}
                  </span>
                  <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.26)_50%,transparent_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
                </button>
              </form>
              <div className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs font-bold text-[#8b6f60]/80 dark:text-[#71717a] transition-colors duration-500">
                Protected by Let's Encrypt · TradeFlex v3
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Ticker Strip */}
      <div className="fixed bottom-0 left-0 right-0 py-3 bg-white/40 dark:bg-black/60 border-t border-black/5 dark:border-white/5 backdrop-blur-md overflow-hidden z-20 transition-colors duration-500">
        <div className="flex whitespace-nowrap animate-[tf-ticker_40s_linear_infinite]">
          {[...TICKERS, ...TICKERS, ...TICKERS].map((t, i) => (
            <div key={i} className="inline-flex items-center gap-3 px-8 text-sm font-bold border-r border-black/5 dark:border-white/10">
              <span className="tracking-widest text-black/50 dark:text-white/40 transition-colors duration-500">{t.sym}</span>
              <span className="text-[#1d140f] dark:text-white transition-colors duration-500">{t.price}</span>
              <span className={t.up ? "text-[#059669] dark:text-[#4ade80]" : "text-[#dc2626] dark:text-[#f87171]"}>{t.chg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
