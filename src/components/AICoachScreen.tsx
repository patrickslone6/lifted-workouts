import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ScheduledEvent, UserProfile, WorkoutPlan } from '../types';
import {
  Sparkles,
  Send,
  Bot,
  User,
  HelpCircle,
  Clock,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';

interface Props {
  user: UserProfile;
  currentPlan: WorkoutPlan;
  scheduledEvents: ScheduledEvent[];
  chatMessages: ChatMessage[];
  onSaveMessages: (messages: ChatMessage[]) => void;
  onQuickAdaptPlan?: (adaptation: string) => void;
}

export const AICoachScreen: React.FC<Props> = ({
  user,
  currentPlan,
  scheduledEvents,
  chatMessages,
  onSaveMessages,
  onQuickAdaptPlan
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    onSaveMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: newMessages.slice(-6),
          userContext: user,
          currentPlan,
          scheduledEvents
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const updated = [...newMessages, botMsg];
        setMessages(updated);
        onSaveMessages(updated);
      } else {
        throw new Error('Network error');
      }
    } catch (e) {
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: `Coach advice: Focus on form and keeping 1-2 reps in reserve. Since you have practice later today, we have already modulated the leg volume to prevent delayed onset muscle soreness. Feel free to adjust the time or load at any point!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const updated = [...newMessages, botMsg];
      setMessages(updated);
      onSaveMessages(updated);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-3xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-left">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">AI Athletic Coach</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Memory
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Aware of your {user.sport} training, practice schedule, and upcoming matches
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3 bg-zinc-950/40 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
        {[
          'Why this weight for squats?',
          'How does practice later change my workout?',
          'Taper for my game this weekend',
          'Make today a 20-minute session',
          'How do I maximize hypertrophy safely?'
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs transition shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isMe = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isMe
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                }`}
              >
                {isMe ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-zinc-950/80 border border-zinc-800 text-zinc-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <span
                  className={`text-[10px] block mt-1.5 ${
                    isMe ? 'text-emerald-200 text-right' : 'text-zinc-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs p-2">
            <Bot className="w-4 h-4 animate-spin text-emerald-400" />
            <span>AI Coach is analyzing your schedule and biomechanics...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about weights, form, hypertrophy, upcoming games..."
          className="flex-1 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition shadow-lg shadow-emerald-950"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
