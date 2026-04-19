import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout, getUserProfile, createUserProfile, db } from '../lib/firebase';
import { onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { LogIn, Loader2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = 'johnnamwiyo22@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock Admin Login persistence
  useEffect(() => {
    const mockAdmin = localStorage.getItem('ryoms_mock_admin');
    if (mockAdmin) {
      const adminProfile: UserProfile = JSON.parse(mockAdmin);
      setProfile(adminProfile);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (localStorage.getItem('ryoms_mock_admin')) return;
      
      setUser(u);
      
      // Cleanup previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (u) {
        // First check if profile exists
        const pInitial = await getUserProfile(u.uid);
        if (!pInitial) {
          await createUserProfile(u);
        }

        // Setup real-time listener
        unsubProfile = onSnapshot(doc(db, 'users', u.uid), (snapshot) => {
          if (snapshot.exists()) {
            const p = { uid: snapshot.id, ...snapshot.data() } as UserProfile;
            
            // Auto-activate super admin if needed
            if (u.email === SUPER_ADMIN_EMAIL && p.status === 'Pending') {
               updateDoc(doc(db, 'users', u.uid), { status: 'Active', role: 'Super Admin' });
            }
            
            setProfile(p);
            setLoading(false);
          }
        }, (err) => {
          console.error("Profile listener error:", err);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signIn = async () => {
    try {
      localStorage.removeItem('ryoms_mock_admin');
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const credentialLogin = (username: string) => {
    const mockProfile: UserProfile = {
      uid: 'admin-265',
      email: 'admin@ryoms.org',
      displayName: 'System Admin',
      role: 'Super Admin',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('ryoms_mock_admin', JSON.stringify(mockProfile));
    setProfile(mockProfile);
    setLoading(false);
  };

  const signOutUser = async () => {
    try {
      localStorage.removeItem('ryoms_mock_admin');
      await logout();
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut: signOutUser }}>
      {loading ? (
        <div className="h-screen w-full flex items-center justify-center bg-body-bg">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (user || profile) ? (
        (profile?.status === 'Active' || profile?.email === SUPER_ADMIN_EMAIL) ? children : <PendingApprovalScreen profile={profile} signOut={signOutUser} />
      ) : (
        <LoginScreen onCredentialLogin={credentialLogin} />
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

function LoginScreen({ onCredentialLogin }: { onCredentialLogin: (u: string) => void }) {
  const { signIn } = useAuth();
  const [showCreds, setShowCreds] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleCredLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin265' && password === '123456') {
      onCredentialLogin(username);
    } else {
      setError('Invalid system credentials');
    }
  };
  
  return (
    <div className="h-screen w-full flex items-center justify-center bg-body-bg p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(37,99,235,0.1),transparent)] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl p-10 shadow-2xl border border-border text-center z-10"
      >
        <div className="mb-10">
          <div className="w-16 h-16 bg-primary rounded-xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <span className="text-white text-3xl font-black">R</span>
          </div>
          <h1 className="text-3xl font-bold text-text-main mb-2 tracking-tight">RYOMS</h1>
          <p className="text-text-muted text-sm px-4">Reliable Youth Organization Management System</p>
        </div>
        
        {!showCreds ? (
          <div className="space-y-4">
            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-3 bg-primary text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-primary-dark transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/10"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
            <button 
              onClick={() => setShowCreds(true)}
              className="text-[11px] font-bold text-text-muted uppercase tracking-widest hover:text-primary transition-colors"
            >
              Management Access Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleCredLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Username</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Password</label>
              <input 
                type="password" 
                className="w-full bg-slate-50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-accent text-[11px] font-semibold text-center">{error}</p>}
            <div className="pt-2 space-y-3">
              <button 
                type="submit"
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/10 hover:bg-primary-dark transition-all"
              >
                Login to System
              </button>
              <button 
                type="button"
                onClick={() => setShowCreds(false)}
                className="w-full text-[11px] font-bold text-text-muted uppercase tracking-widest hover:text-primary transition-colors py-2"
              >
                Back to SSO
              </button>
            </div>
          </form>
        )}
        
        <p className="mt-10 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold opacity-50">
          Restricted Access
        </p>
      </motion.div>
    </div>
  );
}

function PendingApprovalScreen({ profile, signOut }: { profile: UserProfile | null, signOut: () => void }) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-body-bg p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl p-12 shadow-2xl border border-border text-center"
      >
        <div className="w-16 h-16 bg-accent/10 rounded-full mx-auto flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-text-main mb-4">Approval Pending</h2>
        <p className="text-text-muted text-sm mb-8 leading-relaxed">
          Hello {profile?.displayName}, your account is currently pending administrative approval. 
          Please contact the HR department or a Super Admin to activate your access.
        </p>
        <button
          onClick={signOut}
          className="w-full py-3 px-6 rounded-xl font-semibold border border-border text-text-muted hover:bg-slate-50 transition-all font-sans"
        >
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
