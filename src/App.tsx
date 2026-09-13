import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, DailyReadiness, WorkoutPlan, MorningMobilityRoutine, NightlyStretchingRoutine, ScheduledEvent, ChatMessage, UserAccount, PlyometricsRoutine, SchoolWorkoutLog } from './types';
import { storageService, DEFAULT_PROFILE, DEFAULT_READINESS } from './services/storage';
import { fitnessEngine } from './services/fitnessEngine';
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

const todayKey = () => new Date().toISOString().slice(0, 10);

function getSavedTodayPlan(): WorkoutPlan | null {
  try {
    const raw = localStorage.getItem('ai_coach_today_workout_v1');
    const saved = raw ? JSON.parse(raw) : null;
    const plan = saved?.plan || saved;
    return plan?.date === todayKey() && Array.isArray(plan.exercises) && plan.exercises.length ? plan : null;
  } catch { return null; }
}

const readyPlan = (date = todayKey()): WorkoutPlan => ({
  id: `ready-${date}`,
  date,
  workoutTitle: 'Ready when you are',
  goal: 'Sport performance, strength & durability',
  estimatedMinutes: 35,
  readinessStatus: 'Check in to build today',
  reasoning: 'Your workout is intentionally not generated when the app opens. Tap Start Lift for Today, complete the check-in, and Lifted will generate one plan for this session.',
  injuryProtectionNotes: 'Tell the check-in about soreness, pain, and what you did yesterday so the coach can adjust the session.',
  status: 'planned',
  isAiGenerated: true,
  needsGeneration: true,
  equipmentNeeded: [],
  exercises: []
} as WorkoutPlan);

const emptyMobility = (): MorningMobilityRoutine => ({ id: `mobility-ready-${todayKey()}`, date: todayKey(), completed: false, isAiGenerated: true, title: 'Morning mobility', durationMinutes: 10, rationale: 'Complete the morning check-in before starting so Lifted can account for soreness and yesterday\'s workload.', exercises: [] } as MorningMobilityRoutine);
const emptyNightly = (): NightlyStretchingRoutine => ({ id: `nightly-ready-${todayKey()}`, date: todayKey(), completed: false, isAiGenerated: true, title: 'Evening recovery', durationMinutes: 10, rationale: 'Lifted will personalize recovery from your actual training and feedback.', exercises: [] } as NightlyStretchingRoutine);
const emptyPlyos = (): PlyometricsRoutine => ({ id: `plyo-ready-${todayKey()}`, date: todayKey(), completed: false, isAiGenerated: true, title: 'Athletic power', durationMinutes: 10, rationale: 'Power work is only generated when you ask for it and will account for your recent load.', exercises: [] } as PlyometricsRoutine);

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
  const [plyometricsRoutine, setPlyometricsRoutine] = useState<PlyometricsRoutine>(() => emptyPlyos());
  const [mobility, setMobility] = useState<MorningMobilityRoutine>(() => emptyMobility());
  const [nightlyRoutine, setNightlyRoutine] = useState<NightlyStretchingRoutine>(() => emptyNightly());
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

  const buildPerformanceMap = useCallback((history: WorkoutPlan[]) => {
    const map: Record<string, any> = {};
    [...history].sort((a, b) => a.date.localeCompare(b.date)).forEach((workout) => {
      if (workout.status !== 'completed' && !workout.completedAt) return;
      (workout.exercises || []).forEach((ex) => {
        const sets = (ex.completedSets || []).filter((s) => s.completed && Number(s.weight) >= 0 && Number(s.reps) > 0);
        if (!sets.length && !ex.completed) return;
        const best: any = sets.length ? sets.reduce((a, b) => Number(b.weight) > Number(a.weight) ? b : a) : { weight: ex.actualWeightUsed ?? ex.recommendedWeight ?? 0, reps: ex.reps };
        const record = { weight: Number(best.weight) || 0, reps: Number(best.reps) || ex.reps, difficulty: ex.feedbackDifficulty || 'just_right', painReported: ex.painReported, date: workout.date };
        map[ex.exerciseId] = record;
        map[ex.name.toLowerCase().trim()] = record;
      });
    });
    return map;
  }, []);

  const syncToCloud = useCallback((acc: UserAccount | null = currentAccount, customState: any = {}) => {
    if (!acc) return;
    void storageService.syncAllToCloud(acc, {
      profile: customState.profile || user,
      readiness: customState.readiness || readiness,
      events: customState.events || scheduledEvents,
      history: customState.history || workoutHistory,
      todayPlan: customState.todayPlan || todayWorkout,
      additionalWorkout: customState.additionalWorkout !== undefined ? customState.additionalWorkout : additionalWorkout,
      schoolLogs: storageService.getSchoolWorkoutLogs(),
      chatMessages: customState.chatMessages || chatMessages
    });
  }, [currentAccount, user, readiness, scheduledEvents, workoutHistory, todayWorkout, additionalWorkout, chatMessages]);

  const refreshStats = () => {
    setDailyStreak(storageService.calculateDailyStreak());
    setVolumeTracking(storageService.calculateAccumulatedVolume());
  };

  const generateWorkoutWithAI = async (targetUser = user, targetReadiness = readiness, targetEvents = scheduledEvents, focusPrompt?: string, schoolLogData: SchoolWorkoutLog | null = schoolLog): Promise<WorkoutPlan | null> => {
    setIsAiGenerating(true);
    const perfMap = buildPerformanceMap(workoutHistory);
    try {
      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: targetUser, readiness: targetReadiness, scheduledEvents: targetEvents, exercisePerformanceMap: perfMap, recentHistory: workoutHistory.slice(0, 12), recentSchoolLogs: storageService.getRecentSchoolLogs(14), customFocus: focusPrompt, schoolLog: schoolLogData, targetDate: todayKey() })
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const plan: WorkoutPlan = (data?.plan || data) as WorkoutPlan;
      if (!plan?.exercises?.length) throw new Error('AI returned no exercises');
      const fresh = { ...plan, id: plan.id || `ai-plan-${Date.now()}`, date: todayKey(), isAiGenerated: true, needsGeneration: false, status: 'planned' } as WorkoutPlan;
      setTodayWorkout(fresh);
      storageService.saveCurrentWorkoutPlan(fresh);
      syncToCloud(currentAccount, { profile: targetUser, readiness: targetReadiness, events: targetEvents, todayPlan: fresh });
      return fresh;
    } catch (error) {
      console.warn('Lifted AI generation failed:', error);
      // Never replace an already-generated plan with a new fallback. A fallback is
      // only allowed when the athlete explicitly asked to start today's session.
      const fallback = fitnessEngine.generateDailyWorkout(targetUser, targetReadiness, targetEvents, perfMap, schoolLogData);
      const safe = { ...fallback, date: todayKey(), needsGeneration: false, isAiGenerated: false } as WorkoutPlan;
      setTodayWorkout(safe);
      storageService.saveCurrentWorkoutPlan(safe);
      syncToCloud(currentAccount, { profile: targetUser, readiness: targetReadiness, events: targetEvents, todayPlan: safe });
      return safe;
    } finally { setIsAiGenerating(false); }
  };

  const generateMorningRoutineWithAI = async () => {
    setIsRegeneratingMorning(true);
    try {
      const res = await fetch('/api/generate-morning-routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, readiness, scheduledEvents, todayWorkout, recentHistory: workoutHistory.slice(0, 8), recentSchoolLogs: storageService.getRecentSchoolLogs(7) }) });
      if (!res.ok) throw new Error('mobility api');
      const data = await res.json();
      if (!data?.routine) throw new Error('no routine');
      setMobility(data.routine); storageService.saveMorningMobility(data.routine); return data.routine;
    } catch {
      const fallback = fitnessEngine.generateMorningMobility(user, readiness, 10); setMobility(fallback); storageService.saveMorningMobility(fallback); return fallback;
    } finally { setIsRegeneratingMorning(false); }
  };

  const generateNightlyRoutineWithAI = async () => {
    setIsRegeneratingNightly(true);
    try {
      const res = await fetch('/api/generate-nightly-routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, readiness, scheduledEvents, todayWorkout, recentHistory: workoutHistory.slice(0, 8) }) });
      if (!res.ok) throw new Error('nightly api');
      const data = await res.json();
      if (!data?.routine) throw new Error('no routine');
      setNightlyRoutine(data.routine); storageService.saveNightlyRoutine(data.routine); return data.routine;
    } catch {
      const fallback = fitnessEngine.generateNightlyStretching(user, readiness, 10, todayWorkout); setNightlyRoutine(fallback); storageService.saveNightlyRoutine(fallback); return fallback;
    } finally { setIsRegeneratingNightly(false); }
  };

  const generatePlyometricsWithAI = async () => {
    try {
      const res = await fetch('/api/generate-plyometrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, readiness, schoolLog, recentHistory: workoutHistory.slice(0, 8) }) });
      if (!res.ok) throw new Error('plyo api');
      const data = await res.json();
      if (!data?.routine) throw new Error('no routine');
      setPlyometricsRoutine(data.routine); storageService.savePlyometricsRoutine(data.routine); return data.routine;
    } catch {
      const fallback = fitnessEngine.generateDailyPlyometricsRoutine(user, readiness, schoolLog, 10); setPlyometricsRoutine(fallback); storageService.savePlyometricsRoutine(fallback); return fallback;
    }
  };

  const handleStartTodayWorkout = () => {
    if (todayWorkout.needsGeneration || !todayWorkout.exercises?.length) {
      setPendingStart(true);
      setShowCheckInModal(true);
      return;
    }
    setActiveWorkoutTarget('today'); setIsWorkingOut(true);
  };

  const handleSaveCheckIn = async (newReadiness: DailyReadiness) => {
    setReadiness(newReadiness); storageService.saveDailyReadiness(newReadiness);
    let updatedUser = user;
    if (newReadiness.injuryStatus && user.specificInjuries) {
      updatedUser = { ...user, specificInjuries: user.specificInjuries.map((inj) => ({ ...inj, todayStatus: newReadiness.injuryStatus?.[inj.id] || inj.todayStatus })) };
      setUser(updatedUser); storageService.saveUserProfile(updatedUser);
    }
    setShowCheckInModal(false);
    if (pendingStart) {
      setPendingStart(false);
      const plan = await generateWorkoutWithAI(updatedUser, newReadiness, scheduledEvents, undefined, schoolLog);
      if (plan) { setActiveWorkoutTarget('today'); setIsWorkingOut(true); }
    } else {
      // A manual check-in is allowed to inform the coach, but does not silently
      // replace a workout already generated for today.
      syncToCloud(currentAccount, { profile: updatedUser, readiness: newReadiness });
    }
  };

  const handleAddEvent = (event: ScheduledEvent) => {
    const updated = [...scheduledEvents, event]; setScheduledEvents(updated); storageService.saveScheduledEvents(updated); syncToCloud(currentAccount, { events: updated });
  };
  const handleRemoveEvent = (id: string) => {
    const updated = scheduledEvents.filter((e) => e.id !== id); setScheduledEvents(updated); storageService.saveScheduledEvents(updated); syncToCloud(currentAccount, { events: updated });
  };
  const handleStartAdditionalWorkout = () => { if (additionalWorkout) { setActiveWorkoutTarget('additional'); setIsWorkingOut(true); } };
  const handleSaveInProgressWorkout = (plan: WorkoutPlan) => {
    if (activeWorkoutTarget === 'today') { setTodayWorkout(plan); storageService.saveCurrentWorkoutPlan(plan); syncToCloud(currentAccount, { todayPlan: plan }); }
    else { setAdditionalWorkout(plan); storageService.saveAdditionalWorkout(plan); syncToCloud(currentAccount, { additionalWorkout: plan }); }
  };
  const handleFinishWorkout = (completed: WorkoutPlan) => {
    const history = [completed, ...workoutHistory.filter((w) => w.id !== completed.id)];
    setWorkoutHistory(history); storageService.saveWorkoutHistory(history); storageService.recordExercisePerformance(completed);
    if (activeWorkoutTarget === 'today') { setTodayWorkout(completed); storageService.saveCurrentWorkoutPlan(completed); syncToCloud(currentAccount, { history, todayPlan: completed }); }
    else { setAdditionalWorkout(null); storageService.deleteAdditionalWorkout(); syncToCloud(currentAccount, { history, additionalWorkout: null }); }
    setIsWorkingOut(false); setActiveTab('history'); refreshStats();
  };
  const handleDeleteWorkout = (id: string) => { const history = workoutHistory.filter((w) => w.id !== id); setWorkoutHistory(history); storageService.deleteWorkoutHistoryItem(id); syncToCloud(currentAccount, { history }); refreshStats(); };
  const handleDeleteCurrentWorkout = () => { handleDeleteWorkout(activeWorkoutTarget === 'today' ? todayWorkout.id : additionalWorkout?.id || ''); setIsWorkingOut(false); };
  const handleSaveSchoolLog = (log: SchoolWorkoutLog) => { storageService.addSchoolWorkoutLog(log); setSchoolLog(storageService.getTodaySchoolWorkoutLog()); setShowSchoolLogModal(false); refreshStats(); syncToCloud(currentAccount); };
  const handleSwapExercise = (exerciseId: string) => { const updated = fitnessEngine.swapExercise(todayWorkout, exerciseId, user); setTodayWorkout(updated); storageService.saveCurrentWorkoutPlan(updated); syncToCloud(currentAccount, { todayPlan: updated }); };
  const handleQuickAdjustTime = (minutes: number) => { const next = { ...readiness, availableMinutes: minutes }; setReadiness(next); storageService.saveDailyReadiness(next); };
  const handleSaveSettings = (updated: UserProfile) => { setUser(updated); storageService.saveUserProfile(updated); setShowSettingsModal(false); syncToCloud(currentAccount, { profile: updated }); };
  const handleSaveMessages = (msgs: ChatMessage[]) => { setChatMessages(msgs); storageService.saveChatMessages(msgs); syncToCloud(currentAccount, { chatMessages: msgs }); };

  const handleLoginSuccess = (account: UserAccount, cloudData?: any) => {
    setCurrentAccount(account); storageService.saveUserAccount(account);
    if (cloudData) {
      if (cloudData.profile) { setUser(cloudData.profile); storageService.saveUserProfile(cloudData.profile); }
      if (cloudData.readiness) { setReadiness(cloudData.readiness); storageService.saveDailyReadiness(cloudData.readiness); }
      if (cloudData.events) { setScheduledEvents(cloudData.events); storageService.saveScheduledEvents(cloudData.events); }
      if (cloudData.history) { setWorkoutHistory(cloudData.history.filter((w: WorkoutPlan) => w.id !== 'hist-1')); storageService.saveWorkoutHistory(cloudData.history); storageService.rebuildExercisePerformanceMap(cloudData.history); }
      if (cloudData.todayPlan) { setTodayWorkout(cloudData.todayPlan); storageService.saveCurrentWorkoutPlan(cloudData.todayPlan); }
      if (cloudData.additionalWorkout !== undefined) { setAdditionalWorkout(cloudData.additionalWorkout || null); if (cloudData.additionalWorkout) storageService.saveAdditionalWorkout(cloudData.additionalWorkout); }
      if (cloudData.chatMessages) { setChatMessages(cloudData.chatMessages); storageService.saveChatMessages(cloudData.chatMessages); }
      refreshStats();
    } else syncToCloud(account);
  };
  const handleLogout = () => { setCurrentAccount(null); storageService.saveUserAccount(null); };
  const handleResetData = () => { storageService.clearAll(); window.location.reload(); };

  useEffect(() => {
    // Deliberately no AI generation here. Opening/reloading the app is read-only.
    // AI generation starts only from an explicit user action.
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-400 selection:text-black">
      <Header user={user} currentAccount={currentAccount} activeTab={activeTab} onTabChange={setActiveTab} readiness={readiness} scheduledEvents={scheduledEvents} onOpenCheckIn={() => setShowCheckInModal(true)} onOpenSettings={() => setShowSettingsModal(true)} onOpenAuth={() => setShowAuthModal(true)} onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'today' && <TodayScreen user={user} readiness={readiness} todayWorkout={todayWorkout} mobility={mobility} nightlyRoutine={nightlyRoutine} plyometricsRoutine={plyometricsRoutine} schoolLog={schoolLog} dailyStreak={dailyStreak} volumeTracking={volumeTracking} scheduledEvents={scheduledEvents} workoutHistory={workoutHistory} isAiGenerating={isAiGenerating} isRegeneratingMorning={isRegeneratingMorning} isRegeneratingNightly={isRegeneratingNightly} onRegenerateWorkout={(focus) => { setPendingStart(true); setShowCheckInModal(true); }} onRegenerateMorning={async () => { await generateMorningRoutineWithAI(); }} onRegenerateNightly={async () => { await generateNightlyRoutineWithAI(); }} onStartWorkout={handleStartTodayWorkout} onStartAdditionalWorkout={handleStartAdditionalWorkout} onDeleteAdditionalWorkout={() => { if (!additionalWorkout) return; storageService.deleteAdditionalWorkout(); setAdditionalWorkout(null); }} onDeleteTodayWorkout={() => { setTodayWorkout(readyPlan()); localStorage.removeItem('ai_coach_today_workout_v1'); }} onStartMobility={async () => { const routine = await generateMorningRoutineWithAI(); if (routine) setIsDoingMobility(true); }} onStartNightly={async () => { const routine = await generateNightlyRoutineWithAI(); if (routine) setIsDoingNightly(true); }} onStartPlyometrics={async () => { const routine = await generatePlyometricsWithAI(); if (routine) setIsDoingPlyometrics(true); }} onOpenSchoolLog={() => setShowSchoolLogModal(true)} onOpenCheckIn={() => setShowCheckInModal(true)} onSwapExercise={handleSwapExercise} onQuickAdjustTime={handleQuickAdjustTime} onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)} />}
        {activeTab === 'calendar' && <CalendarScreen user={user} scheduledEvents={scheduledEvents} workoutHistory={workoutHistory} onAddEvent={handleAddEvent} onRemoveEvent={handleRemoveEvent} todayWorkout={todayWorkout} />}
        {activeTab === 'history' && <HistoryScreen workoutHistory={workoutHistory} onDeleteWorkout={handleDeleteWorkout} />}
        {activeTab === 'progress' && <ProgressScreen user={user} history={workoutHistory} dailyStreak={dailyStreak} volumeTracking={volumeTracking} schoolLogs={storageService.getSchoolWorkoutLogs()} />}
        {activeTab === 'coach' && <AICoachScreen user={user} currentPlan={todayWorkout} scheduledEvents={scheduledEvents} chatMessages={chatMessages} onSaveMessages={handleSaveMessages} />}
      </main>

      {isWorkingOut && <ActiveWorkoutModal workout={activeWorkoutTarget === 'today' ? todayWorkout : (additionalWorkout || todayWorkout)} user={user} workoutHistory={workoutHistory} onFinishWorkout={handleFinishWorkout} onSaveInProgress={handleSaveInProgressWorkout} onDeleteWorkout={handleDeleteCurrentWorkout} onClose={() => setIsWorkingOut(false)} />}
      {isDoingMobility && <MobilityModal mobility={mobility} onComplete={() => { const next = { ...mobility, completed: true }; setMobility(next); storageService.saveMorningMobility(next); storageService.recordActivity('mobility', next.date, 1); setIsDoingMobility(false); refreshStats(); }} onClose={() => setIsDoingMobility(false)} />}
      {isDoingNightly && <NightlyRoutineModal routine={nightlyRoutine} onComplete={() => { const next = { ...nightlyRoutine, completed: true }; setNightlyRoutine(next); storageService.saveNightlyRoutine(next); storageService.recordActivity('nightly', next.date, 1); setIsDoingNightly(false); refreshStats(); }} onClose={() => setIsDoingNightly(false)} />}
      {isDoingPlyometrics && <PlyometricsModal routine={plyometricsRoutine} onComplete={() => { const next = { ...plyometricsRoutine, completed: true }; setPlyometricsRoutine(next); storageService.savePlyometricsRoutine(next); setIsDoingPlyometrics(false); refreshStats(); }} onClose={() => setIsDoingPlyometrics(false)} />}
      {showSchoolLogModal && <LogSchoolWorkoutModal existingLog={schoolLog} onSave={handleSaveSchoolLog} onClose={() => setShowSchoolLogModal(false)} />}
      {showCheckInModal && <DailyCheckInModal user={user} initialReadiness={readiness} onSave={handleSaveCheckIn} onClose={() => { setPendingStart(false); setShowCheckInModal(false); }} />}
      {showSettingsModal && <SettingsModal user={user} onSave={handleSaveSettings} onResetData={handleResetData} onClose={() => setShowSettingsModal(false)} />}
      {showAuthModal && <AuthModal currentAccount={currentAccount} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} onClose={() => setShowAuthModal(false)} />}
      {!user.onboardingCompleted && <OnboardingModal onComplete={(profile) => { setUser(profile); storageService.saveUserProfile(profile); }} />}
      {showCustomWorkoutModal && <CustomWorkoutModal isOpen={showCustomWorkoutModal} user={user} workoutHistory={workoutHistory} savedTemplates={storageService.getCustomWorkoutTemplates()} onSaveWorkout={(plan, startImmediately = false, mode = 'replace') => { if (mode === 'replace') { setTodayWorkout(plan); storageService.saveCurrentWorkoutPlan(plan); setActiveWorkoutTarget('today'); } else { setAdditionalWorkout(plan); storageService.saveAdditionalWorkout(plan); setActiveWorkoutTarget('additional'); } setShowCustomWorkoutModal(false); if (startImmediately) setIsWorkingOut(true); }} onSaveTemplate={(template) => storageService.addCustomWorkoutTemplate(template)} onClose={() => setShowCustomWorkoutModal(false)} />}
    </div>
  );
}

export default App;
