import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, UserRound, Briefcase, 
  DollarSign, CalendarDays, MessageSquare, 
  BarChart3, Settings, LogOut, ChevronRight,
  Bot, FileBarChart, FileText, FileJson
} from 'lucide-react';
import { useAuth } from './AuthGuard';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'hr', label: 'HR & Volunteers', icon: Users },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'members', label: 'Members', icon: UserRound },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'finance_reports', label: 'Financial Reports', icon: FileJson },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'comm', label: 'Communication', icon: MessageSquare },
  { id: 'meetings', label: 'Meetings', icon: FileText },
  { id: 'impact', label: 'Impact / M&E', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'admin', label: 'Admin', icon: Settings },
];

export function Shell({ children, activeTab, onTabChange }: { 
  children: React.ReactNode, 
  activeTab: string, 
  onTabChange: (id: string) => void 
}) {
  const { user, profile, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-body-bg overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 80 }}
        className="h-full bg-sidebar-bg text-white flex flex-col py-6 relative border-r border-border"
      >
        <div className="px-6 mb-8 w-full flex items-center justify-start gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg p-1.5 border border-border group overflow-hidden">
            <img 
              src="/logo.png" 
              alt="REYO Logo" 
              className="w-full h-full object-contain" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden w-full h-full bg-sidebar-bg rounded-lg flex items-center justify-center font-black text-white text-xl">R</div>
          </div>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="font-black text-lg tracking-tight text-white leading-none">REYO</span>
              <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Management</span>
            </motion.div>
          )}
        </div>

        <div className="px-6 mb-2">
          {isSidebarOpen && <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Core Modules</p>}
        </div>

        <nav className="flex-1 w-full space-y-1">
          {MENU_ITEMS.filter(item => {
            if (profile?.role === 'Super Admin' || profile?.role === 'Chairperson') return true;
            if (['Admin', 'Vice Chairperson', 'Secretary', 'Vice Secretary', 'Treasurer'].includes(profile?.role || '')) {
              return ['dashboard', 'hr', 'projects', 'members', 'finance', 'finance_reports', 'events', 'comm', 'meetings', 'impact', 'reports', 'admin'].includes(item.id);
            }
            if (profile?.role === 'Field Staff') {
              return ['dashboard', 'projects', 'members', 'events', 'comm'].includes(item.id);
            }
            if (profile?.role === 'Volunteer') {
              return ['dashboard', 'members', 'events'].includes(item.id);
            }
            return ['dashboard'].includes(item.id);
          }).map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-2.5 transition-all group relative",
                activeTab === item.id 
                  ? "bg-sidebar-hover text-white border-l-4 border-primary" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto w-full pt-6 space-y-2 border-t border-slate-800">
           {isSidebarOpen && (
            <div className="px-2 py-3 flex items-center gap-3 bg-white/5 rounded-lg mb-4">
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}`} 
                alt="" 
                className="w-8 h-8 rounded-full bg-slate-700" 
                referrerPolicy="no-referrer" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.displayName}</p>
                <button 
                  onClick={() => onTabChange('profile')}
                  className="text-[10px] text-slate-400 truncate hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Settings className="w-2.5 h-2.5" />
                  Profile Settings
                </button>
              </div>
            </div>
           )}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium text-sm"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all z-10"
        >
          <ChevronRight className={cn("w-3 h-3 text-slate-400 transition-transform", isSidebarOpen ? "rotate-180" : "")} />
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative flex flex-col bg-body-bg">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight text-text-main">
              {MENU_ITEMS.find(i => i.id === activeTab)?.label || 'User Profile'}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-64 bg-white border border-border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            
            <div className="flex items-center gap-3 pl-6 border-l border-border">
              <button 
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-accent hover:bg-accent/10 transition-all font-bold text-xs border border-accent/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
              
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors relative group">
                <Bot className="w-5 h-5 text-text-muted" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success border-2 border-white rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
