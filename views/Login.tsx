
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { loginUser, resetPassword, saveUser } from '../services/storage';
import { 
  QrCode, 
  ShieldCheck, 
  GraduationCap, 
  School, 
  Lock, 
  Mail, 
  ArrowRight, 
  Globe, 
  Zap, 
  BarChart, 
  Loader2,
  Check,
  Twitter,
  Github,
  Linkedin,
  X,
  ArrowLeft,
  Command,
  Layout,
  Play,
  User as UserIcon,
  Sun,
  Moon,
  ChevronRight,
  Ghost
} from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

type LoginView = 'SELECTION' | UserRole;
type LoginStatus = 'idle' | 'loading' | 'success' | 'error';
type ThemeMode = 'light' | 'dark' | 'red-ghost';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<LoginView>('SELECTION');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');

  // Theme State
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'red-ghost' || savedTheme === 'light') {
            return savedTheme as ThemeMode;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'red-ghost');
    
    if (theme === 'dark') {
        root.classList.add('dark');
    } else if (theme === 'red-ghost') {
        root.classList.add('dark', 'red-ghost');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => {
          if (prev === 'light') return 'dark';
          if (prev === 'dark') return 'red-ghost';
          return 'light';
      });
  };

  useEffect(() => {
    // Reset state on view change
    setEmail('');
    setPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setIsForgotPassword(false);
    setIsRegistering(false);
    setLoginStatus('idle');
    setRememberMe(false);
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginStatus('loading');

    try {
      if (view !== 'SELECTION') {
          const cleanEmail = email.trim();
          const minDelay = new Promise(resolve => setTimeout(resolve, 800)); // Animation delay
          
          const [user] = await Promise.all([
            loginUser(cleanEmail, password, view),
            minDelay
          ]);
          
          setLoginStatus('success');
          
          setTimeout(() => {
             onLogin(user);
          }, 600);
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password.');
      setLoginStatus('error');
      setTimeout(() => setLoginStatus('idle'), 2000);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (regPassword !== regConfirmPassword) {
        setError('Passwords do not match.');
        setLoginStatus('error');
        setTimeout(() => setLoginStatus('idle'), 1500);
        return;
      }

      try {
        const generatedId = `TR-${Date.now().toString().slice(-6)}`;
        const newUser: User & { password?: string } = {
            id: generatedId,
            name: regName.trim(),
            email: regEmail.trim(),
            password: regPassword,
            role: UserRole.TEACHER,
            createdAt: Date.now(),
            subjects: []
        };
        await saveUser(newUser);
        setLoginStatus('success');
        setSuccessMsg('Account created successfully!');
        setTimeout(() => {
            setIsRegistering(false);
            setLoginStatus('idle');
            setEmail(regEmail); 
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
        setLoginStatus('error');
        setTimeout(() => setLoginStatus('idle'), 1500);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await resetPassword(email.trim());
        setSuccessMsg(`Reset link sent to ${email}`);
        setEmail('');
        setLoginStatus('success');
        setTimeout(() => {
             setLoginStatus('idle');
             setIsForgotPassword(false); 
        }, 2000);
    } catch (err: any) {
        setError('Failed to send link.');
        setLoginStatus('error');
        setTimeout(() => setLoginStatus('idle'), 1500);
    }
  };

  // Theme Config based on Role
  const getTheme = (role: LoginView) => {
    switch (role) {
      case UserRole.ADMIN:
        return {
          color: 'indigo',
          gradient: 'from-violet-600 to-indigo-700',
          darkGradient: 'dark:from-violet-900 dark:to-slate-900',
          accent: 'indigo',
          title: 'Admin Portal',
          desc: 'System control & management',
          icon: <ShieldCheck className="h-8 w-8 text-white" />
        };
      case UserRole.TEACHER:
        return {
          color: 'blue',
          gradient: 'from-blue-500 to-cyan-600',
          darkGradient: 'dark:from-blue-900 dark:to-slate-900',
          accent: 'blue',
          title: 'Faculty Access',
          desc: 'Manage classes & marks',
          icon: <School className="h-8 w-8 text-white" />
        };
      case UserRole.STUDENT:
        return {
          color: 'emerald',
          gradient: 'from-emerald-500 to-teal-600',
          darkGradient: 'dark:from-emerald-900 dark:to-slate-900',
          accent: 'emerald',
          title: 'Student Zone',
          desc: 'Track attendance & results',
          icon: <GraduationCap className="h-8 w-8 text-white" />
        };
      default:
        return { color: 'gray', gradient: '', darkGradient: '', accent: 'gray', title: '', desc: '', icon: null };
    }
  };

  const currentTheme = getTheme(view);

  const getFormTitle = () => {
      if (isRegistering) return 'Create Account';
      if (isForgotPassword) return 'Recover Account';
      return currentTheme.title || 'Welcome Back';
  };

  // Background Blobs
  const AnimatedBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-300/20 dark:bg-indigo-900/10 rounded-full mix-blend-multiply filter blur-[90px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-300/20 dark:bg-purple-900/10 rounded-full mix-blend-multiply filter blur-[90px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-pink-300/20 dark:bg-pink-900/10 rounded-full mix-blend-multiply filter blur-[90px] animate-blob animation-delay-4000"></div>
        
        {/* Red Ghost Specific Background Elements */}
        {theme === 'red-ghost' && (
            <>
                <div className="absolute inset-0 bg-red-950/20 z-0"></div>
                <Ghost className="absolute text-red-600/30 w-16 h-16 top-[15%] right-[15%] animate-ghost-float" style={{ animationDuration: '7s' }} />
                <Ghost className="absolute text-red-600/20 w-10 h-10 bottom-[25%] left-[10%] animate-ghost-float" style={{ animationDuration: '9s', animationDelay: '1s' }} />
                <Ghost className="absolute text-red-600/20 w-8 h-8 top-[40%] left-[40%] animate-ghost-float" style={{ animationDuration: '11s', animationDelay: '3s' }} />
            </>
        )}
    </div>
  );

  // --- SELECTION VIEW ---
  if (view === 'SELECTION') {
    return (
      <div className="min-h-screen relative flex flex-col font-sans text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-950 transition-colors duration-500 overflow-hidden">
        <AnimatedBackground />
        
        {/* Navbar */}
        <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 vibrant-glow transform hover:rotate-6 transition-transform duration-300">
                    <QrCode className="h-6 w-6" />
                </div>
                <span className="text-xl font-display font-bold tracking-tight text-gray-900 dark:text-white">RollCall</span>
                
                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="ml-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors relative"
                  title={`Theme: ${theme}`}
                >
                  {theme === 'light' && <Sun className="h-5 w-5 text-amber-500" />}
                  {theme === 'dark' && <Moon className="h-5 w-5 text-indigo-400" />}
                  {theme === 'red-ghost' && <Ghost className="h-5 w-5 text-red-500 animate-pulse" />}
                </button>
             </div>
             <a href="#" className="hidden md:flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group">
                <Globe className="h-4 w-4 group-hover:rotate-12 transition-transform" /> <span>RollCall Web</span>
             </a>
        </header>

        {/* Hero */}
        <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 py-8">
            <div className="text-center max-w-4xl mx-auto mb-16 space-y-6 animate-fade-in-up">
                 <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 hover:scale-105 transition-transform cursor-default">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                    Smart Campus System v2.0
                 </div>
                 <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1] drop-shadow-sm">
                    Attendance <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-border-flow bg-[length:200%_auto]">Reimagined.</span>
                 </h1>
                 <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed font-light">
                    Secure, real-time campus management for everyone. Select your role to begin.
                 </p>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                 {[
                    { role: UserRole.ADMIN, title: 'Administrator', desc: 'System Control', icon: Command, color: 'indigo', shadow: 'shadow-indigo-500/20' },
                    { role: UserRole.TEACHER, title: 'Faculty', desc: 'Class Management', icon: Layout, color: 'blue', shadow: 'shadow-blue-500/20' },
                    { role: UserRole.STUDENT, title: 'Student', desc: 'Personal Portal', icon: UserIcon, color: 'emerald', shadow: 'shadow-emerald-500/20' }
                 ].map((card) => (
                    <div 
                        key={card.role}
                        onClick={() => setView(card.role as UserRole)}
                        className={`group relative bg-white dark:bg-gray-800 rounded-[2rem] p-1 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${card.shadow} border border-gray-100 dark:border-gray-700`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]"></div>
                        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[1.8rem] p-8 h-full relative overflow-hidden flex flex-col items-center text-center z-10 transition-colors group-hover:bg-white dark:group-hover:bg-gray-800">
                            
                            <div className={`w-20 h-20 rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-900/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                                <card.icon className={`h-10 w-10 text-${card.color}-600 dark:text-${card.color}-400 transition-colors`} />
                            </div>
                            
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{card.title}</h3>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8">{card.desc}</p>
                            
                            <div className={`mt-auto w-full py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold text-sm group-hover:bg-${card.color}-600 group-hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg`}>
                                Access Portal <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    </div>
                 ))}
            </div>
            
            <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm font-semibold text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Zap className="h-4 w-4 text-amber-500" /> Fast Sync</span>
                <span className="flex items-center gap-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><ShieldCheck className="h-4 w-4 text-emerald-500" /> End-to-End Encryption</span>
                <span className="flex items-center gap-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><BarChart className="h-4 w-4 text-blue-500" /> Real-time Analytics</span>
            </div>
        </main>

        <Footer />
      </div>
    );
  }

  // --- LOGIN FORM VIEW ---
  return (
      <div className="min-h-screen flex bg-white dark:bg-gray-900 font-sans overflow-hidden transition-colors duration-500">
        
        {/* Left Side - Visuals */}
        <div className={`hidden lg:flex w-5/12 bg-gradient-to-br ${currentTheme.gradient} ${currentTheme.darkGradient} relative overflow-hidden items-center justify-center p-12 text-white transition-all duration-700 ease-in-out`}>
            {/* Animated Shapes */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[100px] animate-blob mix-blend-overlay"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-white/5 rounded-full blur-[80px] animate-blob animation-delay-2000 mix-blend-overlay"></div>
            
            {/* Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            <div className="relative z-10 max-w-md w-full">
                <button 
                    onClick={() => setView('SELECTION')}
                    className="absolute -top-32 left-0 flex items-center gap-2 text-white/60 hover:text-white transition-all group hover:-translate-x-1"
                >
                    <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 backdrop-blur-md transition-all">
                        <ArrowLeft className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Switch Role</span>
                </button>

                <div className="inline-flex p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 mb-8 shadow-2xl animate-float">
                    {currentTheme.icon}
                </div>
                
                <h2 className="text-5xl font-display font-extrabold mb-6 leading-tight tracking-tight">{currentTheme.title}</h2>
                <p className="text-xl text-white/80 font-light leading-relaxed mb-10">
                    {currentTheme.desc}. <br/>Authenticate securely to access your dashboard.
                </p>
                
                {/* Feature List */}
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-white/90 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors cursor-default">
                        <div className="bg-white/20 p-2 rounded-xl"><Check className="h-5 w-5 text-white" /></div>
                        <span className="text-sm font-semibold tracking-wide">Secure Biometric-Ready Access</span>
                    </div>
                    <div className="flex items-center gap-4 text-white/90 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors cursor-default">
                        <div className="bg-white/20 p-2 rounded-xl"><Check className="h-5 w-5 text-white" /></div>
                        <span className="text-sm font-semibold tracking-wide">Instant Session Synchronization</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-gray-900 transition-colors duration-500 overflow-hidden">
            {/* Red Ghost Background Overlay for Form Side */}
            {theme === 'red-ghost' && (
                <div className="absolute inset-0 pointer-events-none z-0">
                    <Ghost className="absolute text-red-600/10 w-24 h-24 top-10 right-10 animate-ghost-float" style={{ animationDuration: '12s' }} />
                    <Ghost className="absolute text-red-600/10 w-16 h-16 bottom-10 left-10 animate-ghost-float" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                </div>
            )}

            {/* Mobile Nav */}
            <div className="lg:hidden absolute top-6 left-6 right-6 flex justify-between items-center z-20">
                <button 
                    onClick={() => setView('SELECTION')}
                    className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <button 
                    onClick={toggleTheme}
                    className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    {theme === 'light' && <Sun className="h-5 w-5 text-amber-500" />}
                    {theme === 'dark' && <Moon className="h-5 w-5 text-indigo-400" />}
                    {theme === 'red-ghost' && <Ghost className="h-5 w-5 text-red-500" />}
                </button>
            </div>

            <div className="w-full max-w-[480px] animate-fade-in-up p-1 rounded-[2rem] animated-border bg-gray-100 dark:bg-gray-800">
              <div className="w-full h-full bg-white dark:bg-gray-950 rounded-[1.8rem] p-8 sm:p-12 relative z-10 shadow-2xl shadow-gray-200/50 dark:shadow-none">
                <div className="text-center lg:text-left mb-10">
                    <div className={`lg:hidden inline-flex p-4 rounded-2xl bg-${currentTheme.accent}-50 dark:bg-${currentTheme.accent}-900/30 text-${currentTheme.accent}-600 dark:text-${currentTheme.accent}-400 mb-6 shadow-sm`}>
                        {currentTheme.icon && React.cloneElement(currentTheme.icon as React.ReactElement, { className: "h-8 w-8 text-current" })}
                    </div>
                    <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-3">
                        {getFormTitle()}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-base">
                        {isRegistering 
                            ? 'Create your credentials to get started.' 
                            : isForgotPassword 
                                ? 'We will send a recovery link to your inbox.'
                                : 'Please enter your details to sign in.'
                        }
                    </p>
                </div>

                {/* Loading Overlay */}
                {loginStatus === 'loading' && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[1.8rem]">
                        <Loader2 className={`h-12 w-12 animate-spin text-${currentTheme.accent}-600 mb-4`} />
                        <p className={`text-${currentTheme.accent}-700 dark:text-${currentTheme.accent}-400 font-bold tracking-wide`}>Verifying Credentials...</p>
                    </div>
                )}

                {!isForgotPassword && !isRegistering ? (
                     <div className="space-y-6">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group input-animated-border">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                        <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors duration-300" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-transparent dark:focus:border-transparent focus:ring-0 transition-all duration-300 outline-none font-medium transform focus:-translate-y-0.5 focus:shadow-md relative z-0"
                                        placeholder="name@school.com"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</label>
                                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">Forgot Password?</button>
                                </div>
                                <div className="relative group input-animated-border">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                        <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors duration-300" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-transparent dark:focus:border-transparent focus:ring-0 transition-all duration-300 outline-none font-medium transform focus:-translate-y-0.5 focus:shadow-md relative z-0"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center ml-1">
                                <label className="relative flex items-center cursor-pointer group">
                                    <input 
                                        id="remember-me" 
                                        type="checkbox" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                        <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" />
                                    </div>
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">Remember me for 30 days</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] subtle-shimmer vibrant-glow flex items-center justify-center
                                    ${loginStatus === 'error' ? 'bg-red-600' : 
                                    loginStatus === 'success' ? 'bg-emerald-600' : 
                                    'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500'
                                    }`}
                            >
                                {loginStatus === 'success' ? 'Redirecting...' : 'Sign In Account'}
                                {loginStatus !== 'success' && <ArrowRight className="ml-2 h-5 w-5 opacity-80" />}
                            </button>
                        </form>
                        
                        {view === UserRole.TEACHER && (
                            <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    New Faculty Member? <button type="button" onClick={() => setIsRegistering(true)} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline hover:text-indigo-700 transition-colors">Create Account</button>
                                </p>
                            </div>
                        )}
                     </div>
                ) : isRegistering ? (
                    <form onSubmit={handleRegister} className="space-y-5 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Full Name</label>
                                <div className="input-animated-border">
                                    <input
                                        type="text"
                                        required
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-transparent dark:focus:border-transparent focus:ring-0 transition-all duration-300 outline-none text-gray-900 dark:text-white relative z-0 transform focus:-translate-y-0.5"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Email</label>
                                <div className="input-animated-border">
                                    <input
                                        type="email"
                                        required
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-transparent dark:focus:border-transparent focus:ring-0 transition-all duration-300 outline-none text-gray-900 dark:text-white relative z-0 transform focus:-translate-y-0.5"
                                        placeholder="john@school.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Password</label>
                                <div className="input-animated-border">
                                    <input
                                        type="password"
                                        required
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-transparent dark:focus:border-transparent focus:ring-0 transition-all duration-300 outline-none text-gray-900 dark:text-white relative z-0 transform focus:-translate-y-0.5"
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Confirm</label>
                                <div className="input-animated-border">
                                    <input
                                        type="password"
                                        required
                                        value={regConfirmPassword}
                                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-transparent dark:focus:border-transparent focus:ring-0 transition-all duration-300 outline-none text-gray-900 dark:text-white relative z-0 transform focus:-translate-y-0.5"
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsRegistering(false)} className="flex-1 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transform hover:scale-[1.02] active:scale-[0.98]">Cancel</button>
                            <button type="submit" className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 vibrant-glow transform hover:scale-[1.02] active:scale-[0.98]">Create Account</button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-6 animate-fade-in">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Registered Email</label>
                            <div className="input-animated-border">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-transparent rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-transparent dark:focus:border-transparent focus:ring-0 transition-all duration-300 outline-none font-medium relative z-0 transform focus:-translate-y-0.5"
                                    placeholder="name@school.com"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setIsForgotPassword(false)} className="flex-1 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transform hover:scale-[1.02] active:scale-[0.98]">Back</button>
                            <button type="submit" className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 vibrant-glow transform hover:scale-[1.02] active:scale-[0.98]">Send Link</button>
                        </div>
                    </form>
                )}

                {/* Messages */}
                {error && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center text-red-600 dark:text-red-400 text-sm font-bold animate-fade-in shadow-sm">
                        <X className="h-5 w-5 mr-3 flex-shrink-0" /> {error}
                    </div>
                )}
                {successMsg && (
                     <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-bold animate-fade-in shadow-sm">
                        <Check className="h-5 w-5 mr-3 flex-shrink-0" /> {successMsg}
                     </div>
                )}
              </div>
            </div>
        </div>
      </div>
  );
};

const Footer = () => (
    <footer className="relative z-10 w-full border-t border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md mt-auto transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="text-sm">
                    <span className="font-bold text-gray-900 dark:text-white">RollCall</span>
                    <span className="text-gray-300 dark:text-gray-600 mx-3">|</span>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">&copy; {new Date().getFullYear()} Campus Systems</span>
                </div>
            </div>
            <div className="flex gap-6">
                <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-110"><Globe className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-110"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-110"><Github className="h-5 w-5" /></a>
            </div>
        </div>
    </footer>
);
