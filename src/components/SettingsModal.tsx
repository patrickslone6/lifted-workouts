import React, { useState } from 'react';
import { PhysicalLimitation, SpecificInjury, UserProfile } from '../types';
import {
  Settings,
  X,
  Dumbbell,
  ShieldAlert,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  HeartPulse
} from 'lucide-react';

interface Props {
  user: UserProfile;
  onSave: (updated: UserProfile) => void;
  onResetData: () => void;
  onClose: () => void;
}

const ALL_EQUIPMENT_OPTIONS = [
  { id: 'barbell', name: 'Barbell & Plates' },
  { id: 'dumbbell', name: 'Dumbbells' },
  { id: 'cable_machine', name: 'Cable Machine' },
  { id: 'bench', name: 'Flat / Incline Bench' },
  { id: 'squat_rack', name: 'Squat Rack' },
  { id: 'pull_up_bar', name: 'Pull-up Bar' },
  { id: 'kettlebell', name: 'Kettlebells' },
  { id: 'resistance_bands', name: 'Resistance Bands' }
];

export const SettingsModal: React.FC<Props> = ({
  user,
  onSave,
  onResetData,
  onClose
}) => {
  const [profile, setProfile] = useState<UserProfile>(user);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New specific injury form state
  const [showAddInjury, setShowAddInjury] = useState(false);
  const [injuryName, setInjuryName] = useState('');
  const [injuryDesc, setInjuryDesc] = useState('');
  const [injuryMovements, setInjuryMovements] = useState('');
  const [injurySeverity, setInjurySeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');

  // Equipment toggle
  const toggleEquipment = (eqId: string) => {
    setProfile((prev) => {
      const exists = prev.availableEquipment.includes(eqId);
      const nextEquip = exists
        ? prev.availableEquipment.filter((x) => x !== eqId)
        : [...prev.availableEquipment, eqId];
      return { ...prev, availableEquipment: nextEquip };
    });
  };

  const handleAddSpecificInjury = () => {
    if (!injuryName.trim()) return;

    const newInj: SpecificInjury = {
      id: `inj-${Date.now()}`,
      name: injuryName.trim(),
      description: injuryDesc.trim() || 'User reported athletic sensitivity',
      aggravatingMovements: injuryMovements.trim() || 'Heavy loaded ranges',
      severity: injurySeverity,
      todayStatus: 'mild_stiffness'
    };

    setProfile((prev) => ({
      ...prev,
      specificInjuries: [...(prev.specificInjuries || []), newInj]
    }));

    setInjuryName('');
    setInjuryDesc('');
    setInjuryMovements('');
    setShowAddInjury(false);
  };

  const handleRemoveSpecificInjury = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      specificInjuries: (prev.specificInjuries || []).filter((i) => i.id !== id)
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh] text-left">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Profile, Injuries &amp; Equipment</h2>
              <p className="text-xs text-zinc-400">Configure your sport, specific typed injuries, and gear</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Sport &amp; Position
              </label>
              <input
                type="text"
                value={profile.sport}
                onChange={(e) => setProfile({ ...profile, sport: e.target.value })}
                placeholder="e.g. Soccer - Midfielder"
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* SPECIFIC INJURY INPUT (User Prompt Feature) */}
          <div className="space-y-3 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Specific Typed Injuries &amp; Limitations</h3>
                  <p className="text-xs text-zinc-400">
                    Type your exact injury, triggers, and pain points. The AI strictly adapts around them.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInjury(!showAddInjury)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900/50 text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Injury
              </button>
            </div>

            {/* List of current injuries */}
            {(profile.specificInjuries || []).length > 0 ? (
              <div className="space-y-2 pt-1">
                {profile.specificInjuries!.map((inj) => (
                  <div
                    key={inj.id}
                    className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-300">{inj.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300">
                          {inj.severity}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1">{inj.description}</p>
                      {inj.aggravatingMovements && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Triggers: <span className="text-zinc-300">{inj.aggravatingMovements}</span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecificInjury(inj.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                      title="Remove this injury"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No specific injuries logged. You are currently clear for full training.</p>
            )}

            {/* Add New Injury Form Drawer */}
            {showAddInjury && (
              <div className="p-3.5 bg-zinc-900 rounded-xl border border-rose-900/60 space-y-3 mt-2">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                  Add Specific Injury
                </span>
                <div>
                  <label className="text-xs text-zinc-300 font-medium block mb-1">
                    Specific Injury Name
                  </label>
                  <input
                    type="text"
                    value={injuryName}
                    onChange={(e) => setInjuryName(e.target.value)}
                    placeholder="e.g. Left Patellar Tendonitis, Right AC Joint Strain"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-medium block mb-1">
                    Details &amp; What Makes It Worse
                  </label>
                  <input
                    type="text"
                    value={injuryDesc}
                    onChange={(e) => setInjuryDesc(e.target.value)}
                    placeholder="e.g. Sharp pain when squatting below 90 deg or landing from jump"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-300 font-medium block mb-1">
                      Aggravating Movements
                    </label>
                    <input
                      type="text"
                      value={injuryMovements}
                      onChange={(e) => setInjuryMovements(e.target.value)}
                      placeholder="e.g. Deep flexion, impact, pressing"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300 font-medium block mb-1">
                      Severity
                    </label>
                    <select
                      value={injurySeverity}
                      onChange={(e) => setInjurySeverity(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="mild">Mild (Stiffness / Discomfort)</option>
                      <option value="moderate">Moderate (Pain with heavy loads)</option>
                      <option value="severe">Severe (Acute / Sharp pain)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddInjury(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSpecificInjury}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition"
                  >
                    Save Injury
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Equipment Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" /> Available Equipment
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_EQUIPMENT_OPTIONS.map((eq) => {
                const isSelected = profile.availableEquipment.includes(eq.id);
                return (
                  <button
                    type="button"
                    key={eq.id}
                    onClick={() => toggleEquipment(eq.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition text-left flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span>{eq.name}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration & Units */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Weight Unit
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['lb', 'kg'] as const).map((u) => (
                  <button
                    type="button"
                    key={u}
                    onClick={() => setProfile({ ...profile, weightUnit: u })}
                    className={`py-2 rounded-xl border text-xs font-bold transition uppercase ${
                      profile.weightUnit === u
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Default Duration
              </label>
              <select
                value={profile.preferredWorkoutDuration}
                onChange={(e) =>
                  setProfile({ ...profile, preferredWorkoutDuration: Number(e.target.value) })
                }
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={20}>20 minutes</option>
                <option value={35}>35 minutes (Standard)</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>

          {/* Footer Save & Reset */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onResetData}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/30 hover:text-red-300 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Local Data
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-950"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile &amp; Regenerate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
