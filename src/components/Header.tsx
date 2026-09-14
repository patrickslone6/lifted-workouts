import React from 'react';
import { DailyReadiness, ScheduledEvent, UserAccount, UserProfile } from '../types';
import { Dumbbell, Calendar, History, TrendingUp, MessageSquare, Settings, Sliders, AlertCircle, UserCheck } from 'lucide-react';

export type NavTab = 'today' | 'calendar' | 'history' | 'progress' | 'coach';

interface Props {
  user: UserProfile;
  currentAccount: UserAccount | null;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  readiness: DailyReadiness;
  scheduledEvents: ScheduledEvent[];
  onOpenCheckIn: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenCustomWorkout?: () => void;
}

export const Header: React.FC<Props> = ({ user, currentAccount, activeTab, onTabChange, readiness, scheduledEvents, onOpenCheckIn, onOpenSettings, onOpenAuth, onOpenCustomWorkout }) => {
  const hasPracticeToday = readiness.practiceLaterToday || readiness.practiceEarlierToday;
  const hasGameSoon = scheduledEvents.some((e) => {
    if (e.type !== 'game' && e.type !== 'tournament') return false;
    const diff = (new Date(e.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 lifted-header">
      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        <div className="lifted-header-main">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-950 shrink-0">
              <Dumbbell className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tighter text-white">LIFTED</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs text-zinc-400 font-medium truncate max-w-[110px]">{user.sport}</span>
              </div>
            </div>
          </div>

          <div className="lifted-header-actions">
            {onOpenCustomWorkout && (
              <button onClick={onOpenCustomWorkout} className="lifted-header-action lifted-create-action px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950 shrink-0">
                <Dumbbell className="w-3.5 h-3.5" /><span className="hidden sm:inline">Create Workout</span><span className="sm:hidden">Create</span>
              </button>
            )}
            {hasPracticeToday && <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25"><AlertCircle className="w-3 h-3" /> Practice Later</div>}
            {hasGameSoon && <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">Game Soon</div>}
            <button onClick={onOpenAuth} className={`lifted-header-icon px-2.5 py-1.5 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 ${currentAccount ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title={currentAccount ? `Synced: ${currentAccount.identifier}` : 'Sync Account'}>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /><span className="hidden sm:inline">{currentAccount ? 'Synced' : 'Sync'}</span>
            </button>
            <button onClick={onOpenCheckIn} className="lifted-header-icon p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition" title="Daily Readiness Check-In"><Sliders className="w-4 h-4 text-emerald-400" /></button>
            <button onClick={onOpenSettings} className="lifted-header-icon p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition" title="Settings"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-zinc-900 scrollbar-none lifted-tab-nav">
          {[
            { id: 'today' as NavTab, label: 'Today', icon: Dumbbell },
            { id: 'calendar' as NavTab, label: 'Calendar & Games', icon: Calendar },
            { id: 'history' as NavTab, label: 'History', icon: History },
            { id: 'progress' as NavTab, label: 'Progress & PRs', icon: TrendingUp },
            { id: 'coach' as NavTab, label: 'Coach AI', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${isActive ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'}`}><Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : ''}`} />{tab.label}</button>;
          })}
        </nav>
      </div>
    </header>
  );
};
