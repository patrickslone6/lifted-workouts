import React, { useState } from 'react';
import { ScheduledEvent, UserProfile, WorkoutPlan } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Trophy,
  Activity,
  Trash2,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  X,
  Dumbbell
} from 'lucide-react';
import { formatLocalDate, getTodayDateString, formatDateDisplay } from '../utils/dateUtils';

interface Props {
  user: UserProfile;
  scheduledEvents: ScheduledEvent[];
  workoutHistory?: WorkoutPlan[];
  onAddEvent: (event: ScheduledEvent) => void;
  onRemoveEvent: (id: string) => void;
  todayWorkout: WorkoutPlan;
}

export const CalendarScreen: React.FC<Props> = ({
  user,
  scheduledEvents,
  workoutHistory = [],
  onAddEvent,
  onRemoveEvent,
  todayWorkout
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventType, setEventType] = useState<'game' | 'practice'>('game');
  const [sport, setSport] = useState(user.sport || 'Soccer');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return formatLocalDate(d);
  });
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [intensity, setIntensity] = useState<'moderate' | 'hard' | 'extreme'>('hard');
  const [notes, setNotes] = useState('');

  // Selected Day Inspection State (User Prompt Feature: view future and past workouts)
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Generate current week dates
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDates();
  const todayStr = getTodayDateString();

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: ScheduledEvent = {
      id: `evt-${Date.now()}`,
      date,
      type: eventType,
      sport,
      timeOfDay,
      expectedIntensity: intensity,
      durationMinutes: eventType === 'game' ? 90 : 75,
      notes: notes || `${eventType === 'game' ? 'Official Game' : 'Team Practice'} (${sport})`
    };
    onAddEvent(newEvent);
    setShowAddModal(false);
    setNotes('');
  };

  // Find workout for selected day inspection
  const getSelectedDayDetails = () => {
    if (!selectedDayDate) return null;
    const isToday = selectedDayDate === todayStr;
    const isPast = selectedDayDate < todayStr;
    const isFuture = selectedDayDate > todayStr;

    const completed = workoutHistory.find((w) => w.date === selectedDayDate);
    const dayEvents = scheduledEvents.filter((e) => e.date === selectedDayDate);

    return {
      date: selectedDayDate,
      isToday,
      isPast,
      isFuture,
      completedWorkout: completed,
      events: dayEvents
    };
  };

  const selectedDayInfo = getSelectedDayDetails();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-950/40 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Adaptive Weekly Periodization
            </span>
            <span className="text-xs text-zinc-400">AI Schedule &amp; Game Planning</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Weekly Calendar &amp; Workouts
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
            Click any day to view past completed sessions or future AI planned workouts. Changing or deleting future practices and games immediately recalculates today's workout through AI.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm transition flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-950"
        >
          <Plus className="w-4 h-4" /> Add Game or Practice
        </button>
      </div>

      {/* Week Timeline View */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" /> Click Any Day to Inspect Workouts
          </h3>
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Real-Time AI Adaptive
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2.5">
          {weekDays.map((dateObj) => {
            const dateStr = formatLocalDate(dateObj);
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const isSelected = selectedDayDate === dateStr;
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dateObj.getDate();

            // Find events and history on this day
            const dayEvents = scheduledEvents.filter((e) => e.date === dateStr);
            const hasGame = dayEvents.some((e) => e.type === 'game' || e.type === 'tournament');
            const hasPractice = dayEvents.some((e) => e.type === 'practice' || e.type === 'scrimmage');
            const completedPast = workoutHistory.find((w) => w.date === dateStr);

            let dayPlanTitle = isPast
              ? completedPast
                ? completedPast.workoutTitle
                : 'Rest / Missed (Cleared)'
              : 'Planned: Hypertrophy & Power';

            let planBadge = isPast ? (completedPast ? 'Completed' : 'Rest/Cleaned') : 'Planned';

            if (isToday) {
              dayPlanTitle = todayWorkout.workoutTitle;
              planBadge = 'Today (Active)';
            } else if (hasGame) {
              dayPlanTitle = 'Match Day: Primer & Mobility';
              planBadge = 'MATCH DAY';
            } else if (hasPractice) {
              dayPlanTitle = 'Practice Day: Core & Posture';
              planBadge = 'Practice Day';
            }

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDayDate(isSelected ? null : dateStr)}
                className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[140px] cursor-pointer transition select-none ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-500/50'
                    : isToday
                    ? 'border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                    : hasGame
                    ? 'border-amber-500/50 bg-amber-950/15 hover:border-amber-400'
                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase text-zinc-400">
                      {dayName}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        isToday ? 'text-emerald-400' : 'text-zinc-200'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {/* Badges for events */}
                  <div className="space-y-1 my-1.5">
                    {hasGame && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" /> GAME
                      </span>
                    )}
                    {hasPractice && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Activity className="w-2.5 h-2.5" /> PRACTICE
                      </span>
                    )}
                    {completedPast && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> FINISHED
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60">
                  <div className="text-[11px] leading-tight line-clamp-2 text-zinc-300 font-medium">
                    {dayPlanTitle}
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-400">
                    <span className={isToday ? 'text-emerald-400 font-bold' : ''}>{planBadge}</span>
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED DAY WORKOUT INSPECTION MODAL / PANEL */}
      {selectedDayInfo && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-cyan-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  {formatDateDisplay(selectedDayInfo.date, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {selectedDayInfo.isToday
                    ? todayWorkout.workoutTitle
                    : selectedDayInfo.completedWorkout
                    ? selectedDayInfo.completedWorkout.workoutTitle
                    : selectedDayInfo.isPast
                    ? 'Past Day (No Incomplete Workouts)'
                    : 'Planned AI Session for this Day'}
                </h3>
              </div>
            </div>

            <button
              onClick={() => setSelectedDayDate(null)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Events on this day */}
          {(selectedDayInfo.events || []).length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Scheduled Events for this Date:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(selectedDayInfo.events || []).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block capitalize">
                        {evt.type === 'game' ? '⚽ Match Day' : '🏃 Practice Session'} ({evt.sport})
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {evt.durationMinutes}m • Intensity: {evt.expectedIntensity}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemoveEvent(evt.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition"
                      title="Delete event and recalibrate workout via AI"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workout Details */}
          {selectedDayInfo.isToday ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
                <strong className="block mb-1 text-emerald-300 font-bold">
                  Active AI Plan for Today:
                </strong>
                {todayWorkout?.reasoning || 'Targeted athletic stimulation and joint protection.'}
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Today's Exercises ({(todayWorkout?.exercises || []).length})
                </span>
                {(todayWorkout?.exercises || []).map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white block">{ex.name}</span>
                      <span className="text-zinc-400">
                        {ex.sets} sets × {ex.reps} reps @ {ex.recommendedWeight} {ex.weightUnit}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{(ex.targetMuscles || []).join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedDayInfo.completedWorkout ? (
            <div className="space-y-3">
              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300">
                <strong className="block mb-1 text-zinc-200 font-bold">Completed Session:</strong>
                {selectedDayInfo.completedWorkout.reasoning}
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Exercises Performed
                </span>
                {(selectedDayInfo.completedWorkout.exercises || []).map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white block">{ex.name}</span>
                      <span className="text-zinc-400">
                        {ex.sets} sets × {ex.reps} reps @ {ex.actualWeightUsed ?? ex.recommendedWeight} {ex.weightUnit}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400 capitalize">
                      {ex.feedbackDifficulty?.replace('_', ' ') || 'Completed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedDayInfo.isPast ? (
            <div className="p-6 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
              <p className="text-xs text-zinc-400">
                No completed workout on this past date. Any past scheduled workouts you missed were automatically deleted from the schedule to keep your training plan current.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Sparkles className="w-4 h-4" /> Future Training Day
              </div>
              <p>
                The AI dynamically calibrates this day based on whether you have a practice or match scheduled. If you add or delete events, the AI automatically recalculates volume and exercise choices.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Events List & Management */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Scheduled Matches &amp; Team Practices
            </h3>
            <span className="text-xs text-zinc-400">
              Deleting any future practice or game immediately recalibrates today's workout through AI!
            </span>
          </div>
          <span className="px-3 py-1 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300">
            {scheduledEvents.length} Event{scheduledEvents.length === 1 ? '' : 's'}
          </span>
        </div>

        {scheduledEvents.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
            No games or team practices scheduled. Click &quot;Add Game or Practice&quot; above to schedule your week!
          </div>
        ) : (
          <div className="space-y-2.5">
            {scheduledEvents.map((event) => {
              const isGame = event.type === 'game' || event.type === 'tournament';
              const eventDate = formatDateDisplay(event.date, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isGame
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}
                    >
                      {isGame ? <Trophy className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          {eventDate}
                        </span>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs text-zinc-400 capitalize">{event.timeOfDay.replace('_', ' ')}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {isGame ? 'Match Day' : 'Team Practice'} ({event.sport})
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {event.durationMinutes} min • Intensity: <span className="capitalize text-zinc-300">{event.expectedIntensity}</span>
                        {event.notes ? ` • "${event.notes}"` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveEvent(event.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition"
                    title="Delete event and regenerate workout with AI"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Adding Event */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" /> Add Game or Practice
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Event Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEventType('game')}
                    className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      eventType === 'game'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" /> Official Match
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventType('practice')}
                    className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      eventType === 'practice'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" /> Team Practice
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Time of Day</label>
                  <select
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Expected Intensity</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['moderate', 'hard', 'extreme'] as const).map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setIntensity(lvl)}
                      className={`py-1.5 rounded-xl border text-xs font-semibold capitalize transition ${
                        intensity === lvl
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Notes / Opponent</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. League match vs Arsenal FC, or Sprint testing"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Schedule &amp; Calibrate AI Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
