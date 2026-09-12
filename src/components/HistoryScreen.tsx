import React, { useState } from 'react';
import { WorkoutPlan } from '../types';
import {
  Calendar,
  Clock,
  Dumbbell,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  Trash2,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface Props {
  workoutHistory: WorkoutPlan[];
  onDeleteWorkout: (id: string) => void;
}

export const HistoryScreen: React.FC<Props> = ({ workoutHistory, onDeleteWorkout }) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    workoutHistory.length > 0 ? workoutHistory[0].id : null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteWorkout(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 text-left">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
              Training Log
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Workout History</h2>
          </div>
          <span className="px-3 py-1 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300">
            {workoutHistory.length} Recorded Session{workoutHistory.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Review past completed workouts or delete any past sessions. The AI uses your historical volume and feedback to adapt upcoming loads. Any past workouts you miss are automatically cleaned from the schedule.
        </p>
      </div>

      {workoutHistory.length === 0 ? (
        <div className="p-12 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
          <Dumbbell className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
          <h4 className="text-base font-bold text-white mb-1">No Workout History Found</h4>
          <p className="text-xs text-zinc-400">
            Finish today's AI-generated workout session to log your completed exercises and feedback here!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workoutHistory.map((workout) => {
            const isExpanded = expandedId === workout.id;
            const isConfirming = confirmDeleteId === workout.id;
            const formattedDate = new Date(workout.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={workout.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition"
              >
                {/* Header Summary Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : workout.id)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-zinc-800/40 transition cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          {formattedDate}
                        </span>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs text-zinc-400">
                          {workout.actualMinutes || workout.estimatedMinutes} min
                        </span>
                        {workout.isAiGenerated && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/25 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> AI Calibrated
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mt-0.5">{workout.workoutTitle}</h3>
                      <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{(workout.exercises || []).length} exercises recorded</span>
                        {workout.practiceLaterToday && (
                          <span className="text-amber-400 font-medium">• Practice-aware session</span>
                        )}
                        {workout.injuryProtectionNotes && (
                          <span className="text-rose-400 font-medium">• Injury Protected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Delete Past Workout Button (User Prompt Feature) */}
                    {isConfirming ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 p-1 bg-red-950/80 border border-red-800 rounded-xl"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleDelete(workout.id, e)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 text-zinc-400 hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(workout.id);
                        }}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition"
                        title="Delete past workout"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="p-2 text-zinc-400 hover:text-white rounded-lg">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-zinc-800/80 space-y-4">
                    {workout.injuryProtectionNotes && (
                      <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-300">
                        <strong className="text-rose-200 block mb-0.5 font-bold">
                          Injury Safeguards Applied:
                        </strong>
                        {workout.injuryProtectionNotes}
                      </div>
                    )}

                    {workout.userNotes && (
                      <div className="p-3 bg-zinc-950/60 rounded-xl text-xs text-zinc-300 border border-zinc-800 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-zinc-200">Session Feedback:</strong> {workout.userNotes}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                        Exercises &amp; Performance
                      </span>
                      {(workout.exercises || []).map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block text-sm">{ex.name}</span>
                            <span className="text-zinc-400 mt-0.5 block">
                              {ex.sets} sets × {ex.reps} reps @{' '}
                              <strong className="text-zinc-200">
                                {ex.actualWeightUsed ?? ex.recommendedWeight} {ex.weightUnit}
                              </strong>
                            </span>
                            {ex.whyWeightHypertrophyInjury && (
                              <p className="text-[11px] text-emerald-400/90 mt-1 max-w-lg">
                                {ex.whyWeightHypertrophyInjury}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            {ex.feedbackDifficulty && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-emerald-300 capitalize border border-zinc-700">
                                {ex.feedbackDifficulty.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
