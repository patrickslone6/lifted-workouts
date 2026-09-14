import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, Plus, Trash2, X } from 'lucide-react';
import { ScheduledEvent } from '../types';
import { formatLocalDate } from '../utils/dateUtils';

interface Props {
  initialEvents: ScheduledEvent[];
  weekStart: string;
  onSave: (events: ScheduledEvent[], weekKey: string) => void;
}

type DraftEvent = Omit<ScheduledEvent, 'id'> & { id: string };

const EVENT_TYPES: Array<{ value: ScheduledEvent['type']; label: string }> = [
  { value: 'practice', label: 'Practice' },
  { value: 'game', label: 'Game' },
  { value: 'scrimmage', label: 'Scrimmage' },
  { value: 'other_hard_activity', label: 'Open gym / lifting class / other' }
];

const emptyEvent = (date: string): DraftEvent => ({
  id: `weekly-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  date,
  type: 'practice',
  sport: 'Basketball',
  timeOfDay: 'afternoon',
  expectedIntensity: 'hard',
  durationMinutes: 90,
  notes: ''
});

export const WeeklyPlanningModal: React.FC<Props> = ({ initialEvents, weekStart, onSave }) => {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const [plan, setPlan] = useState<Record<string, DraftEvent[]>>(() => {
    const grouped: Record<string, DraftEvent[]> = {};
    days.forEach((day) => {
      const date = formatLocalDate(day);
      grouped[date] = initialEvents.filter((e) => e.date === date).map((e) => ({ ...e }));
    });
    return grouped;
  });

  const updateEvent = (date: string, id: string, patch: Partial<DraftEvent>) => {
    setPlan((prev) => ({ ...prev, [date]: (prev[date] || []).map((e) => e.id === id ? { ...e, ...patch } : e) }));
  };

  const addEvent = (date: string) => {
    setPlan((prev) => ({ ...prev, [date]: [...(prev[date] || []), emptyEvent(date)] }));
  };

  const removeEvent = (date: string, id: string) => {
    setPlan((prev) => ({ ...prev, [date]: (prev[date] || []).filter((e) => e.id !== id) }));
  };

  const markRest = (date: string) => {
    setPlan((prev) => ({ ...prev, [date]: [] }));
  };

  const handleSave = () => {
    const events = Object.values(plan).flat().map(({ id, ...event }) => ({ id, ...event } as ScheduledEvent));
    onSave(events, weekStart);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[94dvh] overflow-hidden rounded-3xl border border-emerald-500/30 bg-zinc-950 text-zinc-100 shadow-2xl flex flex-col">
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CalendarDays className="w-4 h-4" /> Sunday weekly planning
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Plan the week ahead</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">Tell Lifted about practices, games, open gyms, weightlifting classes, scrimmages, and other hard activities. Days you leave empty are treated as planned rest. This schedule becomes part of the AI's training context.</p>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-3">
          {days.map((day) => {
            const date = formatLocalDate(day);
            const events = plan[date] || [];
            return (
              <section key={date} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">{day.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    <div className="text-xs text-zinc-500">{day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => markRest(date)} className="px-2.5 py-1.5 rounded-lg border border-zinc-700 text-[11px] font-bold text-zinc-300 hover:bg-zinc-800">Rest / no hard activity</button>
                    <button type="button" onClick={() => addEvent(date)} className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-black text-[11px] font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
                  </div>
                </div>
                {events.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-3 text-xs text-zinc-500">Planned rest / no scheduled hard activity</div>
                ) : (
                  <div className="space-y-2">
                    {events.map((event) => (
                      <div key={event.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center rounded-xl bg-zinc-950/70 border border-zinc-800 p-2.5">
                        <select value={event.type} onChange={(e) => updateEvent(date, event.id, { type: e.target.value as ScheduledEvent['type'] })} className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs text-white sm:col-span-2">
                          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input value={event.sport} onChange={(e) => updateEvent(date, event.id, { sport: e.target.value })} placeholder="Sport / activity" className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs text-white" />
                        <select value={event.expectedIntensity} onChange={(e) => updateEvent(date, event.id, { expectedIntensity: e.target.value as ScheduledEvent['expectedIntensity'] })} className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs text-white">
                          {['light', 'moderate', 'hard', 'extreme'].map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                        <input type="number" min="10" max="240" value={event.durationMinutes} onChange={(e) => updateEvent(date, event.id, { durationMinutes: Number(e.target.value) || 0 })} className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs text-white" aria-label="Duration minutes" />
                        <button type="button" onClick={() => removeEvent(date, event.id)} className="p-2 rounded-lg text-zinc-500 hover:text-red-300 hover:bg-red-950/30" title="Remove activity"><Trash2 className="w-4 h-4 mx-auto" /></button>
                        <input value={event.notes || ''} onChange={(e) => updateEvent(date, event.id, { notes: e.target.value })} placeholder="Notes (optional)" className="sm:col-span-5 rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs text-white" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <div className="text-[11px] text-zinc-500 sm:mr-auto flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Lifted will use this plan when choosing training load and recovery.</div>
          <button type="button" onClick={handleSave} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 text-black font-black text-sm flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Save weekly plan</button>
        </div>
      </div>
    </div>
  );
};
