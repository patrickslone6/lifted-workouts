import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, DailyReadiness, WorkoutPlan, MorningMobilityRoutine, NightlyStretchingRoutine, ScheduledEvent, ChatMessage, UserAccount, PlyometricsRoutine, SchoolWorkoutLog } from './types';
import { storageService } from './services/storage';
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

export function App() {
  const buildPerformanceMap = (history: WorkoutPlan[]) => {
    const map: Record<string, any> = {};
    [...history].sort((a, b) => a.date.localeCompare(b.date)).forEach((workout) => {
      if (workout.status !== 'completed' && !workout.completedAt) return;
      (workout.exercises || []).forEach((ex) => {
        const sets = (ex.completedSets || []).filter((set) => set.completed && Number(set.weight) >= 0 && Number(set.reps) > 0);
        if (!sets.length && !ex.completed) return;
        const best: any = sets.length ? sets.reduce((a, b) => (b.weight > a.weight ? b : a)) : { weight: ex.actualWeightUsed ?? ex.recommendedWeight ?? 0, reps: ex.reps };
        const record = { weight: Number(best.weight) || 0, reps: Number(best.reps) || ex.reps, difficulty: ex.feedbackDifficulty || 'just_right', painReported: ex.painReported, date: workout.date };
        map[ex.exerciseId] = record;
        map[ex.name.toLowerCase().trim()] = record;
      });
    });
    return map;
  };

  const [user, setUser] = useState<UserProfile>(() => storageService.getUserProfile());
  const [readiness, setReadiness] = useState<DailyReadiness>(() => storageService.getDailyReadiness());
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>(() => storageService.getScheduledEvents());
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutPlan[]>(() => {
    storageService.cleanMissedPastWorkouts();
    return storageService.getWorkoutHistory().filter((workout) => workout.id !== 'hist-1');
  });
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(() => storageService.getUserAccount());
  const [schoolLog, setSchoolLog] = useState<SchoolWorkoutLog | null>(() => storageService.getTodaySchoolWorkoutLog());
  const [dailyStreak, setDailyStreak] = useState(() => storageService.calculateDailyStreak());
  const [volumeTracking, setVolumeTracking] = useState(() => storageService.calculateAccumulatedVolume());

  const [todayWorkout, setTodayWorkout] = useState<WorkoutPlan>(() => {
    const saved = storageService.getCurrentWorkoutPlan();
    if (saved && Array.isArray(saved.exercises) && saved.exercises.length > 0) return saved;
    const historyForGeneration = storageService.getWorkoutHistory().filter((workout) => workout.id !== 'hist-1');
    const generated = fitnessEngine.generateDailyWorkout(user, readiness, scheduledEvents, buildPerformanceMap(historyForGeneration), storageService.getTodaySchoolWorkoutLog());
    storageService.saveCurrentWorkoutPlan(generated);
    return generated;
  });
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
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isRegeneratingMorning, setIsRegeneratingMorning] = useState(false);
  const [isRegeneratingNightly, setIsRegeneratingNightly] = useState(false);
  const [isRegeneratingPlyometrics, setIsRegeneratingPlyometrics] = useState(false);

  const refreshStats = () => {
    setDailyStreak(storageService.calculateDailyStreak());
    setVolumeTracking(storageService.calculateAccumulatedVolume());
  };

  const syncToCloud = useCallback((acc: UserAccount | null = currentAccount, customState?: { profile?: UserProfile; readiness?: DailyReadiness; events?: ScheduledEvent[]; history?: WorkoutPlan[]; todayPlan?: WorkoutPlan; additionalWorkout?: WorkoutPlan | null }) => {
    if (!acc) return;
    storageService.syncAllToCloud(acc, {
      profile: customState?.profile || user,
      readiness: customState?.readiness || readiness,
      events: customState?.events || scheduledEvents,
      history: customState?.history || workoutHistory,
      todayPlan: customState?.todayPlan || todayWorkout,
      additionalWorkout: customState?.additionalWorkout !== undefined ? customState.additionalWorkout : additionalWorkout,
      schoolLogs: storageService.getSchoolWorkoutLogs()
    });
  }, [currentAccount, user, readiness, scheduledEvents, workoutHistory, todayWorkout, additionalWorkout]);

  const generateMorningRoutineWithAI = async (targetUser = user, targetReadiness = readiness) => {
    setIsRegeneratingMorning(true);
    try {
      const res = await fetch('/api/generate-morning-routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: targetUser, readiness: targetReadiness, scheduledEvents, todayWorkout }) });
      if (res.ok) { const data = await res.json(); if (data?.routine) { setMobility(data.routine); storageService.saveMorningMobility(data.routine); return data.routine; } }
    } catch {}
    finally { setIsRegeneratingMorning(false); }
    const fallback = fitnessEngine.generateMorningMobility(targetUser, targetReadiness, 10); setMobility(fallback); storageService.saveMorningMobility(fallback); return fallback;
  };

  const generateNightlyRoutineWithAI = async (targetUser = user, targetReadiness = readiness, workoutPlan = todayWorkout) => {
    setIsRegeneratingNightly(true);
    try {
      const res = await fetch('/api/generate-nightly-routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: targetUser, readiness: targetReadiness, scheduledEvents, todayWorkout: workoutPlan }) });
      if (res.ok) { const data = await res.json(); if (data?.routine) { setNightlyRoutine(data.routine); storageService.saveNightlyRoutine(data.routine); return data.routine; } }
    } catch {}
    finally { setIsRegeneratingNightly(false); }
    const fallback = fitnessEngine.generateNightlyStretching(targetUser, targetReadiness, 10, workoutPlan); setNightlyRoutine(fallback); storageService.saveNightlyRoutine(fallback); return fallback;
  };

  const generatePlyometricsWithAI = async (targetUser = user, targetReadiness = readiness, targetSchoolLog: SchoolWorkoutLog | null = schoolLog) => {
    setIsRegeneratingPlyometrics(true);
    try {
      const res = await fetch('/api/generate-plyometrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: targetUser, readiness: targetReadiness, schoolLog: targetSchoolLog }) });
      if (res.ok) { const data = await res.json(); if (data?.routine) { setPlyometricsRoutine(data.routine); storageService.savePlyometricsRoutine(data.routine); return data.routine; } }
    } catch {}
    finally { setIsRegeneratingPlyometrics(false); }
    const fallback = fitnessEngine.generateDailyPlyometricsRoutine(targetUser, targetReadiness, targetSchoolLog, 12); setPlyometricsRoutine(fallback); storageService.savePlyometricsRoutine(fallback); return fallback;
  };

  const generateWorkoutWithAI = async (targetUser = user, targetReadiness = readiness, targetEvents = scheduledEvents, focusPrompt?: string, schoolLogData: SchoolWorkoutLog | null = schoolLog) => {
    setIsAiGenerating(true);
    const perfMap = buildPerformanceMap(workoutHistory);
    try {
      const res = await fetch('/api/generate-workout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        user: targetUser, readiness: targetReadiness, scheduledEvents: targetEvents, exercisePerformanceMap: perfMap,
        recentHistory: workoutHistory.slice(0, 8), recentSchoolLogs: storageService.getRecentSchoolLogs(7), customFocus: focusPrompt, schoolLog: schoolLogData
      }) });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json(); const freshPlan: WorkoutPlan = (data?.exercises ? data : data?.plan) as WorkoutPlan;
      if (!freshPlan?.exercises?.length) throw new Error('Invalid workout plan');
      setTodayWorkout(freshPlan); storageService.saveCurrentWorkoutPlan(freshPlan);
      generateMorningRoutineWithAI(targetUser, targetReadiness); generateNightlyRoutineWithAI(targetUser, targetReadiness, freshPlan); generatePlyometricsWithAI(targetUser, targetReadiness, schoolLogData);
      syncToCloud(currentAccount, { profile: targetUser, readiness: targetReadiness, events: targetEvents, todayPlan: freshPlan });
    } catch {
      const fallbackPlan = fitnessEngine.generateDailyWorkout(targetUser, targetReadiness, targetEvents, perfMap, schoolLogData);
      setTodayWorkout(fallbackPlan); storageService.saveCurrentWorkoutPlan(fallbackPlan);
      const freshMobility = fitnessEngine.generateMorningMobility(targetUser, targetReadiness, 10); const freshNightly = fitnessEngine.generateNightlyStretching(targetUser, targetReadiness, 10, fallbackPlan); const freshPlyos = fitnessEngine.generateDailyPlyometricsRoutine(targetUser, targetReadiness, schoolLogData, 12);
      setMobility(freshMobility); setNightlyRoutine(freshNightly); setPlyometricsRoutine(freshPlyos); storageService.saveMorningMobility(freshMobility); storageService.saveNightlyRoutine(freshNightly); storageService.savePlyometricsRoutine(freshPlyos);
    } finally { setIsAiGenerating(false); }
  };

  useEffect(() => {
    if (!todayWorkout?.isAiGenerated) generateWorkoutWithAI(user, readiness, scheduledEvents);
    else { if (!mobility?.isAiGenerated) generateMorningRoutineWithAI(); if (!nightlyRoutine?.isAiGenerated) generateNightlyRoutineWithAI(); if (!plyometricsRoutine?.isAiGenerated) generatePlyometricsWithAI(); }
  }, []);

  const handleSaveCheckIn = (newReadiness: DailyReadiness) => {
    setReadiness(newReadiness); storageService.saveDailyReadiness(newReadiness);
    let updatedUser = user;
    if (newReadiness.injuryStatus && user.specificInjuries) { updatedUser = { ...user, specificInjuries: user.specificInjuries.map((inj) => ({ ...inj, todayStatus: newReadiness.injuryStatus?.[inj.id] || inj.todayStatus })) }; setUser(updatedUser); storageService.saveUserProfile(updatedUser); }
    setShowCheckInModal(false); generateWorkoutWithAI(updatedUser, newReadiness, scheduledEvents);
  };

  const handleAddEvent = (newEvent: ScheduledEvent) => {
    const updated = [...scheduledEvents, newEvent]; setScheduledEvents(updated); storageService.saveScheduledEvents(updated);
    let updatedReadiness = readiness;
    const today = new Date().toISOString().split('T')[0];
    if (newEvent.date === today && (newEvent.type === 'practice' || newEvent.type === 'scrimmage')) {
      updatedReadiness = { ...readiness, practiceLaterToday: true, practiceIntensity: newEvent.expectedIntensity as any, practiceDurationMinutes: newEvent.durationMinutes };
      setReadiness(updatedReadiness); storageService.saveDailyReadiness(updatedReadiness);
    }
    generateWorkoutWithAI(user, updatedReadiness, updated);
  };

  const handleRemoveEvent = (id: string) => {
    const removed = scheduledEvents.find((e) => e.id === id); const updated = scheduledEvents.filter((e) => e.id !== id); setScheduledEvents(updated); storageService.saveScheduledEvents(updated);
    let updatedReadiness = readiness;
    const today = new Date().toISOString().split('T')[0];
    if (removed?.date === today && (removed.type === 'practice' || removed.type === 'scrimmage')) { updatedReadiness = { ...readiness, practiceLaterToday: false }; setReadiness(updatedReadiness); storageService.saveDailyReadiness(updatedReadiness); }
    generateWorkoutWithAI(user, updatedReadiness, updated, 'Recalibrated after scheduled event change');
  };

  const handleDeletePastWorkout = (id: string) => { storageService.deleteWorkoutHistoryItem(id); const updated = workoutHistory.filter((w) => w.id !== id); setWorkoutHistory(updated); refreshStats(); syncToCloud(currentAccount, { history: updated }); };
  const handleStartTodayWorkout = () => { setActiveWorkoutTarget('today'); setIsWorkingOut(true); };
  const handleStartAdditionalWorkout = () => { setActiveWorkoutTarget('additional'); setIsWorkingOut(true); };

  const handleSaveInProgressWorkout = (inProgressPlan: WorkoutPlan) => {
    if (activeWorkoutTarget === 'today') { setTodayWorkout(inProgressPlan); storageService.saveCurrentWorkoutPlan(inProgressPlan); syncToCloud(currentAccount, { todayPlan: inProgressPlan }); }
    else { setAdditionalWorkout(inProgressPlan); storageService.saveAdditionalWorkout(inProgressPlan); syncToCloud(currentAccount, { additionalWorkout: inProgressPlan }); }
    refreshStats();
  };

  const handleDeleteTodayWorkout = () => {
    storageService.deleteWorkoutHistoryItem(todayWorkout.id); const updatedHistory = workoutHistory.filter((w) => w.id !== todayWorkout.id); setWorkoutHistory(updatedHistory);
    const fallback = fitnessEngine.generateDailyWorkout(user, readiness, scheduledEvents, buildPerformanceMap(updatedHistory), schoolLog); setTodayWorkout(fallback); storageService.saveCurrentWorkoutPlan(fallback); refreshStats(); syncToCloud(currentAccount, { history: updatedHistory, todayPlan: fallback });
  };
  const handleDeleteAdditionalWorkout = () => {
    if (!additionalWorkout) return; storageService.deleteWorkoutHistoryItem(additionalWorkout.id); const updated = workoutHistory.filter((w) => w.id !== additionalWorkout.id); setWorkoutHistory(updated); setAdditionalWorkout(null); storageService.deleteAdditionalWorkout(); refreshStats(); syncToCloud(currentAccount, { history: updated, additionalWorkout: null });
  };
  const handleDeleteCurrentWorkout = () => { if (activeWorkoutTarget === 'today') handleDeleteTodayWorkout(); else handleDeleteAdditionalWorkout(); setIsWorkingOut(false); };

  const handleFinishWorkout = (completed: WorkoutPlan) => {
    const updatedHistory = [completed, ...workoutHistory.filter((w) => w.id !== completed.id)]; setWorkoutHistory(updatedHistory); storageService.saveWorkoutHistory(updatedHistory); storageService.recordExercisePerformance(completed);
    if (activeWorkoutTarget === 'today') { setTodayWorkout(completed); storageService.saveCurrentWorkoutPlan(completed); syncToCloud(currentAccount, { history: updatedHistory, todayPlan: completed }); }
    else { setAdditionalWorkout(null); storageService.deleteAdditionalWorkout(); syncToCloud(currentAccount, { history: updatedHistory, additionalWorkout: null }); }
    setIsWorkingOut(false); setActiveTab('history'); refreshStats();
  };

  const handleSaveCustomWorkout = (customPlan: WorkoutPlan, startImmediately = false, mode: 'replace' | 'alongside' = 'replace') => {
    if (mode === 'replace') { setTodayWorkout(customPlan); storageService.saveCurrentWorkoutPlan(customPlan); setActiveWorkoutTarget('today'); syncToCloud(currentAccount, { todayPlan: customPlan }); }
    else { setAdditionalWorkout(customPlan); storageService.saveAdditionalWorkout(customPlan); setActiveWorkoutTarget('additional'); syncToCloud(currentAccount, { additionalWorkout: customPlan }); }
    setShowCustomWorkoutModal(false); refreshStats(); if (startImmediately) setIsWorkingOut(true);
  };

  const handleCompleteMobility = () => { const updated = { ...mobility, completed: true }; setMobility(updated); storageService.saveMorningMobility(updated); storageService.recordActivity('mobility', updated.date, 1); setIsDoingMobility(false); refreshStats(); };
  const handleCompleteNightly = () => { const updated = { ...nightlyRoutine, completed: true }; setNightlyRoutine(updated); storageService.saveNightlyRoutine(updated); storageService.recordActivity('nightly', updated.date, 1); setIsDoingNightly(false); refreshStats(); };
  const handleCompletePlyometrics = () => {
    const updated = { ...plyometricsRoutine, completed: true }; setPlyometricsRoutine(updated); storageService.savePlyometricsRoutine(updated);
    const jumpCount = (updated.exercises || []).reduce((sum, ex) => { const match = String(ex.repsOrDuration || '').match(/\d+/); return sum + (match ? Number(match[0]) * ex.sets : 0); }, 0);
    storageService.recordActivity('plyometrics', updated.date, jumpCount); setIsDoingPlyometrics(false); refreshStats();
  };

  const handleSaveSchoolLog = (newLog: SchoolWorkoutLog) => {
    storageService.addSchoolWorkoutLog(newLog); setSchoolLog(storageService.getTodaySchoolWorkoutLog()); setShowSchoolLogModal(false); refreshStats(); generateWorkoutWithAI(user, readiness, scheduledEvents, undefined, newLog); syncToCloud(currentAccount, { history: workoutHistory });
  };
  const handleSwapExercise = (exerciseId: string) => { const updated = fitnessEngine.swapExercise(todayWorkout, exerciseId, user); setTodayWorkout(updated); storageService.saveCurrentWorkoutPlan(updated); syncToCloud(currentAccount, { todayPlan: updated }); };
  const handleQuickAdjustTime = (minutes: number) => { const r = { ...readiness, availableMinutes: minutes }; setReadiness(r); storageService.saveDailyReadiness(r); generateWorkoutWithAI(user, r, scheduledEvents); };
  const handleSaveSettings = (updated: UserProfile) => { setUser(updated); storageService.saveUserProfile(updated); setShowSettingsModal(false); generateWorkoutWithAI(updated, readiness, scheduledEvents); };
  const handleSaveMessages = (msgs: ChatMessage[]) => { setChatMessages(msgs); storageService.saveChatMessages(msgs); };

  const handleLoginSuccess = (account: UserAccount, cloudData?: any) => {
    setCurrentAccount(account); storageService.saveUserAccount(account);
    if (cloudData) {
      if (cloudData.profile) { setUser(cloudData.profile); storageService.saveUserProfile(cloudData.profile); }
      if (cloudData.readiness) { setReadiness(cloudData.readiness); storageService.saveDailyReadiness(cloudData.readiness); }
      if (cloudData.events) { setScheduledEvents(cloudData.events); storageService.saveScheduledEvents(cloudData.events); }
      if (cloudData.history) { const history = cloudData.history.filter((w: WorkoutPlan) => w.id !== 'hist-1'); setWorkoutHistory(history); storageService.saveWorkoutHistory(history); storageService.rebuildExercisePerformanceMap(history); }
      if (cloudData.todayPlan) { setTodayWorkout(cloudData.todayPlan); storageService.saveCurrentWorkoutPlan(cloudData.todayPlan); }
      if (cloudData.additionalWorkout !== undefined) { setAdditionalWorkout(cloudData.additionalWorkout || null); if (cloudData.additionalWorkout) storageService.saveAdditionalWorkout(cloudData.additionalWorkout); else storageService.deleteAdditionalWorkout(); }
      refreshStats();
    } else syncToCloud(account);
  };
  const handleLogout = () => { setCurrentAccount(null); storageService.saveUserAccount(null); };
  const handleResetData = () => { storageService.clearAll(); window.location.reload(); };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      <Header user={user} currentAccount={currentAccount} activeTab={activeTab} onTabChange={setActiveTab} readiness={readiness} scheduledEvents={scheduledEvents} onOpenCheckIn={() => setShowCheckInModal(true)} onOpenSettings={() => setShowSettingsModal(true)} onOpenAuth={() => setShowAuthModal(true)} onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)} />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'today' && <TodayScreen user={user} readiness={readiness} todayWorkout={todayWorkout} additionalWorkout={additionalWorkout} mobility={mobility} nightlyRoutine={nightlyRoutine} plyometricsRoutine={plyometricsRoutine} schoolLog={schoolLog} dailyStreak={dailyStreak} volumeTracking={volumeTracking} scheduledEvents={scheduledEvents} workoutHistory={workoutHistory} isAiGenerating={isAiGenerating} isRegeneratingMorning={isRegeneratingMorning} isRegeneratingNightly={isRegeneratingNightly} onRegenerateWorkout={(focus) => generateWorkoutWithAI(user, readiness, scheduledEvents, focus)} onRegenerateMorning={() => generateMorningRoutineWithAI()} onRegenerateNightly={() => generateNightlyRoutineWithAI()} onStartWorkout={handleStartTodayWorkout} onStartAdditionalWorkout={handleStartAdditionalWorkout} onDeleteAdditionalWorkout={handleDeleteAdditionalWorkout} onDeleteTodayWorkout={handleDeleteTodayWorkout} onStartMobility={() => setIsDoingMobility(true)} onStartNightly={() => setIsDoingNightly(true)} onStartPlyometrics={() => setIsDoingPlyometrics(true)} onOpenSchoolLog={() => setShowSchoolLogModal(true)} onOpenCheckIn={() => setShowCheckInModal(true)} onSwapExercise={handleSwapExercise} onQuickAdjustTime={handleQuickAdjustTime} onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)} />}
        {activeTab === 'calendar' && <CalendarScreen user={user} scheduledEvents={scheduledEvents} workoutHistory={workoutHistory} onAddEvent={handleAddEvent} onRemoveEvent={handleRemoveEvent} todayWorkout={todayWorkout} />}
        {activeTab === 'history' && <HistoryScreen workoutHistory={workoutHistory} onDeleteWorkout={handleDeletePastWorkout} />}
        {activeTab === 'progress' && <ProgressScreen user={user} history={workoutHistory} dailyStreak={dailyStreak} volumeTracking={volumeTracking} schoolLogs={storageService.getSchoolWorkoutLogs()} />}
        {activeTab === 'coach' && <AICoachScreen user={user} currentPlan={todayWorkout} scheduledEvents={scheduledEvents} chatMessages={chatMessages} onSaveMessages={handleSaveMessages} />}
      </main>

      {isWorkingOut && <ActiveWorkoutModal workout={activeWorkoutTarget === 'today' ? todayWorkout : (additionalWorkout || todayWorkout)} user={user} workoutHistory={workoutHistory} onFinishWorkout={handleFinishWorkout} onSaveInProgress={handleSaveInProgressWorkout} onDeleteWorkout={handleDeleteCurrentWorkout} onClose={() => setIsWorkingOut(false)} />}
      {isDoingMobility && <MobilityModal mobility={mobility} onComplete={handleCompleteMobility} onClose={() => setIsDoingMobility(false)} />}
      {isDoingNightly && nightlyRoutine && <NightlyRoutineModal routine={nightlyRoutine} onComplete={handleCompleteNightly} onClose={() => setIsDoingNightly(false)} />}
      {isDoingPlyometrics && plyometricsRoutine && <PlyometricsModal routine={plyometricsRoutine} onComplete={handleCompletePlyometrics} onClose={() => setIsDoingPlyometrics(false)} />}
      {showSchoolLogModal && <LogSchoolWorkoutModal existingLog={schoolLog} onSave={handleSaveSchoolLog} onClose={() => setShowSchoolLogModal(false)} />}
      {showCheckInModal && <DailyCheckInModal user={user} initialReadiness={readiness} onSave={handleSaveCheckIn} onClose={() => setShowCheckInModal(false)} />}
      {showSettingsModal && <SettingsModal user={user} onSave={handleSaveSettings} onResetData={handleResetData} onClose={() => setShowSettingsModal(false)} />}
      {showAuthModal && <AuthModal currentAccount={currentAccount} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} onClose={() => setShowAuthModal(false)} />}
      {!user.onboardingCompleted && <OnboardingModal onComplete={(profile) => { setUser(profile); storageService.saveUserProfile(profile); generateWorkoutWithAI(profile, readiness, scheduledEvents); }} />}
      {showCustomWorkoutModal && <CustomWorkoutModal isOpen={showCustomWorkoutModal} user={user} workoutHistory={workoutHistory} savedTemplates={storageService.getCustomWorkoutTemplates()} onSaveWorkout={handleSaveCustomWorkout} onSaveTemplate={(template) => storageService.addCustomWorkoutTemplate(template)} onClose={() => setShowCustomWorkoutModal(false)} />}
    </div>
  );
}

export default App;