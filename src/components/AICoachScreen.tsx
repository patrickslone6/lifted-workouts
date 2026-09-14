import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User, Wifi, WifiOff } from 'lucide-react';
import { ChatMessage, DailyReadiness, ScheduledEvent, SchoolWorkoutLog, UserProfile, WorkoutPlan } from '../types';
import { storageService } from '../services/storage';
import { apiFetch } from '../services/api';

interface Props {
  user: UserProfile;
  readiness?: DailyReadiness;
  currentPlan: WorkoutPlan;
  workoutHistory?: WorkoutPlan[];
  scheduledEvents: ScheduledEvent[];
  schoolLogs?: SchoolWorkoutLog[];
  chatMessages: ChatMessage[];
  onSaveMessages?: (messages: ChatMessage[]) => void;
}

const safeText = (value: unknown) => typeof value === 'string' ? value : String(value ?? '');

export const AICoachScreen: React.FC<Props> = ({
  user,
  readiness,
  currentPlan,
  workoutHistory = [],
  scheduledEvents = [],
  schoolLogs = [],
  chatMessages = [],
  onSaveMessages,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(Array.isArray(chatMessages) ? chatMessages : []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const persist = (next: ChatMessage[]) => {
    setMessages(next);
    try { storageService.saveChatMessages(next); } catch (error) { console.warn('Coach history save failed', error); }
    try { onSaveMessages?.(next); } catch (error) { console.warn('Coach parent save failed', error); }
  };

  useEffect(() => { setMessages(Array.isArray(chatMessages) ? chatMessages : []); }, [chatMessages]);
  useEffect(() => { const node = endRef.current; if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, loading]);

  const send = async (preset?: string) => {
    const text = safeText(preset ?? input).trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, sender: 'user', text, timestamp: new Date().toISOString() };
    const next = [...messages, userMsg];
    persist(next); setInput(''); setLoading(true); setOnline(true);
    try {
      const completeHistory = workoutHistory.length ? workoutHistory : storageService.getWorkoutHistory();
      const completeSchoolLogs = schoolLogs.length ? schoolLogs : storageService.getSchoolWorkoutLogs();
      const completeReadiness = readiness || storageService.getDailyReadiness();
      const response = await apiFetch('/api/coach-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        message: text,
        history: next.slice(-12),
        user,
        readiness: completeReadiness,
        recentHistory: completeHistory.slice(0, 8).map((w) => ({
          id: w.id, date: w.date, workoutTitle: w.workoutTitle, status: w.status,
          exercises: (w.exercises || []).map((ex) => ({ name: ex.name, exerciseId: ex.exerciseId, sets: ex.sets, reps: ex.reps, recommendedWeight: ex.recommendedWeight, actualWeightUsed: ex.actualWeightUsed, feedbackDifficulty: ex.feedbackDifficulty, painReported: ex.painReported, completed: ex.completed }))
        })),
        scheduledEvents: scheduledEvents.slice(0, 14),
        recentSchoolLogs: completeSchoolLogs.slice(0, 10),
        activityLog: storageService.getActivityLog().slice(-10),
        trainingSnapshot: storageService.getTrainingSnapshot(),
        todayWorkout: { id: currentPlan?.id, date: currentPlan?.date, workoutTitle: currentPlan?.workoutTitle, goal: currentPlan?.goal, status: currentPlan?.status, exercises: (currentPlan?.exercises || []).map((ex) => ({ name: ex.name, sets: ex.sets, reps: ex.reps, recommendedWeight: ex.recommendedWeight, restSeconds: ex.restSeconds, feedbackDifficulty: ex.feedbackDifficulty })) },
        customFocus: 'Answer the athlete using the supplied recent training context. Do not invent missing history.'
      }) });
      const raw = await response.text(); let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`Coach returned invalid data (${response.status}).`); }
      if (!response.ok) throw new Error(data?.error || `Coach API ${response.status}`);
      const reply = safeText(data?.reply || 'I could not produce a coaching response. Please try again.');
      persist([...next, { id: `bot-${Date.now()}`, sender: 'assistant', text: reply, timestamp: new Date().toISOString() }]);
    } catch (error) {
      console.warn('Coach AI request failed', error); setOnline(false);
      persist([...next, { id: `bot-${Date.now()}`, sender: 'assistant', text: 'I could not reach Coach AI right now. Your message was saved locally. Please try again when the connection is available.', timestamp: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const suggestions = ['How should I adjust today for how I feel?','What should I improve from my recent workouts?','How can this workout help my sport?','What does my recent weight and rep trend show?'];
  return <section className="coach-shell" aria-label="Lifted AI Coach">
    <div className="coach-header"><div className="coach-brand"><div className="coach-icon"><Sparkles size={19} /></div><div><h1>Lifted Coach</h1><p>Uses your training history, check-ins, feedback and schedule.</p></div></div><div className={`coach-status ${online ? 'is-online' : 'is-offline'}`}><span className="status-dot" />{online ? <Wifi size={13} /> : <WifiOff size={13} />}{online ? 'AI ready' : 'Offline'}</div></div>
    <div className="coach-chips">{suggestions.map((s) => <button key={s} type="button" onClick={() => void send(s)} disabled={loading}>{s}</button>)}</div>
    <div className="coach-messages">{messages.length === 0 && <div className="coach-empty"><Bot size={30} /><h2>Your training copilot</h2><p>Ask about your workout, progression, recovery, soreness, or how your training connects to your sport.</p></div>}{messages.map((m) => { const mine = m.sender === 'user'; return <div key={m.id} className={`coach-row ${mine ? 'mine' : ''}`}><div className={`coach-avatar ${mine ? 'user-avatar' : ''}`}>{mine ? <User size={15} /> : <Bot size={15} />}</div><div className={`coach-bubble ${mine ? 'user-bubble' : ''}`}><div>{safeText(m.text)}</div><time>{new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div></div>; })}{loading && <div className="coach-row"><div className="coach-avatar"><Bot size={15} /></div><div className="coach-bubble typing"><span /><span /><span /></div></div>}<div ref={endRef} /></div>
    <form className="coach-composer" onSubmit={(e) => { e.preventDefault(); void send(); }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Lifted anything about your training…" autoComplete="off" enterKeyHint="send" disabled={loading} /><button type="submit" disabled={!input.trim() || loading} aria-label="Send"><Send size={18} /></button></form>
  </section>;
};
