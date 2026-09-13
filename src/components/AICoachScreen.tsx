import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User, Wifi, WifiOff } from 'lucide-react';
import { ChatMessage, DailyReadiness, ScheduledEvent, SchoolWorkoutLog, UserProfile, WorkoutPlan } from '../types';

interface Props {
  user: UserProfile;
  readiness?: DailyReadiness;
  currentPlan: WorkoutPlan;
  workoutHistory?: WorkoutPlan[];
  scheduledEvents: ScheduledEvent[];
  schoolLogs?: SchoolWorkoutLog[];
  chatMessages: ChatMessage[];
  onSaveMessages: (messages: ChatMessage[]) => void;
}

export const AICoachScreen: React.FC<Props> = ({ user, readiness, currentPlan, workoutHistory = [], scheduledEvents, schoolLogs = [], chatMessages, onSaveMessages }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMessages(chatMessages), [chatMessages]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), [messages, loading]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, sender: 'user', text, timestamp: new Date().toISOString() };
    const next = [...messages, userMsg];
    setMessages(next); onSaveMessages(next); setInput(''); setLoading(true); setOnline(true);
    try {
      const res = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: next,
          user,
          readiness,
          recentHistory: workoutHistory,
          scheduledEvents,
          recentSchoolLogs: schoolLogs,
          todayWorkout: currentPlan,
          targetDate: new Date().toISOString().slice(0, 10)
        })
      });
      if (!res.ok) throw new Error(`Coach API ${res.status}`);
      const data = await res.json();
      const reply = String(data?.reply || 'I could not produce a coaching response. Please try again.');
      const bot: ChatMessage = { id: `bot-${Date.now()}`, sender: 'assistant', text: reply, timestamp: new Date().toISOString() };
      const updated = [...next, bot];
      setMessages(updated); onSaveMessages(updated);
    } catch (error) {
      console.warn('Coach AI request failed', error);
      setOnline(false);
      const bot: ChatMessage = { id: `bot-${Date.now()}`, sender: 'assistant', text: 'I could not reach the Coach AI right now. Your message is saved and will remain in your coach history. Check your connection and try again.', timestamp: new Date().toISOString() };
      const updated = [...next, bot]; setMessages(updated); onSaveMessages(updated);
    } finally { setLoading(false); }
  };

  const suggestions = [
    'How should I adjust today for how I feel?',
    'What should I improve from my recent workouts?',
    'How can this workout help my sport?',
    'What does my recent weight and rep trend show?'
  ];

  return (
    <section className="coach-shell" aria-label="Lifted AI Coach">
      <div className="coach-header">
        <div className="coach-brand">
          <div className="coach-icon"><Sparkles size={19} /></div>
          <div><h1>Lifted Coach</h1><p>Uses your training history, check-ins, feedback and schedule.</p></div>
        </div>
        <div className={`coach-status ${online ? 'is-online' : 'is-offline'}`}><span className="status-dot" />{online ? <Wifi size={13} /> : <WifiOff size={13} />}{online ? 'AI ready' : 'Offline'}</div>
      </div>

      <div className="coach-chips">
        {suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}
      </div>

      <div className="coach-messages">
        {messages.length === 0 && <div className="coach-empty"><Bot size={30} /><h2>Your training copilot</h2><p>Ask about your workout, progression, recovery, soreness, or how your training connects to your sport.</p></div>}
        {messages.map((m) => {
          const mine = m.sender === 'user';
          return <div key={m.id} className={`coach-row ${mine ? 'mine' : ''}`}><div className={`coach-avatar ${mine ? 'user-avatar' : ''}`}>{mine ? <User size={15} /> : <Bot size={15} />}</div><div className={`coach-bubble ${mine ? 'user-bubble' : ''}`}><div>{m.text}</div><time>{new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div></div>;
        })}
        {loading && <div className="coach-row"><div className="coach-avatar"><Bot size={15} /></div><div className="coach-bubble typing"><span /><span /><span /></div></div>}
        <div ref={endRef} />
      </div>

      <form className="coach-composer" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Lifted anything about your training…" autoComplete="off" enterKeyHint="send" />
        <button type="submit" disabled={!input.trim() || loading} aria-label="Send"><Send size={18} /></button>
      </form>
    </section>
  );
};
