// Final verified persistence/History/Coach repair.
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, DailyReadiness, WorkoutPlan, MorningMobilityRoutine, NightlyStretchingRoutine, ScheduledEvent, ChatMessage, UserAccount, PlyometricsRoutine, SchoolWorkoutLog } from './types';
import { storageService } from './services/storage';
import { fitnessEngine } from './services/fitnessEngine';
import { apiFetch } from './services/api';
import { Header, NavTab } from './components/Header';
import { TodayScreen } from './components/TodayScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { AICoachScreen } from './components/AICoachScreen';
import { ActiveWorkoutModal } from './components/ActiveWorkoutModal';
import { MobilityModal } from './components/MobilityModal';
import { NightlyRoutineModal } from './components/NightlyRoutineModal';
import { PlyometricsModal } from './components/PlyometricsModal';
import { LogSchoolWorkoutModal } from './components/LogSchoolWorkoutModal';
import { DailyCheckInModal } from './components/DailyCheckInModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { CustomWorkoutModal } from './components/CustomWorkoutModal';
import { WeeklyPlanningModal } from './components/WeeklyPlanningModal';

const todayKey = () => { const d = new Date(); return d.toLocaleDateString('en-CA'); };
const weekStartKey = (dateKey = todayKey()) => { const d = new Date(dateKey + 'T12:00:00'); d.setDate(d.getDate() - d.getDay()); return d.toLocaleDateString('en-CA'); };
const weeklyPlannerKey = (week = weekStartKey()) => 'lifted_week_plan_ack_' + week;
const generationGateKey = (date = todayKey()) => `lifted_workout_generation_gate_${date}`;

function getSavedTodayPlan(): WorkoutPlan | null {
  try {
    if (localStorage.getItem(generationGateKey()) !== '1') return null;
    const raw = localStorage.getItem('ai_coach_today_workout_v1');
    const saved = raw ? JSON.parse(raw) : null;
    const plan = saved?.plan || saved;
    return plan?.date === todayKey() && Array.isArray(plan.exercises) && plan.exercises.length ? plan : null;
  } catch { return null; }
}

const readyPlan = (date = todayKey()): WorkoutPlan => ({
  id: `ready-${date}`, date, workoutTitle: 'Ready when you are', goal: 'Sport performance, strength & durability', estimatedMinutes: 35,
  readinessStatus: 'Check in to build today',
  reasoning: 'Your daily lift stays hidden until you explicitly generate it after the pre-workout check-in.',
  injuryProtectionNotes: 'Tell the check-in about soreness, pain, and what you did yesterday so the coach can adjust the session.',
  status: 'planned', isAiGenerated: true, needsGeneration: true, equipmentNeeded: [], exercises: []
} as WorkoutPlan);

const emptyMobility = (): MorningMobilityRoutine => ({ id: `mobility-ready-${todayKey()}`, date: todayKey(), completed: false, isAiGenerated: true, title: 'Morning mobility', durationMinutes: 10, rationale: 'Complete the check-in before starting so Lifted can account for soreness and yesterday\'s workload.', exercises: [] } as MorningMobilityRoutine);
const emptyNightly = (): NightlyStretchingRoutine => ({ id: `nightly-ready-${todayKey()}`, date: todayKey(), completed: false, isAiGenerated: true, title: 'Evening recovery', durationMinutes: 10, rationale: 'Lifted will personalize recovery from your actual training and feedback.', exercises: [] } as NightlyStretchingRoutine);
const emptyPlyos = (): PlyometricsRoutine => ({ id: `plyo-ready-${todayKey()}`, date: todayKey(), completed: false, isAiGenerated: true, title: 'Athletic power', durationMinutes: 10, rationale: 'Power work is generated only when requested and will account for recent load.', exercises: [] } as PlyometricsRoutine);

export function App() {
  const [user, setUser] = useState<UserProfile>(() => storageService.getUserProfile());
  const [readiness, setReadiness] = useState<DailyReadiness>(() => storageService.getDailyReadiness());
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>(() => storageService.getScheduledEvents());
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutPlan[]>(() => storageService.getWorkoutHistory().filter((w) => w.id !== 'hist-1'));
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(() => storageService.getUserAccount());
  const [schoolLog, setSchoolLog] = useState<SchoolWorkoutLog | null>(() => storageService.getTodaySchoolWorkoutLog());
  const [dailyStreak, setDailyStreak] = useState(() => storageService.calculateDailyStreak());
  const [volumeTracking, setVolumeTracking] = useState(() => storageService.calculateAccumulatedVolume());
  const [todayWorkout, setTodayWorkout] = useState<WorkoutPlan>(() => getSavedTodayPlan() || readyPlan());
  const [additionalWorkout, setAdditionalWorkout] = useState<WorkoutPlan | null>(() => storageService.getAdditionalWorkout());
  const [activeWorkoutTarget, setActiveWorkoutTarget] = useState<'today' | 'additional'>('today');
  const [plyometricsRoutine, setPlyometricsRoutine] = useState<PlyometricsRoutine>(() => storageService.getPlyometricsRoutine());
  const [mobility, setMobility] = useState<MorningMobilityRoutine>(() => storageService.getMorningMobility());
  const [nightlyRoutine, setNightlyRoutine] = useState<NightlyStretchingRoutine>(() => storageService.getNightlyRoutine());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => storageService.getChatMessages());
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [isWorkingOut, setIsWorkingOut] = useState(false);
  const [isDoingMobility, setIsDoingMobility] = useState(false);
  const [isDoingNightly, setIsDoingNightly] = useState(false);
  const [isDoingPlyometrics, setIsDoingPlyometrics] = useState(false);
  const [showSchoolLogModal, setShowSchoolLogModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCustomWorkoutModal, setShowCustomWorkoutModal] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isRegeneratingMorning, setIsRegeneratingMorning] = useState(false);
  const [isRegeneratingNightly, setIsRegeneratingNightly] = useState(false);
  const [showWeeklyPlanner, setShowWeeklyPlanner] = useState(false);

  const buildPerformanceMap = useCallback((history: WorkoutPlan[]) => {
    const map: Record<string, any> = {};
    [...history].filter((w) => w.status === 'completed' || w.completedAt).sort((a, b) => a.date.localeCompare(b.date)).forEach((workout) => {
      (workout.exercises || []).forEach((ex) => {
        const sets = (ex.completedSets || []).filter((s) => s.completed && Number(s.weight) >= 0 && Number(s.reps) > 0);
        if (!sets.length && !ex.completed) return;
        const record = { weight: Number(sets.length ? sets[sets.length - 1].weight : ex.actualWeightUsed ?? ex.recommendedWeight ?? 0) || 0, reps: Number(sets.length ? sets[sets.length - 1].reps : ex.reps) || 0, difficulty: ex.feedbackDifficulty || 'just_right', painReported: Boolean(ex.painReported), note: ex.feedbackNote || ex.notes || '', date: workout.date };
        [ex.exerciseId, ex.name.toLowerCase().trim()].filter(Boolean).forEach((key) => { const existing = map[key]?.history || []; map[key] = { ...record, history: [...existing, record].slice(-12) }; });
      });
    });
    return map;
  }, []);

  const syncToCloud = useCallback((acc: UserAccount | null = currentAccount, customState: any = {}) => {
    if (!acc) return;
    void storageService.syncAllToCloud(acc, { profile: customState.profile || user, readiness: customState.readiness || readiness, events: customState.events || scheduledEvents, history: customState.history || workoutHistory, todayPlan: customState.todayPlan || todayWorkout, additionalWorkout: customState.additionalWorkout !== undefined ? customState.additionalWorkout : additionalWorkout, weeklyPlanWeekKey: customState.weeklyPlanWeekKey !== undefined ? customState.weeklyPlanWeekKey : (localStorage.getItem(weeklyPlannerKey()) === '1' ? weekStartKey() : undefined), schoolLogs: storageService.getSchoolWorkoutLogs(), chatMessages: customState.chatMessages || chatMessages, activityLog: customState.activityLog || storageService.getActivityLog(), mobility: customState.mobility || mobility, nightlyRoutine: customState.nightlyRoutine || nightlyRoutine, plyometricsRoutine: customState.plyometricsRoutine || plyometricsRoutine });
  }, [currentAccount, user, readiness, scheduledEvents, workoutHistory, todayWorkout, additionalWorkout, chatMessages]);

  const refreshStats = () => { setDailyStreak(storageService.calculateDailyStreak()); setVolumeTracking(storageService.calculateAccumulatedVolume()); };

  const generateWorkoutWithAI = async (targetUser = user, targetReadiness = readiness, targetEvents = scheduledEvents, focusPrompt?: string, schoolLogData: SchoolWorkoutLog | null = schoolLog): Promise<WorkoutPlan | null> => {
    setIsAiGenerating(true); const perfMap = buildPerformanceMap(workoutHistory);
    try {
      const res = await apiFetch('/api/generate-workout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: targetUser, readiness: targetReadiness, scheduledEvents: targetEvents, exercisePerformanceMap: perfMap, recentHistory: workoutHistory.slice(0, 30), recentSchoolLogs: storageService.getRecentSchoolLogs(30), activityLog: storageService.getActivityLog(), trainingSnapshot: storageService.getTrainingSnapshot(), customFocus: focusPrompt, schoolLog: schoolLogData, targetDate: todayKey() }) });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json(); const plan: WorkoutPlan = (data?.plan || data) as WorkoutPlan; if (!plan?.exercises?.length) throw new Error('AI returned no exercises');
      const fresh = { ...plan, id: plan.id || `ai-plan-${Date.now()}`, date: todayKey(), isAiGenerated: true, needsGeneration: false, status: 'planned' } as WorkoutPlan;
      localStorage.setItem(generationGateKey(), '1'); setTodayWorkout(fresh); storageService.saveCurrentWorkoutPlan(fresh); syncToCloud(currentAccount, { profile: targetUser, readiness: targetReadiness, events: targetEvents, todayPlan: fresh }); return fresh;
    } catch (error) {
      console.warn('Lifted AI generation failed:', error); const fallback = fitnessEngine.generateDailyWorkout(targetUser, targetReadiness, targetEvents, perfMap, schoolLogData); const safe = { ...fallback, date: todayKey(), needsGeneration: false, isAiGenerated: false } as WorkoutPlan; localStorage.setItem(generationGateKey(), '1'); setTodayWorkout(safe); storageService.saveCurrentWorkoutPlan(safe); syncToCloud(currentAccount, { profile: targetUser, readiness: targetReadiness, events: targetEvents, todayPlan: safe }); return safe;
    } finally { setIsAiGenerating(false); }
  };

  const generateMorningRoutineWithAI = async () => { setIsRegeneratingMorning(true); try { const res = await apiFetch('/api/generate-morning-routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, readiness, scheduledEvents, todayWorkout, recentHistory: workoutHistory.slice(0, 12), recentSchoolLogs: storageService.getRecentSchoolLogs(14) }) }); if (!res.ok) throw new Error('mobility api'); const data = await res.json(); if (!data?.routine) throw new Error('no routine'); setMobility(data.routine); storageService.saveMorningMobility(data.routine); return data.routine; } catch { const fallback = fitnessEngine.generateMorningMobility(user, readiness, 10); setMobility(fallback); storageService.saveMorningMobility(fallback); return fallback; } finally { setIsRegeneratingMorning(false); } };
  const generateNightlyRoutineWithAI = async () => { setIsRegeneratingNightly(true); try { const res = await apiFetch('/api/generate-nightly-routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, readiness, scheduledEvents, todayWorkout, recentHistory: workoutHistory.slice(0, 12), recentSchoolLogs: storageService.getRecentSchoolLogs(14) }) }); if (!res.ok) throw new Error('nightly api'); const data = await res.json(); if (!data?.routine) throw new Error('no routine'); setNightlyRoutine(data.routine); storageService.saveNightlyRoutine(data.routine); return data.routine; } catch { const fallback = fitnessEngine.generateNightlyStretching(user, readiness, 10, todayWorkout); setNightlyRoutine(fallback); storageService.saveNightlyRoutine(fallback); return fallback; } finally { setIsRegeneratingNightly(false); } };
  const generatePlyometricsWithAI = async () => { try { const res = await apiFetch('/api/generate-plyometrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, readiness, schoolLog, recentHistory: workoutHistory.slice(0, 12), recentSchoolLogs: storageService.getRecentSchoolLogs(14) }) }); if (!res.ok) throw new Error('plyo api'); const data = await res.json(); if (!data?.routine) throw new Error('no routine'); setPlyometricsRoutine(data.routine); storageService.savePlyometricsRoutine(data.routine); return data.routine; } catch { const fallback = fitnessEngine.generateDailyPlyometricsRoutine(user, readiness, schoolLog, 10); setPlyometricsRoutine(fallback); storageService.savePlyometricsRoutine(fallback); return fallback; } };

  const handleStartTodayWorkout = () => { if (todayWorkout.needsGeneration || !todayWorkout.exercises?.length) { setPendingStart(true); setShowCheckInModal(true); return; } setActiveWorkoutTarget('today'); setIsWorkingOut(true); };
  const handleSaveCheckIn = async (newReadiness: DailyReadiness) => { setReadiness(newReadiness); storageService.saveDailyReadiness(newReadiness); let updatedUser = user; if (newReadiness.injuryStatus && user.specificInjuries) { updatedUser = { ...user, specificInjuries: user.specificInjuries.map((inj) => ({ ...inj, todayStatus: newReadiness.injuryStatus?.[inj.id] || inj.todayStatus })) }; setUser(updatedUser); storageService.saveUserProfile(updatedUser); } setShowCheckInModal(false); if (pendingStart || todayWorkout.needsGeneration || !todayWorkout.exercises?.length) { const shouldStart = pendingStart; setPendingStart(false); const plan = await generateWorkoutWithAI(updatedUser, newReadiness, scheduledEvents, undefined, schoolLog); if (plan && shouldStart) { setActiveWorkoutTarget('today'); setIsWorkingOut(true); } } else syncToCloud(currentAccount, { profile: updatedUser, readiness: newReadiness }); };
  const handleWeeklyPlanSave = (events: ScheduledEvent[], weekKey: string) => { const start = new Date(weekKey + 'T12:00:00'); const end = new Date(start); end.setDate(end.getDate() + 6); const endKey = end.toLocaleDateString('en-CA'); const updated = [...scheduledEvents.filter((e) => e.date < weekKey || e.date > endKey), ...events]; setScheduledEvents(updated); storageService.saveScheduledEvents(updated); localStorage.setItem(weeklyPlannerKey(weekKey), '1'); setShowWeeklyPlanner(false); syncToCloud(currentAccount, { events: updated, weeklyPlanWeekKey: weekKey }); };
  const handleAddEvent = (event: ScheduledEvent) => { const updated = [...scheduledEvents, event]; setScheduledEvents(updated); storageService.saveScheduledEvents(updated); syncToCloud(currentAccount, { events: updated }); };
  const handleRemoveEvent = (id: string) => { const updated = scheduledEvents.filter((e) => e.id !== id); setScheduledEvents(updated); storageService.saveScheduledEvents(updated); syncToCloud(currentAccount, { events: updated }); };
  const handleStartAdditionalWorkout = () => { if (additionalWorkout) { setActiveWorkoutTarget('additional'); setIsWorkingOut(true); } };
  const handleSaveInProgressWorkout = (plan: WorkoutPlan) => { if (activeWorkoutTarget === 'today') { setTodayWorkout(plan); storageService.saveCurrentWorkoutPlan(plan); syncToCloud(currentAccount, { todayPlan: plan }); } else { setAdditionalWorkout(plan); storageService.saveAdditionalWorkout(plan); syncToCloud(currentAccount, { additionalWorkout: plan }); } };
  const handleFinishWorkout = (completed: WorkoutPlan) => { const history = [completed, ...workoutHistory.filter((w) => w.id !== completed.id)]; setWorkoutHistory(history); storageService.saveWorkoutHistory(history); storageService.recordExercisePerformance(completed); if (activeWorkoutTarget === 'today') { setTodayWorkout(completed); storageService.saveCurrentWorkoutPlan(completed); syncToCloud(currentAccount, { history, todayPlan: completed }); } else { setAdditionalWorkout(null); storageService.deleteAdditionalWorkout(); syncToCloud(currentAccount, { history, additionalWorkout: null }); } setIsWorkingOut(false); setActiveTab('history'); refreshStats(); };
  const handleDeleteWorkout = (id: string) => { const history = workoutHistory.filter((w) => w.id !== id); setWorkoutHistory(history); storageService.deleteWorkoutHistoryItem(id); storageService.rebuildExercisePerformanceMap(history); syncToCloud(currentAccount, { history }); refreshStats(); };
  const handleDeleteActivity = (type: 'mobility' | 'nightly' | 'plyometrics', date: string) => { const activityLog = storageService.removeActivity(type, date); refreshStats(); syncToCloud(currentAccount, { activityLog }); };
  const handleDeleteCurrentWorkout = () => { handleDeleteWorkout(activeWorkoutTarget === 'today' ? todayWorkout.id : additionalWorkout?.id || ''); localStorage.removeItem(generationGateKey()); setTodayWorkout(readyPlan()); setIsWorkingOut(false); };
  const handleSaveSchoolLog = (log: SchoolWorkoutLog) => { storageService.addSchoolWorkoutLog(log); setSchoolLog(storageService.getTodaySchoolWorkoutLog()); setShowSchoolLogModal(false); refreshStats(); syncToCloud(currentAccount); };
  const handleSwapExercise = (exerciseId: string) => { const updated = fitnessEngine.swapExercise(todayWorkout, exerciseId, user); setTodayWorkout(updated); storageService.saveCurrentWorkoutPlan(updated); syncToCloud(currentAccount, { todayPlan: updated }); };
  const handleQuickAdjustTime = (minutes: number) => { const next = { ...readiness, availableMinutes: minutes }; setReadiness(next); storageService.saveDailyReadiness(next); };
  const handleSaveSettings = (updated: UserProfile) => { setUser(updated); storageService.saveUserProfile(updated); setShowSettingsModal(false); syncToCloud(currentAccount, { profile: updated }); };
  const handleSaveMessages = (msgs: ChatMessage[]) => { setChatMessages(msgs); storageService.saveChatMessages(msgs); syncToCloud(currentAccount, { chatMessages: msgs }); };
  const handleLoginSuccess = (account: UserAccount, cloudData?: any) => { setCurrentAccount(account); storageService.saveUserAccount(account); if (cloudData) { if (cloudData.profile) { setUser(cloudData.profile); storageService.saveUserProfile(cloudData.profile); } if (cloudData.readiness) { setReadiness(cloudData.readiness); storageService.saveDailyReadiness(cloudData.readiness); } if (cloudData.events) { setScheduledEvents(cloudData.events); storageService.saveScheduledEvents(cloudData.events); } if (cloudData.weeklyPlanWeekKey) { localStorage.setItem(weeklyPlannerKey(cloudData.weeklyPlanWeekKey), '1'); setShowWeeklyPlanner(false); } if (cloudData.history) { const clean = cloudData.history.filter((w: WorkoutPlan) => w.id !== 'hist-1'); setWorkoutHistory(clean); storageService.saveWorkoutHistory(clean); storageService.rebuildExercisePerformanceMap(clean); } if (cloudData.todayPlan?.exercises?.length && cloudData.todayPlan.date === todayKey()) { localStorage.setItem(generationGateKey(), '1'); setTodayWorkout(cloudData.todayPlan); storageService.saveCurrentWorkoutPlan(cloudData.todayPlan); } if (cloudData.additionalWorkout !== undefined) { setAdditionalWorkout(cloudData.additionalWorkout || null); if (cloudData.additionalWorkout) storageService.saveAdditionalWorkout(cloudData.additionalWorkout); } if (cloudData.chatMessages) { setChatMessages(cloudData.chatMessages); storageService.saveChatMessages(cloudData.chatMessages); } if (cloudData.activityLog) localStorage.setItem('lifted_activity_completion_v1', JSON.stringify(cloudData.activityLog)); if (cloudData.mobility) { setMobility(cloudData.mobility); storageService.saveMorningMobility(cloudData.mobility); } if (cloudData.nightlyRoutine) { setNightlyRoutine(cloudData.nightlyRoutine); storageService.saveNightlyRoutine(cloudData.nightlyRoutine); } if (cloudData.plyometricsRoutine) { setPlyometricsRoutine(cloudData.plyometricsRoutine); storageService.savePlyometricsRoutine(cloudData.plyometricsRoutine); } refreshStats(); } else syncToCloud(account); };
  const handleLogout = () => { setCurrentAccount(null); storageService.saveUserAccount(null); };
  const handleResetData = () => { storageService.clearAll(); window.location.reload(); };

  useEffect(() => { if (new Date().getDay() === 0 && localStorage.getItem(weeklyPlannerKey()) !== '1') setShowWeeklyPlanner(true); }, []);
  useEffect(() => { if (!currentAccount?.identifier) return; let cancelled = false; (async () => { const cloudData = await storageService.loadAllFromCloud(currentAccount.identifier); if (!cloudData || cancelled) return; if (cloudData.profile) { setUser(cloudData.profile); storageService.saveUserProfile(cloudData.profile); } if (cloudData.readiness) { setReadiness(cloudData.readiness); storageService.saveDailyReadiness(cloudData.readiness); } if (Array.isArray(cloudData.events)) { setScheduledEvents(cloudData.events); storageService.saveScheduledEvents(cloudData.events); } if (Array.isArray(cloudData.history)) { const local = storageService.getWorkoutHistory(); const byId = new Map(local.map(w => [w.id,w])); cloudData.history.forEach((w:any) => byId.set(w.id,w)); const merged = [...byId.values()].filter((w:any) => w.id !== 'hist-1').sort((a:any,b:any) => String(b.date).localeCompare(String(a.date))); setWorkoutHistory(merged); storageService.saveWorkoutHistory(merged); storageService.rebuildExercisePerformanceMap(merged); } if (cloudData.todayPlan?.exercises?.length && cloudData.todayPlan.date === todayKey()) { localStorage.setItem(generationGateKey(), '1'); setTodayWorkout(cloudData.todayPlan); storageService.saveCurrentWorkoutPlan(cloudData.todayPlan); } if (cloudData.additionalWorkout !== undefined) { setAdditionalWorkout(cloudData.additionalWorkout || null); if (cloudData.additionalWorkout) storageService.saveAdditionalWorkout(cloudData.additionalWorkout); else storageService.deleteAdditionalWorkout(); } if (Array.isArray(cloudData.chatMessages)) { setChatMessages(cloudData.chatMessages); storageService.saveChatMessages(cloudData.chatMessages); } if (Array.isArray(cloudData.activityLog)) { const local = storageService.getActivityLog(); const byKey = new Map(local.map((a:any) => [a.type+'|'+a.date,a])); cloudData.activityLog.forEach((a:any) => byKey.set(a.type+'|'+a.date,a)); localStorage.setItem('lifted_activity_completion_v1', JSON.stringify([...byKey.values()])); } if (cloudData.mobility) { const local = storageService.getMorningMobility(); const routine = local.completed ? local : cloudData.mobility; setMobility(routine); storageService.saveMorningMobility(routine); } if (cloudData.nightlyRoutine) { const local = storageService.getNightlyRoutine(); const routine = local.completed ? local : cloudData.nightlyRoutine; setNightlyRoutine(routine); storageService.saveNightlyRoutine(routine); } if (cloudData.plyometricsRoutine) { const local = storageService.getPlyometricsRoutine(); const routine = local.completed ? local : cloudData.plyometricsRoutine; setPlyometricsRoutine(routine); storageService.savePlyometricsRoutine(routine); } refreshStats(); })(); return () => { cancelled = true; }; }, [currentAccount?.identifier]);
  useEffect(() => { const refreshFromDataChange = () => { setWorkoutHistory(storageService.getWorkoutHistory()); setScheduledEvents(storageService.getScheduledEvents()); setChatMessages(storageService.getChatMessages()); setSchoolLog(storageService.getTodaySchoolWorkoutLog()); setTodayWorkout(getSavedTodayPlan() || readyPlan()); refreshStats(); }; window.addEventListener('lifted-data-changed', refreshFromDataChange); return () => window.removeEventListener('lifted-data-changed', refreshFromDataChange); }, []);

  return (<div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-400 selection:text-black">
    {isAiGenerating && <div className="lifted-ai-calibration" role="dialog" aria-modal="true" aria-label="Lifted AI calibration"><div className="lifted-ai-calibration-card"><div className="lifted-ai-spinner" /><h2>Calibrating your workout</h2><p>Lifted is reviewing your recent training, feedback, school workload, weekly schedule, and upcoming games before choosing today's session and loads.</p><small>Please wait — this screen is intentionally locked during calibration.</small></div></div>}
    <Header user={user} currentAccount={currentAccount} activeTab={activeTab} onTabChange={setActiveTab} readiness={readiness} scheduledEvents={scheduledEvents} onOpenCheckIn={() => setShowCheckInModal(true)} onOpenSettings={() => setShowSettingsModal(true)} onOpenAuth={() => setShowAuthModal(true)} onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)} />
    <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6">
      {activeTab === 'today' && <TodayScreen user={user} readiness={readiness} todayWorkout={todayWorkout} mobility={mobility} nightlyRoutine={nightlyRoutine} plyometricsRoutine={plyometricsRoutine} schoolLog={schoolLog} dailyStreak={dailyStreak} volumeTracking={volumeTracking} scheduledEvents={scheduledEvents} workoutHistory={workoutHistory} isAiGenerating={isAiGenerating} isRegeneratingMorning={isRegeneratingMorning} isRegeneratingNightly={isRegeneratingNightly} onRegenerateWorkout={() => { localStorage.removeItem(generationGateKey()); setTodayWorkout(readyPlan()); setPendingStart(false); setShowCheckInModal(true); }} onGenerateWorkout={() => { if (todayWorkout.needsGeneration || !todayWorkout.exercises?.length) { setPendingStart(false); setShowCheckInModal(true); } }} onRegenerateMorning={async () => { await generateMorningRoutineWithAI(); }} onRegenerateNightly={async () => { await generateNightlyRoutineWithAI(); }} onStartWorkout={handleStartTodayWorkout} onStartAdditionalWorkout={handleStartAdditionalWorkout} onDeleteAdditionalWorkout={() => { if (!additionalWorkout) return; storageService.deleteAdditionalWorkout(); setAdditionalWorkout(null); }} onDeleteTodayWorkout={() => { setTodayWorkout(readyPlan()); localStorage.removeItem('ai_coach_today_workout_v1'); localStorage.removeItem(generationGateKey()); }} onStartMobility={async () => { const routine = await generateMorningRoutineWithAI(); if (routine) setIsDoingMobility(true); }} onStartNightly={async () => { const routine = await generateNightlyRoutineWithAI(); if (routine) setIsDoingNightly(true); }} onStartPlyometrics={async () => { const routine = await generatePlyometricsWithAI(); if (routine) setIsDoingPlyometrics(true); }} onOpenSchoolLog={() => setShowSchoolLogModal(true)} onOpenCheckIn={() => setShowCheckInModal(true)} onSwapExercise={handleSwapExercise} onQuickAdjustTime={handleQuickAdjustTime} onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)} />}
      {activeTab === 'calendar' && <CalendarScreen user={user} scheduledEvents={scheduledEvents} workoutHistory={workoutHistory} onAddEvent={handleAddEvent} onRemoveEvent={handleRemoveEvent} todayWorkout={todayWorkout} />}
      {activeTab === 'history' && <HistoryScreen workoutHistory={workoutHistory} activityLog={storageService.getActivityLog()} onDeleteWorkout={handleDeleteWorkout} onDeleteActivity={handleDeleteActivity} />}
      {activeTab === 'progress' && <ProgressScreen user={user} history={workoutHistory} dailyStreak={dailyStreak} volumeTracking={volumeTracking} schoolLogs={storageService.getSchoolWorkoutLogs()} />}
      {activeTab === 'coach' && <AICoachScreen user={user} readiness={readiness} currentPlan={todayWorkout} workoutHistory={workoutHistory} scheduledEvents={scheduledEvents} schoolLogs={storageService.getSchoolWorkoutLogs()} chatMessages={chatMessages} onSaveMessages={handleSaveMessages} />}
    </main>
    {isWorkingOut && <ActiveWorkoutModal workout={activeWorkoutTarget === 'today' ? todayWorkout : (additionalWorkout || todayWorkout)} user={user} workoutHistory={workoutHistory} onFinishWorkout={handleFinishWorkout} onSaveInProgress={handleSaveInProgressWorkout} onDeleteWorkout={handleDeleteCurrentWorkout} onClose={() => setIsWorkingOut(false)} />}
    {isDoingMobility && <MobilityModal mobility={mobility} onComplete={() => { const next = { ...mobility, completed: true, completedAt: new Date().toISOString() }; setMobility(next); storageService.saveMorningMobility(next); storageService.recordActivity('mobility', next.date, 1); setIsDoingMobility(false); refreshStats(); syncToCloud(currentAccount, { mobility: next, activityLog: storageService.getActivityLog() }); }} onClose={() => setIsDoingMobility(false)} />}
    {isDoingNightly && <NightlyRoutineModal routine={nightlyRoutine} onComplete={() => { const next = { ...nightlyRoutine, completed: true, completedAt: new Date().toISOString() }; setNightlyRoutine(next); storageService.saveNightlyRoutine(next); storageService.recordActivity('nightly', next.date, 1); setIsDoingNightly(false); refreshStats(); syncToCloud(currentAccount, { nightlyRoutine: next, activityLog: storageService.getActivityLog() }); }} onClose={() => setIsDoingNightly(false)} />}
    {isDoingPlyometrics && <PlyometricsModal routine={plyometricsRoutine} onComplete={() => { const next = { ...plyometricsRoutine, completed: true, completedAt: new Date().toISOString() }; setPlyometricsRoutine(next); storageService.savePlyometricsRoutine(next); storageService.recordActivity('plyometrics', next.date, 1); setIsDoingPlyometrics(false); refreshStats(); syncToCloud(currentAccount, { plyometricsRoutine: next, activityLog: storageService.getActivityLog() }); }} onClose={() => setIsDoingPlyometrics(false)} />}
    {showSchoolLogModal && <LogSchoolWorkoutModal existingLog={schoolLog} onSave={handleSaveSchoolLog} onClose={() => setShowSchoolLogModal(false)} />}
    {showWeeklyPlanner && <WeeklyPlanningModal initialEvents={scheduledEvents} weekStart={weekStartKey()} onSave={handleWeeklyPlanSave} />}
    {showCheckInModal && <DailyCheckInModal user={user} initialReadiness={readiness} onSave={handleSaveCheckIn} onClose={() => { setPendingStart(false); setShowCheckInModal(false); }} />}
    {showSettingsModal && <SettingsModal user={user} onSave={handleSaveSettings} onResetData={handleResetData} onClose={() => setShowSettingsModal(false)} />}
    {showAuthModal && <AuthModal currentAccount={currentAccount} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} onClose={() => setShowAuthModal(false)} />}
    {!user.onboardingCompleted && <OnboardingModal onComplete={(profile) => { setUser(profile); storageService.saveUserProfile(profile); }} />}
    {showCustomWorkoutModal && <CustomWorkoutModal isOpen={showCustomWorkoutModal} user={user} workoutHistory={workoutHistory} savedTemplates={storageService.getCustomWorkoutTemplates()} onSaveWorkout={(plan, startImmediately = false, mode = 'replace') => { if (mode === 'replace') { setTodayWorkout(plan); storageService.saveCurrentWorkoutPlan(plan); localStorage.setItem(generationGateKey(), '1'); setActiveWorkoutTarget('today'); } else { setAdditionalWorkout(plan); storageService.saveAdditionalWorkout(plan); setActiveWorkoutTarget('additional'); } setShowCustomWorkoutModal(false); if (startImmediately) setIsWorkingOut(true); }} onSaveTemplate={(template) => storageService.addCustomWorkoutTemplate(template)} onClose={() => setShowCustomWorkoutModal(false)} />}
  </div>);
}
export default App;
