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
  CUSTOM_TEMPLATES: 'lifted_custom_workout_templates_v1'
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default',
  name: 'Alex Rivera',
  age: 24,
  height: `5'10"`,
  weight: '165',
  experienceLevel: 'intermediate',
  goals: ['Hypertrophy / Muscle Growth', 'Athletic Performance', 'Injury Prevention'],
  sport: 'Soccer',
  sportDetails: {
    position: 'Midfielder',
    trainingFrequency: '3-4x per week',
    mainPerformanceGoals: 'Stamina, lower body joint durability, upper body strength'
  },
  equipmentProfile: 'full_gym',
  availableEquipment: ['barbell', 'dumbbell', 'cable_machine', 'bench', 'pull_up_bar', 'resistance_bands'],
  weightUnit: 'lb',
  limitations: [],
  specificInjuries: [
    {
      id: 'inj-default-1',
      name: 'Left Patellar Tendonitis',
      description: 'Anterior knee pain during deep squats and landing after jumping',
      aggravatingMovements: 'Deep knee flexion, deceleration, plyometric jumping',
      severity: 'moderate',
      todayStatus: 'mild_stiffness'
    }
  ],
  dislikedExercises: [],
  favoriteExercises: ['db-goblet-squat', 'db-single-arm-row'],
  neverRecommendExercises: [],
  preferredWorkoutDuration: 35,
  onboardingCompleted: true
};

export const DEFAULT_READINESS: DailyReadiness = {
  date: getTodayDateString(),
  energyLevel: 'good',
  sorenessLevel: 'none',
  practiceEarlierToday: false,
  practiceLaterToday: true, // Show user-requested practice later today out-of-the-box!
  practiceIntensity: 'moderate',
  practiceDurationMinutes: 90,
  availableMinutes: 35,
  readinessScore: 8
};

// Seed realistic upcoming game and practice events at start of the week
export const DEFAULT_SCHEDULED_EVENTS: ScheduledEvent[] = [
  {
    id: 'evt-practice-today',
    date: getTodayDateString(),
    type: 'practice',
    sport: 'Soccer',
    timeOfDay: 'later_today',
    expectedIntensity: 'moderate',
    durationMinutes: 90,
    notes: 'Team tactical drills & sprint intervals'
  },
  {
    id: 'evt-game-weekend',
    // 4 days from now (Saturday game)
    date: formatLocalDate(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
    type: 'game',
    sport: 'Soccer',
    timeOfDay: 'morning',
    expectedIntensity: 'hard',
    durationMinutes: 90,
    notes: 'League Match vs Rivals'
  }
];

export const StorageService = {
  getUserProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return DEFAULT_PROFILE;
  },

  saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save user profile', e);
    }
  },

  getDailyReadiness(): DailyReadiness {
    const today = getTodayDateString();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_READINESS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.date === today) return parsed;
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_READINESS, date: today };
  },

  saveDailyReadiness(readiness: DailyReadiness): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_READINESS, JSON.stringify(readiness));
    } catch (e) {
      console.error('Failed to save readiness', e);
    }
  },

  getScheduledEvents(): ScheduledEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULED_EVENTS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return DEFAULT_SCHEDULED_EVENTS;
  },

  saveScheduledEvents(events: ScheduledEvent[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_EVENTS, JSON.stringify(events));
    } catch (e) {
      console.error('Failed to save scheduled events', e);
    }
  },

  addScheduledEvent(event: ScheduledEvent): void {
    const events = this.getScheduledEvents();
    events.push(event);
    this.saveScheduledEvents(events);
  },

  removeScheduledEvent(id: string): void {
    const events = this.getScheduledEvents().filter((e) => e.id !== id);
    this.saveScheduledEvents(events);
  },

  getTodayWorkout(): WorkoutPlan {
    const today = getTodayDateString();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TODAY_WORKOUT);
      if (data) {
        const parsed: any = JSON.parse(data);
        const plan: WorkoutPlan = parsed?.exercises ? parsed : parsed?.plan;
        if (plan && Array.isArray(plan.exercises) && plan.exercises.length > 0) {
          if (plan.date === today) return plan;
        }
      }
    } catch {
      // fallback
    }

    // Auto-generate fresh plan using user profile, readiness and scheduled events
    const profile = this.getUserProfile();
    const readiness = this.getDailyReadiness();
    const events = this.getScheduledEvents();
    const history = this.getExercisePerformanceMap();
    const newPlan = generateLocalWorkoutPlan(profile, readiness, events, history, today);
    this.saveTodayWorkout(newPlan);
    return newPlan;
  },

  saveTodayWorkout(workout: any): void {
    try {
      const planToSave = workout?.exercises ? workout : (workout?.plan || workout);
      localStorage.setItem(STORAGE_KEYS.TODAY_WORKOUT, JSON.stringify(planToSave));
    } catch (e) {
      console.error('Failed to save today workout', e);
    }
  },

  getCurrentWorkoutPlan(): WorkoutPlan {
    return this.getTodayWorkout();
  },

  saveCurrentWorkoutPlan(workout: WorkoutPlan): void {
    this.saveTodayWorkout(workout);
  },

  getMorningMobility(): MorningMobilityRoutine {
    const today = getTodayDateString();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MORNING_MOBILITY);
      if (data) {
        const parsed: MorningMobilityRoutine = JSON.parse(data);
        if (parsed.date === today) return parsed;
      }
    } catch {
      // fallback
    }
    const profile = this.getUserProfile();
    const readiness = this.getDailyReadiness();
    const mobility = generateMorningMobilityRoutine(profile, readiness, 10);
    this.saveMorningMobility(mobility);
    return mobility;
  },

  saveMorningMobility(mobility: MorningMobilityRoutine): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MORNING_MOBILITY, JSON.stringify(mobility));
    } catch (e) {
      console.error('Failed to save morning mobility', e);
    }
  },

  getNightlyRoutine(): NightlyStretchingRoutine {
    const today = getTodayDateString();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NIGHTLY_ROUTINE);
      if (data) {
        const parsed: NightlyStretchingRoutine = JSON.parse(data);
        if (parsed.date === today) return parsed;
      }
    } catch {
      // fallback
    }
    const profile = this.getUserProfile();
    const readiness = this.getDailyReadiness();
    const todayWorkout = this.getTodayWorkout();
    const routine = generateNightlyStretchingRoutine(profile, readiness, 10, todayWorkout);
    this.saveNightlyRoutine(routine);
    return routine;
  },

  saveNightlyRoutine(routine: NightlyStretchingRoutine): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NIGHTLY_ROUTINE, JSON.stringify(routine));
    } catch (e) {
      console.error('Failed to save nightly routine', e);
    }
  },

  getPlyometricsRoutine(): PlyometricsRoutine {
    const today = getTodayDateString();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLYOMETRICS_ROUTINE);
      if (data) {
        const parsed: PlyometricsRoutine = JSON.parse(data);
        if (parsed.date === today) return parsed;
      }
    } catch {
      // fallback
    }
    const profile = this.getUserProfile();
    const readiness = this.getDailyReadiness();
    const schoolLog = this.getTodaySchoolWorkoutLog();
    const routine = generateDailyPlyometricsRoutine(profile, readiness, schoolLog, 12);
    this.savePlyometricsRoutine(routine);
    return routine;
  },

  savePlyometricsRoutine(routine: PlyometricsRoutine): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLYOMETRICS_ROUTINE, JSON.stringify(routine));
    } catch (e) {
      console.error('Failed to save plyometrics routine', e);
    }
  },

  getWorkoutHistory(): WorkoutPlan[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    // Return sample completed workout from 2 days ago for immediate historical reference
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return [
      {
        id: 'hist-1',
        date: twoDaysAgo,
        workoutTitle: 'Lower Body Unilateral Power & Core',
        goal: 'Hypertrophy & Sprint Power',
        status: 'completed',
        estimatedMinutes: 35,
        actualMinutes: 34,
        readinessStatus: 'High Readiness',
        reasoning: 'Focused on single-leg stability to shield knees from soccer cutting forces.',
        practiceLaterToday: false,
        equipmentNeeded: ['dumbbell', 'bench'],
        completedAt: `${twoDaysAgo}T18:30:00Z`,
        userNotes: 'Felt very explosive on the Bulgarian split squats. 20 lb felt just right.',
        exercises: [
          {
            id: 'pe-hist-1',
            exerciseId: 'db-goblet-squat',
            name: 'Dumbbell Goblet Squat',
            sets: 3,
            reps: 10,
            recommendedWeight: 25,
            actualWeightUsed: 25,
            weightUnit: 'lb',
            restSeconds: 90,
            targetMuscles: ['Quadriceps', 'Gluteus Maximus'],
            completed: true,
            feedbackDifficulty: 'just_right',
            completedSets: [
              { setNumber: 1, weight: 25, reps: 10, completed: true },
              { setNumber: 2, weight: 25, reps: 10, completed: true },
              { setNumber: 3, weight: 25, reps: 10, completed: true }
            ]
          },
          {
            id: 'pe-hist-2',
            exerciseId: 'db-romanian-deadlift',
            name: 'Dumbbell Romanian Deadlift (RDL)',
            sets: 3,
            reps: 10,
            recommendedWeight: 25,
            actualWeightUsed: 25,
            weightUnit: 'lb',
            restSeconds: 90,
            targetMuscles: ['Hamstrings', 'Gluteus Maximus'],
            completed: true,
            feedbackDifficulty: 'easy',
            completedSets: [
              { setNumber: 1, weight: 25, reps: 10, completed: true },
              { setNumber: 2, weight: 25, reps: 10, completed: true },
              { setNumber: 3, weight: 25, reps: 10, completed: true }
            ]
          }
        ]
      }
    ];
  },

  saveWorkoutHistory(history: WorkoutPlan[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save workout history', e);
    }
  },

  addCompletedWorkout(workout: WorkoutPlan): void {
    const history = this.getWorkoutHistory();
    history.unshift(workout);
    this.saveWorkoutHistory(history);

    // Also update exercise performance tracking map for future weight calculations
    const perfMap = this.getExercisePerformanceMap();
    workout.exercises.forEach((ex) => {
      if (ex.completed && ex.actualWeightUsed !== undefined) {
        perfMap[ex.exerciseId] = {
          weight: ex.actualWeightUsed,
          reps: ex.reps,
          difficulty: ex.feedbackDifficulty || 'just_right',
          painReported: ex.painReported
        };
      }
    });
    this.saveExercisePerformanceMap(perfMap);
  },

  getExercisePerformanceMap(): Record<string, { weight: number; reps: number; difficulty: any; painReported?: boolean }> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXERCISE_PERFORMANCE);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return {
      'db-goblet-squat': { weight: 25, reps: 10, difficulty: 'just_right' },
      'db-romanian-deadlift': { weight: 25, reps: 10, difficulty: 'easy' },
      'db-flat-bench-press': { weight: 25, reps: 8, difficulty: 'just_right' }
    };
  },

  saveExercisePerformanceMap(map: Record<string, any>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXERCISE_PERFORMANCE, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to save exercise performance map', e);
    }
  },

  recordExercisePerformance(workout: WorkoutPlan): void {
    try {
      const map = this.getExercisePerformanceMap();
      for (const ex of workout.exercises || []) {
        let weight = ex.actualWeightUsed ?? ex.recommendedWeight;
        let reps = ex.reps;
        if (ex.completedSets && ex.completedSets.length > 0) {
          const completed = ex.completedSets.filter((s) => s.completed !== false);
          if (completed.length > 0) {
            weight = Math.max(...completed.map((s) => s.weight || 0));
            reps = completed[completed.length - 1].reps || reps;
          }
        }
        if (weight !== undefined && weight !== null) {
          map[ex.exerciseId] = {
            weight,
            reps,
            difficulty: ex.feedbackDifficulty || 'just_right',
            painReported: ex.painReported
          };
          map[ex.name.toLowerCase().trim()] = {
            weight,
            reps,
            difficulty: ex.feedbackDifficulty || 'just_right',
            painReported: ex.painReported
          };
        }
      }
      this.saveExercisePerformanceMap(map);
    } catch (e) {
      console.error('Failed to record exercise performance', e);
    }
  },

  getChatMessages(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [
      {
        id: 'msg-init',
        sender: 'assistant',
        text: `Hey Alex! I have calibrated today's workout for you. Because you have soccer practice later today, I structured today's plan to protect your legs from heavy fatigue while keeping your upper body, posture, and core resilient. Also, I see your match coming up on Saturday and have scheduled your training volume to peak your explosiveness. What questions do you have?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  },

  saveChatMessages(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat messages', e);
    }
  },

  deleteWorkoutHistoryItem(id: string): void {
    const history = this.getWorkoutHistory().filter((w) => w.id !== id);
    this.saveWorkoutHistory(history);
  },

  cleanMissedPastWorkouts(): number {
    const todayStr = new Date().toISOString().split('T')[0];
    const history = this.getWorkoutHistory();
    // Only remove workouts that are from before today and were never completed
    const initialLen = history.length;
    const cleaned = history.filter((w) => {
      const isPast = w.date < todayStr;
      const isMissed = w.status === 'planned' || w.status === 'skipped';
      return !(isPast && isMissed);
    });
    if (cleaned.length !== initialLen) {
      this.saveWorkoutHistory(cleaned);
    }
    return initialLen - cleaned.length;
  },

  getUserAccount(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_ACCOUNT);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return null;
  },

  saveUserAccount(account: any | null): void {
    try {
      if (account) {
        localStorage.setItem(STORAGE_KEYS.USER_ACCOUNT, JSON.stringify(account));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_ACCOUNT);
      }
    } catch (e) {
      console.error('Failed to save account', e);
    }
  },

  async syncAllToCloud(account: any, payload: any): Promise<boolean> {
    if (!account?.identifier) return false;
    try {
      const res = await fetch('/api/cloud-sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: account.identifier,
          data: payload
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('Cloud sync error:', err);
      return false;
    }
  },

  async loadAllFromCloud(identifier: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/cloud-sync/load/${encodeURIComponent(identifier)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.warn('Cloud load error:', err);
      return null;
    }
  },

  getCustomWorkoutTemplates(): WorkoutPlan[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [];
  },

  saveCustomWorkoutTemplates(templates: WorkoutPlan[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to save templates', e);
    }
  },

  addCustomWorkoutTemplate(template: WorkoutPlan): void {
    const templates = this.getCustomWorkoutTemplates();
    const existingIdx = templates.findIndex((t) => t.id === template.id);
    if (existingIdx >= 0) {
      templates[existingIdx] = template;
    } else {
      templates.unshift(template);
    }
    this.saveCustomWorkoutTemplates(templates);
  },

  getSchoolWorkoutLogs(): SchoolWorkoutLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHOOL_WORKOUT_LOGS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [];
  },

  saveSchoolWorkoutLogs(logs: SchoolWorkoutLog[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHOOL_WORKOUT_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save school workout logs', e);
    }
  },

  addSchoolWorkoutLog(log: SchoolWorkoutLog): void {
    const logs = this.getSchoolWorkoutLogs();
    const existingIdx = logs.findIndex((l) => l.date === log.date);
    if (existingIdx >= 0) {
      logs[existingIdx] = log;
    } else {
      logs.unshift(log);
    }
    this.saveSchoolWorkoutLogs(logs);
  },

  getTodaySchoolWorkoutLog(): SchoolWorkoutLog | null {
    const today = getTodayDateString();
    const logs = this.getSchoolWorkoutLogs();
    return logs.find((l) => l.date === today) || null;
  },

  /**
   * Real daily workout streak calculation
   * Checks workouts, plyos, mobility, stretches, and school weightlifting/practice
   */
  calculateDailyStreak(): {
    currentStreak: number;
    bestStreak: number;
    activeDaysThisMonth: number;
    lastActiveDate: string;
    isActiveToday: boolean;
  } {
    const activeDates = new Set<string>();

    // 1. History workouts
    const history = this.getWorkoutHistory();
    for (const w of history) {
      if (w.status === 'completed' || w.completedAt) {
        activeDates.add(w.date);
      }
    }

    // 2. Today's workout
    const todayWorkout = this.getTodayWorkout();
    if (todayWorkout && todayWorkout.status === 'completed') {
      activeDates.add(todayWorkout.date);
    }

    // 3. Morning mobility
    const morning = this.getMorningMobility();
    if (morning && morning.completed) {
      activeDates.add(morning.date);
    }

    // 4. Nightly routine
    const nightly = this.getNightlyRoutine();
    if (nightly && nightly.completed) {
      activeDates.add(nightly.date);
    }

    // 5. Plyometrics
    const plyo = this.getPlyometricsRoutine();
    if (plyo && plyo.completed) {
      activeDates.add(plyo.date);
    }

    // 6. School logs
    const schoolLogs = this.getSchoolWorkoutLogs();
    for (const s of schoolLogs) {
      if (s.hadWeightliftingClass || s.hadPractice) {
        activeDates.add(s.date);
      }
    }

    const todayStr = getTodayDateString();
    const isActiveToday = activeDates.has(todayStr);

    // Compute active days this month
    const currentYearMonth = todayStr.substring(0, 7);
    let activeDaysThisMonth = 0;
    activeDates.forEach((d) => {
      if (d.startsWith(currentYearMonth)) {
        activeDaysThisMonth++;
      }
    });

    // Compute streak stepping backwards
    let currentStreak = 0;
    const now = new Date();

    // Check starting from today if completed, otherwise starting from yesterday
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayFormatted = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

    if (!activeDates.has(todayFormatted)) {
      // Step to yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (activeDates.has(dateKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate best historical streak
    const sortedDates = Array.from(activeDates).sort();
    let bestStreak = currentStreak;
    let tempStreak = 0;
    let prevTime: number | null = null;

    for (const d of sortedDates) {
      const [year, month, day] = d.split('-').map(Number);
      const time = new Date(year, month - 1, day).getTime();
      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTime = time;
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    }

    const sortedDesc = Array.from(activeDates).sort().reverse();
    const lastActiveDate = sortedDesc[0] || '';

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      activeDaysThisMonth,
      lastActiveDate,
      isActiveToday
    };
  },

  /**
   * Volume accumulated tracking: weights lifted, jumps, sets, reps, minutes
   */
  calculateAccumulatedVolume(): {
    totalWeightVolume: number;
    totalWorkoutsCompleted: number;
    totalMinutesTrained: number;
    totalPlyometricJumps: number;
    totalMobilityCompleted: number;
    thisWeekVolume: number;
    totalSetsCompleted: number;
  } {
    let totalWeightVolume = 0;
    let totalWorkoutsCompleted = 0;
    let totalMinutesTrained = 0;
    let totalSetsCompleted = 0;
    let thisWeekVolume = 0;

    const sevenDaysAgoTime = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const allWorkouts = [...this.getWorkoutHistory()];
    const today = this.getTodayWorkout();
    if (today && today.status === 'completed' && !allWorkouts.some((w) => w.id === today.id)) {
      allWorkouts.push(today);
    }

    for (const w of allWorkouts) {
      if (w.status === 'completed' || w.completedAt) {
        totalWorkoutsCompleted++;
        totalMinutesTrained += w.actualMinutes || w.estimatedMinutes || 30;

        const isWithinWeek = new Date(w.date).getTime() >= sevenDaysAgoTime;

        for (const ex of w.exercises) {
          if (ex.completedSets && ex.completedSets.length > 0) {
            for (const s of ex.completedSets) {
              if (s.completed) {
                totalSetsCompleted++;
                const vol = (s.weight || 0) * (s.reps || 0);
                totalWeightVolume += vol;
                if (isWithinWeek) thisWeekVolume += vol;
              }
            }
          } else if (ex.completed) {
            const weight = ex.actualWeightUsed || ex.recommendedWeight || 0;
            const vol = ex.sets * ex.reps * weight;
            totalSetsCompleted += ex.sets;
            totalWeightVolume += vol;
            if (isWithinWeek) thisWeekVolume += vol;
          }
        }
      }
    }

    // Add estimated plyometric jump volume
    let totalPlyometricJumps = 0;
    const plyo = this.getPlyometricsRoutine();
    if (plyo && plyo.completed) {
      totalPlyometricJumps += 55; // average jumps in plyo routine
    }

    // Add mobility count
    let totalMobilityCompleted = 0;
    const morning = this.getMorningMobility();
    if (morning && morning.completed) totalMobilityCompleted++;
    const nightly = this.getNightlyRoutine();
    if (nightly && nightly.completed) totalMobilityCompleted++;

    return {
      totalWeightVolume,
      totalWorkoutsCompleted,
      totalMinutesTrained,
      totalPlyometricJumps,
      totalMobilityCompleted,
      thisWeekVolume,
      totalSetsCompleted
    };
  },

  resetAll(): void {
    localStorage.clear();
  },

  clearAll(): void {
    localStorage.clear();
  }
};

export const storageService = StorageService;
