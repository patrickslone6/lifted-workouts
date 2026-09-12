import React from 'react';
import { UserProfile, WorkoutPlan } from '../types';
import {
  Trophy,
  Flame,
  Activity,
  CheckCircle,
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  Dumbbell
} from 'lucide-react';

interface Props {
  user: UserProfile;
  history: WorkoutPlan[];
}

export const ProgressScreen: React.FC<Props> = ({ user, history }) => {
  const safeHistory = history || [];
  const totalWorkouts = safeHistory.length;
  const totalExercises = safeHistory.reduce((acc, w) => acc + (w.exercises?.length || 0), 0);

  // Calculate total volume lifted
  const totalVolume = safeHistory.reduce((acc, w) => {
    return (
      acc +
      (w.exercises || []).reduce((exAcc, ex) => {
        const load = ex.actualWeightUsed ?? ex.recommendedWeight ?? 0;
        return exAcc + load * (ex.reps || 0) * (ex.sets || 0);
      }, 0)
    );
  }, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 text-left">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
            Performance &amp; Adaptation Dashboard
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Training Progress
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
            Tracking consistency, mechanical workload, progressive overload, and athletic durability for {user.sport || 'general fitness'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-center px-4">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
              Current Streak
            </span>
            <span className="text-xl font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
              <Flame className="w-4 h-4 fill-current" /> 5 Days
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Workouts Logged</span>
            <Dumbbell className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalWorkouts}</div>
          <span className="text-[11px] text-emerald-400 font-medium">Consistent cadence</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Total Sets &amp; Reps</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalExercises} Exercises</div>
          <span className="text-[11px] text-cyan-400 font-medium">Safe volume progression</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Mobility Sessions</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">7 Done</div>
          <span className="text-[11px] text-amber-300 font-medium">Joint health priority</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">Volume Accumulated</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {totalVolume.toLocaleString()} <span className="text-xs font-normal text-zinc-400">{user.weightUnit}</span>
          </div>
          <span className="text-[11px] text-purple-400 font-medium">Hypertrophic stimulus</span>
        </div>
      </div>

      {/* Personal Records & Load Benchmarks */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Working Load &amp; Personal Bests
            </h3>
            <span className="text-xs text-zinc-400">
              Recorded under strict form and safe athletic training conditions
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              name: 'Dumbbell Goblet Squat',
              best: '25 lb × 10 reps',
              category: 'Quad & Glute Hypertrophy',
              note: 'Progressive overload steady'
            },
            {
              name: 'Dumbbell Romanian Deadlift (RDL)',
              best: '25 lb × 10 reps',
              category: 'Hamstring Deceleration Strength',
              note: 'Prevents sprint strains'
            },
            {
              name: 'Dumbbell Single-Arm Row',
              best: '25 lb × 10 reps',
              category: 'Lat & Scapular Stability',
              note: 'Protects throwing/tackling'
            }
          ].map((pr, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1"
            >
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                {pr.category}
              </span>
              <h4 className="text-sm font-bold text-white">{pr.name}</h4>
              <div className="text-lg font-extrabold text-amber-300 pt-1">{pr.best}</div>
              <p className="text-[11px] text-zinc-400">{pr.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sport Adaptation Distribution */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Sport Adaptations ({user.sport || 'Athlete'})
          </h3>
          <span className="text-xs text-zinc-400">Balancing Workload vs Recovery</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
              <span>Unilateral Leg Strength &amp; Joint Durability</span>
              <span className="font-bold text-emerald-400">85% Target Met</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="w-[85%] h-full bg-emerald-500 rounded-full" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
              <span>Upper Body &amp; Scapular Deceleration Strength</span>
              <span className="font-bold text-cyan-400">90% Target Met</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="w-[90%] h-full bg-cyan-500 rounded-full" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
              <span>Core Anti-Rotation &amp; Lumbar Protection</span>
              <span className="font-bold text-purple-400">80% Target Met</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="w-[80%] h-full bg-purple-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
