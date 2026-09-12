import {
  DailyReadiness,
  MorningMobilityRoutine,
  NightlyStretchingRoutine,
  ScheduledEvent,
  UserProfile,
  WorkoutPlan,
  ChatMessage,
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
  CUSTOM_TEMPLATES: 'lifted_custom_workout_templates_v1',
  ADDITIONAL_WORKOUT: 'lifted_additional_workout_v1',
  ACTIVITY_LOG: 'lifted_activity_completion_v1'
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default',
  name: 'Athlete',
  age: 18,
  height: '',
  weight: '',
  experienceLevel: 'intermediate',
  goals: ['Athletic Performance', 'Strength', 'Injury Prevention'],
  sport: 'General Athletics',
  sportDetails: { position: '', trainingFrequency: '3-4x per week', mainPerformanceGoals: '' },
  equipmentProfile: 'full_gym',
  availableEquipment: ['barbell', 'dumbbell', 'cable_machine', 'bench', 'pull_up_bar', 'resistance_bands'],
  weightUnit: 'lb',
  limitations: [],
  specificInjuries: [],
  dislikedExercises: [],
  favoriteExercises: [],
  neverRecommendExercises: [],
  preferredWorkoutDuration: 35,
  onboardingCompleted: false
};

export const DEFAULT_READINESS: DailyReadiness = {
  date: getTodayDateString(),
  energyLevel: 'good',
  sorenessLevel: 'none',
  practiceEarlierToday: false,
  practiceLaterToday: false,
  practiceIntensity: 'moderate',
  practiceDurationMinutes: 90,
  availableMinutes: 35,
  readinessScore: 8
};

export const DEFAULT_SCHEDULED_EVENTS: ScheduledEvent[] = [];

const parse = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); }
};

export const StorageService = {
  getUserProfile(): UserProfile {
    const saved = parse<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null);
    if (!saved) return DEFAULT_PROFILE;
    return {
      ...DEFAULT_PROFILE,
      ...saved,
      goals: Array.isArray(saved.goals) ? saved.goals : DEFAULT_PROFILE.goals,
      availableEquipment: Array.isArray(saved.availableEquipment) ? saved.availableEquipment : DEFAULT_PROFILE.availableEquipment,
      limitations: Array.isArray(saved.limitations) ? saved.limitations : [],
      specificInjuries: Array.isArray(saved.specificInjuries) ? saved.specificInjuries : [],
      dislikedExercises: Array.isArray(saved.dislikedExercises) ? saved.dislikedExercises : [],
      favoriteExercises: Array.isArray(saved.favoriteExercises) ? saved.favoriteExercises : [],
      neverRecommendExercises: Array.isArray(saved.neverRecommendExercises) ? saved.neverRecommendExercises : []
    };
  },
  saveUserProfile(profile: UserProfile) { save(STORAGE_KEYS.USER_PROFILE, profile); },

  getDailyReadiness(): DailyReadiness {
    const today = getTodayDateString();
    const saved = parse<DailyReadiness | null>(STORAGE_KEYS.DAILY_READINESS, null);
    return saved?.date === today ? saved : { ...DEFAULT_READINESS, date: today };
  },
  saveDailyReadiness(readiness: DailyReadiness) { save(STORAGE_KEYS.DAILY_READINESS, readiness); },

  getScheduledEvents(): ScheduledEvent[] {
    const events = parse<ScheduledEvent[]>(STORAGE_KEYS.SCHEDULED_EVENTS, DEFAULT_SCHEDULED_EVENTS);
    return Array.isArray(events) ? events.filter((e) => e.id !== 'evt-practice-today') : [];
  },
  saveScheduledEvents(events: ScheduledEvent[]) { save(STORAGE_KEYS.SCHEDULED_EVENTS, events); },
  addScheduledEvent(event: ScheduledEvent) { this.saveScheduledEvents([...this.getScheduledEvents(), event]); },
  removeScheduledEvent(id: string) { this.saveScheduledEvents(this.getScheduledEvents().filter((e) => e.id !== id)); },

  getTodayWorkout(): WorkoutPlan {
    const today = getTodayDateString();
    const saved = parse<any>(STORAGE_KEYS.TODAY_WORKOUT, null);
    const plan: WorkoutPlan | null = saved?.exercises ? saved : saved?.plan || null;
    if (plan && Array.isArray(plan.exercises) && plan.exercises.length && plan.date === today) return plan;
    const generated = generateLocalWorkoutPlan(
      this.getUserProfile(), this.getDailyReadiness(), this.getScheduledEvents(),
      this.getExercisePerformanceMap(), today, this.getTodaySchoolWorkoutLog()
    );
    this.saveTodayWorkout(generated);
    return generated;
  },
  saveTodayWorkout(workout: WorkoutPlan) { save(STORAGE_KEYS.TODAY_WORKOUT, workout?.exercises ? workout : (workout as any)?.plan || workout); },
  getCurrentWorkoutPlan(): WorkoutPlan { return this.getTodayWorkout(); },
  saveCurrentWorkoutPlan(workout: WorkoutPlan) { this.saveTodayWorkout(workout); },
  resetTodayWorkout(): WorkoutPlan {
    try { localStorage.removeItem(STORAGE_KEYS.TODAY_WORKOUT); } catch {}
    return this.getTodayWorkout();
  },

  getAdditionalWorkout(): WorkoutPlan | null {
    const plan = parse<WorkoutPlan | null>(STORAGE_KEYS.ADDITIONAL_WORKOUT, null);
    return plan?.date === getTodayDateString() ? plan : null;
  },
  saveAdditionalWorkout(workout: WorkoutPlan) { save(STORAGE_KEYS.ADDITIONAL_WORKOUT, workout); },
  deleteAdditionalWorkout() { try { localStorage.removeItem(STORAGE_KEYS.ADDITIONAL_WORKOUT); } catch {} },

  getWorkoutHistory(): WorkoutPlan[] {
    const history = parse<WorkoutPlan[]>(STORAGE_KEYS.WORKOUT_HISTORY, []);
    return Array.isArray(history) ? history.filter((w) => w.id !== 'hist-1') : [];
  },
  saveWorkoutHistory(history: WorkoutPlan[]) { save(STORAGE_KEYS.WORKOUT_HISTORY, history); },

  getExercisePerformanceMap(): Record<string, any> { return parse<Record<string, any>>(STORAGE_KEYS.EXERCISE_PERFORMANCE, {}); },
  saveExercisePerformanceMap(map: Record<string, any>) { save(STORAGE_KEYS.EXERCISE_PERFORMANCE, map); },
  rebuildExercisePerformanceMap(history: WorkoutPlan[] = this.getWorkoutHistory()) {
    const map: Record<string, any> = {};
    [...history].sort((a, b) => a.date.localeCompare(b.date)).forEach((workout) => {
      if (workout.status !== 'completed' && !workout.completedAt) return;
      (workout.exercises || []).forEach((ex) => {
        const sets = (ex.completedSets || []).filter((s) => s.completed && Number(s.weight) >= 0 && Number(s.reps) > 0);
        if (!sets.length && !ex.completed) return;
        const best: any = sets.length ? sets.reduce((a, b) => Number(b.weight) > Number(a.weight) ? b : a) : { weight: ex.actualWeightUsed ?? ex.recommendedWeight ?? 0, reps: ex.reps };
        const record = { weight: Number(best.weight) || 0, reps: Number(best.reps) || ex.reps || 0, difficulty: ex.feedbackDifficulty || 'just_right', painReported: Boolean(ex.painReported), date: workout.date };
        map[ex.exerciseId] = record;
        map[ex.name.toLowerCase().trim()] = record;
      });
    });
    this.saveExercisePerformanceMap(map);
  },
  recordExercisePerformance(workout: WorkoutPlan) {
    if (workout?.status === 'completed' || workout?.completedAt) this.rebuildExercisePerformanceMap(this.getWorkoutHistory());
  },
  addCompletedWorkout(workout: WorkoutPlan) {
    const history = this.getWorkoutHistory();
    history.unshift(workout);
    this.saveWorkoutHistory(history);
    this.rebuildExercisePerformanceMap(history);
  },
  deleteWorkoutHistoryItem(id: string) {
    const history = this.getWorkoutHistory().filter((w) => w.id !== id);
    this.saveWorkoutHistory(history);
    this.rebuildExercisePerformanceMap(history);
    if (this.getTodayWorkout()?.id === id) this.resetTodayWorkout();
    if (this.getAdditionalWorkout()?.id === id) this.deleteAdditionalWorkout();
  },
  clearAllWorkoutHistory() { this.saveWorkoutHistory([]); this.saveExercisePerformanceMap({}); this.resetTodayWorkout(); },
  cleanMissedPastWorkouts() {
    const today = getTodayDateString();
    const history = this.getWorkoutHistory();
    const cleaned = history.filter((w) => !(w.date < today && (w.status === 'planned' || w.status === 'skipped')));
    if (cleaned.length !== history.length) this.saveWorkoutHistory(cleaned);
    return history.length - cleaned.length;
  },

  getMorningMobility(): MorningMobilityRoutine {
    const today = getTodayDateString();
    const saved = parse<MorningMobilityRoutine | null>(STORAGE_KEYS.MORNING_MOBILITY, null);
    if (saved?.date === today) return saved;
    const routine = generateMorningMobilityRoutine(this.getUserProfile(), this.getDailyReadiness(), 10);
    this.saveMorningMobility(routine);
    return routine;
  },
  saveMorningMobility(routine: MorningMobilityRoutine) { save(STORAGE_KEYS.MORNING_MOBILITY, routine); },

  getNightlyRoutine(): NightlyStretchingRoutine {
    const today = getTodayDateString();
    const saved = parse<NightlyStretchingRoutine | null>(STORAGE_KEYS.NIGHTLY_ROUTINE, null);
    if (saved?.date === today) return saved;
    const routine = generateNightlyStretchingRoutine(this.getUserProfile(), this.getDailyReadiness(), 10, this.getTodayWorkout());
    this.saveNightlyRoutine(routine);
    return routine;
  },
  saveNightlyRoutine(routine: NightlyStretchingRoutine) { save(STORAGE_KEYS.NIGHTLY_ROUTINE, routine); },

  getPlyometricsRoutine(): PlyometricsRoutine {
    const today = getTodayDateString();
    const saved = parse<PlyometricsRoutine | null>(STORAGE_KEYS.PLYOMETRICS_ROUTINE, null);
    if (saved?.date === today) return saved;
    const routine = generateDailyPlyometricsRoutine(this.getUserProfile(), this.getDailyReadiness(), this.getTodaySchoolWorkoutLog(), 12);
    this.savePlyometricsRoutine(routine);
    return routine;
  },
  savePlyometricsRoutine(routine: PlyometricsRoutine) { save(STORAGE_KEYS.PLYOMETRICS_ROUTINE, routine); },

  getCustomWorkoutTemplates(): WorkoutPlan[] { return parse<WorkoutPlan[]>(STORAGE_KEYS.CUSTOM_TEMPLATES, []); },
  saveCustomWorkoutTemplates(templates: WorkoutPlan[]) { save(STORAGE_KEYS.CUSTOM_TEMPLATES, templates); },
  addCustomWorkoutTemplate(template: WorkoutPlan) {
    const templates = this.getCustomWorkoutTemplates();
    const index = templates.findIndex((t) => t.id === template.id);
    if (index >= 0) templates[index] = template; else templates.unshift(template);
    this.saveCustomWorkoutTemplates(templates);
  },

  getSchoolWorkoutLogs(): SchoolWorkoutLog[] { return parse<SchoolWorkoutLog[]>(STORAGE_KEYS.SCHOOL_WORKOUT_LOGS, []); },
  saveSchoolWorkoutLogs(logs: SchoolWorkoutLog[]) { save(STORAGE_KEYS.SCHOOL_WORKOUT_LOGS, logs); },
  addSchoolWorkoutLog(log: SchoolWorkoutLog) {
    const logs = this.getSchoolWorkoutLogs();
    const key = log.weightliftingDate || log.date;
    const index = logs.findIndex((l) => (l.weightliftingDate || l.date) === key && (l.practiceDate || '') === (log.practiceDate || ''));
    if (index >= 0) logs[index] = log; else logs.unshift(log);
    this.saveSchoolWorkoutLogs(logs);
  },
  getTodaySchoolWorkoutLog(): SchoolWorkoutLog | null {
    const today = getTodayDateString();
    return this.getSchoolWorkoutLogs().find((l) => (l.weightliftingDate || l.date) === today || (l.practiceDate || l.date) === today) || null;
  },
  getRecentSchoolLogs(limitDays = 7) { return [...this.getSchoolWorkoutLogs()].sort((a, b) => (b.weightliftingDate || b.date).localeCompare(a.weightliftingDate || a.date)).slice(0, limitDays); },
  deleteSchoolWorkoutLog(id: string) { this.saveSchoolWorkoutLogs(this.getSchoolWorkoutLogs().filter((l) => l.id !== id)); },

  getActivityLog(): Array<{ date: string; type: 'mobility' | 'nightly' | 'plyometrics'; amount?: number }> { return parse(STORAGE_KEYS.ACTIVITY_LOG, []); },
  recordActivity(type: 'mobility' | 'nightly' | 'plyometrics', date: string, amount = 1) {
    const entries = this.getActivityLog();
    const next = { date, type, amount };
    const index = entries.findIndex((x) => x.date === date && x.type === type);
    if (index >= 0) entries[index] = next; else entries.push(next);
    save(STORAGE_KEYS.ACTIVITY_LOG, entries);
  },

  calculateDailyStreak() {
    const activeDates = new Set<string>();
    this.getWorkoutHistory().forEach((w) => { if (w.status === 'completed' || w.completedAt) activeDates.add(w.date); });
    this.getSchoolWorkoutLogs().forEach((l) => {
      if (l.hadWeightliftingClass) activeDates.add(l.weightliftingDate || l.date);
      if (l.hadPractice) activeDates.add(l.practiceDate || l.date);
    });
    this.getActivityLog().forEach((a) => activeDates.add(a.date));
    const today = getTodayDateString();
    let cursor = new Date(`${today}T12:00:00`);
    if (!activeDates.has(today)) cursor.setDate(cursor.getDate() - 1);
    let currentStreak = 0;
    while (activeDates.has(cursor.toISOString().split('T')[0])) { currentStreak++; cursor.setDate(cursor.getDate() - 1); }
    const sorted = [...activeDates].sort();
    let bestStreak = 0, run = 0, previous: Date | null = null;
    for (const d of sorted) {
      const cur = new Date(`${d}T12:00:00`);
      const gap = previous ? Math.round((cur.getTime() - previous.getTime()) / 86400000) : 0;
      run = gap === 1 ? run + 1 : 1;
      bestStreak = Math.max(bestStreak, run);
      previous = cur;
    }
    return { currentStreak, bestStreak, activeDaysThisMonth: sorted.filter((d) => d.startsWith(today.slice(0, 7))).length, lastActiveDate: sorted.at(-1) || '', isActiveToday: activeDates.has(today) };
  },

  calculateAccumulatedVolume() {
    let totalWeightVolume = 0, totalWorkoutsCompleted = 0, totalMinutesTrained = 0, totalSetsCompleted = 0, thisWeekVolume = 0;
    const cutoff = Date.now() - 7 * 86400000;
    this.getWorkoutHistory().forEach((w) => {
      if (w.status !== 'completed' && !w.completedAt) return;
      totalWorkoutsCompleted++;
      totalMinutesTrained += w.actualMinutes || w.estimatedMinutes || 0;
      (w.exercises || []).forEach((ex) => {
        const sets = (ex.completedSets || []).filter((s) => s.completed);
        if (sets.length) sets.forEach((s) => { totalSetsCompleted++; const volume = (s.weight || 0) * (s.reps || 0); totalWeightVolume += volume; if (new Date(`${w.date}T12:00:00`).getTime() >= cutoff) thisWeekVolume += volume; });
        else if (ex.completed) { totalSetsCompleted += ex.sets; const volume = (ex.actualWeightUsed || ex.recommendedWeight || 0) * ex.sets * ex.reps; totalWeightVolume += volume; if (new Date(`${w.date}T12:00:00`).getTime() >= cutoff) thisWeekVolume += volume; }
      });
    });
    const activity = this.getActivityLog();
    const totalPlyometricJumps = activity.filter((a) => a.type === 'plyometrics').reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalMobilityCompleted = activity.filter((a) => a.type === 'mobility' || a.type === 'nightly').length;
    return { totalWeightVolume, totalWorkoutsCompleted, totalMinutesTrained, totalPlyometricJumps, totalMobilityCompleted, thisWeekVolume, totalSetsCompleted };
  },

  getChatMessages(): ChatMessage[] { return parse<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES, []); },
  saveChatMessages(messages: ChatMessage[]) { save(STORAGE_KEYS.CHAT_MESSAGES, messages); },
  getUserAccount(): any | null { return parse(STORAGE_KEYS.USER_ACCOUNT, null); },
  saveUserAccount(account: any | null) { if (account) save(STORAGE_KEYS.USER_ACCOUNT, account); else { try { localStorage.removeItem(STORAGE_KEYS.USER_ACCOUNT); } catch {} } },

  async syncAllToCloud(account: any, payload: any): Promise<boolean> {
    if (!account?.identifier) return false;
    try {
      const res = await fetch('/api/cloud-sync/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: account.identifier, data: payload }) });
      return res.ok && (res.headers.get('content-type') || '').includes('application/json');
    } catch { return false; }
  },
  async loadAllFromCloud(identifier: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/cloud-sync/load/${encodeURIComponent(identifier)}`);
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return null;
      const json = await res.json();
      return json?.data || null;
    } catch { return null; }
  },

  resetAll() { localStorage.clear(); },
  clearAll() { localStorage.clear(); }
};

export const storageService = StorageService;
