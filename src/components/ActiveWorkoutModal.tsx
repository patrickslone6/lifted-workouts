import React, { useState, useEffect } from 'react';
import { PlannedExercise, UserProfile, DifficultyRating, WorkoutPlan } from '../types';
import { ExerciseExplanationModal } from './ExerciseExplanationModal';
import { getExerciseProgression } from '../utils/exerciseProgression';
import { CheckCircle, Play, Pause, RotateCcw, Sparkles, ChevronRight, ChevronLeft, X, AlertTriangle, Flame, Award, Clock, ArrowRight, TrendingUp, History, Trash2, Save } from 'lucide-react';

interface Props {
  workout: WorkoutPlan;
  user: UserProfile;
  workoutHistory?: WorkoutPlan[];
  onFinishWorkout: (completedWorkout: WorkoutPlan) => void;
  onSaveInProgress?: (updatedWorkout: WorkoutPlan) => void;
  onDeleteWorkout?: (workoutId: string) => void;
  onClose: () => void;
}

export const ActiveWorkoutModal: React.FC<Props> = ({ workout, user, workoutHistory = [], onFinishWorkout, onSaveInProgress, onDeleteWorkout, onClose }) => {
  const [exercises, setExercises] = useState<PlannedExercise[]>(workout?.exercises || []);
  const [currentIdx, setCurrentIdx] = useState(() => {
    const firstUnfinished = (workout?.exercises || []).findIndex((e) => !e.completed);
    return firstUnfinished >= 0 ? firstUnfinished : 0;
  });
  const [showExplanation, setShowExplanation] = useState(false);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [showExitDialog, setShowExitDialog] = useState(false);
  const currentEx = exercises[currentIdx];
  const currentProgression = currentEx ? getExerciseProgression(currentEx.name, workoutHistory) : null;

  const [timerSeconds, setTimerSeconds] = useState(currentEx ? currentEx.restSeconds : 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Persist partial progress so a close/refresh never throws away completed sets.
  useEffect(() => {
    const hasProgress = exercises.some((ex) => ex.completed || (ex.completedSets || []).some((set) => set.completed));
    if (hasProgress && onSaveInProgress) onSaveInProgress({ ...workout, status: 'in_progress', exercises });
  }, [exercises]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timerRunning && timerSeconds > 0) interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    else if (timerSeconds === 0 && timerRunning) setTimerRunning(false);
    return () => { if (interval) clearInterval(interval); };
  }, [timerRunning, timerSeconds]);

  const handleAdjustWeight = (delta: number) => setExercises((prev) => { const copy = [...prev]; const ex = { ...copy[currentIdx] }; ex.actualWeightUsed = Math.max(0, (ex.actualWeightUsed ?? ex.recommendedWeight) + delta); copy[currentIdx] = ex; return copy; });

  const handleToggleSet = (setNumber: number) => {
    setExercises((prev) => {
      const copy = [...prev]; const ex = { ...copy[currentIdx] }; const sets = ex.completedSets ? [...ex.completedSets] : [];
      const existing = sets.find((s) => s.setNumber === setNumber); const curWeight = ex.actualWeightUsed ?? ex.recommendedWeight;
      if (existing) existing.completed = !existing.completed;
      else sets.push({ setNumber, weight: curWeight, reps: ex.reps, completed: true });
      ex.completedSets = sets;
      if (!existing || existing.completed) { setTimerSeconds(ex.restSeconds); setTimerRunning(true); }
      ex.completed = sets.filter((s) => s.completed).length === ex.sets;
      copy[currentIdx] = ex; return copy;
    });
  };

  const handleSelectFeedback = (rating: DifficultyRating, pain = false) => {
    setExercises((prev) => { const copy = [...prev]; const ex = { ...copy[currentIdx] }; ex.feedbackDifficulty = rating; ex.painReported = pain; ex.completed = true; copy[currentIdx] = ex; return copy; });
    if (currentIdx < exercises.length - 1) { setCurrentIdx((prev) => prev + 1); setTimerRunning(false); setTimerSeconds(exercises[currentIdx + 1]?.restSeconds || 60); }
    else setWorkoutFinished(true);
  };

  const handlePauseAndResumeLater = () => {
    onSaveInProgress?.({ ...workout, status: 'in_progress', exercises });
    setShowExitDialog(false); onClose();
  };
  const handleDeleteThisWorkout = () => { onDeleteWorkout?.(workout.id); setShowExitDialog(false); onClose(); };

  const handleComplete = () => {
    const totalActualVolume = exercises.reduce((acc, ex) => {
      const doneSets = (ex.completedSets || []).filter((s) => s.completed).length;
      return acc + (ex.actualWeightUsed ?? ex.recommendedWeight) * ex.reps * (doneSets || ex.sets);
    }, 0);
    const completed: WorkoutPlan = { ...workout, status: 'completed', exercises, completedAt: new Date().toISOString(), actualMinutes: workout.estimatedMinutes, userNotes: userNotes || `Completed ${exercises.length} exercises. Total volume: ${totalActualVolume} ${user.weightUnit}.` };
    onFinishWorkout(completed);
  };

  if (!currentEx) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowExitDialog(true)} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition" title="Pause or Exit Workout"><X className="w-5 h-5" /></button>
          <div><div className="flex items-center gap-2"><span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{workout.workoutTitle}</span>{workout.practiceLaterToday && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">Practice Later Today</span>}</div><div className="text-xs text-zinc-400">Exercise {currentIdx + 1} of {exercises.length}</div></div>
        </div>
        <div className="flex gap-1">{exercises.map((ex, i) => <div key={i} className={`h-2 rounded-full transition-all ${i === currentIdx ? 'w-6 bg-emerald-500' : ex.completed ? 'w-3 bg-emerald-700' : 'w-3 bg-zinc-800'}`} />)}</div>
      </div>

      {!workoutFinished ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-3"><div><span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Current Exercise</span><h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">{currentEx.name}</h2><div className="flex flex-wrap gap-1.5 mt-2">{currentEx.targetMuscles.map((m, i) => <span key={i} className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300">{m}</span>)}</div></div><button onClick={() => setShowExplanation(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition shrink-0"><Sparkles className="w-3.5 h-3.5" /> Why this?</button></div>
            <div className="mt-4 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/90 text-xs"><div className="flex items-center justify-between gap-2 flex-wrap mb-1.5"><span className="font-bold flex items-center gap-1.5 text-zinc-300"><History className="w-3.5 h-3.5 text-emerald-400" /> Past Performance</span>{currentProgression?.hasDoneBefore ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Done {currentProgression.timesCompleted}x before</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">First logged session</span>}</div>{currentProgression?.hasDoneBefore ? <div className="space-y-1 text-zinc-400"><span>Past weight used: <strong className="text-white">{currentProgression.lastWeight} {currentEx.weightUnit}</strong></span>{currentProgression.maxWeight && currentProgression.maxWeight > (currentProgression.lastWeight || 0) && <span className="ml-2">Best: <strong className="text-emerald-300">{currentProgression.maxWeight} {currentEx.weightUnit}</strong></span>}</div> : <p className="text-[11px] text-zinc-400">Your completed sets today become the baseline for future recommendations.</p>}</div>
            <div className="grid grid-cols-2 gap-3 mt-4 p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80"><div><span className="text-xs text-zinc-400 font-medium">Target Scheme</span><div className="text-xl font-bold text-white mt-1">{currentEx.sets} sets × {currentEx.reps} reps</div><div className="text-[11px] text-zinc-400 mt-1">Rest: {currentEx.restSeconds}s</div></div><div><div className="flex items-center justify-between"><span className="text-xs text-zinc-400 font-medium">Weight Used</span><span className="text-[10px] text-emerald-400">Target: {currentEx.recommendedWeight} {currentEx.weightUnit}</span></div><div className="flex items-center gap-1.5 mt-1.5"><button onClick={() => handleAdjustWeight(-2.5)} className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold">-</button><input type="number" step="0.5" min="0" value={currentEx.actualWeightUsed ?? currentEx.recommendedWeight} onChange={(e) => setExercises((prev) => { const copy = [...prev]; copy[currentIdx] = { ...copy[currentIdx], actualWeightUsed: parseFloat(e.target.value) || 0 }; return copy; })} className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-lg font-extrabold text-emerald-400 text-center" /><span className="text-xs text-zinc-400">{currentEx.weightUnit}</span><button onClick={() => handleAdjustWeight(2.5)} className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold">+</button></div></div></div>
            <div className="mt-6 space-y-2"><span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Record Completed Sets</span>{Array.from({ length: currentEx.sets }).map((_, idx) => { const setNum = idx + 1; const setObj = (currentEx.completedSets || []).find((s) => s.setNumber === setNum); const isDone = Boolean(setObj?.completed); return <button key={setNum} onClick={() => handleToggleSet(setNum)} className={`w-full p-3 rounded-xl border flex items-center justify-between transition ${isDone ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200' : 'bg-zinc-800/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800'}`}><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>{isDone ? <CheckCircle className="w-4 h-4" /> : setNum}</div><span className="text-sm font-semibold">Set {setNum}</span></div><div className="text-sm font-medium">{currentEx.actualWeightUsed ?? currentEx.recommendedWeight} {currentEx.weightUnit} × {currentEx.reps} reps</div></button>; })}</div>
            {currentEx.notes && <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg text-xs text-zinc-400 border border-zinc-800/60"><strong>Form Cue:</strong> {currentEx.notes}</div>}
          </div>
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Clock className="w-5 h-5 text-emerald-400" /><div><span className="text-xs text-zinc-400 block">Rest timer</span><span className="text-xl font-black text-white">{Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}</span></div></div><div className="flex gap-2"><button onClick={() => setTimerRunning((v) => !v)} className="px-3 py-2 rounded-lg bg-zinc-800 text-xs font-bold">{timerRunning ? 'Pause' : 'Start'}</button><button onClick={() => { setTimerSeconds(currentEx.restSeconds); setTimerRunning(false); }} className="px-3 py-2 rounded-lg bg-zinc-800 text-xs font-bold">Reset</button></div></div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"><span className="text-xs font-bold uppercase tracking-wider text-zinc-400">How did that exercise feel?</span><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{(['too_easy','easy','just_right','hard','too_hard'] as DifficultyRating[]).map((rating) => <button key={rating} onClick={() => handleSelectFeedback(rating)} className="p-2 rounded-lg bg-zinc-800 hover:bg-emerald-500/20 text-xs font-semibold text-zinc-200">{rating.replace('_', ' ')}</button>)}</div></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 max-w-2xl mx-auto w-full space-y-5"><div className="text-center py-6"><CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" /><h2 className="text-2xl font-black text-white mt-3">Workout Ready to Save</h2><p className="text-sm text-zinc-400 mt-1">Your sets, weights, feedback, and notes will be stored in training history.</p></div><textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Optional note for the AI Coach" className="w-full h-24 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 resize-none" /><button onClick={handleComplete} className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2">Save to Training History <ArrowRight className="w-4 h-4" /></button></div>
      )}

      {!workoutFinished && <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between"><button onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))} disabled={currentIdx === 0} className="px-4 py-2 rounded-xl bg-zinc-800 disabled:opacity-40 text-xs font-semibold"><ChevronLeft className="w-4 h-4 inline" /> Previous</button>{currentIdx < exercises.length - 1 ? <button onClick={() => setCurrentIdx((p) => p + 1)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold">Next Exercise <ChevronRight className="w-4 h-4 inline" /></button> : <button onClick={() => setWorkoutFinished(true)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold">Finish Workout <CheckCircle className="w-4 h-4 inline" /></button>}</div>}

      {showExitDialog && <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"><div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4"><div><h3 className="text-lg font-bold text-white">Leave this workout?</h3><p className="text-xs text-zinc-400 mt-1">Your completed sets are saved. You can resume later.</p></div><button onClick={handlePauseAndResumeLater} className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save &amp; Resume Later</button><button onClick={() => setShowExitDialog(false)} className="w-full py-3 rounded-xl bg-zinc-800 text-white font-semibold text-sm">Keep Working Out</button>{onDeleteWorkout && <button onClick={handleDeleteThisWorkout} className="w-full py-3 rounded-xl bg-rose-500/10 text-rose-300 font-semibold text-sm flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete Workout &amp; Progress</button>}</div></div>}
      {showExplanation && <ExerciseExplanationModal exercise={currentEx} user={user} hasPracticeLater={workout.practiceLaterToday} onClose={() => setShowExplanation(false)} />}
    </div>
  );
};