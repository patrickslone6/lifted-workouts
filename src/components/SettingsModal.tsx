import React, { useState } from 'react';
import { PhysicalLimitation, SpecificInjury, UserProfile } from '../types';
import { Settings, X, Dumbbell, Save, RotateCcw, CheckCircle, Plus, Trash2, HeartPulse, Database, MessageSquare, GraduationCap, Activity } from 'lucide-react';
import { storageService } from '../services/storage';
import { apiFetch } from '../services/api';

interface Props { user: UserProfile; onSave: (updated: UserProfile) => void; onResetData: () => void; onClose: () => void; }

const ALL_EQUIPMENT_OPTIONS = [
  { id: 'barbell', name: 'Barbell & Plates' }, { id: 'dumbbell', name: 'Dumbbells' }, { id: 'cable_machine', name: 'Cable Machine' }, { id: 'bench', name: 'Flat / Incline Bench' },
  { id: 'squat_rack', name: 'Squat Rack' }, { id: 'pull_up_bar', name: 'Pull-up Bar' }, { id: 'kettlebell', name: 'Kettlebells' }, { id: 'resistance_bands', name: 'Resistance Bands' }
];

export const SettingsModal: React.FC<Props> = ({ user, onSave, onResetData, onClose }) => {
  const [profile, setProfile] = useState<UserProfile>(user);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showAddInjury, setShowAddInjury] = useState(false);
  const [injuryName, setInjuryName] = useState('');
  const [injuryDesc, setInjuryDesc] = useState('');
  const [injuryMovements, setInjuryMovements] = useState('');
  const [injurySeverity, setInjurySeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [dataMessage, setDataMessage] = useState('');

  const toggleEquipment = (eqId: string) => setProfile((prev) => {
    const exists = prev.availableEquipment.includes(eqId);
    return { ...prev, availableEquipment: exists ? prev.availableEquipment.filter((x) => x !== eqId) : [...prev.availableEquipment, eqId] };
  });

  const handleAddSpecificInjury = () => {
    if (!injuryName.trim()) return;
    const newInj: SpecificInjury = { id: `inj-${Date.now()}`, name: injuryName.trim(), description: injuryDesc.trim() || 'User reported athletic sensitivity', aggravatingMovements: injuryMovements.trim() || 'Heavy loaded ranges', severity: injurySeverity, todayStatus: 'mild_stiffness' };
    setProfile((prev) => ({ ...prev, specificInjuries: [...(prev.specificInjuries || []), newInj] }));
    setInjuryName(''); setInjuryDesc(''); setInjuryMovements(''); setShowAddInjury(false);
  };

  const handleRemoveSpecificInjury = (id: string) => setProfile((prev) => ({ ...prev, specificInjuries: (prev.specificInjuries || []).filter((i) => i.id !== id) }));
  const handleSave = (e: React.FormEvent) => { e.preventDefault(); onSave(profile); setSavedSuccess(true); setTimeout(() => { setSavedSuccess(false); onClose(); }, 800); };

  const deleteCategory = async (category: 'workouts' | 'school' | 'chat' | 'activities' | 'scheduled' | 'today') => {
    const account = storageService.getUserAccount();
    if (category === 'workouts') { storageService.clearAllWorkoutHistory(); setDataMessage('Workout history and saved performance calibration deleted.'); }
    if (category === 'school') { storageService.saveSchoolWorkoutLogs([]); setDataMessage('School lifting and practice logs deleted.'); }
    if (category === 'chat') { storageService.saveChatMessages([]); setDataMessage('Coach conversation history deleted.'); }
    if (category === 'activities') { localStorage.removeItem('lifted_activity_completion_v1'); localStorage.removeItem('ai_coach_morning_mobility_v1'); localStorage.removeItem('ai_coach_nightly_routine_v1'); localStorage.removeItem('lifted_plyometrics_routine_v1'); setDataMessage('Mobility, stretching and plyometric records deleted.'); }
    if (category === 'scheduled') { storageService.saveScheduledEvents([]); setDataMessage('Practice/game schedule deleted.'); }
    if (category === 'today') { localStorage.removeItem('ai_coach_today_workout_v1'); localStorage.removeItem('lifted_additional_workout_v1'); setDataMessage('Saved daily/in-progress workout plans deleted.'); }
    if (account?.identifier) {
      try { await apiFetch('/api/cloud-sync/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: account.identifier, data: { profile: storageService.getUserProfile(), readiness: storageService.getDailyReadiness(), events: storageService.getScheduledEvents(), history: storageService.getWorkoutHistory(), todayPlan: storageService.getTodayWorkout(), schoolLogs: storageService.getSchoolWorkoutLogs(), chatMessages: storageService.getChatMessages() } }) }); } catch {}
    }
    window.dispatchEvent(new Event('lifted-data-changed'));
  };

  const deleteAll = async () => {
    if (!window.confirm('Delete all stored Lifted training data on this device and from your cloud account? This cannot be undone.')) return;
    try { await apiFetch('/api/cloud-sync/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: storageService.getUserAccount()?.identifier }) }); } catch {}
    storageService.resetAll();
    setDataMessage('All stored Lifted data was deleted. Reloading…');
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh] text-left">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70"><div className="flex items-center gap-2.5"><div className="p-2 rounded-xl bg-zinc-800 text-zinc-300"><Settings className="w-5 h-5" /></div><div><h2 className="text-lg font-bold text-white">Profile, Injuries &amp; Data</h2><p className="text-xs text-zinc-400">Tune your athlete profile and control what Lifted remembers.</p></div></div><button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"><X className="w-5 h-5" /></button></div>

        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Name</label><input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500" required /></div><div><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Sport &amp; Position</label><input type="text" value={profile.sport} onChange={(e) => setProfile({ ...profile, sport: e.target.value })} placeholder="e.g. Soccer - Midfielder" className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500" /></div></div>

          <div className="space-y-3 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-rose-400" /><div><h3 className="text-sm font-bold text-white">Specific Injuries &amp; Limitations</h3><p className="text-xs text-zinc-400">Tell Lifted what feels limited so it can adapt safely.</p></div></div><button type="button" onClick={() => setShowAddInjury(!showAddInjury)} className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/50 text-xs font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Injury</button></div>
            {(profile.specificInjuries || []).map((inj) => <div key={inj.id} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-xs font-bold text-rose-300">{inj.name}</span><span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300">{inj.severity}</span></div><p className="text-xs text-zinc-300 mt-1">{inj.description}</p>{inj.aggravatingMovements && <p className="text-[11px] text-zinc-400 mt-0.5">Triggers: <span className="text-zinc-300">{inj.aggravatingMovements}</span></p>}</div><button type="button" onClick={() => handleRemoveSpecificInjury(inj.id)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button></div>)}
            {!profile.specificInjuries?.length && <p className="text-xs text-zinc-400 italic">No specific injuries logged.</p>}
            {showAddInjury && <div className="p-3.5 bg-zinc-900 rounded-xl border border-rose-900/60 space-y-3"><span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Add Specific Injury</span><input value={injuryName} onChange={(e) => setInjuryName(e.target.value)} placeholder="Injury name" className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white" /><input value={injuryDesc} onChange={(e) => setInjuryDesc(e.target.value)} placeholder="Details / what makes it worse" className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white" /><div className="grid grid-cols-2 gap-2"><input value={injuryMovements} onChange={(e) => setInjuryMovements(e.target.value)} placeholder="Aggravating movements" className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white" /><select value={injurySeverity} onChange={(e) => setInjurySeverity(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAddInjury(false)} className="px-3 py-1.5 text-xs text-zinc-400">Cancel</button><button type="button" onClick={handleAddSpecificInjury} className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-xs font-bold text-white">Save Injury</button></div></div>}
          </div>

          <div><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5"><Dumbbell className="w-4 h-4 text-emerald-400" /> Available Equipment</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{ALL_EQUIPMENT_OPTIONS.map((eq) => { const selected = profile.availableEquipment.includes(eq.id); return <button type="button" key={eq.id} onClick={() => toggleEquipment(eq.id)} className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center justify-between ${selected ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}><span>{eq.name}</span>{selected && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}</button>; })}</div></div>

          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Weight Unit</label><div className="grid grid-cols-2 gap-2">{(['lb', 'kg'] as const).map((u) => <button type="button" key={u} onClick={() => setProfile({ ...profile, weightUnit: u })} className={`py-2 rounded-xl border text-xs font-bold uppercase ${profile.weightUnit === u ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>{u}</button>)}</div></div><div><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Default Duration</label><select value={profile.preferredWorkoutDuration} onChange={(e) => setProfile({ ...profile, preferredWorkoutDuration: Number(e.target.value) })} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white"><option value={20}>20 minutes</option><option value={35}>35 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></div></div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3"><div className="flex items-center gap-2"><Database className="w-4 h-4 text-emerald-400" /><div><h3 className="text-sm font-bold text-white">Manage stored training data</h3><p className="text-xs text-zinc-400">Delete individual categories without wiping your profile.</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><button type="button" onClick={() => void deleteCategory('workouts')} className="data-delete"><Activity size={15} /> Workout history &amp; weights</button><button type="button" onClick={() => void deleteCategory('school')} className="data-delete"><GraduationCap size={15} /> School lifting &amp; practice</button><button type="button" onClick={() => void deleteCategory('activities')} className="data-delete"><HeartPulse size={15} /> Mobility, stretches &amp; plyos</button><button type="button" onClick={() => void deleteCategory('chat')} className="data-delete"><MessageSquare size={15} /> Coach chat history</button><button type="button" onClick={() => void deleteCategory('scheduled')} className="data-delete"><Activity size={15} /> Practice &amp; game schedule</button><button type="button" onClick={() => void deleteCategory('today')} className="data-delete"><Dumbbell size={15} /> Saved/in-progress lift</button></div>{dataMessage && <p className="text-xs text-emerald-300">{dataMessage} Refresh to update every screen.</p>}<button type="button" onClick={() => void deleteAll()} className="w-full py-2.5 rounded-xl border border-red-900/60 bg-red-950/20 text-red-300 font-bold text-xs flex items-center justify-center gap-2"><Trash2 size={15} /> Delete all stored Lifted data</button></div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3"><button type="button" onClick={onResetData} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Reset Local Data</button><button type="submit" className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2">{savedSuccess ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Profile</>}</button></div>
        </form>
      </div>
    </div>
  );
};
