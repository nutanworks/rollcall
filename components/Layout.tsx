
import React, { useState, useEffect } from 'react';
import { LogOut, QrCode, User as UserIcon, Menu, AlertTriangle, Megaphone, ShieldAlert, X, Heart, Github, Twitter, Linkedin, Moon, Sun, Ghost, Terminal } from 'lucide-react';
import { User, SystemSettings, NotificationType } from '../types';
import { getSystemSettings } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  title: string;
}

type ThemeMode = 'light' | 'dark' | 'red-ghost';

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, title }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  
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
    const fetchSettings = async () => {
        try {
            const data = await getSystemSettings();
            setSettings(data);
        } catch (err) {
            console.error('Failed to fetch settings for layout banner', err);
        }
    };
    fetchSettings();
  }, []);

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

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const toggleTheme = () => {
      setTheme(prev => {
          if (prev === 'light') return 'dark';
          if (prev === 'dark') return 'red-ghost';
          return 'light';
      });
  };

  const getBannerStyles = (type?: NotificationType) => {
    switch (type) {
        case 'critical':
            return {
                bg: 'bg-red-600',
                text: 'text-white',
                icon: <ShieldAlert className="h-5 w-5 mr-3 animate-pulse" />,
                border: 'border-red-700'
            };
        case 'warning':
            return {
                bg: 'bg-amber-500',
                text: 'text-white',
                icon: <AlertTriangle className="h-5 w-5 mr-3" />,
                border: 'border-amber-600'
            };
        case 'info':
        default:
            return {
                bg: 'bg-indigo-600',
                text: 'text-white',
                icon: <Megaphone className="h-5 w-5 mr-3" />,
                border: 'border-indigo-700'
            };
    }
  };

  const bannerTheme = getBannerStyles(settings?.notificationType);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden">
      
      {/* Red Ghost (Hacker) Theme Effects */}
      {theme === 'red-ghost' && (
          <>
            {/* Scanlines Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[9999] opacity-20" 
                 style={{
                     background: 'linear-gradient(to bottom, rgba(255,0,0,0), rgba(255,0,0,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
                     backgroundSize: '100% 4px'
                 }}>
            </div>
            {/* Ghost Animation Background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
                <Ghost className="absolute text-red-600 w-12 h-12 top-[80%] left-[10%] animate-ghost-float" style={{ animationDelay: '0s', opacity: 0.2 }} />
                <Ghost className="absolute text-red-500 w-8 h-8 top-[60%] left-[80%] animate-ghost-float" style={{ animationDelay: '2s', opacity: 0.15 }} />
                <Ghost className="absolute text-red-700 w-16 h-16 top-[40%] left-[20%] animate-ghost-float" style={{ animationDelay: '4s', opacity: 0.1 }} />
                <Ghost className="absolute text-red-600 w-10 h-10 top-[20%] left-[70%] animate-ghost-float" style={{ animationDelay: '6s', opacity: 0.2 }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-red-900/5 to-red-900/10 mix-blend-overlay"></div>
            </div>
          </>
      )}

      {/* Global Announcement Banner */}
      {showAnnouncement && settings?.systemNotification && (
        <div className={`${bannerTheme.bg} ${bannerTheme.text} px-4 py-3 relative transition-all duration-500 animate-fade-in border-b ${bannerTheme.border} z-[60]`}>
           <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center pr-10">
                 {bannerTheme.icon}
                 <p className="text-sm font-bold leading-tight">
                    <span className="hidden sm:inline uppercase tracking-widest text-[10px] bg-white/20 px-1.5 py-0.5 rounded mr-2 align-middle">Announcement</span>
                    {settings.systemNotification}
                 </p>
              </div>
              <button 
                onClick={() => setShowAnnouncement(false)}
                className="hover:bg-black/10 p-1 rounded-full transition-colors absolute right-4 top-1/2 -translate-y-1/2"
                title="Dismiss"
              >
                 <X className="h-4 w-4" />
              </button>
           </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 transition-all duration-300 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo & Theme Toggle Section */}
            <div className="flex items-center">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3 flex flex-col justify-center">
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                  {settings?.schoolName || 'RollCall'}
                </span>
                {settings?.academicYear && (
                   <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest mt-0.5">
                     {settings.academicYear}
                   </span>
                )}
              </div>
              
              {/* Theme Toggle Button */}
              <button 
                onClick={toggleTheme}
                className="ml-4 md:ml-6 p-2 rounded-full bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 relative overflow-hidden group"
                title={`Current Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
                aria-label="Toggle Color Theme"
              >
                <div className="relative z-10">
                    {theme === 'light' && <Sun className="h-5 w-5 text-amber-500" />}
                    {theme === 'dark' && <Moon className="h-5 w-5 text-indigo-400" />}
                    {theme === 'red-ghost' && <Terminal className="h-5 w-5 text-red-500 animate-pulse" />}
                </div>
              </button>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{user?.role}</span>
              </div>
              
              <div className="md:hidden h-8 w-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
                {user?.name.charAt(0)}
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>

              <button
                onClick={handleLogoutClick}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 ring-1 ring-gray-200 dark:ring-gray-700">
             <div className="p-6 text-center">
               <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4 animate-bounce-slight">
                 <LogOut className="h-6 w-6 text-red-600 dark:text-red-400" />
               </div>
               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Logout</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Are you sure you want to end your session? You will need to sign in again to access your dashboard.</p>
               <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => setShowLogoutConfirm(false)}
                   className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmLogout}
                   className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white border border-transparent rounded-xl font-bold transition-colors shadow-lg shadow-red-500/30 focus:ring-4 focus:ring-red-500/40"
                 >
                   Logout
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        <header className="mb-6 sm:mb-8 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:hidden">
            Welcome back, {user?.name}
          </p>
        </header>
        <main className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          {children}
        </main>
      </div>

      {/* Dashboard Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-300 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{settings?.schoolName || 'RollCall'}</span>
                      {settings?.academicYear && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">{settings.academicYear}</span>}
                      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                      <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
                  </div>
                  
                  <div className="flex items-center gap-6">
                      <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
                          Privacy Policy
                      </a>
                      <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
                          Terms of Service
                      </a>
                      <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                          <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Github className="h-4 w-4" /></a>
                          <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Twitter className="h-4 w-4" /></a>
                          <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><Linkedin className="h-4 w-4" /></a>
                      </div>
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
};
