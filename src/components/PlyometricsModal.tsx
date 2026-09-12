import React, { useState, useEffect } from 'react';
import { PlyometricsRoutine, PlyometricsExercise } from '../types';
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Flame,
  ShieldCheck,
  Timer
} from 'lucide-react';

interface Props {
  routine: PlyometricsRoutine;
  onComplete: () => void;
  onClose: () => void;
}

export const PlyometricsModal: React.FC<Props> = ({ routine, onComplete, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentEx = routine.exercises[currentIdx];

  const [currentSet, setCurrentSet] = useState(1);
  const totalSets = currentEx ? currentEx.sets : 3;

  const [isResting, setIsResting] = useState(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState(currentEx ? currentEx.restSeconds : 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedSetsCount, setCompletedSetsCount] = useState(0);

  // When changing exercise, reset set and rest state
  useEffect(() => {
    setCurrentSet(1);
    setIsResting(false);
    setIsTimerRunning(false);
    if (currentEx) {
      setRestSecondsLeft(currentEx.restSeconds);
    }
  }, [currentIdx, currentEx]);

  // Rest countdown timer
  useEffect(() => {
    let interval: any;
    if (isResting && isTimerRunning && restSecondsLeft > 0) {
      interval = setInterval(() => {
        setRestSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (restSecondsLeft === 0 && isResting) {
      setIsResting(false);
      setIsTimerRunning(false);
      if (currentSet < totalSets) {
        setCurrentSet((s) => s + 1);
      }
    }
    return () => clearInterval(interval);
  }, [isResting, isTimerRunning, restSecondsLeft, currentSet, totalSets]);

  const handleFinishSet = () => {
    setCompletedSetsCount((c) => c + 1);
    if (currentSet < totalSets) {
      setIsResting(true);
      setRestSecondsLeft(currentEx ? currentEx.restSeconds : 45);
      setIsTimerRunning(true);
    } else {
      // Completed all sets of this exercise
      if (currentIdx < routine.exercises.length - 1) {
        setCurrentIdx((i) => i + 1);
      }
    }
  };

  const handleFinishAll = () => {
    onComplete();
  };

  if (!currentEx) return null;

  const isAllExercisesDone = currentIdx === routine.exercises.length - 1 && currentSet === totalSets;

  return (
    <div
      id="plyometrics-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
    >
      <div
        id="plyometrics-modal-card"
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                  Daily At-Home Plyos
                </span>
                {routine.isAiGenerated && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-medium">
                    AI Tailored
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">{routine.title}</h3>
            </div>
          </div>
          <button
            id="close-plyometrics-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 h-1.5">
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-1.5 transition-all duration-300"
            style={{
              width: `${((currentIdx + (currentSet - 1) / totalSets) / routine.exercises.length) * 100}%`
            }}
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Rationale pill */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{routine.rationale}</p>
          </div>

          {/* Exercise Card */}
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-amber-400">
                  Exercise {currentIdx + 1} of {routine.exercises.length}
                </span>
                <h4 className="text-xl font-bold text-white mt-0.5">{currentEx.name}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{currentEx.targetFocus}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {currentEx.equipmentNeeded === 'none' ? 'Zero Equipment' : 'Minimal Space'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  currentEx.intensity === 'high'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : currentEx.intensity === 'moderate'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {currentEx.intensity.toUpperCase()} INTENSITY
                </span>
              </div>
            </div>

            {/* Set & Target Display */}
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-zinc-800/60 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Current Set</span>
                <span className="text-lg font-bold text-amber-400">
                  Set {currentSet} of {totalSets}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Target Reps</span>
                <span className="text-lg font-bold text-white">{currentEx.repsOrDuration}</span>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <span className="text-xs font-semibold text-zinc-400 block mb-1">Execution</span>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">{currentEx.instructions}</p>
            </div>

            {/* Coaching Cue */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Coaching Key
                </span>
                <p className="text-xs text-amber-200 font-medium leading-relaxed">{currentEx.coachingCue}</p>
              </div>
            </div>

            {/* Rest Timer Overlay / Block if resting */}
            {isResting && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Timer className="w-5 h-5 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Rest & Elastic Recharge</span>
                </div>
                <div className="text-3xl font-black text-white tracking-wider">
                  {restSecondsLeft}s
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-3 py-1 rounded-lg bg-zinc-800 text-xs font-medium text-zinc-200 hover:text-white"
                  >
                    {isTimerRunning ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResting(false);
                      setIsTimerRunning(false);
                      if (currentSet < totalSets) setCurrentSet((s) => s + 1);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Skip Rest & Next Set
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="prev-plyo-ex-btn"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs text-zinc-400 font-medium">
              {currentIdx + 1} / {routine.exercises.length}
            </span>
            <button
              id="next-plyo-ex-btn"
              disabled={currentIdx === routine.exercises.length - 1}
              onClick={() => setCurrentIdx((i) => Math.min(routine.exercises.length - 1, i + 1))}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isAllExercisesDone ? (
              <button
                id="finish-plyo-set-btn"
                onClick={handleFinishSet}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                {currentSet < totalSets ? `Complete Set ${currentSet}` : 'Next Exercise'}
              </button>
            ) : (
              <button
                id="complete-all-plyos-btn"
                onClick={handleFinishAll}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Plyo Routine
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
