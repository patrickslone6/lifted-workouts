import React, { useState } from 'react';
import { UserAccount } from '../types';
import { UserCheck, Mail, Phone, Lock, Cloud, X, CheckCircle, Sparkles, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  currentAccount: UserAccount | null;
  onLoginSuccess: (account: UserAccount, cloudData?: any) => void;
  onLogout: () => void;
  onClose: () => void;
}

const LOCAL_ACCOUNTS_KEY = 'lifted_local_accounts_v1';

function readLocalAccounts(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function saveLocalAccount(identifier: string, account: any) {
  const accounts = readLocalAccounts();
  accounts[identifier] = account;
  try { localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts)); } catch {}
}

async function readJsonSafely(res: Response): Promise<any> {
  const text = await res.text();
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch {
    throw new Error(`The app server returned a web page instead of an API response (HTTP ${res.status}).`);
  }
}

function createLocalAccount(identifier: string, identifierType: 'email' | 'phone', name: string, existing?: any): UserAccount {
  const now = new Date().toISOString();
  return {
    id: existing?.id || `local-${Date.now()}`,
    identifier,
    identifierType,
    name: name || existing?.name || identifier.split('@')[0] || 'Athlete',
    createdAt: existing?.createdAt || now,
    lastSyncedAt: existing?.lastSyncedAt || now
  };
}

export const AuthModal: React.FC<Props> = ({ currentAccount, onLoginSuccess, onLogout, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccessMsg(null);
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanIdentifier) { setError(`Please enter a valid ${identifierType}.`); return; }
    setLoading(true);
    let completed = false;
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: cleanIdentifier, identifierType, name: name.trim() || undefined, password: cleanPassword || undefined }) });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      if (!data.account) throw new Error('Authentication response was missing the account.');
      setSuccessMsg(mode === 'register' ? 'Account created and synced successfully!' : 'Logged in! Your athletic data is synchronized.');
      completed = true;
      setTimeout(() => { onLoginSuccess(data.account, data.userData); onClose(); }, 500);
    } catch (err: any) {
      const message = err?.message || '';
      const looksLikeStaticPages = message.includes('web page instead of an API response') || message.includes('Unexpected token') || message.includes('Failed to fetch') || message.includes('NetworkError');
      if (looksLikeStaticPages) {
        const accounts = readLocalAccounts();
        const existing = accounts[cleanIdentifier];
        if (mode === 'register' && existing) { setError('An account with this email or phone already exists on this device. Sign in instead.'); return; }
        if (mode === 'login' && !existing) { setError('No local account was found on this device. Create an account first.'); return; }
        if (mode === 'login' && existing?.password && existing.password !== cleanPassword) { setError('Incorrect password.'); return; }
        const account = createLocalAccount(cleanIdentifier, identifierType, name.trim(), existing);
        saveLocalAccount(cleanIdentifier, { ...account, password: existing?.password || cleanPassword || '', userData: existing?.userData || null });
        setSuccessMsg(mode === 'register' ? 'Account created on this device. Your workouts will still be saved locally.' : 'Logged in on this device.');
        completed = true;
        setTimeout(() => { onLoginSuccess(account, existing?.userData || null); onClose(); }, 500);
      } else setError(message || 'Network error occurred');
    } finally {
      if (!completed) setLoading(false); else setTimeout(() => setLoading(false), 550);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70"><div className="flex items-center gap-2.5"><div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Cloud className="w-5 h-5" /></div><div><h2 className="text-lg font-bold text-white tracking-tight">{currentAccount ? 'Cloud Sync Account' : 'Athletic Account & Sync'}</h2><p className="text-xs text-zinc-400">Save &amp; access your customized workouts across any device</p></div></div><button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"><X className="w-5 h-5" /></button></div>
        <div className="p-6 overflow-y-auto space-y-6">
          {currentAccount ? <div className="space-y-4"><div className="p-4 rounded-xl bg-zinc-950/70 border border-emerald-500/30 space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> Active Account</span><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">{currentAccount.id.startsWith('local-') ? 'This Device' : 'Online Sync'}</span></div><h3 className="text-base font-bold text-white">{currentAccount.name || 'Athlete'}</h3><p className="text-xs text-zinc-400 break-all font-mono">{currentAccount.identifier} ({currentAccount.identifierType})</p>{currentAccount.lastSyncedAt && <p className="text-[11px] text-zinc-400">Last active: {new Date(currentAccount.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>}</div><div className="p-3 bg-zinc-800/40 rounded-xl text-xs text-zinc-300 border border-zinc-700/50 flex items-start gap-2"><Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Your injuries, readiness, practice schedule, workout history, weights, mobility, plyometrics, and coach data are stored by Lifted. When the online API is available, they also sync to your account.</span></div><button type="button" onClick={onLogout} className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 hover:text-red-300 font-semibold text-xs transition border border-zinc-700 flex items-center justify-center gap-1.5"><LogOut className="w-4 h-4" /> Sign Out from this Device</button></div> : <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800"><button type="button" onClick={() => { setMode('login'); setError(null); }} className={`py-2 rounded-lg text-xs font-bold transition ${mode === 'login' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Sign In</button><button type="button" onClick={() => { setMode('register'); setError(null); }} className={`py-2 rounded-lg text-xs font-bold transition ${mode === 'register' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Create Account</button></div>
            <div><label className="text-xs font-semibold text-zinc-300 block mb-1.5">Sign in using</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setIdentifierType('email')} className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${identifierType === 'email' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'}`}><Mail className="w-3.5 h-3.5" /> Email Address</button><button type="button" onClick={() => setIdentifierType('phone')} className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${identifierType === 'phone' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'}`}><Phone className="w-3.5 h-3.5" /> Phone Number</button></div></div>
            {mode === 'register' && <div><label className="text-xs font-semibold text-zinc-300 block mb-1">Your Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition" /></div>}
            <div><label className="text-xs font-semibold text-zinc-300 block mb-1">{identifierType === 'email' ? 'Email Address' : 'Phone Number'}</label><div className="relative"><input type={identifierType === 'email' ? 'email' : 'tel'} value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={identifierType === 'email' ? 'athlete@example.com' : '+1 (555) 019-2834'} required className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition" /><div className="absolute left-3 top-3 text-zinc-400">{identifierType === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}</div></div></div>
            <div><div className="flex items-center justify-between mb-1"><label className="text-xs font-semibold text-zinc-300">Password / PIN (Optional)</label><span className="text-[10px] text-zinc-400">Optional</span></div><div className="relative"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank for passwordless sign-in" className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition" /><Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" /></div></div>
            {error && <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">{error}</div>}{successMsg && <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-1.5"><CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2">{loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Authenticating...</> : mode === 'register' ? <><Sparkles className="w-4 h-4" /> Create Account &amp; Sync Data</> : <><Cloud className="w-4 h-4" /> Log In &amp; Load All Data</>}</button>
          </form>}
        </div>
      </div>
    </div>
  );
};
