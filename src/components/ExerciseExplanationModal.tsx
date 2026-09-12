import React, { useState } from 'react';
import { PlannedExercise, UserProfile, WorkoutPlan } from '../types';
import { ShieldCheck, Zap, Sparkles, Activity, CheckCircle2, X, RefreshCw, History, TrendingUp, Calendar } from 'lucide-react';
import { getExerciseProgression } from '../utils/exerciseProgression';

interface Props {
  exercise: PlannedExercise | null;
  user: UserProfile;
  hasPracticeLater: boolean;
  workoutHistory?: WorkoutPlan[];
  onClose: () => void;
}

export const ExerciseExplanationModal: React.FC<Props> = ({
  exercise,
  user,
  hasPracticeLater,
  workoutHistory = [],
  onClose
}) => {
  if (!exercise) return null;

  const [loadingAI, setLoadingAI] = useState(false);
  const [summary, setSummary] = useState(exercise.aiSummary);

  const progression = getExerciseProgression(exercise.name, workoutHistory);

  const fetchFreshAISummary = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/exercise-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseName: exercise.name,
          pattern: exercise.targetMuscles[0] || 'Strength',
          muscles: exercise.targetMuscles,
          weight: exercise.recommendedWeight,
          weightUnit: exercise.weightUnit,
          previousFeedback: exercise.previousPerformance?.difficulty,
          hasPracticeLater,
          experienceLevel: user.experienceLevel,
          sport: user.sport
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error('Error fetching live AI summary:', e);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Biomechanics & Hypertrophy Analysis
              </span>
              {hasPracticeLater && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Practice-Aware Calibration
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{exercise.name}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Prescribed Target: {exercise.sets} sets × {exercise.reps} reps @ {exercise.recommendedWeight} {exercise.weightUnit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: What It Is */}
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> What This Exercise Is
            </h3>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {summary?.whatItIs || `${exercise.name} is a high-yield functional exercise targeting the ${exercise.targetMuscles.join(', ')}.`}
            </p>
          </div>

          {/* Section 2: What It Exercises (Muscles Worked) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-800">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
                Primary Muscles Worked
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(summary?.whatItExercises?.primary || exercise.targetMuscles).map((m, i) => (
                  <span key={i} className="px-2.5 py-1 bg-emerald-950/40 text-emerald-300 border border-emerald-700/40 rounded-md text-xs font-medium">
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-800">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">
                Secondary & Stabilizers
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(summary?.whatItExercises?.secondary || ['Core', 'Joint Stabilizers']).map((m, i) => (
                  <span key={i} className="px-2.5 py-1 bg-cyan-950/40 text-cyan-300 border border-cyan-700/40 rounded-md text-xs font-medium">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Past Performance & Weight History Tracking */}
          <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" /> Past Performance & Progression
              </h3>
              {progression.hasDoneBefore ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Completed {progression.timesCompleted}x in Past
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                  First Time Doing This
                </span>
              )}
            </div>

            {progression.hasDoneBefore ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block text-[11px]">Last Weight</span>
                    <span className="text-sm font-bold text-white">
                      {progression.lastWeight} {exercise.weightUnit}
                    </span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block text-[11px]">Best PR Weight</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {progression.maxWeight} {exercise.weightUnit}
                    </span>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 col-span-2 sm:col-span-1">
                    <span className="text-zinc-400 block text-[11px]">Last Logged</span>
                    <span className="text-xs font-semibold text-zinc-300 truncate block">
                      {progression.formattedLastDate || 'Recently'}
                    </span>
                  </div>
                </div>

                {progression.weightIncreased && progression.weightIncreaseDetail && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{progression.weightIncreaseDetail}</span>
                  </div>
                )}

                {progression.allLogs.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                      Recent Session Log History:
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-xs">
                      {progression.allLogs.slice(-4).reverse().map((entry, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-zinc-900/90 text-zinc-300">
                          <span className="text-zinc-400">{entry.date}</span>
                          <span className="font-bold text-white">
                            {entry.weight} {exercise.weightUnit} × {entry.reps} reps ({entry.sets} sets)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 leading-relaxed">
                You haven&apos;t logged this exercise yet in your saved workouts. Today&apos;s recommended target is{' '}
                <strong className="text-emerald-400">{exercise.recommendedWeight} {exercise.weightUnit}</strong>. All weights and reps logged during today&apos;s workout will be automatically preserved for future comparisons.
              </p>
            )}
          </div>

          {/* Section 3: WHY WE ARE USING THIS WEIGHT (Hypertrophy & Injury Prevention) */}
          <div className="bg-gradient-to-br from-emerald-950/20 via-zinc-900 to-zinc-900 border border-emerald-800/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Why We Are Using {exercise.recommendedWeight} {exercise.weightUnit}
              </h3>
              <span className="text-xs text-zinc-400">Science & Biomechanics Rationale</span>
            </div>

            {/* Hypertrophy Gain Explanation */}
            <div className="bg-zinc-900/80 rounded-lg p-3.5 border border-zinc-800">
              <div className="flex items-center gap-2 mb-1.5 text-amber-300 font-semibold text-sm">
                <Zap className="w-4 h-4 text-amber-400" />
                Maximizing Hypertrophy Gains (Muscle Growth)
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {summary?.whyThisWeight?.hypertrophyMechanism ||
                  `At ${exercise.recommendedWeight} ${exercise.weightUnit}, you are operating within the optimal 8-12 repetition window (~2-3 Reps in Reserve). This stimulates mechanical tension on high-threshold motor units without creating excessive systemic damage that impairs recovery.`}
              </p>
            </div>

            {/* Injury Prevention Explanation */}
            <div className="bg-zinc-900/80 rounded-lg p-3.5 border border-zinc-800">
              <div className="flex items-center gap-2 mb-1.5 text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Injury Prevention & Joint Longevity
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {summary?.whyThisWeight?.injuryPreventionFocus ||
                  `This load is specifically calibrated to safeguard your tendon insertions and spinal mechanics. When fatigue accumulates, excessive weights cause form breakdown (e.g. knee valgus collapse or lumbar flexion). This weight keeps the tension squarely on the contractile muscle fibers rather than your passive joint capsules.`}
              </p>
            </div>

            {/* Progression & Practice Context */}
            <div className="flex items-start gap-2 pt-1 text-xs text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Adaptation Context:</strong> {summary?.whyThisWeight?.progressionContext || 'Calibrated based on your history and readiness.'}
                {hasPracticeLater && ' Load is adjusted down to avoid pre-fatiguing your legs before practice.'}
              </span>
            </div>
          </div>

          {/* Section 4: How To Do It (Step by step cues) */}
          <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
              How To Do It (Step-by-Step Form & Breathing)
            </h3>
            <ol className="space-y-2.5 text-sm text-zinc-300 list-decimal list-inside">
              {(summary?.howToDoIt || [
                'Set up with a stable stance and engage a full 360-degree core brace.',
                'Control the lowering phase (eccentric) for 2-3 seconds to stretch muscle fibers under tension.',
                'Exhale past the sticking point as you drive through the target musculature.'
              ]).map((step, idx) => (
                <li key={idx} className="leading-relaxed pl-1">
                  <span className="text-zinc-200">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <button
            onClick={fetchFreshAISummary}
            disabled={loadingAI}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAI ? 'animate-spin text-emerald-400' : ''}`} />
            {loadingAI ? 'Consulting Gemini AI...' : 'Refresh AI Analysis'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-md shadow-emerald-950"
          >
            Got It, Back to Workout
          </button>
        </div>
      </div>
    </div>
  );
};
