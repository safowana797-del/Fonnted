import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Activity, 
  TrendingUp, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard, 
  CreditCard, 
  History, 
  HelpCircle,
  Home,
  Play,
  Zap,
  BarChart3,
  Search,
  Bell,
  ChevronRight,
  Calendar,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, isFirebaseConfigured } from './services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- Types ---
export type View = 'home' | 'today' | 'live' | 'favorites' | 'profile' | 'activity' | 'transactions' | 'admin';

export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  score: string;
  time: string;
  status: 'live' | 'upcoming' | 'completed';
  league: string;
  odds: { home: number; draw: number; away: number };
  probability: { home: number; draw: number; away: number };
  stats?: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    corners: { home: number; away: number };
  };
  pastPerformance?: {
    home: string[];
    away: string[];
  };
  h2h?: {
    homeWins: number;
    awayWins: number;
    draws: number;
    lastMatches: { date: string; score: string; winner: string }[];
  };
}

export interface UserStats {
  balance: number;
  winRate: number;
  rank: number;
  predictions: number;
}

export interface Prediction {
  id: string;
  match: string;
  prediction: string;
  odds: number;
  stake: number;
  outcome: 'won' | 'lost' | 'pending';
  profit?: number;
  date: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'prediction_win' | 'prediction_stake';
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  description: string;
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const TeamLogo = ({ team, logo, size = 16, className }: { team: string, logo: string, size?: number, className?: string }) => {
  const [error, setError] = useState(false);
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team)}&background=random&color=fff&bold=true&size=128`;

  return (
    <div className={cn(
      "rounded-[2rem] bg-white/5 p-3 relative z-10 border border-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm",
      size === 24 ? "w-24 h-24 rounded-3xl p-4" : "w-16 h-16",
      className
    )}>
      <img 
        src={error ? fallbackUrl : logo} 
        alt={team} 
        className="w-full h-full object-contain transition-transform duration-500" 
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    </div>
  );
};

const Logo = ({ className, size = 24 }: { className?: string, size?: number }) => (
  <div className={cn("relative flex items-center justify-center group", className)}>
    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center shadow-2xl border border-white/10">
      <Trophy className="text-white fill-white/20" size={size} />
    </div>
  </div>
);
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-white/5 rounded-2xl", className)} />
);

const MatchCardSkeleton = () => (
  <div className="glass p-5 rounded-3xl flex flex-col gap-5 border border-white/5">
    <div className="flex justify-between">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-20 h-6 rounded-full" />
    </div>
    <div className="flex items-center justify-between">
      <div className="flex flex-col items-center gap-3 w-1/3">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <Skeleton className="w-20 h-3" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="w-12 h-8" />
        <Skeleton className="w-16 h-2" />
      </div>
      <div className="flex flex-col items-center gap-3 w-1/3">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <Skeleton className="w-20 h-3" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <Skeleton className="h-10 rounded-xl" />
      <Skeleton className="h-10 rounded-xl" />
      <Skeleton className="h-10 rounded-xl" />
    </div>
  </div>
);

const LiveScore = ({ score, status }: { score: string, status: string }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (score !== prevScore) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 3000);
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);

  return (
    <div className="flex flex-col items-center gap-1 relative">
      <motion.div
        key={score}
        initial={{ scale: 1.5, filter: "brightness(2)" }}
        animate={{ 
          scale: [1.5, 0.9, 1.1, 1],
          filter: ["brightness(2)", "brightness(1)"],
          textShadow: isFlashing ? ["0 0 20px rgba(52, 211, 153, 0.8)", "0 0 0px rgba(52, 211, 153, 0)"] : "none"
        }}
        transition={{ duration: 0.6, times: [0, 0.4, 0.7, 1] }}
        className={cn(
          "text-3xl font-black tracking-tighter transition-colors duration-700",
          isFlashing ? "text-emerald-400" : "text-white"
        )}
      >
        {score}
      </motion.div>
      <AnimatePresence>
        {isFlashing && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.5 }}
            animate={{ opacity: 1, y: -25, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 1.2 }}
            className="absolute left-1/2 -translate-x-1/2 bg-emerald-500 text-[9px] font-black px-2 py-0.5 rounded-full text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] z-20"
          >
            GOAL!
          </motion.div>
        )}
      </AnimatePresence>
      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{status}</span>
    </div>
  );
};

const OddsButton = ({ label, value, active }: { label: string, value: number, active?: boolean }) => (
  <motion.button 
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300",
      active 
        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
        : "bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10"
    )}
  >
    <span className="text-[8px] font-bold uppercase opacity-60 mb-0.5">{label}</span>
    <span className="text-xs font-mono font-bold tracking-tight">{value.toFixed(2)}</span>
  </motion.button>
);

const MatchCard = ({ match, isFavorite, onToggleFavorite, onClick }: { match: Match, isFavorite: boolean, onToggleFavorite: (id: number) => void, onClick: (match: Match) => void }) => {
  const [showStats, setShowStats] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(match)}
      className="glass p-6 rounded-[2.5rem] flex flex-col gap-6 relative overflow-hidden group border border-white/5 cursor-pointer"
    >
      <div className="absolute top-0 right-0 p-5 flex gap-2 items-center z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(match.id); }}
          className={cn("p-2.5 rounded-2xl transition-all", isFavorite ? "text-red-500 bg-red-500/10" : "text-slate-500 bg-white/5")}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <div className={cn(
          "text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest",
          match.status === 'live' ? "bg-red-500/20 text-red-400" : "bg-white/10 text-slate-400"
        )}>
          {match.time}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-6">
        <div className="flex flex-col items-center gap-4 w-1/3">
          <TeamLogo team={match.homeTeam} logo={match.homeLogo} />
          <span className="text-xs font-black text-center truncate w-full uppercase text-slate-200">{match.homeTeam}</span>
        </div>
        <LiveScore score={match.score} status={match.league} />
        <div className="flex flex-col items-center gap-4 w-1/3">
          <TeamLogo team={match.awayTeam} logo={match.awayLogo} />
          <span className="text-xs font-black text-center truncate w-full uppercase text-slate-200">{match.awayTeam}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <OddsButton label="Home" value={match.odds.home} />
        <OddsButton label="Draw" value={match.odds.draw} />
        <OddsButton label="Away" value={match.odds.away} />
      </div>
    </motion.div>
  );
};
const Sidebar = ({ isOpen, onClose, userStats, setView, user }: { isOpen: boolean, onClose: () => void, userStats: UserStats | null, setView: (v: View) => void, user: FirebaseUser }) => (
  <>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </AnimatePresence>
    
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      className="fixed right-0 top-0 bottom-0 w-80 glass border-l border-white/5 z-50 p-8 flex flex-col gap-10 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <Logo size={18} />
        <button onClick={onClose} className="p-3 glass rounded-2xl hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4 p-6 glass rounded-[2.5rem] border-white/5 relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5">
          <img 
            src={`https://i.pravatar.cc/150?u=${user.uid}`} 
            alt="User Avatar" 
            className="w-full h-full object-cover rounded-[1.1rem] border-2 border-[#05060f]"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <div className="text-lg font-black tracking-tight truncate max-w-[140px]">{user.email?.split('@')[0]}</div>
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pro Member</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-5 rounded-3xl flex flex-col gap-2 border-white/5">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Balance</span>
          <span className="font-mono text-blue-400 font-black text-lg">🪙 {userStats?.balance}</span>
        </div>
        <div className="glass p-5 rounded-3xl flex flex-col gap-2 border-white/5">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Win Rate</span>
          <span className="font-mono text-emerald-400 font-black text-lg">{userStats?.winRate}%</span>
        </div>
      </div>

      <nav className="flex flex-col gap-3">
        <MenuItem icon={<User size={18} />} label="Profile" onClick={() => { setView('profile'); onClose(); }} />
        <MenuItem icon={<History size={18} />} label="Transactions" onClick={() => { setView('transactions'); onClose(); }} />
        <MenuItem icon={<Settings size={18} />} label="Settings" />
        <div className="h-px bg-white/5 my-4" />
        <MenuItem icon={<LogOut size={18} />} label="Logout" className="text-red-400" onClick={() => signOut(auth)} />
      </nav>
    </motion.div>
  </>
);

const MenuItem = ({ icon, label, className, onClick }: { icon: React.ReactNode, label: string, className?: string, onClick?: () => void }) => (
  <button onClick={onClick} className={cn("flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium w-full text-left", className)}>
    {icon}
    {label}
  </button>
);

const MatchModal = ({ match, onClose, onToggleFavorite, isFavorite }: { match: Match, onClose: () => void, onToggleFavorite: (id: number) => void, isFavorite: boolean }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] border-white/10 relative z-10 p-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-widest">Match Details</h3>
        <button onClick={onClose} className="p-2 glass rounded-xl"><X size={20} /></button>
      </div>
      
      <div className="flex items-center justify-between gap-8 mb-12">
        <div className="flex flex-col items-center gap-4 flex-1">
          <TeamLogo team={match.homeTeam} logo={match.homeLogo} size={24} />
          <span className="text-xl font-black text-center">{match.homeTeam}</span>
        </div>
        <div className="text-5xl font-black">{match.score}</div>
        <div className="flex flex-col items-center gap-4 flex-1">
          <TeamLogo team={match.awayTeam} logo={match.awayLogo} size={24} />
          <span className="text-xl font-black text-center">{match.awayTeam}</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 glass rounded-2xl">
          <span className="text-slate-500 font-bold uppercase text-xs">League</span>
          <span className="font-black">{match.league}</span>
        </div>
        <div className="flex items-center justify-between p-4 glass rounded-2xl">
          <span className="text-slate-500 font-bold uppercase text-xs">AI Probability (Home)</span>
          <span className="font-black text-blue-400">{match.probability.home}%</span>
        </div>
        <div className="flex items-center justify-between p-4 glass rounded-2xl">
          <span className="text-slate-500 font-bold uppercase text-xs">AI Probability (Away)</span>
          <span className="font-black text-indigo-400">{match.probability.away}%</span>
        </div>
      </div>
    </motion.div>
  </motion.div>
);
const BottomNav = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => (
  <nav className="md:hidden fixed bottom-6 left-6 right-6 z-40">
    <div className="glass rounded-[2.5rem] p-3 flex items-center justify-around border-white/5 shadow-2xl shadow-black/50 backdrop-blur-2xl">
      <NavButton icon={<Home size={20} />} active={currentView === 'home'} onClick={() => setView('home')} label="Home" />
      <NavButton icon={<Calendar size={20} />} active={currentView === 'today'} onClick={() => setView('today')} label="Today" />
      <div className="relative -top-8">
        <button 
          onClick={() => setView('live')}
          className={cn(
            "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl border-4 border-[#05060f]",
            currentView === 'live' ? "bg-blue-600 text-white shadow-blue-500/40 scale-110" : "bg-white text-black hover:bg-blue-500 hover:text-white"
          )}
        >
          <Zap size={28} className={cn(currentView === 'live' && "fill-white")} />
        </button>
      </div>
      <NavButton icon={<Heart size={20} />} active={currentView === 'favorites'} onClick={() => setView('favorites')} label="Saved" />
      <NavButton icon={<Activity size={20} />} active={currentView === 'activity'} onClick={() => setView('activity')} label="Activity" />
    </div>
  </nav>
);

const NavButton = ({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-all", active ? "text-blue-400" : "text-slate-500")}>
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
  </button>
);

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!auth || !db) {
      setError('Neural Link not initialized. Please check your configuration.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            balance: 1000,
            winRate: 0,
            rank: 0,
            predictions: 0,
            createdAt: new Date().toISOString()
          });
        } catch (firestoreErr: any) {
          console.error("Firestore Init Error:", firestoreErr);
          setError("Account created but profile initialization failed.");
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during synchronization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#05060f]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-md p-10 rounded-[3rem] border-white/10 relative z-10"
      >
        <div className="flex flex-col items-center gap-6 mb-10">
          <Logo size={32} />
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight mb-2">
              {isLogin ? 'Welcome Back' : 'Join the Elite'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm"
            placeholder="Email Address"
          />
          <input 
            type="password" 
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm"
            placeholder="Access Key"
          />
          {error && <div className="text-red-400 text-[10px] font-black uppercase text-center">{error}</div>}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'INITIALIZE SESSION' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-colors">
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SetupRequiredScreen = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-[#05060f] text-center">
    <div className="max-w-md space-y-8">
      <Logo size={48} className="mx-auto" />
      <h2 className="text-3xl font-black tracking-tight">Configuration Required</h2>
      <p className="text-slate-400 text-sm">Please set your Firebase API credentials in the environment variables.</p>
    </div>
  </div>
);
const StatCard = ({ label, value, trend, color }: { label: string, value: any, trend: string, color: 'emerald' | 'blue' | 'red' }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass p-6 rounded-[2rem] space-y-3 relative overflow-hidden group"
  >
    <div className={cn(
      "absolute -right-4 -top-4 w-24 h-24 blur-3xl rounded-full transition-all duration-500 group-hover:scale-150",
      color === 'emerald' ? "bg-emerald-500/10" : color === 'blue' ? "bg-blue-500/10" : "bg-red-500/10"
    )} />
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] relative z-10">{label}</span>
    <div className="flex items-end justify-between relative z-10">
      <div className="text-3xl font-black tracking-tight">{value}</div>
      <div className={cn(
        "text-[10px] font-black px-2 py-1 rounded-lg",
        trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      )}>
        {trend}
      </div>
    </div>
  </motion.div>
);

const PredictionItem = ({ prediction }: { prediction: Prediction }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="glass p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-white/5 hover:bg-white/5 transition-all"
  >
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{prediction.date}</span>
      <h4 className="font-black text-lg tracking-tight">{prediction.match}</h4>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pick</span>
        <span className="text-sm font-bold text-emerald-400">{prediction.prediction}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Odds</span>
        <span className="text-sm font-mono font-bold">{prediction.odds.toFixed(2)}</span>
      </div>
      <div className="flex flex-col items-end min-w-[80px]">
        <span className={cn(
          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
          prediction.outcome === 'won' ? "bg-emerald-500/20 text-emerald-400" : 
          prediction.outcome === 'lost' ? "bg-red-500/20 text-red-400" : 
          "bg-slate-500/20 text-slate-400"
        )}>
          {prediction.outcome}
        </span>
      </div>
    </div>
  </motion.div>
);

const TransactionItem = ({ transaction }: { transaction: Transaction }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="glass p-5 rounded-3xl flex items-center justify-between gap-4 border-white/5 hover:bg-white/5 transition-all"
  >
    <div className="flex items-center gap-4">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center",
        transaction.type === 'deposit' || transaction.type === 'prediction_win' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      )}>
        {transaction.type === 'deposit' ? <Zap size={20} /> : <TrendingUp size={20} />}
      </div>
      <div className="flex flex-col gap-0.5">
        <h4 className="font-bold text-sm tracking-tight">{transaction.description}</h4>
        <span className="text-[10px] font-medium text-slate-500">{transaction.date}</span>
      </div>
    </div>
    
    <div className="flex flex-col items-end gap-1">
      <span className={cn(
        "text-lg font-mono font-black tracking-tighter",
        transaction.amount >= 0 ? "text-emerald-400" : "text-white"
      )}>
        {transaction.amount >= 0 ? '+' : ''}{transaction.amount}
      </span>
    </div>
  </motion.div>
);

const CircularProgress = ({ percentage, label }: { percentage: number, label: string }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={radius} fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
          <motion.circle
            cx="80" cy="80" r={radius} fill="transparent" stroke="currentColor" strokeWidth="8"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="text-blue-500"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black tracking-tighter">{percentage}%</span>
        </div>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</span>
    </div>
  );
};

const LeaderboardItem = ({ rank, name, winRate, profit, avatar }: { rank: number, name: string, winRate: number, profit: number, avatar: string }) => (
  <motion.div 
    whileHover={{ x: 10 }}
    className="glass p-4 rounded-2xl flex items-center justify-between group border-white/5"
  >
    <div className="flex items-center gap-4">
      <span className={cn(
        "text-lg font-black w-8 text-center",
        rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-300" : rank === 3 ? "text-amber-600" : "text-slate-500"
      )}>
        {rank}
      </span>
      <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden border border-white/10">
        <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-sm">{name}</span>
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Win Rate: {winRate}%</span>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-mono font-black text-blue-400">🪙 +{profit}</div>
    </div>
  </motion.div>
);
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [view, setView] = useState<View>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth!, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch User Stats
        const userDoc = await getDoc(doc(db!, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserStats(userDoc.data() as UserStats);
        } else {
          const initialStats = { balance: 1000, winRate: 0, rank: 0, predictions: 0 };
          await setDoc(doc(db!, 'users', currentUser.uid), initialStats);
          setUserStats(initialStats);
        }
        
        // Mock Data for Demo
        setPredictions([
          { id: '1', match: 'Real Madrid vs Barcelona', prediction: 'Home Win', odds: 1.85, stake: 100, outcome: 'won', profit: 85, date: '2026-03-01' },
          { id: '2', match: 'Liverpool vs Man City', prediction: 'Over 2.5', odds: 1.65, stake: 50, outcome: 'lost', date: '2026-03-02' },
          { id: '3', match: 'Bayern vs Dortmund', prediction: 'Away Win', odds: 3.20, stake: 20, outcome: 'pending', date: '2026-03-04' }
        ]);
        
        setTransactions([
          { id: '1', type: 'prediction_win', amount: 85, date: '2026-03-01', status: 'completed', description: 'Real Madrid vs Barcelona Win' },
          { id: '2', type: 'prediction_stake', amount: -50, date: '2026-03-02', status: 'completed', description: 'Liverpool vs Man City Stake' },
          { id: '3', type: 'deposit', amount: 500, date: '2026-02-28', status: 'completed', description: 'Wallet Top-up' }
        ]);

        setAnalytics({
          dailyActiveUsers: 1420,
          totalPredictions: 84200,
          revenue: 124000
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Mock Matches Data
    const mockMatches: Match[] = [
      {
        id: 1,
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
        awayLogo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_(crest).svg',
        score: '2 - 1',
        time: '84\'',
        status: 'live',
        league: 'La Liga',
        odds: { home: 1.85, draw: 3.40, away: 4.20 },
        probability: { home: 62, draw: 20, away: 18 }
      },
      {
        id: 2,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeLogo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
        awayLogo: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
        score: '0 - 0',
        time: '12\'',
        status: 'live',
        league: 'Premier League',
        odds: { home: 2.10, draw: 3.20, away: 3.50 },
        probability: { home: 45, draw: 30, away: 25 }
      },
      {
        id: 3,
        homeTeam: 'Liverpool',
        awayTeam: 'Man City',
        homeLogo: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
        awayLogo: 'https://upload.wikimedia.org/wikipedia/en/eb/eb/Manchester_City_FC_badge.svg',
        score: '0 - 0',
        time: '20:45',
        status: 'upcoming',
        league: 'Premier League',
        odds: { home: 2.80, draw: 3.60, away: 2.40 },
        probability: { home: 35, draw: 25, away: 40 }
      }
    ];
    setMatches(mockMatches);
  }, []);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  if (!isFirebaseConfigured) return <SetupRequiredScreen />;
  if (isLoading) return <div className="min-h-screen bg-[#05060f] flex items-center justify-center"><Logo className="animate-bounce" /></div>;
  if (!user) return <AuthScreen />;

  const chartData = [
    { name: 'Mon', users: 400, predictions: 2400 },
    { name: 'Tue', users: 300, predictions: 1398 },
    { name: 'Wed', users: 200, predictions: 9800 },
    { name: 'Thu', users: 278, predictions: 3908 },
    { name: 'Fri', users: 189, predictions: 4800 },
    { name: 'Sat', users: 239, predictions: 3800 },
    { name: 'Sun', users: 349, predictions: 4300 },
  ];

  return (
    <div className="min-h-screen bg-[#05060f] text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center gap-8">
          <button onClick={() => setView('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Logo size={20} />
            <div className="hidden sm:block">
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">EliteSports</h1>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] leading-none">Neural Analytics</span>
            </div>
          </button>
          
          <nav className="hidden lg:flex items-center gap-1">
            {['home', 'today', 'live', 'favorites'].map((v) => (
              <button 
                key={v}
                onClick={() => setView(v as View)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  view === v ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                {v}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 glass rounded-2xl border-white/5">
            <CreditCard size={14} className="text-blue-400" />
            <span className="text-xs font-black tracking-tight">🪙 {userStats?.balance}</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-3 glass rounded-2xl hover:bg-white/10 transition-colors relative">
            <Menu size={20} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#05060f]" />
          </button>
        </div>
      </header>

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        userStats={userStats} 
        setView={setView} 
        user={user}
      />

      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-20"
            >
              {/* Hero Section */}
              <section className="relative py-12">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full" />
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 glass rounded-full border-blue-500/20">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Neural Network v4.2 Online</span>
                  </div>
                  <h2 className="text-8xl font-black tracking-tighter uppercase leading-[0.85] text-white">
                    Precision <br />
                    <span className="text-slate-500">Intelligence</span>
                  </h2>
                  <p className="text-slate-500 font-medium text-xl leading-relaxed max-w-2xl">
                    Experience the next generation of sports analytics. Our neural engine processes millions of data points to deliver institutional-grade signals.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <button onClick={() => setView('live')} className="px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-2xl shadow-white/5">Initialize Stream</button>
                    <button onClick={() => setView('today')} className="px-10 py-5 glass rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all border-white/10">View Schedule</button>
                  </div>
                </div>
              </section>

              {/* Live Matches Slider */}
              <section className="space-y-8">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black tracking-tight uppercase">Live Flux</h3>
                    <p className="text-slate-500 font-medium">Real-time probability shifts across active nodes</p>
                  </div>
                  <button onClick={() => setView('live')} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">View All Live</button>
                </div>
                
                <div className="flex gap-8 overflow-x-auto pb-8 scrollbar-hide -mx-6 px-6">
                  {matches.filter(m => m.status === 'live').map(match => (
                    <div key={match.id} className="min-w-[400px]">
                      <MatchCard 
                        match={match} 
                        isFavorite={favorites.includes(match.id)} 
                        onToggleFavorite={toggleFavorite} 
                        onClick={setSelectedMatch}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Stats Section */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <h2 className="text-5xl font-black tracking-tight leading-tight uppercase">Neural <br />Performance</h2>
                  <p className="text-slate-500 text-lg leading-relaxed font-medium">Our proprietary algorithms process over 10,000 data points per second, providing you with insights that go beyond the surface.</p>
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <StatCard label="Model Precision" value="94.2%" trend="+2.4%" color="blue" />
                    <StatCard label="Network Latency" value="0.2s" trend="-0.1s" color="emerald" />
                  </div>
                </div>
                <div className="glass p-8 rounded-[4rem] border-white/5 relative overflow-hidden h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </motion.div>
          )}

          {view === 'today' && (
            <motion.div key="today" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <h2 className="text-6xl font-black tracking-tighter uppercase">Today's Schedule</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {matches.map(match => (
                  <MatchCard key={match.id} match={match} isFavorite={favorites.includes(match.id)} onToggleFavorite={toggleFavorite} onClick={setSelectedMatch} />
                ))}
              </div>
            </motion.div>
          )}

          {view === 'live' && (
            <motion.div key="live" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <h2 className="text-6xl font-black tracking-tighter uppercase text-red-500">Live Transmission</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {matches.filter(m => m.status === 'live').map(match => (
                  <MatchCard key={match.id} match={match} isFavorite={favorites.includes(match.id)} onToggleFavorite={toggleFavorite} onClick={setSelectedMatch} />
                ))}
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto space-y-12">
              <div className="glass p-12 rounded-[4rem] border-white/5 flex flex-col md:flex-row items-center gap-12">
                <div className="w-48 h-48 rounded-[4rem] bg-blue-500 p-1.5">
                  <img src={`https://i.pravatar.cc/400?u=${user.uid}`} className="w-full h-full object-cover rounded-[3.8rem] border-8 border-[#05060f]" />
                </div>
                <div className="flex-1 space-y-4">
                  <h2 className="text-5xl font-black uppercase tracking-tighter">{user.email?.split('@')[0]}</h2>
                  <p className="text-slate-500 font-bold text-xl">{user.email}</p>
                  <div className="flex gap-4">
                    <div className="px-6 py-3 glass rounded-2xl border-white/5 text-xs font-black uppercase tracking-widest">Rank #42</div>
                    <div className="px-6 py-3 glass rounded-2xl border-white/5 text-xs font-black uppercase tracking-widest">Pro Member</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard label="Balance" value={`🪙 ${userStats?.balance}`} trend="+15%" color="blue" />
                <StatCard label="Win Rate" value={`${userStats?.winRate}%`} trend="+5%" color="emerald" />
                <StatCard label="Signals" value={userStats?.predictions} trend="+12" color="blue" />
              </div>
            </motion.div>
          )}

          {view === 'favorites' && (
            <motion.div key="favorites" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <h2 className="text-6xl font-black tracking-tighter uppercase text-red-400">Saved Signals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {matches.filter(m => favorites.includes(m.id)).map(match => (
                  <MatchCard key={match.id} match={match} isFavorite={true} onToggleFavorite={toggleFavorite} onClick={setSelectedMatch} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav currentView={view} setView={setView} />
      <AnimatePresence>
        {selectedMatch && <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(selectedMatch.id)} />}
      </AnimatePresence>
    </div>
  );
    }
