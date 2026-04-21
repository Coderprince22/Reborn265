import React, { useEffect, useState } from 'react';
import { 
  Users, UserRound, Briefcase, DollarSign, Plus, Search, Filter, 
  ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, Clock, MapPin, 
  BarChart3, Loader2, Trash2, Edit3, ShieldCheck, ShieldAlert, Shield, 
  UserPlus, FileBarChart, Download, Upload, FileJson, FileSpreadsheet,
  Check, X, FileText, History, Send, MessageCircle, Mail
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from './AuthGuard';
import { UserProfile, Member, Project, Transaction, AppEvent, UserRole, Meeting, Communication } from '../types';

export const USER_ROLES: UserRole[] = [
  'Super Admin', 'Admin', 'Field Staff', 'Volunteer', 
  'Chairperson', 'Vice Chairperson', 'Secretary', 'Vice Secretary', 'Treasurer'
];

// Data Management Helpers
const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const val = row[header];
        const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        return `"${stringVal.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ExportButton = ({ data, filename, label = 'Export' }: { data: any[], filename: string, label?: string }) => (
  <button 
    onClick={() => exportToCSV(data, filename)}
    className="flex items-center gap-2 bg-white border border-border text-text-main px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
  >
    <Download className="w-4 h-4" />
    {label}
  </button>
);

const ImportButton = ({ onImport, label = 'Import' }: { onImport: (data: any[]) => void, label?: string }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length === 0) return;

      const parseCSVLine = (line: string) => {
        const result = [];
        let cur = "";
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && line[i+1] === '"') {
            cur += '"';
            i++;
          } else if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const result = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        return headers.reduce((obj: any, header, index) => {
          if (header) {
            obj[header] = values[index];
          }
          return obj;
        }, {});
      });
      onImport(result);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <label className="flex items-center gap-2 bg-white border border-border text-text-main px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
      <Upload className="w-4 h-4" />
      {label}
      <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
    </label>
  );
};

// ... existing code ...

export function ReportsView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [stats, setStats] = useState({
    members: 0,
    volunteers: 0,
    projects: 0,
    finances: { income: 0, expense: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (s) => setStats(prev => ({ ...prev, members: s.size })));
    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => setStats(prev => ({ ...prev, volunteers: s.docs.filter(d => d.data().role === 'Volunteer').length })));
    const unsubProjects = onSnapshot(collection(db, 'projects'), (s) => setStats(prev => ({ ...prev, projects: s.size })));
    const unsubFinance = onSnapshot(collection(db, 'transactions'), (s) => {
      const totals = s.docs.reduce((acc, d) => {
        const item = d.data();
        if (item.type === 'Income') acc.income += item.amount;
        else acc.expense += item.amount;
        return acc;
      }, { income: 0, expense: 0 });
      setStats(prev => ({ ...prev, finances: totals }));
    });

    setLoading(false);
    return () => {
      unsubMembers();
      unsubUsers();
      unsubProjects();
      unsubFinance();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-main">System Reports</h2>
        <div className="flex gap-2">
           <ExportButton data={[stats]} filename="system_summary" label="Export Summary" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Membership Overview">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Total Registered Youth</span>
              <span className="text-lg font-bold text-text-main">{stats.members}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Active Volunteers</span>
              <span className="text-lg font-bold text-text-main">{stats.volunteers}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-primary" style={{ width: `${(stats.volunteers / (stats.members || 1)) * 100}%` }}></div>
            </div>
          </div>
        </Card>

        <Card title="Financial Performance">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Total Income</span>
              <span className="text-lg font-bold text-success">MWK {stats.finances.income.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Total Expenses</span>
              <span className="text-lg font-bold text-accent">MWK {stats.finances.expense.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
              <span className="text-sm font-bold text-text-main">Net Balance</span>
              <span className="text-lg font-bold text-primary">MWK {(stats.finances.income - stats.finances.expense).toLocaleString()}</span>
            </div>
            <button 
              onClick={() => onNavigate?.('finance_reports')}
              className="w-full mt-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
            >
              View Detailed Financial Analysis
            </button>
          </div>
        </Card>
      </div>

      <Card title="Quarterly Progress">
        <div className="py-20 text-center flex flex-col items-center">
          <FileBarChart className="w-12 h-12 text-slate-100 mb-4" />
          <p className="text-sm text-text-muted">Detailed analytics and trend charts will appear here as more data is collected.</p>
        </div>
      </Card>
    </div>
  );
}
const Card = ({ children, title, subtitle, className }: { children: React.ReactNode, title?: string, subtitle?: string, className?: string }) => (
  <div className={cn("bg-white rounded-xl shadow-sm border border-border overflow-hidden", className)}>
    {(title || subtitle) && (
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-white">
        <div>
          {title && <h3 className="text-[15px] font-semibold text-text-main">{title}</h3>}
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
    )}
    <div className="p-5">
      {children}
    </div>
  </div>
);

const Stat = ({ label, value, icon: Icon, trend, color, onClick }: { label: string, value: string | number, icon: any, trend?: string, color: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white rounded-xl p-5 shadow-sm border border-border transition-all",
      onClick && "cursor-pointer hover:border-primary hover:shadow-md active:scale-[0.98]"
    )}
  >
    <p className="text-[13px] text-text-muted mb-2">{label}</p>
    <div className="flex items-center justify-between">
      <h4 className="text-2xl font-bold text-text-main">{value}</h4>
    </div>
    {trend && (
      <div className="mt-2 flex items-center gap-1">
        <span className={cn(
          "text-xs font-medium flex items-center", 
          trend.startsWith('+') || trend.includes('↑') ? "text-success" : "text-accent"
        )}>
          {trend.startsWith('+') || trend.includes('↑') ? '↑' : '↓'} {trend.replace('+', '').replace('↑', '')}
        </span>
        <span className="text-[11px] text-text-muted">from last month</span>
      </div>
    )}
    {!trend && (
      <div className="mt-2 h-4"></div>
    )}
  </div>
);

// View Components
export function DashboardView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [stats, setStats] = useState({
    members: 0,
    volunteers: 0,
    projects: 0,
    funds: 0
  });
  const [pendingCount, setPendingCount] = useState(0);
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Super Admin';

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (s) => setStats(prev => ({ ...prev, members: s.size })), (err) => console.debug("Members listener suppressed:", err.message));
    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('status', '==', 'Active')), (s) => {
      const volCount = s.docs.filter(d => d.data().role === 'Volunteer').length;
      setStats(prev => ({ ...prev, volunteers: volCount }));
    }, (err) => console.debug("Users listener suppressed:", err.message));
    const unsubProjects = onSnapshot(collection(db, 'projects'), (s) => {
      setStats(prev => ({ ...prev, projects: s.size }));
    }, (err) => console.debug("Projects listener suppressed:", err.message));
    const unsubFinance = onSnapshot(collection(db, 'transactions'), (s) => {
      const total = s.docs.reduce((acc, d) => {
        const item = d.data();
        return acc + (item.type === 'Income' ? item.amount : -item.amount);
      }, 0);
      setStats(prev => ({ ...prev, funds: total }));
    }, (err) => console.debug("Transactions listener suppressed:", err.message));

    return () => {
      unsubMembers();
      unsubUsers();
      unsubProjects();
      unsubFinance();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), where('status', '==', 'Pending'));
    return onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      {isAdmin && pendingCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-main">{pendingCount} New Users Awaiting Approval</p>
              <p className="text-xs text-text-muted mt-0.5">Please review the personnel profiles in the HR module.</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate?.('hr')}
            className="text-xs font-bold text-accent hover:underline"
          >
            View Personnel
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-4 gap-5">
        <Stat label="Total Youth Members" value={stats.members.toLocaleString()} icon={UserRound} trend="Live" color="bg-primary" onClick={() => onNavigate?.('members')} />
        <Stat label="Active Volunteers" value={stats.volunteers.toLocaleString()} icon={Users} trend="Verified" color="bg-sidebar-bg" onClick={() => onNavigate?.('hr')} />
        <Stat label="Net Funding" value={`MWK ${(stats.funds / 1000).toFixed(1)}k`} icon={DollarSign} trend="Real-time" color="bg-accent" onClick={() => onNavigate?.('finance')} />
        <Stat label="Running Projects" value={stats.projects.toLocaleString()} icon={Briefcase} trend="Total" color="bg-success" onClick={() => onNavigate?.('projects')} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card title="Impact & Participation" className="col-span-2 shadow-sm">
           <div className="py-20 text-center flex flex-col items-center">
              <TrendingUp className="w-12 h-12 text-slate-100 mb-4" />
              <p className="text-sm text-text-muted">Impact visualization and detailed analytics coming soon.</p>
           </div>
        </Card>
        
        <Card title="Quick Tasks">
           <div className="space-y-4">
              <button 
                onClick={() => onNavigate?.('members')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Plus className="w-4 h-4 text-primary" /></div>
                <span className="text-xs font-semibold text-text-main">Register New Member</span>
              </button>
              <button 
                onClick={() => onNavigate?.('finance')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center"><Plus className="w-4 h-4 text-success" /></div>
                <span className="text-xs font-semibold text-text-main">Log Transaction</span>
              </button>
              <button 
                onClick={() => onNavigate?.('events')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Plus className="w-4 h-4 text-accent" /></div>
                <span className="text-xs font-semibold text-text-main">Create Event</span>
              </button>
           </div>
        </Card>
      </div>
    </div>
  );
}

export function HRView({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({ role: 'Volunteer', status: 'Pending' });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { profile: currentUser } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (err) => {
      console.debug("HR users listener suppressed:", err.message);
      setLoading(false);
    });
  }, []);

  const handleApprove = async (userId: string) => {
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin')) return;
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'Active',
        approvedBy: currentUser.uid,
        role: 'Field Staff' // Default role upon approval, can be changed
      });
    } catch (error) {
      console.error("Failed to approve user:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.displayName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'users'), {
        ...newUser,
        createdAt: serverTimestamp(),
      });
      setNewUser({ role: 'Volunteer', status: 'Pending' });
      setIsAddingUser(false);
    } catch (e) {
      console.error("Failed to create user:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const isLead = ['Super Admin', 'Admin', 'Chairperson', 'Secretary'].includes(currentUser?.role || '');
    if (!currentUser || !isLead) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      console.error("Failed to change role:", error);
    }
  };

  const handleBulkImport = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      for (const item of data) {
        if (item.displayName || item.email) {
          await addDoc(collection(db, 'users'), {
            ...item,
            role: item.role || 'Volunteer',
            status: item.status || 'Pending',
            createdAt: serverTimestamp()
          });
        }
      }
      alert(`Imported ${data.length} accounts.`);
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <Card title="Personnel & Approvals" subtitle="Manage staff, volunteers and system access">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-border flex-1 max-w-md focus-within:border-primary/50 group mr-4">
            <Search className="w-5 h-5 text-text-muted group-focus-within:text-primary" />
            <input type="text" placeholder="Search personnel..." className="bg-transparent outline-none text-sm w-full" />
          </div>
          <div className="flex items-center gap-2">
            <ImportButton onImport={handleBulkImport} />
            <ExportButton data={users} filename="personnel_registry" />
            <button 
              onClick={() => {
                if (isAddingUser && newUser.role === 'Volunteer') {
                  setIsAddingUser(false);
                } else {
                  setNewUser({ role: 'Volunteer', status: 'Pending' });
                  setIsAddingUser(true);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all",
                isAddingUser && newUser.role === 'Volunteer' ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-600 text-white hover:bg-slate-700"
              )}
            >
              <UserPlus className="w-5 h-5" />
              {isAddingUser && newUser.role === 'Volunteer' ? 'Cancel' : 'Add Volunteer'}
            </button>
            <button 
              onClick={() => {
                if (isAddingUser && (newUser.role === 'Admin' || newUser.role === 'Field Staff')) {
                  setIsAddingUser(false);
                } else {
                  setNewUser({ role: 'Admin', status: 'Active' });
                  setIsAddingUser(true);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all",
                isAddingUser && (newUser.role === 'Admin' || newUser.role === 'Field Staff') ? "bg-red-50 text-red-600 border border-red-100" : "bg-sidebar-bg text-white hover:bg-slate-700"
              )}
            >
              <ShieldCheck className="w-5 h-5" />
              {isAddingUser && (newUser.role === 'Admin' || newUser.role === 'Field Staff') ? 'Cancel' : 'Add Official/Staff'}
            </button>
            <button 
              onClick={() => onNavigate?.('members')}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-primary-dark transition-all"
            >
              <Plus className="w-5 h-5" />
              Members Registry
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isAddingUser && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <Card title="Register New Personnel Account" className="bg-slate-50 border-dashed">
                <form onSubmit={handleCreateUser} className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm" 
                      value={newUser.displayName || ''} 
                      onChange={e => setNewUser({...newUser, displayName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email"
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm" 
                      value={newUser.email || ''} 
                      onChange={e => setNewUser({...newUser, email: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Role</label>
                    <select 
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm" 
                      value={newUser.role} 
                      onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                    >
                      {USER_ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Initial Status</label>
                    <select 
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm" 
                      value={newUser.status} 
                      onChange={e => setNewUser({...newUser, status: e.target.value as any})}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>
                  <div className="col-span-4 mt-2">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-success text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-success/90 transition-all"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Personnel Profile'}
                    </button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase tracking-widest">User</th>
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase tracking-widest">Requested Role</th>
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`} 
                          alt="" 
                          className="w-9 h-9 rounded-full bg-slate-100" 
                          referrerPolicy="no-referrer" 
                        />
                        <div>
                          <p className="text-sm font-semibold text-text-main">{user.displayName}</p>
                          <p className="text-[11px] text-text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-text-main">{user.role}</span>
                        {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || currentUser?.role === 'Chairperson' || currentUser?.role === 'Secretary') && (
                          <select 
                            className="bg-slate-50 border border-border rounded px-1 py-0.5 text-[10px] outline-none"
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                          >
                            {USER_ROLES.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                        user.status === 'Active' ? "bg-green-50 text-green-700" : 
                        user.status === 'Pending' ? "bg-accent/10 text-accent" : "bg-red-50 text-red-700"
                      )}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      {user.status === 'Pending' && (currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') ? (
                        <button 
                          onClick={() => handleApprove(user.uid)}
                          disabled={processingId === user.uid}
                          className="text-[11px] font-bold text-white bg-success px-3 py-1.5 rounded-lg hover:bg-success/90 transition-all shadow-sm flex items-center justify-center gap-1 disabled:opacity-50 min-w-[80px]"
                        >
                          {processingId === user.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                        </button>
                      ) : (
                        <button className="text-xs font-semibold text-primary hover:underline">View Profile</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({ status: 'Active' });
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Super Admin';

  useEffect(() => {
    return onSnapshot(collection(db, 'projects'), (s) => {
      setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setLoading(false);
    }, (err) => {
      console.debug("Projects list listener suppressed:", err.message);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        createdAt: serverTimestamp()
      });
      setNewProject({ status: 'Active' });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete project?")) return;
    await deleteDoc(doc(db, 'projects', id));
  };

  const handleBulkImport = async (data: any[]) => {
    try {
      for (const item of data) {
        if (item.name) {
          await addDoc(collection(db, 'projects'), { 
            ...item, 
            status: item.status || 'Planned',
            createdAt: serverTimestamp() 
          });
        }
      }
      alert(`Imported ${data.length} projects.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'projects', id), { status: newStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const stats = projects.reduce((acc, p) => {
    acc.status[p.status] = (acc.status[p.status] || 0) + 1;
    if (p.category) {
      acc.category[p.category] = (acc.category[p.category] || 0) + 1;
    }
    return acc;
  }, { 
    status: {} as Record<string, number>, 
    category: {} as Record<string, number> 
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Projects', value: stats.status['Active'] || 0, color: 'text-primary' },
          { label: 'Planned Initiatives', value: stats.status['Planned'] || 0, color: 'text-blue-600' },
          { label: 'Completed', value: stats.status['Completed'] || 0, color: 'text-green-600' },
          { label: 'Total Categories', value: Object.keys(stats.category).length, color: 'text-text-main' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-28">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{s.label}</p>
            <p className={cn("text-3xl font-black", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-text-main">Organizational Initiatives</h3>
        <div className="flex gap-2">
          <ImportButton onImport={handleBulkImport} />
          <ExportButton data={projects} filename="projects" />
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-primary-dark transition-all"
            >
              <Plus className="w-5 h-5" />
              {isAdding ? 'Cancel' : 'New Project'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card title="Launch New Initiative">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Project Name</label>
                    <input required className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm outline-none" value={newProject.name || ''} onChange={e => setNewProject({...newProject, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Category</label>
                    <select className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm outline-none" value={newProject.category || ''} onChange={e => setNewProject({...newProject, category: e.target.value})}>
                      <option value="">Select Category</option>
                      <option value="Education">Education</option>
                      <option value="Environment">Environment</option>
                      <option value="Health">Health</option>
                      <option value="STEM">STEM</option>
                      <option value="SME">SME Support</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Description</label>
                  <textarea className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm outline-none h-24" value={newProject.description || ''} onChange={e => setNewProject({...newProject, description: e.target.value})} />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-success text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-success/90 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Project'}
                </button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <div className="col-span-2 py-20 bg-white rounded-xl border border-dashed border-border text-center text-text-muted italic">No active projects found.</div>
        ) : projects.map((proj) => (
          <Card key={proj.id} className="hover:border-primary/20 transition-all group relative">
            {isAdmin && (
              <button onClick={() => handleDelete(proj.id)} className="absolute top-4 right-4 p-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-inner">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-3 py-1 bg-slate-50 border border-border rounded-full text-text-muted uppercase">{proj.category}</span>
            </div>
            <h4 className="text-xl font-bold text-text-main mb-2 tracking-tight">{proj.name}</h4>
            <p className="text-sm text-text-muted line-clamp-2 mb-6 leading-relaxed">{proj.description}</p>
            <div className="flex items-center justify-between pt-6 border-t border-border mt-auto">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", proj.status === 'Active' ? "bg-success" : proj.status === 'Completed' ? "bg-blue-500" : "bg-accent")}></div>
                {isAdmin ? (
                  <select 
                    className="text-xs font-bold text-text-main uppercase tracking-widest bg-transparent outline-none cursor-pointer"
                    value={proj.status}
                    onChange={(e) => handleStatusUpdate(proj.id, e.target.value)}
                  >
                    <option value="Planned">Planned</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                ) : (
                  <p className="text-xs font-bold text-text-main uppercase tracking-widest">{proj.status}</p>
                )}
              </div>
              <button className="text-[11px] font-bold text-primary hover:underline">View Details →</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MembersView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMember, setNewMember] = useState<Partial<Member>>({ gender: 'Male' });

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
      setLoading(false);
    }, (err) => {
      console.debug("Members list listener suppressed:", err.message);
      setLoading(false);
    });
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.fullName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'members', editingId), {
          ...newMember,
          updatedAt: serverTimestamp()
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'members'), {
          ...newMember,
          createdAt: serverTimestamp()
        });
      }
      setNewMember({ gender: 'Male' });
      setIsAdding(false);
    } catch (error) {
      console.error("Error saving member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (member: Member) => {
    setNewMember(member);
    setEditingId(member.id);
    setIsAdding(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  const handleBulkImport = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      for (const item of data) {
        if (item.fullName) {
          await addDoc(collection(db, 'members'), {
            ...item,
            createdAt: serverTimestamp()
          });
        }
      }
      alert(`Successfully imported ${data.length} records.`);
    } catch (e) {
      console.error("Import failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold text-text-main">Youth Registry</h2>
         <div className="flex gap-2">
           <ImportButton onImport={handleBulkImport} />
           <ExportButton data={members} filename="youth_registry" />
           <button 
             onClick={() => {
               setIsAdding(!isAdding);
               if (editingId) {
                 setEditingId(null);
                 setNewMember({ gender: 'Male' });
               }
             }}
             className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all"
           >
             <Plus className="w-4 h-4" />
             {isAdding ? 'Cancel' : 'Register Member'}
           </button>
         </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card title={editingId ? "Edit Youth Member" : "Register New Youth Member"}>
              <form onSubmit={handleAddMember} className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Full Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={newMember.fullName || ''}
                    onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Gender</label>
                  <select 
                    className="w-full bg-slate-50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={newMember.gender}
                    onChange={(e) => setNewMember({...newMember, gender: e.target.value as any})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Phone Number</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={newMember.phoneNumber || ''}
                    onChange={(e) => setNewMember({...newMember, phoneNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Address</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={newMember.address || ''}
                    onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Position</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Student, Artisan, etc."
                    className="w-full bg-slate-50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={newMember.position || ''}
                    onChange={(e) => setNewMember({...newMember, position: e.target.value})}
                  />
                </div>
                <div className="col-span-2 pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-success text-white py-2 rounded-lg font-bold text-sm hover:bg-success/90 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Member'}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : members.length === 0 ? (
            <div className="py-20 text-center">
              <UserRound className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm text-text-muted">No members found in registry.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase">Member</th>
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase">Position</th>
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase">Gender</th>
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase">Location</th>
                  <th className="pb-4 px-2 text-[11px] font-bold text-text-muted uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-2">
                       <div className="flex items-center gap-3">
                         <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-text-muted text-xs uppercase">
                           {member.fullName.charAt(0)}
                         </div>
                         <div>
                           <p className="text-sm font-semibold text-text-main">
                             {member.fullName}
                           </p>
                           <p className="text-[11px] text-text-muted">{member.phoneNumber || 'No phone'}</p>
                         </div>
                       </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="text-xs text-text-main font-medium">{member.position || '—'}</span>
                    </td>
                    <td className="py-4 px-2 text-sm text-text-main">{member.gender}</td>
                    <td className="py-4 px-2 text-sm text-text-muted">{member.address || '—'}</td>
                    <td className="py-4 px-2 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <button onClick={() => handleEdit(member)} className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors">
                           <Edit3 className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

export function FinanceView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'Income', date: new Date().toISOString().split('T')[0] });
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Super Admin';

  useEffect(() => {
    return onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50)), (s) => {
      setTxs(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    }, (err) => {
      console.debug("Finance listener suppressed:", err.message);
      setLoading(false);
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        ...newTx,
        amount: Number(newTx.amount),
        recordedBy: profile?.uid,
        createdAt: serverTimestamp()
      });
      setNewTx({ type: 'Income', date: new Date().toISOString().split('T')[0] });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction record? This action is permanent.")) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (e) {
      console.error(e);
    }
  };

  const totals = txs.reduce((acc, t) => {
    if (t.type === 'Income') acc.in += t.amount;
    else acc.out += t.amount;
    return acc;
  }, { in: 0, out: 0 });

  const handleBulkImport = async (data: any[]) => {
    try {
      for (const item of data) {
        if (item.amount) {
          await addDoc(collection(db, 'transactions'), { 
            ...item, 
            amount: Number(item.amount),
            date: item.date || new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp() 
          });
        }
      }
      alert(`Imported ${data.length} transactions.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-6">
        <Stat label="Total Cash on Hand" value={`MWK ${(totals.in - totals.out).toLocaleString()}`} icon={DollarSign} color="bg-[#5A5A40]" />
        <Stat label="Total Income" value={`MWK ${totals.in.toLocaleString()}`} icon={ArrowUpRight} trend="Live" color="bg-green-500" />
        <Stat label="Total Expenses" value={`MWK ${totals.out.toLocaleString()}`} icon={ArrowDownRight} trend="Live" color="bg-red-500" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-text-main">Financial Ledger</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => onNavigate?.('finance_reports')}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all border border-border"
          >
            <FileBarChart className="w-4 h-4" />
            Detailed Reports
          </button>
          <ImportButton onImport={handleBulkImport} />
          <ExportButton data={txs} filename="finances" />
          {isAdmin && (
            <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-primary-dark">
              <Plus className="w-5 h-5" />
              {isAdding ? 'Cancel' : 'Log Transaction'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card title="New Transaction Entry">
              <form onSubmit={handleAdd} className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Amount (MWK)</label>
                  <input required type="number" className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Type</label>
                  <select className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as any})}>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Description</label>
                  <input required className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} />
                </div>
                <div className="space-y-1 self-end">
                   <button 
                     type="submit" 
                     disabled={isSubmitting}
                     className="w-full bg-primary text-white py-2 rounded-xl font-bold text-sm hover:bg-primary-dark flex items-center justify-center gap-2 shadow-sm"
                   >
                     {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Entry'}
                   </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card title="Recent Transactions">
        <div className="space-y-3">
           {loading ? (
             <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
           ) : txs.length === 0 ? (
             <p className="text-center py-10 text-text-muted italic">No transactions recorded.</p>
           ) : txs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-border rounded-2xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    tx.type === 'Income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {tx.type === 'Income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">{tx.description}</p>
                    <p className="text-[10px] text-text-muted">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className={cn("font-bold text-sm", tx.type === 'Income' ? "text-green-600" : "text-red-600")}>
                    {tx.type === 'Income' ? '+' : '-'} {tx.amount.toLocaleString()} MWK
                  </p>
                  {isAdmin && (
                    <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
           ))}
        </div>
      </Card>
    </div>
  );
}

export function EventsView() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<AppEvent>>({ date: new Date().toISOString() });
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Super Admin';

  useEffect(() => {
    return onSnapshot(query(collection(db, 'events'), orderBy('date', 'asc')), (s) => {
      setEvents(s.docs.map(d => ({ id: d.id, ...d.data() } as AppEvent)));
      setLoading(false);
    }, (err) => {
      console.debug("Events listener suppressed:", err.message);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        registeredCount: 0,
        createdAt: serverTimestamp()
      });
      setNewEvent({ date: new Date().toISOString() });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkImport = async (data: any[]) => {
    try {
      for (const item of data) {
        if (item.title) {
          await addDoc(collection(db, 'events'), { 
            ...item, 
            date: item.date || new Date().toISOString(),
            createdAt: serverTimestamp() 
          });
        }
      }
      alert(`Imported ${data.length} events.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-text-main">Community Events & Workshops</h3>
        <div className="flex gap-2">
          <ImportButton onImport={handleBulkImport} />
          <ExportButton data={events} filename="events" />
          {isAdmin && (
            <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-primary-dark">
              <Plus className="w-5 h-5" />
              {isAdding ? 'Cancel' : 'Plan Event'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card title="Schedule Organizational Event">
              <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Event Title</label>
                  <input required className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newEvent.title || ''} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Date</label>
                  <input required type="datetime-local" className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Location</label>
                  <input required className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newEvent.location || ''} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                </div>
                <div className="col-span-2">
                   <button 
                     type="submit" 
                     disabled={isSubmitting}
                     className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary-dark flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Event'}
                   </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <div className="col-span-3 py-20 bg-white rounded-xl border border-dashed border-border text-center text-text-muted italic">No upcoming events.</div>
        ) : events.map((ev) => (
          <Card key={ev.id} className="hover:border-primary/20 transition-all group">
            <div className="flex gap-4 mb-4">
              <div className="w-12 h-14 bg-slate-100 rounded-xl flex flex-col items-center justify-center border border-border">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                <span className="text-xl font-black text-text-main leading-tight">{new Date(ev.date).getDate()}</span>
              </div>
              <div>
                <h4 className="font-bold text-text-main line-clamp-1">{ev.title}</h4>
                <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-text-muted flex items-center gap-1 mb-6">
              <MapPin className="w-3 h-3" /> {ev.location}
            </p>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{ev.registeredCount} Registered</span>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => handleDelete(ev.id)} className="p-1.5 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button className="text-xs font-bold text-primary hover:underline">Manage List</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
export function ImpactView() { return <div className="text-center p-20 text-gray-400 italic">Monitoring & Evaluation dashboard...</div> }

export function ProfileView() {
  const { profile, user } = useAuth();
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName,
        phoneNumber: profile.phoneNumber || '',
        position: profile.position || ''
      });
    }
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card title="Account Settings" subtitle="Keep your profile information up to date">
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-border">
            <img 
              src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}`} 
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-lg font-bold text-text-main">{profile.displayName}</p>
              <p className="text-sm text-text-muted">{profile.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">{profile.role}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-all"
                  value={formData.displayName || ''}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                />
             </div>
             <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Position / Responsibility</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-all"
                  value={formData.position || ''}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                  placeholder="e.g. Field Coordinator"
                />
             </div>
             <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Phone Number</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-all"
                  value={formData.phoneNumber || ''}
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                />
             </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-primary text-white w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
            {success && <p className="text-center text-success text-xs mt-3 font-semibold">Profile updated successfully!</p>}
          </div>
        </form>
      </Card>
    </div>
  );
}

export function AdminView({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'Super Admin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    const q = query(collection(db, 'users'), where('status', '==', 'Pending'));
    return onSnapshot(q, (snapshot) => {
      setPendingUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (err) => console.debug("Admin pending users listener suppressed:", err.message));
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-20 text-center">
        <div>
          <ShieldAlert className="w-12 h-12 text-accent mx-auto mb-4" />
          <h4 className="text-lg font-bold text-text-main">Restricted Module</h4>
          <p className="text-sm text-text-muted mt-2">Only Super Administrators can access system settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold text-text-main">System Governance</h2>
       <div className="grid grid-cols-3 gap-6">
          <Card title="System Alerts" className="col-span-2">
             <div className="space-y-4">
                {pendingUsers.length > 0 ? (
                  <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-accent" />
                      <p className="text-sm font-semibold text-text-main">{pendingUsers.length} Users waiting for access</p>
                    </div>
                    <button 
                      onClick={() => onNavigate?.('hr')}
                      className="text-xs font-bold text-accent hover:underline"
                    >
                      Go to HR Module
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-10 text-text-muted text-sm italic">No active system alerts.</div>
                )}
             </div>
          </Card>
          <Card title="M&E Settings">
             <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs font-medium text-text-main">Public Registration</span>
                  <div className="w-8 h-4 bg-success rounded-full flex items-center justify-end px-1 shadow-inner"><div className="w-3 h-3 bg-white rounded-full"></div></div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs font-medium text-text-main">AI Chatbot Assist</span>
                  <div className="w-8 h-4 bg-success rounded-full flex items-center justify-end px-1 shadow-inner"><div className="w-3 h-3 bg-white rounded-full"></div></div>
                </div>
             </div>
          </Card>
       </div>
    </div>
  );
}
export function CommView() {
  const [comms, setComms] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'broadcast' | 'history'>('broadcast');
  const [newComm, setNewComm] = useState<Partial<Communication>>({
    type: 'Broadcasting',
    channel: 'SMS',
    recipients: 'Everyone',
    status: 'Sent'
  });
  const { profile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'communications'), orderBy('sentAt', 'desc'), limit(50));
    return onSnapshot(q, (s) => {
      setComms(s.docs.map(d => ({ id: d.id, ...d.data() } as Communication)));
      setLoading(false);
    }, (err) => {
      console.debug("Communications listener suppressed:", err.message);
      setLoading(false);
    });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComm.message || !newComm.subject || isSending) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'communications'), {
        ...newComm,
        senderId: profile?.uid,
        senderName: profile?.displayName,
        sentAt: serverTimestamp(),
        status: 'Sent'
      });
      setNewComm({
        type: 'Broadcasting',
        channel: 'SMS',
        recipients: 'Everyone',
        status: 'Sent'
      });
      setActiveTab('history');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between px-6">
        <div>
          <h2 className="text-xl font-bold text-text-main">Communication Center</h2>
          <p className="text-xs text-text-muted mt-1">Broadcast messages via SMS, Email, and In-App notifications</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('broadcast')}
             className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === 'broadcast' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main")}
           >
             New Broadcast
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === 'history' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main")}
           >
             Message History
           </button>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {activeTab === 'broadcast' ? (
          <Card title="Compose Broadcast Message">
            <form onSubmit={handleSend} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Distribution List</label>
                    <select 
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-all"
                      value={newComm.recipients}
                      onChange={e => setNewComm({...newComm, recipients: e.target.value as any})}
                    >
                      <option value="Everyone">Everyone</option>
                      <option value="Staff">Staff Only</option>
                      <option value="Volunteers">Active Volunteers</option>
                      <option value="Youth Members">Youth Members Registry</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Delivery Channel</label>
                    <div className="flex gap-2">
                       {['SMS', 'Email', 'In-App'].map(channel => (
                         <button
                           key={channel}
                           type="button"
                           onClick={() => setNewComm({...newComm, channel: channel as any})}
                           className={cn(
                             "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all",
                             newComm.channel === channel ? "bg-primary/10 border-primary text-primary" : "bg-white border-border text-text-muted hover:border-primary/50"
                           )}
                         >
                            {channel === 'SMS' && <MessageCircle className="w-4 h-4" />}
                            {channel === 'Email' && <Mail className="w-4 h-4" />}
                            {channel === 'In-App' && <ShieldCheck className="w-4 h-4" />}
                            <span className="text-[10px] font-bold">{channel}</span>
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Subject / Header</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-all"
                      placeholder="Enter broadcast subject..."
                      value={newComm.subject || ''}
                      onChange={e => setNewComm({...newComm, subject: e.target.value})}
                    />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Message Content</label>
                  <textarea 
                    required
                    rows={6}
                    className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-none transition-all"
                    placeholder="Type your message here..."
                    value={newComm.message || ''}
                    onChange={e => setNewComm({...newComm, message: e.target.value})}
                  />
                  <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-[10px] text-text-muted italic">
                      Characters: {newComm.message?.length || 0} 
                      {newComm.channel === 'SMS' && ` (Approx. ${Math.ceil((newComm.message?.length || 0) / 160)} SMS parts)`}
                    </p>
                    <p className="text-[10px] text-text-muted bg-slate-100 px-2 py-0.5 rounded-full font-medium">Estimated Recipients: ~340</p>
                  </div>
               </div>

               <button 
                 type="submit"
                 disabled={isSending}
                 className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-[0.99] disabled:opacity-50"
               >
                 {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Send Broadcast Now</>}
               </button>
            </form>
          </Card>
        ) : (
          <Card title="Previous Communications">
             <div className="space-y-4">
                {loading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : comms.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <MessageCircle className="w-12 h-12 text-slate-100 mb-4" />
                    <p className="text-sm text-text-muted italic">No communication history found.</p>
                  </div>
                ) : comms.map(comm => (
                  <div key={comm.id} className="p-5 bg-white border border-border rounded-2xl flex items-start gap-4 hover:border-primary/30 hover:shadow-sm transition-all group">
                     <div className={cn(
                       "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                       comm.channel === 'SMS' ? "bg-green-50 text-green-600" :
                       comm.channel === 'Email' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                     )}>
                        {comm.channel === 'SMS' && <MessageCircle className="w-6 h-6" />}
                        {comm.channel === 'Email' && <Mail className="w-6 h-6" />}
                        {comm.channel === 'In-App' && <ShieldCheck className="w-6 h-6" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="text-sm font-bold text-text-main truncate pr-2">{comm.subject}</h4>
                           <span className="text-[10px] text-text-muted font-medium">
                             {comm.sentAt?.seconds ? new Date(comm.sentAt.seconds * 1000).toLocaleString() : 'Just now'}
                           </span>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-2 mb-3 leading-relaxed">{comm.message}</p>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{comm.status}</span>
                           </div>
                           <span className="text-[10px] text-text-muted bg-slate-50 border border-border/50 px-2 py-0.5 rounded-full">Target: {comm.recipients}</span>
                           <span className="text-[10px] text-text-muted ml-auto group-hover:text-primary transition-colors italic">Sent by: {comm.senderName}</span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export function FinancialReportsView() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    range: 'all', // all, monthly, quarterly, yearly
    type: 'All',
    category: 'All'
  });

  useEffect(() => {
    return onSnapshot(collection(db, 'transactions'), (s) => {
      setTxs(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    });
  }, []);

  const categories = Array.from(new Set(txs.map(t => t.category).filter(Boolean)));

  const filteredData = txs.filter(t => {
    const matchesType = filters.type === 'All' || t.type === filters.type;
    const matchesCategory = filters.category === 'All' || t.category === filters.category;
    
    // Date filter logic
    if (filters.range === 'all') return matchesType && matchesCategory;
    
    const d = new Date(t.date);
    const now = new Date();
    
    if (filters.range === 'monthly') {
      return matchesType && matchesCategory && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (filters.range === 'quarterly') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const txQuarter = Math.floor(d.getMonth() / 3);
      return matchesType && matchesCategory && currentQuarter === txQuarter && d.getFullYear() === now.getFullYear();
    }
    if (filters.range === 'yearly') {
      return matchesType && matchesCategory && d.getFullYear() === now.getFullYear();
    }
    
    return matchesType && matchesCategory;
  });

  const summary = filteredData.reduce((acc, t) => {
    if (t.type === 'Income') acc.in += t.amount;
    else acc.out += t.amount;
    return acc;
  }, { in: 0, out: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-main">Financial Reports</h2>
          <p className="text-xs text-text-muted mt-1">Analyze income trends and expenditure patterns</p>
        </div>
        <ExportButton data={filteredData} filename={`financial_report_${filters.range}`} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Stat label="Total Volume" value={`MWK ${summary.in.toLocaleString()}`} icon={ArrowUpRight} color="bg-green-500" />
        <Stat label="Total Expenditure" value={`MWK ${summary.out.toLocaleString()}`} icon={ArrowDownRight} color="bg-red-500" />
        <Stat label="Report Balance" value={`MWK ${(summary.in - summary.out).toLocaleString()}`} icon={DollarSign} color="bg-primary" />
      </div>

      <Card title="Report Filters">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">Date Range</label>
            <select 
              className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm outline-none"
              value={filters.range}
              onChange={e => setFilters({...filters, range: e.target.value})}
            >
              <option value="all">All Time</option>
              <option value="monthly">Current Month</option>
              <option value="quarterly">Current Quarter</option>
              <option value="yearly">Current Year</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">Transaction Type</label>
            <select 
              className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm outline-none"
              value={filters.type}
              onChange={e => setFilters({...filters, type: e.target.value})}
            >
              <option value="All">All Types</option>
              <option value="Income">Income Only</option>
              <option value="Expense">Expense Only</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">Category</label>
            <select 
              className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm outline-none"
              value={filters.category}
              onChange={e => setFilters({...filters, category: e.target.value})}
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Detailed Log">
        <div className="space-y-2">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : filteredData.length === 0 ? (
            <p className="text-center py-10 text-text-muted italic">No transactions match the selected criteria.</p>
          ) : filteredData.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-slate-50 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", t.type === 'Income' ? "bg-green-500" : "bg-red-500")}></div>
                <div>
                  <p className="text-sm font-semibold text-text-main">{t.description}</p>
                  <p className="text-[10px] text-text-muted">{new Date(t.date).toLocaleDateString()} • {t.category || 'Uncategorized'}</p>
                </div>
              </div>
              <p className={cn("text-sm font-bold", t.type === 'Income' ? "text-green-600" : "text-red-600")}>
                {t.type === 'Income' ? '+' : '-'} {t.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function MeetingsView() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    date: new Date().toISOString().split('T')[0],
  });
  const { profile } = useAuth();
  const isAdmin = ['Super Admin', 'Admin', 'Chairperson', 'Secretary', 'Vice Secretary'].includes(profile?.role || '');

  useEffect(() => {
    return onSnapshot(query(collection(db, 'meetings'), orderBy('date', 'desc')), (s) => {
      setMeetings(s.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
      setLoading(false);
    }, (err) => {
      console.debug("Meetings listener suppressed:", err.message);
      setLoading(false);
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.title || !newMeeting.minutes || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'meetings'), {
        ...newMeeting,
        recordedBy: profile?.displayName || 'System',
        createdAt: serverTimestamp()
      });
      setNewMeeting({ date: new Date().toISOString().split('T')[0] });
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete these minutes?")) return;
    await deleteDoc(doc(db, 'meetings', id));
  };

  const handleBulkImport = async (data: any[]) => {
    try {
      for (const item of data) {
        if (item.title && item.minutes) {
          await addDoc(collection(db, 'meetings'), { 
            ...item, 
            createdAt: serverTimestamp() 
          });
        }
      }
      alert(`Imported ${data.length} minutes.`);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-main">Meeting Minutes</h2>
          <p className="text-xs text-text-muted mt-1">Record and archive official organizational proceedings</p>
        </div>
        <div className="flex gap-2">
          <ImportButton onImport={handleBulkImport} />
          <ExportButton data={meetings} filename="meeting_minutes" />
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-primary-dark transition-all"
            >
              <Plus className="w-5 h-5" />
              {isAdding ? 'Cancel' : 'Record Minutes'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card title="New Minutes Entry">
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Meeting Title</label>
                    <input required className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newMeeting.title || ''} onChange={e => setNewMeeting({...newMeeting, title: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Date</label>
                    <input required type="date" className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newMeeting.date || ''} onChange={e => setNewMeeting({...newMeeting, date: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Attendees (Comma separated)</label>
                  <input className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newMeeting.attendees || ''} onChange={e => setNewMeeting({...newMeeting, attendees: e.target.value})} placeholder="e.g. John Doe, Jane Smith..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Minutes & Deliberations</label>
                  <textarea required rows={6} className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2 text-sm" value={newMeeting.minutes || ''} onChange={e => setNewMeeting({...newMeeting, minutes: e.target.value})} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-primary-dark transition-all">
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Archive Minutes'}
                </button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : meetings.length === 0 ? (
          <p className="text-center py-20 text-text-muted italic bg-white rounded-3xl border border-dashed border-border">No meeting records found.</p>
        ) : meetings.map(m => (
          <Card key={m.id} className="group hover:border-primary/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-lg text-text-main flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {m.title}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-text-muted uppercase bg-slate-100 px-2 py-0.5 rounded">
                    <Calendar className="w-3 h-3" />
                    {new Date(m.date).toLocaleDateString()}
                  </span>
                  <span className="text-[11px] text-text-muted italic">By {m.recordedBy}</span>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(m.id)} className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-4">
              {m.attendees && (
                <div className="bg-slate-50 p-3 rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold text-text-muted uppercase mb-1 tracking-widest">Present</p>
                  <p className="text-sm text-text-main">{m.attendees}</p>
                </div>
              )}
              <div className="prose prose-sm max-w-none text-text-main">
                <p className="whitespace-pre-wrap">{m.minutes}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
