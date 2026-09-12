import React, { useState } from 'react';
import { DailyReadiness, SpecificInjury, UserProfile } from '../types';
import {
  Sparkles,
  X,
  Battery,
  Flame,
  Clock,
  AlertCircle,
  ShieldCheck,
  HeartPulse
} from 'lucide-react';

interface Props {
  user: UserProfile;
  initialReadiness: DailyReadiness;
  onSave: (readiness: DailyReadiness) => void;
  onClose: () => void;
}

export const DailyCheckInModal: React.FC<Props> = ({
  user,
  initialReadiness,
  onSave,
  onClose
}) => {
  const [energy, setEnergy] = useState<DailyReadiness['energyLevel']>(initialReadiness.energyLevel);
  const [soreness, setSoreness] = useState<DailyReadiness['sorenessLevel']>(initialReadiness.sorenessLevel);
  const [practiceLater, setPracticeLater] = useState(initialReadiness.practiceLaterToday);
  const [practiceEarlier, setPracticeEarlier] = useState(initialReadiness.practiceEarlierToday);
  const [practiceIntensity, setPracticeIntensity] = useState<'light' | 'moderate' | 'hard' | 'extreme'>(
    initialReadiness.practiceIntensity || 'moderate'
  );
  const [practiceDuration, setPracticeDuration] = useState(initialReadiness.practiceDurationMinutes || 90);
  const [availableTime, setAvailableTime] = useState(initialReadiness.availableMinutes || 35);

  // Specific injury feelings map
  const [injuryStatus, setInjuryStatus] = useState<Record<string, 'pain_free' | 'mild_stiffness' | 'moderate_ache' | 'severe_flare'>>(() => {
    const map: Record<string, any> = { ...(initialReadiness.injuryStatus || {}) };
    (user.specificInjuries || []).forEach((inj) => {
      if (!map[inj.id]) {
        map[inj.id] = inj.todayStatus || 'mild_stiffness';
      }
    });
    return map;
  });

  const [newPainDescription, setNewPainDescription] = useState(initialReadiness.newPainDescription || '');

  const specificInjuries = user.specificInjuries || [];

  const handleUpdateInjuryFeeling = (
    injId: string,
    status: 'pain_free' | 'mild_stiffness' | 'moderate_ache' | 'severe_flare'
  ) => {
    setInjuryStatus((prev) => ({
      ...prev,
      [injId]: status
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Compute simple readiness score (1-10)
    let score = 8;
    if (energy === 'great') score += 2;
    if (energy === 'okay') score -= 1;
    if (energy === 'tired') score -= 3;
    if (energy === 'very_tired') score -= 4;

    if (soreness === 'moderate') score -= 1;
    if (soreness === 'high') score -= 3;

    if (practiceLater && (practiceIntensity === 'hard' || practiceIntensity === 'extreme')) {
      score -= 2;
    }

    // Check injury status impact
    Object.values(injuryStatus).forEach((status) => {
      if (status === 'moderate_ache') score -= 1;
      if (status === 'severe_flare') score -= 3;
    });

    const finalScore = Math.max(2, Math.min(10, score));

    const updated: DailyReadiness = {
      date: new Date().toISOString().split('T')[0],
      energyLevel: energy,
      sorenessLevel: soreness,
      practiceEarlierToday: practiceEarlier,
      practiceLaterToday: practiceLater,
      practiceIntensity,
      practiceDurationMinutes: practiceDuration,
      availableMinutes: availableTime,
      readinessScore: finalScore,
      injuryStatus,
      newPainDescription: newPainDescription.trim() || undefined
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh] text-left">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
              Daily AI Calibration Check-In
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">Today's Readiness &amp; Injury Status</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Energy Level */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Battery className="w-4 h-4 text-emerald-400" /> 1. How is your energy level today?
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'Great', val: 'great' as const, emoji: '⚡' },
                { label: 'Good', val: 'good' as const, emoji: '🙂' },
                { label: 'Okay', val: 'okay' as const, emoji: '😐' },
                { label: 'Tired', val: 'tired' as const, emoji: '😴' },
                { label: 'Very Tired', val: 'very_tired' as const, emoji: '🥱' }
              ].map((b) => (
                <button
                  type="button"
                  key={b.val}
                  onClick={() => setEnergy(b.val)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                    energy === b.val
                      ? 'border-emerald-500 bg-emerald-950/40 text-white font-bold'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-lg">{b.emoji}</span>
                  <span className="text-[11px] leading-tight">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Muscular Soreness */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" /> 2. Overall muscular soreness?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'None', val: 'none' as const },
                { label: 'Mild', val: 'mild' as const },
                { label: 'Moderate', val: 'moderate' as const },
                { label: 'High', val: 'high' as const }
              ].map((s) => (
                <button
                  type="button"
                  key={s.val}
                  onClick={() => setSoreness(s.val)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition text-center ${
                    soreness === s.val
                      ? 'border-amber-500 bg-amber-950/40 text-amber-200'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* SPECIFIC INJURY CHECK-IN SECTION (User Prompt Feature) */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-sm font-bold text-white block">
                  Injury &amp; Pain Check-In
                </span>
                <span className="text-xs text-zinc-400">
                  How are your specific injuries feeling today? The AI strictly modifies today's exercises.
                </span>
              </div>
            </div>

            {specificInjuries.length > 0 ? (
              <div className="space-y-3 pt-2">
                {specificInjuries.map((inj) => {
                  const currentFeeling = injuryStatus[inj.id] || 'mild_stiffness';
                  return (
                    <div
                      key={inj.id}
                      className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-300">{inj.name}</span>
                        <span className="text-[10px] text-zinc-400">Severity: {inj.severity}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 italic">"{inj.description}"</p>

                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {[
                          { val: 'pain_free' as const, label: 'Pain-Free', color: 'emerald' },
                          { val: 'mild_stiffness' as const, label: 'Stiff/Mild', color: 'amber' },
                          { val: 'moderate_ache' as const, label: 'Aching', color: 'orange' },
                          { val: 'severe_flare' as const, label: 'Acute Flare', color: 'rose' }
                        ].map((opt) => {
                          const isSelected = currentFeeling === opt.val;
                          return (
                            <button
                              type="button"
                              key={opt.val}
                              onClick={() => handleUpdateInjuryFeeling(inj.id, opt.val)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border text-center transition ${
                                isSelected
                                  ? opt.color === 'emerald'
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : opt.color === 'amber'
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                    : opt.color === 'orange'
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                                    : 'bg-rose-500/20 border-rose-500 text-rose-300'
                                  : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                No active chronic injuries on file. (You can type specific injuries in Settings).
              </p>
            )}

            {/* Any new pain today */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Any other pain or tweak to report today? (Optional)
              </label>
              <input
                type="text"
                value={newPainDescription}
                onChange={(e) => setNewPainDescription(e.target.value)}
                placeholder="e.g. slight right groin tightness during sprints yesterday"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Practice Later Today Toggle */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white block">
                  Do you have practice later today?
                </span>
                <span className="text-xs text-zinc-400">
                  The AI adjusts today's workout so it won't work you too hard before practice.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPracticeLater(!practiceLater)}
                className={`w-12 h-6 rounded-full transition relative flex items-center px-1 shrink-0 ${
                  practiceLater ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                    practiceLater ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {practiceLater && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Expected Practice Intensity:</span>
                  <div className="flex gap-1">
                    {(['light', 'moderate', 'hard'] as const).map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => setPracticeIntensity(lvl)}
                        className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition ${
                          practiceIntensity === lvl
                            ? 'bg-emerald-500 text-black font-bold'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Leg-dominant power exercises will be scaled to preserve your sprinting &amp; deceleration power for practice. Focus shifts to upper body tension, posture, and core.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Time Available Today */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" /> How much time do you have today?
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {[15, 25, 35, 45, 60, 75].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setAvailableTime(m)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition ${
                    availableTime === m
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Calibrate Today's Workout via AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
