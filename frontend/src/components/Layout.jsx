import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Columns, 
  BarChart3, 
  History, 
  Settings, 
  Info, 
  Cpu,
  Moon, 
  Sun,
  Menu,
  X,
  Activity
} from 'lucide-react';
import axios from 'axios';

export default function Layout({ children, isDark, setIsDark }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Fetch stats to get GPU status and API status
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/stats');
        setSystemStats(res.data);
      } catch (err) {
        console.error('Error fetching backend status:', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { name: 'Home', path: '/', icon: Info, exact: true },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Restore Image', path: '/restore', icon: UploadCloud },
    { name: 'Comparison', path: '/comparison', icon: Columns },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'History', path: '/history', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'About', path: '/about', icon: Info },
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 bg-bg-dark text-white`}>
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[#09090B] -z-20" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-blue/5 rounded-full blur-[120px] -z-10 animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary-purple/5 rounded-full blur-[120px] -z-10 animate-pulse-slow pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 glass-panel px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 md:hidden text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-primary-blue to-secondary-purple flex items-center justify-center font-bold text-white shadow-lg shadow-primary-blue/20">
              SR
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Semiconductor RestoreAI
              </h1>
              <p className="text-[10px] text-gray-500 font-medium hidden sm:block">
                Enterprise Quality Wafer Restoration
              </p>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-4">
          {/* Connection status tag */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-xs">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemStats?.model_status === 'Active' ? 'bg-success-green' : 'bg-red-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${systemStats?.model_status === 'Active' ? 'bg-success-green' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-[10px] font-semibold text-gray-400">
              {systemStats?.model_status === 'Active' ? 'API ONLINE' : 'API OFFLINE'}
            </span>
            {systemStats?.gpu_available && (
              <span className="text-[10px] text-accent-cyan font-bold border-l border-white/10 pl-2 flex items-center gap-1">
                <Cpu size={11} /> GPU
              </span>
            )}
          </div>

          {/* Theme Toggler */}
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:text-primary-blue text-gray-400 transition"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden md:flex flex-col w-64 border-r border-white/5 min-h-[calc(100vh-61px)] p-4 shrink-0">
          <nav className="space-y-1.5 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path) && item.path !== '/';
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-primary-blue/20 to-secondary-purple/10 border border-primary-blue/30 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-primary-blue' : ''} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
          
          {/* GPU Info Card */}
          {systemStats && (
            <div className="mt-auto p-4 rounded-2xl glass-card text-xs space-y-2 border border-white/5">
              <div className="flex items-center justify-between text-gray-500 font-medium">
                <span>Inference Engine</span>
                <span className="text-success-green flex items-center gap-1 font-bold">
                  <Activity size={10} /> Active
                </span>
              </div>
              <div className="text-white font-semibold truncate">
                {systemStats.current_model.split('/')[0]}
              </div>
              <div className="text-gray-400 truncate flex items-center gap-1.5">
                <Cpu size={12} className="text-accent-cyan" />
                {systemStats.gpu_name}
              </div>
              {systemStats.gpu_available && (
                <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                  <div className="bg-gradient-to-r from-primary-blue to-accent-cyan h-1.5 rounded-full w-[25%]" />
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Sidebar Navigation - Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Drawer */}
            <aside className="relative flex flex-col w-64 bg-[#09090B] border-r border-white/5 p-4 z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-sm text-gray-400">Navigation</span>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>
              
              <nav className="space-y-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact 
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path) && item.path !== '/';
                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-primary-blue/20 border border-primary-blue/30 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={18} />
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-h-[calc(100vh-61px)] overflow-x-hidden p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 glass-panel py-6 text-center text-xs text-gray-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-gray-400">Semiconductor RestoreAI</span>
          </div>
          <div>
            Developed using React, FastAPI, PyTorch and SwinIR.
          </div>
          <div>
            &copy; {new Date().getFullYear()} Semiconductor RestoreAI Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
