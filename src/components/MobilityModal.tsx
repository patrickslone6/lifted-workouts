import React, { useState, useEffect } from 'react';
import { MorningMobilityRoutine } from '../types';
import {
  Sun,
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
  mobility: MorningMobilityRoutine;
  onComplete: () => void;
  onClose: () => void;
}

export const MobilityModal: React.FC<Props> = ({ mobility, onComplete, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentEx = mobility.exercises[currentIdx];

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
      if (currentIdx < mobility.exercises.length - 1) {
        setCurrentIdx((p) => p + 1);
      } else {
        setIsCompleted(true);
        setIsRunning(false);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, currentIdx, mobility.exercises.length]);

  if (!currentEx) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                Morning Mobility Routine
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">{mobility.title}</h3>
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
                Stretch {currentIdx + 1} of {mobility.exercises.length}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {currentEx.name}
              </h2>
              <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Target: {currentEx.targetArea}
              </span>
            </div>

            {/* Timer Visual Dial */}
            <div className="py-2 flex flex-col items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-amber-500/30 flex flex-col items-center justify-center bg-zinc-950/40 relative shadow-inner">
                <span className="text-3xl font-black font-mono text-white">
                  {secondsLeft}s
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                  Remaining
                </span>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-amber-950"
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => setSecondsLeft(currentEx.durationSeconds)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-800 text-left text-sm text-zinc-300 leading-relaxed">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Movement Cue
              </span>
              {currentEx.instructions}
            </div>

            {/* Breathing Cue */}
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3.5 text-left flex items-start gap-2.5 text-xs text-emerald-200">
              <Wind className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-emerald-300 font-semibold mb-0.5">Breathing Pattern:</strong>
                {currentEx.breathingCue}
              </div>
            </div>

            {currentEx.modification && (
              <div className="text-xs text-zinc-400 text-left">
                <strong>Gentler modification:</strong> {currentEx.modification}
              </div>
            )}
          </div>
        ) : (
          /* Mobility Completed */
          <div className="p-8 text-center space-y-5 flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Morning Routine Complete!</h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-sm">
                Your joint capsules are mobilized, your nervous system is primed, and tissue stiffness has been reduced.
              </p>
            </div>
            <button
              onClick={onComplete}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950"
            >
              Done &amp; Ready for the Day
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        {!isCompleted && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
            <button
              onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
              disabled={currentIdx === 0}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-semibold text-zinc-300 flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            {currentIdx < mobility.exercises.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1 transition"
              >
                Skip / Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsCompleted(true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1 transition shadow-md shadow-emerald-950"
              >
                Finish Mobility <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
