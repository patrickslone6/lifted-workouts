import React from 'react';
import { SchoolWorkoutLog, UserProfile, WorkoutPlan } from '../types';
import { storageService } from '../services/storage';
import {
  Trophy,
  Flame,
  Activity,
  TrendingUp,
  Dumbbell,
  Zap,
  GraduationCap
} from 'lucide-react';

interface Props {
  user: UserProfile;
  history: WorkoutPlan[];
  dailyStreak?: {
    currentStreak: number;
    bestStreak: number;
    activeDaysThisMonth: number;
    lastActiveDate: string;
    isActiveToday: boolean;
  };
  volumeTracking?: {
    totalWeightVolume: number;
    totalWorkoutsCompleted: number;
    totalMinutesTrained: number;
    totalPlyometricJumps: number;
    totalMobilityCompleted: number;
    thisWeekVolume: number;
    totalSetsCompleted: number;
  };
  schoolLogs?: SchoolWorkoutLog[];
}

export const ProgressScreen: React.FC<Props> = ({ user, history, volumeTracking: propVolumeTracking, schoolLogs: propSchoolLogs }) => {
  // Ignore the old demo record from early builds. Progress must only reflect the athlete's data.
  const safeHistory = (history || []).filter((workout) => workout.id !== 'hist-1');
  const schoolLogs = propSchoolLogs || storageService.getSchoolWorkoutLogs();

  const activeDates = new Set<string>();
  safeHistory.forEach((workout) => {
    if (workout.status === 'completed' || workout.completedAt) activeDates.add(workout.date);
  });
  schoolLogs.forEach((log) => {
    if (log.hadWeightliftingClass || log.hadPractice) activeDates.add(log.date);
  });

  const todayKey = new Date().toISOString().split('T')[0];
  let cursor = new Date(`${todayKey}T12:00:00`);
  if (!activeDates.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  let currentStreak = 0;
  while (activeDates.has(cursor.toISOString().split('T')[0])) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedActive = Array.from(activeDates).sort();
  let bestStreak = 0;
  let run = 0;
  let previous: Date | null = null;
  sortedActive.forEach((date) => {
    const current = new Date(`${date}T12:00:00`);
    const gap = previous ? Math.round((current.getTime() - previous.getTime()) / 86400000) : null;
    run = gap === 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = current;
  });

  const dailyStreak = {
    currentStreak,
    bestStreak,
    activeDaysThisMonth: sortedActive.filter((date) => date.startsWith(todayKey.slice(0, 7))).length,
    lastActiveDate: sortedActive.at(-1) || '',
    isActiveToday: activeDates.has(todayKey)
  };

  let totalWeightVolume = 0;
  let totalSetsCompleted = 0;
  let totalMinutesTrained = 0;
  let totalWorkoutsCompleted = 0;
  let thisWeekVolume = 0;
  const weekCutoff = Date.now() - 7 * 86400000;

  safeHistory.forEach((workout) => {
    if (workout.status !== 'completed' && !workout.completedAt) return;
    totalWorkoutsCompleted++;
    totalMinutesTrained += workout.actualMinutes || workout.estimatedMinutes || 0;
    (workout.exercises || []).forEach((ex) => {
      const completedSets = (ex.completedSets || []).filter((set) => set.completed);
      if (completedSets.length) {
        completedSets.forEach((set) => {
          totalSetsCompleted++;
          const volume = (Number(set.weight) || 0) * (Number(set.reps) || 0);
          totalWeightVolume += volume;
          if (new Date(`${workout.date}T12:00:00`).getTime() >= weekCutoff) thisWeekVolume += volume;
        });
      } else if (ex.completed) {
        totalSetsCompleted += ex.sets;
        const volume = (ex.actualWeightUsed ?? ex.recommendedWeight ?? 0) * ex.sets * ex.reps;
        totalWeightVolume += volume;
        if (new Date(`${workout.date}T12:00:00`).getTime() >= weekCutoff) thisWeekVolume += volume;
      }
    });
  });

  const volumeTracking = {
    totalWeightVolume,
    totalWorkoutsCompleted,
    totalMinutesTrained,
    totalPlyometricJumps: propVolumeTracking?.totalPlyometricJumps || 0,
    totalMobilityCompleted: propVolumeTracking?.totalMobilityCompleted || 0,
    thisWeekVolume,
    totalSetsCompleted
  };

  const exerciseCounts: Record<string, { maxWeight: number; maxReps: number; count: number; lastDate: string }> = {};
  safeHistory.forEach((workout) => {
    (workout.exercises || []).forEach((ex) => {
      const completedSets = (ex.completedSets || []).filter((set) => set.completed);
      if (!completedSets.length && !ex.completed) return;
      const name = ex.name;
      const weight = completedSets.length ? Math.max(...completedSets.map((set) => Number(set.weight) || 0)) : (ex.actualWeightUsed ?? ex.recommendedWeight ?? 0);
      const reps = completedSets.length ? completedSets[completedSets.length - 1].reps : ex.reps;
      if (!exerciseCounts[name]) {
        exerciseCounts[name] = { maxWeight: weight, maxReps: reps, count: 1, lastDate: workout.date };
      } else {
        exerciseCounts[name].count++;
        if (workout.date > exerciseCounts[name].lastDate) exerciseCounts[name].lastDate = workout.date;
        if (weight > exerciseCounts[name].maxWeight) {
          exerciseCounts[name].maxWeight = weight;
          exerciseCounts[name].maxReps = reps;
        }
      }
    });
  });

  const exercisePRs = Object.entries(exerciseCounts)
    .map(([name, data]) => ({ name, weight: data.maxWeight, reps: data.maxReps, unit: user.weightUnit || 'lb', timesLogged: data.count, lastDate: data.lastDate }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const mix = { lower: 0, upper: 0, core: 0 };
  safeHistory.forEach((workout) => {
    (workout.exercises || []).forEach((ex) => {
      const completedSets = (ex.completedSets || []).filter((set) => set.completed).length || (ex.completed ? ex.sets : 0);
      if (!completedSets) return;
      const text = `${ex.name} ${(ex.targetMuscles || []).join(' ')}`.toLowerCase();
      if (/core|ab|oblique|pallof|deadbug|plank|trunk/.test(text)) mix.core += completedSets;
      else if (/quad|glute|hamstring|calf|leg|hip|adductor|knee|squat|lunge|deadlift|hinge/.test(text)) mix.lower += completedSets;
      else mix.upper += completedSets;
    });
  });
  const mixTotal = mix.lower + mix.upper + mix.core;
  const pct = (value: number) => (mixTotal ? Math.round((value / mixTotal) * 100) : 0);

  const schoolWeightliftingCount = schoolLogs.filter((l) => l.hadWeightliftingClass).length;
  const schoolPracticeCount = schoolLogs.filter((l) => l.hadPractice).length;

  return (
    <div id="progress-screen-container" className="space-y-6 max-w-4xl mx-auto pb-12 text-left">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Performance &amp; Adaptation Dashboard</span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">Training Progress</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">Every number on this page is derived from completed workouts and logged training days.</p>
        </div>
        <div className="p-3 bg-zinc-950/90 rounded-2xl border border-zinc-800 text-center px-5 shadow-inner">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Current Streak</span>
          <span className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1.5 mt-0.5"><Flame className="w-5 h-5 fill-amber-400" /> {dailyStreak.currentStreak} {dailyStreak.currentStreak === 1 ? 'Day' : 'Days'}</span>
          <span className="text-[10px] font-semibold text-zinc-400 block mt-0.5">Best: {dailyStreak.bestStreak}d • {dailyStreak.activeDaysThisMonth} active this month</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dailyStreak.isActiveToday ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-zinc-300">{dailyStreak.isActiveToday ? <strong className="text-emerald-400">Streak Active Today!</strong> : dailyStreak.currentStreak > 0 ? <strong className="text-amber-400">Streak intact from yesterday.</strong> : <strong className="text-zinc-400">Start a session today to begin your streak!</strong>}</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-medium text-zinc-400 shrink-0">{dailyStreak.activeDaysThisMonth} Active Days This Month</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg"><div className="flex items-center justify-between text-zinc-400 mb-2"><span className="text-xs font-semibold">Workouts Done</span><Dumbbell className="w-4 h-4 text-emerald-400" /></div><div className="text-2xl font-black text-white">{volumeTracking.totalWorkoutsCompleted}</div><span className="text-[11px] text-emerald-400 font-medium">{volumeTracking.totalMinutesTrained} mins trained</span></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg"><div className="flex items-center justify-between text-zinc-400 mb-2"><span className="text-xs font-semibold">Total Sets</span><Activity className="w-4 h-4 text-cyan-400" /></div><div className="text-2xl font-black text-white">{volumeTracking.totalSetsCompleted}</div><span className="text-[11px] text-cyan-400 font-medium">Completed sets only</span></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg"><div className="flex items-center justify-between text-zinc-400 mb-2"><span className="text-xs font-semibold">Plyo Jumps</span><Zap className="w-4 h-4 text-amber-400" /></div><div className="text-2xl font-black text-white">{volumeTracking.totalPlyometricJumps}</div><span className="text-[11px] text-amber-300 font-medium">Recorded routine total</span></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg"><div className="flex items-center justify-between text-zinc-400 mb-2"><span className="text-xs font-semibold">Volume Lifted</span><TrendingUp className="w-4 h-4 text-purple-400" /></div><div className="text-2xl font-black text-white">{volumeTracking.totalWeightVolume.toLocaleString()} <span className="text-xs font-normal text-zinc-400">{user.weightUnit}</span></div><span className="text-[11px] text-purple-400 font-medium">{thisWeekVolume > 0 ? `${Math.round(thisWeekVolume).toLocaleString()} ${user.weightUnit} this week` : 'No volume this week'}</span></div>
      </div>

      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-indigo-400" /><h3 className="text-sm font-bold text-white uppercase tracking-wider">School Weightlifting &amp; Practice Memory</h3></div><span className="text-xs font-bold text-indigo-300">{schoolLogs.length} Total Logs Stored</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800"><span className="text-[10px] uppercase font-bold text-zinc-400 block">Weight Classes</span><span className="text-xl font-black text-white block mt-0.5">{schoolWeightliftingCount}</span></div>
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800"><span className="text-[10px] uppercase font-bold text-zinc-400 block">Team Practices</span><span className="text-xl font-black text-white block mt-0.5">{schoolPracticeCount}</span></div>
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800"><span className="text-[10px] uppercase font-bold text-zinc-400 block">Mobility / Stretch Routines</span><span className="text-xl font-black text-white block mt-0.5">{volumeTracking.totalMobilityCompleted}</span></div>
        </div>
        {schoolLogs.length > 0 && <div className="pt-2 border-t border-zinc-800/80 space-y-1.5"><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Recent School Logs:</span><div className="space-y-1 max-h-36 overflow-y-auto pr-1">{schoolLogs.slice(0, 5).map((log) => <div key={log.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"><div><span className="font-bold text-white">{log.date}</span><span className="text-zinc-400 ml-2">{log.hadWeightliftingClass ? `Main lift: ${log.mainLiftExercise || 'Lifting'}` : 'No lift'}{log.hadPractice ? ` • Practice: ${log.practiceSport || 'Sport'}` : ''}</span></div>{log.bodyPartsSoreOrWorked?.length ? <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Sore: {log.bodyPartsSoreOrWorked.slice(0, 2).join(', ')}</span> : null}</div>)}</div></div>}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3"><div><h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Working Load &amp; Personal Bests</h3><span className="text-xs text-zinc-400">Only completed, logged sets are used.</span></div><span className="text-xs font-semibold text-emerald-400">{exercisePRs.length} Movements Tracked</span></div>
        {exercisePRs.length ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{exercisePRs.map((pr, i) => <div key={i} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5"><div className="flex items-center justify-between"><span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Done {pr.timesLogged}x</span><span className="text-[10px] text-zinc-500">Last: {pr.lastDate}</span></div><h4 className="text-sm font-bold text-white">{pr.name}</h4><div className="text-xl font-extrabold text-amber-300">{pr.weight} {pr.unit} × {pr.reps} reps</div><p className="text-[11px] text-zinc-400">Heaviest logged load for this movement.</p></div>)}</div> : <div className="p-5 rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 text-center"><Dumbbell className="w-6 h-6 text-zinc-600 mx-auto mb-2" /><p className="text-sm font-semibold text-zinc-300">No completed lifts yet</p><p className="text-xs text-zinc-500 mt-1">Finish a workout and real loads, reps, and PRs will appear here.</p></div>}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white uppercase tracking-wider">Training Mix</h3><span className="text-xs text-zinc-400">Based on completed sets</span></div>
        {mixTotal > 0 ? <div className="space-y-4">{[['Lower body', mix.lower, 'bg-emerald-500'], ['Upper body', mix.upper, 'bg-cyan-500'], ['Core / trunk', mix.core, 'bg-purple-500']].map(([label, value, tone]) => <div key={String(label)}><div className="flex items-center justify-between text-xs text-zinc-300 mb-1"><span>{String(label)}</span><span className="font-bold">{pct(Number(value))}% • {value} sets</span></div><div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full ${tone} rounded-full transition-all duration-500`} style={{ width: `${pct(Number(value))}%` }} /></div></div>)}</div> : <p className="text-xs text-zinc-500">Training distribution will populate after completed sets are logged.</p>}
      </div>
    </div>
  );
};