import React, { useState, useEffect } from 'react';
import { PlannedExercise, UserProfile, DifficultyRating, WorkoutPlan } from '../types';
import { ExerciseExplanationModal } from './ExerciseExplanationModal';
import { getExerciseProgression } from '../utils/exerciseProgression';
import {
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
  Flame,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';

interface Props {
  workout: WorkoutPlan;
  user: UserProfile;
  workoutHistory?: WorkoutPlan[];
  onFinishWorkout: (completedWorkout: WorkoutPlan) => void;
  onClose: () => void;
}

export const ActiveWorkoutModal: React.FC<Props> = ({
  workout,
  user,
  workoutHistory = [],
  onFinishWorkout,
  onClose
}) => {
  const [exercises, setExercises] = useState<PlannedExercise[]>(workout?.exercises || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  const currentEx = exercises[currentIdx];
  const currentProgression = currentEx
    ? getExerciseProgression(currentEx.name, workoutHistory)
    : null;

  // Rest Timer State
  const [timerSeconds, setTimerSeconds] = useState(currentEx ? currentEx.restSeconds : 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Handle Weight Adjustment
  const handleAdjustWeight = (delta: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[currentIdx] };
      const current = ex.actualWeightUsed ?? ex.recommendedWeight;
      ex.actualWeightUsed = Math.max(0, current + delta);
      copy[currentIdx] = ex;
      return copy;
    });
  };

  // Toggle Set Complete
  const handleToggleSet = (setNumber: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[currentIdx] };
      const sets = ex.completedSets ? [...ex.completedSets] : [];
      const existing = sets.find((s) => s.setNumber === setNumber);
      const curWeight = ex.actualWeightUsed ?? ex.recommendedWeight;

      if (existing) {
        existing.completed = !existing.completed;
      } else {
        sets.push({
          setNumber,
          weight: curWeight,
          reps: ex.reps,
          completed: true
        });
      }
      ex.completedSets = sets;

      // Auto-start rest timer when a set is completed
      if (!existing || existing.completed) {
        setTimerSeconds(ex.restSeconds);
        setTimerRunning(true);
      }

      // Check if all sets completed
      const allDone = sets.filter((s) => s.completed).length === ex.sets;
      if (allDone) {
        ex.completed = true;
      }

      copy[currentIdx] = ex;
      return copy;
    });
  };

  // Handle Exercise Feedback
  const handleSelectFeedback = (rating: DifficultyRating, pain: boolean = false) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[currentIdx] };
      ex.feedbackDifficulty = rating;
      ex.painReported = pain;
      ex.completed = true;
      copy[currentIdx] = ex;
      return copy;
    });

    // Move to next exercise or finish
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setTimerRunning(false);
      setTimerSeconds(exercises[currentIdx + 1]?.restSeconds || 60);
    } else {
      setWorkoutFinished(true);
    }
  };

  // Finalize Workout
  const handleComplete = () => {
    const totalActualVolume = exercises.reduce((acc, ex) => {
      const w = ex.actualWeightUsed ?? ex.recommendedWeight;
      const doneSets = (ex.completedSets || []).filter((s) => s.completed).length;
      return acc + (w * ex.reps * (doneSets || ex.sets));
    }, 0);

    const completed: WorkoutPlan = {
      ...workout,
      status: 'completed',
      exercises,
      completedAt: new Date().toISOString(),
      actualMinutes: workout.estimatedMinutes,
      userNotes: userNotes || `Completed ${exercises.length} exercises. Total volume: ${totalActualVolume} ${user.weightUnit}.`
    };

    onFinishWorkout(completed);
  };

  if (!currentEx) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Header Navigation */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {workout.workoutTitle}
              </span>
              {workout.practiceLaterToday && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Practice Later Today
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-400">
              Exercise {currentIdx + 1} of {exercises.length}
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {exercises.map((ex, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-6 bg-emerald-500'
                    : ex.completed
                    ? 'w-3 bg-emerald-700'
                    : 'w-3 bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!workoutFinished ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-6">
          {/* Active Exercise Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Current Exercise
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                  {currentEx.name}
                </h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentEx.targetMuscles.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Why Button */}
              <button
                onClick={() => setShowExplanation(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition shrink-0 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Why this weight & form?
              </button>
            </div>

            {/* Exercise Past History & Progression Status */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/90 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                <span className="font-bold flex items-center gap-1.5 text-zinc-300">
                  <History className="w-3.5 h-3.5 text-emerald-400" /> Past Performance
                </span>
                {currentProgression?.hasDoneBefore ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Done {currentProgression.timesCompleted}x before
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                    First time doing this
                  </span>
                )}
              </div>

              {currentProgression?.hasDoneBefore ? (
                <div className="space-y-1 text-zinc-400 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200">
                      Past weight used: <strong className="text-white">{currentProgression.lastWeight} {currentEx.weightUnit}</strong>
                    </span>
                    {currentProgression.maxWeight && currentProgression.maxWeight > (currentProgression.lastWeight || 0) && (
                      <span className="text-zinc-400">
                        (All-time Best: <strong className="text-emerald-300">{currentProgression.maxWeight} {currentEx.weightUnit}</strong>)
                      </span>
                    )}
                  </div>
                  {currentProgression.weightIncreased && currentProgression.weightIncreaseDetail && (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] pt-0.5">
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span>{currentProgression.weightIncreaseDetail}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400">
                  No previous sessions logged for this exercise. Whatever weight you use today will be saved as your baseline for future workouts.
                </p>
              )}
            </div>

            {/* Target Sets x Reps & Load Editor */}
            <div className="grid grid-cols-2 gap-3 mt-4 p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <div>
                <span className="text-xs text-zinc-400 font-medium">Target Scheme</span>
                <div className="text-xl font-bold text-white mt-1">
                  {currentEx.sets} sets × {currentEx.reps} reps
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Rest: {currentEx.restSeconds}s between sets
                </div>
              </div>

              {/* Weight Prescribed and Quick Adjuster */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Weight Used</span>
                  <span className="text-[10px] text-emerald-400">
                    Target: {currentEx.recommendedWeight} {currentEx.weightUnit}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    onClick={() => handleAdjustWeight(-2.5)}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentEx.actualWeightUsed ?? currentEx.recommendedWeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setExercises((prev) => {
                        const copy = [...prev];
                        const ex = { ...copy[currentIdx] };
                        ex.actualWeightUsed = val;
                        copy[currentIdx] = ex;
                        return copy;
                      });
                    }}
                    className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-lg font-extrabold text-emerald-400 text-center focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs font-medium text-zinc-400">{currentEx.weightUnit}</span>
                  <button
                    onClick={() => handleAdjustWeight(2.5)}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Sets Checklist */}
            <div className="mt-6 space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Record Completed Sets
              </span>
              {Array.from({ length: currentEx.sets }).map((_, idx) => {
                const setNum = idx + 1;
                const setObj = (currentEx.completedSets || []).find((s) => s.setNumber === setNum);
                const isDone = Boolean(setObj?.completed);

                return (
                  <button
                    key={setNum}
                    onClick={() => handleToggleSet(setNum)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition ${
                      isDone
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {isDone ? <CheckCircle className="w-4 h-4" /> : setNum}
                      </div>
                      <span className="text-sm font-semibold">Set {setNum}</span>
                    </div>
                    <div className="text-sm font-medium">
                      {currentEx.actualWeightUsed ?? currentEx.recommendedWeight} {currentEx.weightUnit} × {currentEx.reps} reps
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Technique Reminder */}
            {currentEx.notes && (
              <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg text-xs text-zinc-400 flex items-start gap-2 border border-zinc-800/60">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Form Cue:</strong> {currentEx.notes}
                </span>
              </div>
            )}
          </div>

          {/* Rest Timer Widget */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Rest Timer</span>
                <span className="text-2xl font-black font-mono text-white">
                  {Math.floor(timerSeconds / 60)}:
                  {(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`p-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition ${
                  timerRunning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={() => setTimerSeconds((prev) => prev + 30)}
                className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition"
              >
                +30s
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(currentEx.restSeconds);
                }}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Exercise Feedback Loop ("How did that feel?") */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                How did this exercise feel?
              </h3>
              <span className="text-xs text-zinc-400">Adapts future weights</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[
                { label: 'Too Easy', rating: 'too_easy' as DifficultyRating, color: 'hover:border-cyan-500 hover:bg-cyan-950/40' },
                { label: 'Easy', rating: 'easy' as DifficultyRating, color: 'hover:border-teal-500 hover:bg-teal-950/40' },
                { label: 'Just Right', rating: 'just_right' as DifficultyRating, color: 'hover:border-emerald-500 hover:bg-emerald-950/40' },
                { label: 'Hard', rating: 'hard' as DifficultyRating, color: 'hover:border-amber-500 hover:bg-amber-950/40' },
                { label: 'Too Hard', rating: 'too_hard' as DifficultyRating, color: 'hover:border-rose-500 hover:bg-rose-950/40' }
              ].map((b) => (
                <button
                  key={b.rating}
                  onClick={() => handleSelectFeedback(b.rating)}
                  className={`p-2.5 rounded-xl border border-zinc-800 bg-zinc-800/40 text-xs font-semibold text-zinc-200 transition text-center ${b.color}`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Pain / Discomfort Flag Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleSelectFeedback('too_hard', true)}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 rounded-lg hover:bg-rose-950/30 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Report Pain / Discomfort (Will adapt future movements)
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Workout Complete Celebration Screen */
        <div className="flex-1 overflow-y-auto p-6 max-w-lg mx-auto w-full flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-2xl">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wider uppercase border border-emerald-500/20">
              Workout Complete
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-2">Awesome Training!</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Your feedback has been recorded. Future recommendations will adapt to your actual weights and difficulty ratings.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <span className="text-xs text-zinc-400">Exercises Finished</span>
              <div className="text-2xl font-black text-white mt-1">{exercises.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <span className="text-xs text-zinc-400">Duration</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {workout.estimatedMinutes} min
              </div>
            </div>
          </div>

          {/* Post-Workout Notes */}
          <div className="w-full text-left space-y-1.5">
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              Notes for AI Coach (Optional)
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="e.g. Felt explosive today, practiced right before, legs felt light..."
              className="w-full h-20 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition shadow-xl shadow-emerald-950 flex items-center justify-center gap-2"
          >
            Save to Training History <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Navigation Bar */}
      {!workoutFinished && (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between">
          <button
            onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {currentIdx < exercises.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((p) => p + 1)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1 transition shadow-md shadow-emerald-950"
            >
              Next Exercise <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setWorkoutFinished(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1 transition shadow-md shadow-emerald-950"
            >
              Finish Workout <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* In-depth AI Explanation Modal */}
      {showExplanation && (
        <ExerciseExplanationModal
          exercise={currentEx}
          user={user}
          hasPracticeLater={workout.practiceLaterToday}
          onClose={() => setShowExplanation(false)}
        />
      )}
    </div>
  );
};
