import React, { useState } from 'react';
import {
  DailyReadiness,
  MorningMobilityRoutine,
  NightlyStretchingRoutine,
  PlannedExercise,
  ScheduledEvent,
  UserProfile,
  WorkoutPlan,
  PlyometricsRoutine,
  SchoolWorkoutLog
} from '../types';
import {
  Sun,
  Moon,
  Dumbbell,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Play,
  RotateCw,
  Sliders,
  ChevronRight,
  Calendar,
  CheckCircle,
  Activity,
  HeartPulse,
  RefreshCw,
  Wind,
  Plus,
  TrendingUp,
  History,
  Award,
  Zap,
  Flame,
  GraduationCap,
  Scale
} from 'lucide-react';
import { ExerciseExplanationModal } from './ExerciseExplanationModal';
import { getExerciseProgression } from '../utils/exerciseProgression';

interface Props {
  user: UserProfile;
  readiness: DailyReadiness;
  todayWorkout: WorkoutPlan;
  mobility: MorningMobilityRoutine;
  nightlyRoutine?: NightlyStretchingRoutine;
  plyometricsRoutine?: PlyometricsRoutine;
  schoolLog?: SchoolWorkoutLog | null;
  dailyStreak: {
    currentStreak: number;
    bestStreak: number;
    activeDaysThisMonth: number;
    isActiveToday: boolean;
  };
  volumeTracking: {
    totalWeightVolume: number;
    totalWorkoutsCompleted: number;
    totalMinutesTrained: number;
    totalPlyometricJumps: number;
    thisWeekVolume: number;
    totalSetsCompleted: number;
  };
  scheduledEvents: ScheduledEvent[];
  workoutHistory?: WorkoutPlan[];
  isAiGenerating?: boolean;
  isRegeneratingMorning?: boolean;
  isRegeneratingNightly?: boolean;
  onRegenerateWorkout?: (focus?: string) => void;
  onRegenerateMorning?: () => void;
  onRegenerateNightly?: () => void;
  onStartWorkout: () => void;
  onStartMobility: () => void;
  onStartNightly?: () => void;
  onStartPlyometrics?: () => void;
  onOpenSchoolLog?: () => void;
  onOpenCheckIn: () => void;
  onSwapExercise: (exerciseId: string) => void;
  onQuickAdjustTime: (minutes: number) => void;
  onOpenCustomWorkout?: () => void;
}

export const TodayScreen: React.FC<Props> = ({
  user,
  readiness,
  todayWorkout,
  mobility,
  nightlyRoutine,
  plyometricsRoutine,
  schoolLog,
  dailyStreak,
  volumeTracking,
  scheduledEvents,
  workoutHistory = [],
  isAiGenerating = false,
  isRegeneratingMorning = false,
  isRegeneratingNightly = false,
  onRegenerateWorkout,
  onRegenerateMorning,
  onRegenerateNightly,
  onStartWorkout,
  onStartMobility,
  onStartNightly,
  onStartPlyometrics,
  onOpenSchoolLog,
  onOpenCheckIn,
  onSwapExercise,
  onQuickAdjustTime,
  onOpenCustomWorkout
}) => {
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<PlannedExercise | null>(null);
  const [customFocus, setCustomFocus] = useState('');
  const [showFocusInput, setShowFocusInput] = useState(false);

  const upcomingGame = (scheduledEvents || []).find((e) => {
    if (e.type !== 'game' && e.type !== 'tournament') return false;
    const diff = (new Date(e.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  });

  const specificInjuries = user?.specificInjuries || [];
  const exercises = todayWorkout?.exercises || [];

  const handleTriggerRegen = (focus?: string) => {
    if (onRegenerateWorkout) {
      onRegenerateWorkout(focus || customFocus);
    }
    setShowFocusInput(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-14 text-left">
      {/* AI Generating Indicator */}
      {isAiGenerating && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-emerald-500/40 shadow-xl flex items-center gap-3 animate-pulse">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Generating Calibrated Workout...
            </h4>
            <p className="text-[11px] text-zinc-400">
              Adapting exercises for {user.sport} and current readiness.
            </p>
          </div>
        </div>
      )}

      {/* ATHLETIC STATS BAR: STREAK & ACCUMULATED VOLUME */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Daily Streak */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${dailyStreak.currentStreak > 0 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Streak
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white">
                {dailyStreak.currentStreak} {dailyStreak.currentStreak === 1 ? 'Day' : 'Days'}
              </span>
              {dailyStreak.isActiveToday && (
                <span className="text-[10px] font-bold text-emerald-400">Active</span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500">Best: {dailyStreak.bestStreak}d</span>
          </div>
        </div>

        {/* Volume Lifted */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Volume Lifted
            </span>
            <span className="text-lg font-black text-white block">
              {volumeTracking.totalWeightVolume > 0
                ? `${Math.round(volumeTracking.totalWeightVolume).toLocaleString()} ${user.weightUnit}`
                : `0 ${user.weightUnit}`}
            </span>
            <span className="text-[10px] text-zinc-500">
              {volumeTracking.thisWeekVolume > 0
                ? `${Math.round(volumeTracking.thisWeekVolume).toLocaleString()} ${user.weightUnit} this wk`
                : 'Accumulated total'}
            </span>
          </div>
        </div>

        {/* Workouts & Minutes */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Workouts
            </span>
            <span className="text-lg font-black text-white block">
              {volumeTracking.totalWorkoutsCompleted} Done
            </span>
            <span className="text-[10px] text-zinc-500">
              {volumeTracking.totalMinutesTrained}m total time
            </span>
          </div>
        </div>

        {/* Plyo Jumps */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Plyo Jumps
            </span>
            <span className="text-lg font-black text-white block">
              {volumeTracking.totalPlyometricJumps}
            </span>
            <span className="text-[10px] text-zinc-500">
              Home elasticity reps
            </span>
          </div>
        </div>
      </div>

      {/* SCHOOL LIFT & PRACTICE LOG QUICK BANNER */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">School Weightlifting & Practice</h3>
              {schoolLog && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Logged Today
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {schoolLog ? (
                <>
                  {schoolLog.hadWeightliftingClass ? `Main: ${schoolLog.mainLiftExercise || 'Lifting'} (${schoolLog.bodyPartsSoreOrWorked?.join(', ') || 'fatigued'})` : 'No class'} • {schoolLog.hadPractice ? `Practice (${schoolLog.practiceIntensity})` : 'No practice'}
                </>
              ) : (
                'Had basketball weightlifting class or practice? Log it so AI adapts your lifts and plyos.'
              )}
            </p>
          </div>
        </div>
        {onOpenSchoolLog && (
          <button
            id="open-school-log-btn"
            onClick={onOpenSchoolLog}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold transition shrink-0 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            {schoolLog ? 'Update School Log' : 'Log School Lift / Practice'}
          </button>
        )}
      </div>

      {/* Top Welcome Bar & Action Row */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-zinc-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Readiness {readiness.readinessScore}/10
              </span>
              {todayWorkout.practiceLaterToday && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Practice Later
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {todayWorkout.workoutTitle}
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onOpenCustomWorkout && (
              <button
                id="today-custom-workout-btn"
                onClick={onOpenCustomWorkout}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Build Custom Workout
              </button>
            )}

            <button
              id="today-ai-focus-btn"
              onClick={() => setShowFocusInput(!showFocusInput)}
              className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              AI Focus
            </button>
          </div>
        </div>

        {/* Custom AI Focus Prompt (Accordion) */}
        {showFocusInput && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-2 mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="e.g. Deltoid & upper power, or 25-min express"
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleTriggerRegen()}
                disabled={isAiGenerating}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shrink-0"
              >
                Generate
              </button>
            </div>
          </div>
        )}

        {/* Compact Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-medium">
            Goal: <strong className="text-white">{todayWorkout.goal}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-medium">
            Time: <strong className="text-white">{todayWorkout.estimatedMinutes} min</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-medium capitalize">
            State: <strong className="text-emerald-400">{todayWorkout.readinessStatus}</strong>
          </span>
          {specificInjuries.length > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-rose-400" />
              Protected: {specificInjuries.map((i) => i.name).join(', ')}
            </span>
          )}
          {upcomingGame && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              Match in 3 Days
            </span>
          )}
        </div>
      </div>

      {/* TODAY'S WORKOUT EXERCISES */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Exercises ({exercises.length})
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {[20, 35, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => onQuickAdjustTime(mins)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  todayWorkout.estimatedMinutes === mins
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title={`Adjust to ${mins} min`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-3">
          {exercises.map((ex, idx) => {
            const progression = getExerciseProgression(ex.name, workoutHistory);

            return (
              <div
                key={ex.id || idx}
                className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/90 hover:border-zinc-700 transition space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{ex.name}</h3>
                        {ex.targetMuscles?.[0] && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400">
                            {ex.targetMuscles[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-300 font-medium">
                        <span className="text-emerald-400 font-semibold">
                          {ex.sets} sets × {ex.reps} reps
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span>
                          Target: <strong className="text-white">{ex.recommendedWeight} {ex.weightUnit}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                    <button
                      onClick={() => setSelectedExerciseForModal(ex)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition flex items-center gap-1"
                      title="Why this weight & exercise form"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Insights
                    </button>
                    <button
                      onClick={() => onSwapExercise(ex.exerciseId)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
                      title="Swap exercise"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* PAST PERFORMANCE & WEIGHT PROGRESSION STATUS ROW */}
                <div className="pt-2 border-t border-zinc-900 flex flex-wrap items-center gap-2 text-[11px]">
                  {progression.hasDoneBefore ? (
                    <>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium flex items-center gap-1">
                        <History className="w-3 h-3 text-emerald-400" />
                        Done {progression.timesCompleted}x • Past: <strong className="text-white ml-0.5">{progression.lastWeight} {ex.weightUnit}</strong>
                        {progression.maxWeight && progression.maxWeight > (progression.lastWeight || 0) && (
                          <span className="text-zinc-400 ml-1">(Best: {progression.maxWeight} {ex.weightUnit})</span>
                        )}
                      </span>

                      {progression.weightIncreased && progression.weightIncreaseDetail && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          {progression.weightIncreaseDetail}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium">
                      ★ First time performing this exercise
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start Workout Button */}
        <div className="pt-3">
          <button
            id="start-workout-btn"
            onClick={onStartWorkout}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm tracking-wide transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Workout ({todayWorkout.estimatedMinutes} min)
          </button>
        </div>
      </div>

      {/* DAILY ATHLETIC FLOWS: PLYOMETRICS, MORNING MOBILITY & NIGHTLY BEDTIME STRETCH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily At-Home Plyometrics */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Daily Plyometrics</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {plyometricsRoutine ? `${plyometricsRoutine.durationMinutes} min` : '12 min'}
            </span>
          </div>

          <p className="text-xs text-zinc-400 line-clamp-1">
            {plyometricsRoutine?.title || 'At-Home Vertical & Reactivity Plyos'}
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              {plyometricsRoutine?.completed ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                'Zero equipment home moves'
              )}
            </span>
            {onStartPlyometrics && (
              <button
                id="start-plyos-btn"
                onClick={onStartPlyometrics}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-current" />
                {plyometricsRoutine?.completed ? 'Re-run' : 'Start Plyos'}
              </button>
            )}
          </div>
        </div>

        {/* Morning Mobility */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Morning Mobility</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {mobility.durationMinutes} min
            </span>
          </div>

          <p className="text-xs text-zinc-400 line-clamp-1">
            {mobility.title}
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              {mobility.completed ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                `${mobility.exercises.length} bodyweight moves`
              )}
            </span>
            <button
              id="start-mobility-btn"
              onClick={onStartMobility}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-current" />
              {mobility.completed ? 'Re-run' : 'Start Flow'}
            </button>
          </div>
        </div>

        {/* Nightly Bedtime Flow */}
        {nightlyRoutine && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Bedtime Stretch</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {nightlyRoutine.durationMinutes} min
              </span>
            </div>

            <p className="text-xs text-zinc-400 line-clamp-1">
              {nightlyRoutine.title}
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">
                {nightlyRoutine.completed ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                  </span>
                ) : (
                  `${nightlyRoutine.exercises.length} restorative stretches`
                )}
              </span>
              {onStartNightly && (
                <button
                  id="start-nightly-btn"
                  onClick={onStartNightly}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  {nightlyRoutine.completed ? 'Re-run' : 'Start Flow'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Exercise Insights Modal */}
      {selectedExerciseForModal && (
        <ExerciseExplanationModal
          exercise={selectedExerciseForModal}
          user={user}
          hasPracticeLater={todayWorkout.practiceLaterToday}
          workoutHistory={workoutHistory}
          onClose={() => setSelectedExerciseForModal(null)}
        />
      )}
    </div>
  );
};
