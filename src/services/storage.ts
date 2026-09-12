import {
  DailyReadiness,
  MorningMobilityRoutine,
  NightlyStretchingRoutine,
  ScheduledEvent,
  UserProfile,
  WorkoutPlan,
  ChatMessage,
  PersonalRecord,
  PlyometricsRoutine,
  SchoolWorkoutLog
} from '../types';
import {
  generateLocalWorkoutPlan,
  generateMorningMobilityRoutine,
  generateNightlyStretchingRoutine,
  generateDailyPlyometricsRoutine
} from './fitnessEngine';
import { getTodayDateString, formatLocalDate } from '../utils/dateUtils';

const STORAGE_KEYS = {
  USER_ACCOUNT: 'ai_coach_user_account_v1',
  USER_PROFILE: 'ai_coach_user_profile_v1',
  TODAY_WORKOUT: 'ai_coach_today_workout_v1',
  DAILY_READINESS: 'ai_coach_daily_readiness_v1',
  SCHEDULED_EVENTS: 'ai_coach_scheduled_events_v1',
  WORKOUT_HISTORY: 'ai_coach_workout_history_v1',
  EXERCISE_PERFORMANCE: 'ai_coach_exercise_perf_v1',
  MORNING_MOBILITY: 'ai_coach_morning_mobility_v1',
  NIGHTLY_ROUTINE: 'ai_coach_nightly_routine_v1',
  PLYOMETRICS_ROUTINE: 'lifted_plyometrics_routine_v1',
  SCHOOL_WORKOUT_LOGS: 'lifted_school_workout_logs_v1',
  CHAT_MESSAGES: 'ai_coach_chat_messages_v1',
  PERSONAL_RECORDS: 'ai_coach_personal_records_v1',
  CUSTOM_TEMPLATES: 'lifted_custom_workout_templates_v1',
  ADDITIONAL_WORKOUT: 'lifted_additional_workout_v1',
  ACTIVITY_LOG: 'lifted_activity_completion_v1'
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default', name: 'Alex Rivera', age: 24, height: `5'10"`, weight: '165',
  experienceLevel: 'intermediate', goals: ['Hypertrophy / Muscle Growth', 'Athletic Performance', 'Injury Prevention'], sport: 'Soccer',
  sportDetails: { position: 'Midfielder', trainingFrequency: '3-4x per week', mainPerformanceGoals: 'Stamina, lower body joint durability, upper body strength' },
  equipmentProfile: 'full_gym', availableEquipment: ['barbell', 'dumbbell', 'cable_machine', 'bench', 'pull_up_bar', 'resistance_bands'], weightUnit: 'lb', limitations: [],
  specificInjuries: [], dislikedExercises: [], favoriteExercises: [], neverRecommendExercises: [], preferredWorkoutDuration: 35, onboardingCompleted: false
};

export const DEFAULT_READINESS: DailyReadiness = {
  date: getTodayDateString(), energyLevel: 'good', sorenessLevel: 'none', practiceEarlierToday: false, practiceLaterToday: false,
  practiceIntensity: 'moderate', practiceDurationMinutes: 90, availableMinutes: 35, readinessScore: 8
};

export const DEFAULT_SCHEDULED_EVENTS: ScheduledEvent[] = [
  {
    id: 'evt-game-weekend', date: formatLocalDate(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)), type: 'game', sport: 'Soccer',
    timeOfDay: 'morning', expectedIntensity: 'hard', durationMinutes: 90, notes: 'League Match'
  }
];

export const StorageService = {
  getUserProfile(): UserProfile {
    try { const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE); if (data) return JSON.parse(data); } catch {}
    return DEFAULT_PROFILE;
  },
  saveUserProfile(profile: UserProfile): void { try { localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile)); } catch (e) { console.error(e); } },

  getDailyReadiness(): DailyReadiness {
    const today = getTodayDateString();
    try { const data = localStorage.getItem(STORAGE_KEYS.DAILY_READINESS); if (data) { const parsed = JSON.parse(data); if (parsed.date === today) return parsed; } } catch {}
    return { ...DEFAULT_READINESS, date: today };
  },
  saveDailyReadiness(readiness: DailyReadiness): void { try { localStorage.setItem(STORAGE_KEYS.DAILY_READINESS, JSON.stringify(readiness)); } catch (e) { console.error(e); } },

  getScheduledEvents(): ScheduledEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULED_EVENTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((event: ScheduledEvent) => event.id !== 'evt-practice-today');
          if (cleaned.length !== parsed.length) localStorage.setItem(STORAGE_KEYS.SCHEDULED_EVENTS, JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch {}
    return DEFAULT_SCHEDULED_EVENTS;
  },
  saveScheduledEvents(events: ScheduledEvent[]): void { try { localStorage.setItem(STORAGE_KEYS.SCHEDULED_EVENTS, JSON.stringify(events)); } catch (e) { console.error(e); } },
  addScheduledEvent(event: ScheduledEvent): void { this.saveScheduledEvents([...this.getScheduledEvents(), event]); },
  removeScheduledEvent(id: string): void { this.saveScheduledEvents(this.getScheduledEvents().filter((e) => e.id !== id)); },

  getTodayWorkout(): WorkoutPlan {
    const today = getTodayDateString();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TODAY_WORKOUT);
      if (data) {
        const parsed: any = JSON.parse(data); const plan: WorkoutPlan = parsed?.exercises ? parsed : parsed?.plan;
        if (plan && Array.isArray(plan.exercises) && plan.exercises.length > 0 && plan.date === today) return plan;
      }
    } catch {}
    const plan = generateLocalWorkoutPlan(this.getUserProfile(), this.getDailyReadiness(), this.getScheduledEvents(), this.getExercisePerformanceMap(), today, this.getTodaySchoolWorkoutLog());
    this.saveTodayWorkout(plan); return plan;
  },
  saveTodayWorkout(workout: WorkoutPlan): void { try { localStorage.setItem(STORAGE_KEYS.TODAY_WORKOUT, JSON.stringify(workout?.exercises ? workout : (workout as any)?.plan || workout)); } catch (e) { console.error(e); } },
  getCurrentWorkoutPlan(): WorkoutPlan { return this.getTodayWorkout(); },
  saveCurrentWorkoutPlan(workout: WorkoutPlan): void { this.saveTodayWorkout(workout); },
  resetTodayWorkout(): WorkoutPlan {
    try { localStorage.removeItem(STORAGE_KEYS.TODAY_WORKOUT); } catch {}
    return this.getTodayWorkout();
  },

  getAdditionalWorkout(): WorkoutPlan | null {
    try { const data = localStorage.getItem(STORAGE_KEYS.ADDITIONAL_WORKOUT); if (data) { const parsed = JSON.parse(data); if (parsed.date === getTodayDateString()) return parsed; } } catch {}
    return null;
  },
  saveAdditionalWorkout(workout: WorkoutPlan): void { try { localStorage.setItem(STORAGE_KEYS.ADDITIONAL_WORKOUT, JSON.stringify(workout)); } catch (e) { console.error(e); } },
  deleteAdditionalWorkout(): void { try { localStorage.removeItem(STORAGE_KEYS.ADDITIONAL_WORKOUT); } catch {} },

  getWorkoutHistory(): WorkoutPlan[] {
    try { const data = localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY); if (data) { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed.filter((w) => w.id !== 'hist-1') : []; } } catch {}
    return [];
  },
  saveWorkoutHistory(history: WorkoutPlan[]): void { try { localStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(history)); } catch (e) { console.error(e); } },

  getExercisePerformanceMap(): Record<string, { weight: number; reps: number; difficulty: any; painReported?: boolean; date?: string }> {
    try { const data = localStorage.getItem(STORAGE_KEYS.EXERCISE_PERFORMANCE); if (data) return JSON.parse(data); } catch {}
    return {};
  },
  saveExercisePerformanceMap(map: Record<string, any>): void { try { localStorage.setItem(STORAGE_KEYS.EXERCISE_PERFORMANCE, JSON.stringify(map)); } catch (e) { console.error(e); } },
  rebuildExercisePerformanceMap(history: WorkoutPlan[] = this.getWorkoutHistory()): void {
    const map: Record<string, any> = {};
    [...history].sort((a, b) => a.date.localeCompare(b.date)).forEach((workout) => {
      if (workout.status !== 'completed' && !workout.completedAt) return;
      (workout.exercises || []).forEach((ex) => {
        const sets = (ex.completedSets || []).filter((set) => set.completed && Number(set.weight) >= 0 && Number(set.reps) > 0);
        if (!sets.length && !ex.completed) return;
        const best: any = sets.length ? sets.reduce((a, b) => (Number(b.weight) > Number(a.weight) ? b : a)) : { weight: ex.actualWeightUsed ?? ex.recommendedWeight ?? 0, reps: ex.reps };
        const record = { weight: Number(best.weight) || 0, reps: Number(best.reps) || ex.reps || 0, difficulty: ex.feedbackDifficulty || 'just_right', painReported: Boolean(ex.painReported), date: workout.date };
        map[ex.exerciseId] = record; map[ex.name.toLowerCase().trim()] = record;
      });
    });
    this.saveExercisePerformanceMap(map);
  },
  recordExercisePerformance(workout: WorkoutPlan): void { if (workout?.status === 'completed' || workout?.completedAt) this.rebuildExercisePerformanceMap(this.getWorkoutHistory()); },

  addCompletedWorkout(workout: WorkoutPlan): void {
    const history = this.getWorkoutHistory(); history.unshift(workout); this.saveWorkoutHistory(history); this.rebuildExercisePerformanceMap(history);
  },
  deleteWorkoutHistoryItem(id: string): void {
    const history = this.getWorkoutHistory().filter((w) => w.id !== id); this.saveWorkoutHistory(history); this.rebuildExercisePerformanceMap(history);
    const today = this.getTodayWorkout(); if (today?.id === id) this.resetTodayWorkout();
    const additional = this.getAdditionalWorkout(); if (additional?.id === id) this.deleteAdditionalWorkout();
  },
  clearAllWorkoutHistory(): void { this.saveWorkoutHistory([]); this.saveExercisePerformanceMap({}); this.resetTodayWorkout(); },
  cleanMissedPastWorkouts(): number {
    const today = getTodayDateString(), history = this.getWorkoutHistory(), cleaned = history.filter((w) => !(w.date < today && (w.status === 'planned' || w.status === 'skipped')));
    if (cleaned.length !== history.length) this.saveWorkoutHistory(cleaned); return history.length - cleaned.length;
  },

  getCustomWorkoutTemplates(): WorkoutPlan[] { try { const d = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES); if (d) { const p = JSON.parse(d); return Array.isArray(p) ? p : []; } } catch {} return []; },
  saveCustomWorkoutTemplates(templates: WorkoutPlan[]): void { try { localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates)); } catch (e) { console.error(e); } },
  addCustomWorkoutTemplate(template: WorkoutPlan): void { const t = this.getCustomWorkoutTemplates(); const i = t.findIndex((x) => x.id === template.id); if (i >= 0) t[i] = template; else t.unshift(template); this.saveCustomWorkoutTemplates(t); },

  getSchoolWorkoutLogs(): SchoolWorkoutLog[] { try { const d = localStorage.getItem(STORAGE_KEYS.SCHOOL_WORKOUT_LOGS); if (d) { const p = JSON.parse(d); return Array.isArray(p) ? p : []; } } catch {} return []; },
  saveSchoolWorkoutLogs(logs: SchoolWorkoutLog[]): void { try { localStorage.setItem(STORAGE_KEYS.SCHOOL_WORKOUT_LOGS, JSON.stringify(logs)); } catch (e) { console.error(e); } },
  addSchoolWorkoutLog(log: SchoolWorkoutLog): void { const logs = this.getSchoolWorkoutLogs(); const i = logs.findIndex((l) => l.date === log.date); if (i >= 0) logs[i] = log; else logs.unshift(log); this.saveSchoolWorkoutLogs(logs); },
  getTodaySchoolWorkoutLog(): SchoolWorkoutLog | null { return this.getSchoolWorkoutLogs().find((l) => l.date === getTodayDateString()) || null; },
  getRecentSchoolLogs(limitDays = 7): SchoolWorkoutLog[] { return [...this.getSchoolWorkoutLogs()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limitDays); },
  deleteSchoolWorkoutLog(id: string): void { this.saveSchoolWorkoutLogs(this.getSchoolWorkoutLogs().filter((l) => l.id !== id)); },

  getActivityLog(): Array<{ date: string; type: 'mobility' | 'nightly' | 'plyometrics'; amount?: number }> { try { const d = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG); if (d) { const p = JSON.parse(d); return Array.isArray(p) ? p : []; } } catch {} return []; },
  recordActivity(type: 'mobility' | 'nightly' | 'plyometrics', date: string, amount = 1): void {
    const entries = this.getActivityLog(), i = entries.findIndex((x) => x.date === date && x.type === type), next = { date, type, amount };
    if (i >= 0) entries[i] = next; else entries.push(next); localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(entries));
  },

  calculateDailyStreak() {
    const activeDates = new Set<string>();
    this.getWorkoutHistory().forEach((w) => { if (w.status === 'completed' || w.completedAt) activeDates.add(w.date); });
    this.getSchoolWorkoutLogs().forEach((l) => { if (l.hadWeightliftingClass || l.hadPractice) activeDates.add(l.date); });
    this.getActivityLog().forEach((a) => activeDates.add(a.date));
    const today = getTodayDateString(); let cursor = new Date(`${today}T12:00:00`); if (!activeDates.has(today)) cursor.setDate(cursor.getDate() - 1);
    let currentStreak = 0; while (activeDates.has(cursor.toISOString().split('T')[0])) { currentStreak++; cursor.setDate(cursor.getDate() - 1); }
    const sorted = Array.from(activeDates).sort(); let bestStreak = 0, run = 0; let prev: Date | null = null;
    sorted.forEach((d) => { const cur = new Date(`${d}T12:00:00`); const gap = prev ? Math.round((cur.getTime() - prev.getTime()) / 86400000) : null; run = gap === 1 ? run + 1 : 1; bestStreak = Math.max(bestStreak, run); prev = cur; });
    return { currentStreak, bestStreak, activeDaysThisMonth: sorted.filter((d) => d.startsWith(today.slice(0, 7))).length, lastActiveDate: sorted.at(-1) || '', isActiveToday: activeDates.has(today) };
  },

  calculateAccumulatedVolume() {
    let totalWeightVolume = 0, totalWorkoutsCompleted = 0, totalMinutesTrained = 0, totalSetsCompleted = 0, thisWeekVolume = 0;
    const cutoff = Date.now() - 7 * 86400000;
    this.getWorkoutHistory().forEach((w) => {
      if (w.status !== 'completed' && !w.completedAt) return;
      totalWorkoutsCompleted++; totalMinutesTrained += w.actualMinutes || w.estimatedMinutes || 0;
      (w.exercises || []).forEach((ex) => {
        const sets = (ex.completedSets || []).filter((s) => s.completed);
        if (sets.length) sets.forEach((s) => { totalSetsCompleted++; const v = (s.weight || 0) * (s.reps || 0); totalWeightVolume += v; if (new Date(`${w.date}T12:00:00`).getTime() >= cutoff) thisWeekVolume += v; });
        else if (ex.completed) { totalSetsCompleted += ex.sets; const v = (ex.actualWeightUsed || ex.recommendedWeight || 0) * ex.sets * ex.reps; totalWeightVolume += v; if (new Date(`${w.date}T12:00:00`).getTime() >= cutoff) thisWeekVolume += v; }
      });
    });
    const activity = this.getActivityLog();
    let totalPlyometricJumps = activity.filter((a) => a.type === 'plyometrics').reduce((sum, a) => sum + (a.amount || 0), 0);
    let totalMobilityCompleted = activity.filter((a) => a.type === 'mobility' || a.type === 'nightly').length;
    return { totalWeightVolume, totalWorkoutsCompleted, totalMinutesTrained, totalPlyometricJumps, totalMobilityCompleted, thisWeekVolume, totalSetsCompleted };
  },

  getChatMessages(): ChatMessage[] { try { const d = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES); if (d) return JSON.parse(d); } catch {} return []; },
  saveChatMessages(messages: ChatMessage[]): void { try { localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages)); } catch (e) { console.error(e); } },
  getUserAccount(): any | null { try { const d = localStorage.getItem(STORAGE_KEYS.USER_ACCOUNT); if (d) return JSON.parse(d); } catch {} return null; },
  saveUserAccount(account: any | null): void { try { if (account) localStorage.setItem(STORAGE_KEYS.USER_ACCOUNT, JSON.stringify(account)); else localStorage.removeItem(STORAGE_KEYS.USER_ACCOUNT); } catch (e) { console.error(e); } },
  async syncAllToCloud(account: any, payload: any): Promise<boolean> { if (!account?.identifier) return false; try { const res = await fetch('/api/cloud-sync/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: account.identifier, data: payload }) }); return res.ok; } catch (err) { console.warn('Cloud sync error:', err); return false; } },
  async loadAllFromCloud(identifier: string): Promise<any | null> { try { const res = await fetch(`/api/cloud-sync/load/${encodeURIComponent(identifier)}`); if (!res.ok) return null; const json = await res.json(); return json.data || null; } catch { return null; } },
  resetAll(): void { localStorage.clear(); },
  clearAll(): void { localStorage.clear(); }
};

export const storageService = StorageService;