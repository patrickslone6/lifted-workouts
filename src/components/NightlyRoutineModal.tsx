import React, { useState, useEffect } from 'react';
import { NightlyStretchingRoutine } from '../types';
import {
  Moon,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  X,
  Wind,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

interface Props {
  routine: NightlyStretchingRoutine;
  onComplete: () => void;
  onClose: () => void;
}

export const NightlyRoutineModal: React.FC<Props> = ({ routine, onComplete, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentEx = routine.exercises[currentIdx];

  const [secondsLeft, setSecondsLeft] = useState(currentEx ? currentEx.durationSeconds : 60);
  const [isRunning, setIsRunning] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (currentEx) {
      setSecondsLeft(currentEx.durationSeconds);
      setIsRunning(true);
    }
  }, [currentIdx, currentEx]);

  useEffect(() => {
    let interval: any;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      if (currentIdx < routine.exercises.length - 1) {
        setCurrentIdx((p) => p + 1);
      } else {
        setIsCompleted(true);
        setIsRunning(false);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, currentIdx, routine.exercises.length]);

  if (!currentEx) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-indigo-500/30 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Nightly Restorative Stretching
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">{routine.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        {!isCompleted ? (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-center">
            {/* Exercise Title & Progress */}
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                Restorative Stretch {currentIdx + 1} of {routine.exercises.length}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {currentEx.name}
              </h2>
              <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Target: {currentEx.targetArea}
              </span>
            </div>

            {/* Timer Visual Dial */}
            <div className="py-2 flex flex-col items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-indigo-500/40 flex flex-col items-center justify-center bg-zinc-950/60 relative shadow-inner">
                <span className="text-3xl font-black font-mono text-white">
                  {secondsLeft}s
                </span>
                <span className="text-[10px] text-indigo-300/80 uppercase font-semibold">
                  Remaining
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80 text-left space-y-3">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  How to execute:
                </span>
                <p className="text-sm text-zinc-200 leading-relaxed">{currentEx.instructions}</p>
              </div>

              {currentEx.breathingCue && (
                <div className="pt-2 border-t border-zinc-800/60 flex items-start gap-2 text-indigo-300 text-xs">
                  <Wind className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong className="text-indigo-200">Parasympathetic Breath:</strong> {currentEx.breathingCue}
                  </span>
                </div>
              )}

              {currentEx.modification && (
                <div className="pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
                  <strong className="text-zinc-300">Gentle Alternative:</strong> {currentEx.modification}
                </div>
              )}
            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsRunning(!isRunning)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow flex items-center gap-2"
              >
                {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                {isRunning ? 'Pause' : 'Resume'}
              </button>

              <button
                onClick={() => setSecondsLeft(currentEx.durationSeconds)}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                title="Reset Stretch Timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  if (currentIdx < routine.exercises.length - 1) {
                    setCurrentIdx((p) => p + 1);
                  } else {
                    setIsCompleted(true);
                  }
                }}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-5 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">
                Bedtime Wind-Down Complete!
              </h2>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
                Your heart rate and central nervous system are now down-regulated. Muscles worked in today’s training session have been decompressed for restorative recovery and deep sleep.
              </p>
            </div>

            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm transition shadow-lg shadow-indigo-950"
            >
              Mark Bedtime Routine Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
