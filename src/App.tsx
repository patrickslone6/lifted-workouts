import React, { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  DailyReadiness,
  WorkoutPlan,
  MorningMobilityRoutine,
  NightlyStretchingRoutine,
  ScheduledEvent,
  ChatMessage,
  UserAccount,
  PlyometricsRoutine,
  SchoolWorkoutLog
} from './types';
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
  const [user, setUser] = useState<UserProfile>(() => storageService.getUserProfile());
  const [readiness, setReadiness] = useState<DailyReadiness>(() => storageService.getDailyReadiness());
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>(() =>
    storageService.getScheduledEvents()
  );
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutPlan[]>(() => {
    // Automatically clean any missed past workouts on boot
    storageService.cleanMissedPastWorkouts();
    return storageService.getWorkoutHistory();
  });

  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(() =>
    storageService.getUserAccount()
  );

  const [schoolLog, setSchoolLog] = useState<SchoolWorkoutLog | null>(() =>
    storageService.getTodaySchoolWorkoutLog()
  );

  const [dailyStreak, setDailyStreak] = useState(() =>
    storageService.calculateDailyStreak()
  );

  const [volumeTracking, setVolumeTracking] = useState(() =>
    storageService.calculateAccumulatedVolume()
  );

  const [todayWorkout, setTodayWorkout] = useState<WorkoutPlan>(() => {
    const saved = storageService.getCurrentWorkoutPlan();
    if (saved && Array.isArray(saved.exercises) && saved.exercises.length > 0) return saved;
    const u = storageService.getUserProfile();
    const r = storageService.getDailyReadiness();
    const evts = storageService.getScheduledEvents();
    const perfMap = storageService.getExercisePerformanceMap();
    const sl = storageService.getTodaySchoolWorkoutLog();
    const generated = fitnessEngine.generateDailyWorkout(u, r, evts, perfMap, sl);
    storageService.saveCurrentWorkoutPlan(generated);
    return generated;
  });

  const [plyometricsRoutine, setPlyometricsRoutine] = useState<PlyometricsRoutine>(() => {
    const saved = storageService.getPlyometricsRoutine();
    if (saved) return saved;
    const u = storageService.getUserProfile();
    const r = storageService.getDailyReadiness();
    const sl = storageService.getTodaySchoolWorkoutLog();
    const generated = fitnessEngine.generateDailyPlyometricsRoutine(u, r, sl, 12);
    storageService.savePlyometricsRoutine(generated);
    return generated;
  });

  const [mobility, setMobility] = useState<MorningMobilityRoutine>(() => {
    const saved = storageService.getMorningMobility();
    if (saved) return saved;
    const u = storageService.getUserProfile();
    const r = storageService.getDailyReadiness();
    const generated = fitnessEngine.generateMorningMobility(u, r, 10);
    storageService.saveMorningMobility(generated);
    return generated;
  });

  const [nightlyRoutine, setNightlyRoutine] = useState<NightlyStretchingRoutine>(() => {
    const saved = storageService.getNightlyRoutine();
    if (saved) return saved;
    const u = storageService.getUserProfile();
    const r = storageService.getDailyReadiness();
    const tw = storageService.getTodayWorkout();
    const generated = fitnessEngine.generateNightlyStretching(u, r, 10, tw);
    storageService.saveNightlyRoutine(generated);
    return generated;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    storageService.getChatMessages()
  );

  // Active Screen / Modals
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

  // Refresh streaks and volume
  const refreshStats = () => {
    setDailyStreak(storageService.calculateDailyStreak());
    setVolumeTracking(storageService.calculateAccumulatedVolume());
  };

  // Cloud sync helper
  const syncToCloud = useCallback(
    (
      acc: UserAccount | null = currentAccount,
      customState?: {
        profile?: UserProfile;
        readiness?: DailyReadiness;
        events?: ScheduledEvent[];
        history?: WorkoutPlan[];
        todayPlan?: WorkoutPlan;
      }
    ) => {
      if (!acc) return;
      storageService.syncAllToCloud(acc, {
        profile: customState?.profile || user,
        readiness: customState?.readiness || readiness,
        events: customState?.events || scheduledEvents,
        history: customState?.history || workoutHistory,
        todayPlan: customState?.todayPlan || todayWorkout
      });
    },
    [currentAccount, user, readiness, scheduledEvents, workoutHistory, todayWorkout]
  );

  // AI Morning Routine Generation
  const generateMorningRoutineWithAI = async (
    targetUser: UserProfile = user,
    targetReadiness: DailyReadiness = readiness
  ) => {
    setIsRegeneratingMorning(true);
    try {
      const res = await fetch('/api/generate-morning-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: targetUser,
          readiness: targetReadiness,
          scheduledEvents,
          todayWorkout
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.routine) {
          setMobility(data.routine);
          storageService.saveMorningMobility(data.routine);
          return data.routine;
        }
      }
    } catch (err) {
      console.warn('AI morning routine generation error, using fallback:', err);
    } finally {
      setIsRegeneratingMorning(false);
    }
    const fallback = fitnessEngine.generateMorningMobility(targetUser, targetReadiness, 10);
    setMobility(fallback);
    storageService.saveMorningMobility(fallback);
    return fallback;
  };

  // AI Nightly Stretching Generation (Before Bed After Workout)
  const generateNightlyRoutineWithAI = async (
    targetUser: UserProfile = user,
    targetReadiness: DailyReadiness = readiness,
    workoutPlan: WorkoutPlan = todayWorkout
  ) => {
    setIsRegeneratingNightly(true);
    try {
      const res = await fetch('/api/generate-nightly-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: targetUser,
          readiness: targetReadiness,
          scheduledEvents,
          todayWorkout: workoutPlan
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.routine) {
          setNightlyRoutine(data.routine);
          storageService.saveNightlyRoutine(data.routine);
          return data.routine;
        }
      }
    } catch (err) {
      console.warn('AI nightly stretching generation error, using fallback:', err);
    } finally {
      setIsRegeneratingNightly(false);
    }
    const fallback = fitnessEngine.generateNightlyStretching(targetUser, targetReadiness, 10, workoutPlan);
    setNightlyRoutine(fallback);
    storageService.saveNightlyRoutine(fallback);
    return fallback;
  };

  // AI Daily At-Home Plyometrics Generation (Zero/Minimal Equipment)
  const generatePlyometricsWithAI = async (
    targetUser: UserProfile = user,
    targetReadiness: DailyReadiness = readiness,
    targetSchoolLog: SchoolWorkoutLog | null = schoolLog
  ) => {
    setIsRegeneratingPlyometrics(true);
    try {
      const res = await fetch('/api/generate-plyometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: targetUser,
          readiness: targetReadiness,
          schoolLog: targetSchoolLog
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.routine) {
          setPlyometricsRoutine(data.routine);
          storageService.savePlyometricsRoutine(data.routine);
          return data.routine;
        }
      }
    } catch (err) {
      console.warn('AI plyometrics generation error, using fallback:', err);
    } finally {
      setIsRegeneratingPlyometrics(false);
    }
    const fallback = fitnessEngine.generateDailyPlyometricsRoutine(targetUser, targetReadiness, targetSchoolLog, 12);
    setPlyometricsRoutine(fallback);
    storageService.savePlyometricsRoutine(fallback);
    return fallback;
  };

  // Centralized AI Workout Generation Function
  const generateWorkoutWithAI = async (
    targetUser: UserProfile = user,
    targetReadiness: DailyReadiness = readiness,
    targetEvents: ScheduledEvent[] = scheduledEvents,
    focusPrompt?: string,
    schoolLogData: SchoolWorkoutLog | null = schoolLog
  ) => {
    setIsAiGenerating(true);
    const perfMap = storageService.getExercisePerformanceMap();

    try {
      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: targetUser,
          readiness: targetReadiness,
          scheduledEvents: targetEvents,
          exercisePerformanceMap: perfMap,
          recentHistory: workoutHistory.slice(0, 3),
          customFocus: focusPrompt,
          schoolLog: schoolLogData
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const resData = await res.json();
      const freshPlan: WorkoutPlan = (resData?.exercises ? resData : resData?.plan) as WorkoutPlan;

      if (!freshPlan || !Array.isArray(freshPlan.exercises) || freshPlan.exercises.length === 0) {
        throw new Error('Received invalid workout plan from API');
      }

      setTodayWorkout(freshPlan);
      storageService.saveCurrentWorkoutPlan(freshPlan);

      // Concurrently calibrate AI morning, nightly & plyometrics routines custom to this day and school fatigue
      generateMorningRoutineWithAI(targetUser, targetReadiness);
      generateNightlyRoutineWithAI(targetUser, targetReadiness, freshPlan);
      generatePlyometricsWithAI(targetUser, targetReadiness, schoolLogData);

      syncToCloud(currentAccount, {
        profile: targetUser,
        readiness: targetReadiness,
        events: targetEvents,
        todayPlan: freshPlan
      });
    } catch (err) {
      console.warn('Backend AI generation fell back to local engine:', err);
      // Fallback seamlessly to local rule-based fitness engine
      const fallbackPlan = fitnessEngine.generateDailyWorkout(
        targetUser,
        targetReadiness,
        targetEvents,
        perfMap,
        schoolLogData
      );
      const freshMobility = fitnessEngine.generateMorningMobility(targetUser, targetReadiness, 10);
      const freshNightly = fitnessEngine.generateNightlyStretching(targetUser, targetReadiness, 10, fallbackPlan);
      const freshPlyos = fitnessEngine.generateDailyPlyometricsRoutine(targetUser, targetReadiness, schoolLogData, 12);

      setTodayWorkout(fallbackPlan);
      setMobility(freshMobility);
      setNightlyRoutine(freshNightly);
      setPlyometricsRoutine(freshPlyos);
      storageService.saveCurrentWorkoutPlan(fallbackPlan);
      storageService.saveMorningMobility(freshMobility);
      storageService.saveNightlyRoutine(freshNightly);
      storageService.savePlyometricsRoutine(freshPlyos);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Run initial AI generation if routines or plan are not AI generated yet
  useEffect(() => {
    if (!todayWorkout?.isAiGenerated) {
      generateWorkoutWithAI(user, readiness, scheduledEvents);
    } else {
      if (!mobility?.isAiGenerated) {
        generateMorningRoutineWithAI(user, readiness);
      }
      if (!nightlyRoutine?.isAiGenerated) {
        generateNightlyRoutineWithAI(user, readiness, todayWorkout);
      }
      if (!plyometricsRoutine?.isAiGenerated) {
        generatePlyometricsWithAI(user, readiness, schoolLog);
      }
    }
  }, []);

  // Daily Check-In Saved (Updates current day and runs through AI)
  const handleSaveCheckIn = (newReadiness: DailyReadiness) => {
    setReadiness(newReadiness);
    storageService.saveDailyReadiness(newReadiness);

    // Update user's specific injuries status if check-in provided it
    let updatedUser = user;
    if (newReadiness.injuryStatus && user.specificInjuries) {
      const updatedInjuries = user.specificInjuries.map((inj) => ({
        ...inj,
        todayStatus: newReadiness.injuryStatus?.[inj.id] || inj.todayStatus
      }));
      updatedUser = { ...user, specificInjuries: updatedInjuries };
      setUser(updatedUser);
      storageService.saveUserProfile(updatedUser);
    }

    setShowCheckInModal(false);
    // Put current day immediately through AI
    generateWorkoutWithAI(updatedUser, newReadiness, scheduledEvents);
  };

  // Add Calendar Event (Practice or Game) -> Immediately recalculates through AI
  const handleAddEvent = (newEvent: ScheduledEvent) => {
    const updated = [...scheduledEvents, newEvent];
    setScheduledEvents(updated);
    storageService.saveScheduledEvents(updated);

    // If event is today and is practice, update today's readiness
    const todayStr = new Date().toISOString().split('T')[0];
    let updatedReadiness = readiness;
    if (newEvent.date === todayStr && (newEvent.type === 'practice' || newEvent.type === 'scrimmage')) {
      updatedReadiness = {
        ...readiness,
        practiceLaterToday: true,
        practiceIntensity: (newEvent.expectedIntensity as any) || 'moderate'
      };
      setReadiness(updatedReadiness);
      storageService.saveDailyReadiness(updatedReadiness);
    }

    generateWorkoutWithAI(user, updatedReadiness, updated);
  };

  // Remove Calendar Event -> Automatically regenerates workout through AI
  const handleRemoveEvent = (id: string) => {
    const removedEvent = scheduledEvents.find((e) => e.id === id);
    const updated = scheduledEvents.filter((e) => e.id !== id);
    setScheduledEvents(updated);
    storageService.saveScheduledEvents(updated);

    // If deleting practice from today, reset practiceLaterToday
    const todayStr = new Date().toISOString().split('T')[0];
    let updatedReadiness = readiness;
    if (removedEvent?.date === todayStr && (removedEvent.type === 'practice' || removedEvent.type === 'scrimmage')) {
      updatedReadiness = {
        ...readiness,
        practiceLaterToday: false
      };
      setReadiness(updatedReadiness);
      storageService.saveDailyReadiness(updatedReadiness);
    }

    // User requirement: "when you delete future practices and games or change anything important, it puts the workout through ai and generates you another one"
    generateWorkoutWithAI(user, updatedReadiness, updated, 'Recalibrated after scheduled event was removed');
  };

  // Delete past workout (User prompt requirement)
  const handleDeletePastWorkout = (id: string) => {
    storageService.deleteWorkoutHistoryItem(id);
    const updated = workoutHistory.filter((w) => w.id !== id);
    setWorkoutHistory(updated);
    syncToCloud(currentAccount, { history: updated });
  };

  // Finish Workout
  const handleFinishWorkout = (completed: WorkoutPlan) => {
    const updatedHistory = [completed, ...workoutHistory];
    setWorkoutHistory(updatedHistory);
    storageService.saveWorkoutHistory(updatedHistory);
    setTodayWorkout(completed);
    storageService.saveCurrentWorkoutPlan(completed);
    storageService.recordExercisePerformance(completed);
    setIsWorkingOut(false);
    setActiveTab('history');
    refreshStats();
    syncToCloud(currentAccount, { history: updatedHistory, todayPlan: completed });
  };

  // Save Custom Created Workout
  const handleSaveCustomWorkout = (customPlan: WorkoutPlan) => {
    setTodayWorkout(customPlan);
    storageService.saveCurrentWorkoutPlan(customPlan);
    storageService.recordExercisePerformance(customPlan);
    setShowCustomWorkoutModal(false);
    refreshStats();
    syncToCloud(currentAccount, { todayPlan: customPlan });
  };

  // Complete Mobility
  const handleCompleteMobility = () => {
    const updated = { ...mobility, completed: true };
    setMobility(updated);
    storageService.saveMorningMobility(updated);
    setIsDoingMobility(false);
    refreshStats();
  };

  // Complete Nightly Bedtime Routine
  const handleCompleteNightly = () => {
    const updated = { ...nightlyRoutine, completed: true };
    setNightlyRoutine(updated);
    storageService.saveNightlyRoutine(updated);
    setIsDoingNightly(false);
    refreshStats();
  };

  // Complete Daily At-Home Plyometrics Routine
  const handleCompletePlyometrics = () => {
    const updated = { ...plyometricsRoutine, completed: true };
    setPlyometricsRoutine(updated);
    storageService.savePlyometricsRoutine(updated);
    setIsDoingPlyometrics(false);
    refreshStats();
  };

  // Save School Basketball Weightlifting & Practice Log
  const handleSaveSchoolLog = (newLog: SchoolWorkoutLog) => {
    storageService.addSchoolWorkoutLog(newLog);
    setSchoolLog(newLog);
    setShowSchoolLogModal(false);
    refreshStats();
    // User request: "these should be incorporated in the ai generated daily workouts, stretches, and plyometrics and stored in memory"
    generateWorkoutWithAI(user, readiness, scheduledEvents, undefined, newLog);
  };

  // Swap Exercise
  const handleSwapExercise = (exerciseId: string) => {
    const updated = fitnessEngine.swapExercise(todayWorkout, exerciseId, user);
    setTodayWorkout(updated);
    storageService.saveCurrentWorkoutPlan(updated);
    syncToCloud(currentAccount, { todayPlan: updated });
  };

  // Quick Adjust Duration
  const handleQuickAdjustTime = (minutes: number) => {
    const updatedReadiness: DailyReadiness = {
      ...readiness,
      availableMinutes: minutes
    };
    setReadiness(updatedReadiness);
    storageService.saveDailyReadiness(updatedReadiness);
    generateWorkoutWithAI(user, updatedReadiness, scheduledEvents);
  };

  // Save Settings / Specific Injuries
  const handleSaveSettings = (updated: UserProfile) => {
    setUser(updated);
    storageService.saveUserProfile(updated);
    setShowSettingsModal(false);
    // Put current day through AI to immediately reflect new specific injuries or gear changes
    generateWorkoutWithAI(updated, readiness, scheduledEvents);
  };

  // Save Chat
  const handleSaveMessages = (msgs: ChatMessage[]) => {
    setChatMessages(msgs);
    storageService.saveChatMessages(msgs);
  };

  // Auth / Login Success
  const handleLoginSuccess = (account: UserAccount, cloudData?: any) => {
    setCurrentAccount(account);
    storageService.saveUserAccount(account);

    if (cloudData) {
      if (cloudData.profile) {
        setUser(cloudData.profile);
        storageService.saveUserProfile(cloudData.profile);
      }
      if (cloudData.readiness) {
        setReadiness(cloudData.readiness);
        storageService.saveDailyReadiness(cloudData.readiness);
      }
      if (cloudData.events) {
        setScheduledEvents(cloudData.events);
        storageService.saveScheduledEvents(cloudData.events);
      }
      if (cloudData.history) {
        setWorkoutHistory(cloudData.history);
        storageService.saveWorkoutHistory(cloudData.history);
      }
      if (cloudData.todayPlan) {
        setTodayWorkout(cloudData.todayPlan);
        storageService.saveCurrentWorkoutPlan(cloudData.todayPlan);
      }
    } else {
      // Sync local state up to newly created account
      syncToCloud(account);
    }
  };

  // Logout
  const handleLogout = () => {
    setCurrentAccount(null);
    storageService.saveUserAccount(null);
  };

  // Reset Data
  const handleResetData = () => {
    storageService.clearAll();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Sticky Header */}
      <Header
        user={user}
        currentAccount={currentAccount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        readiness={readiness}
        scheduledEvents={scheduledEvents}
        onOpenCheckIn={() => setShowCheckInModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'today' && (
          <TodayScreen
            user={user}
            readiness={readiness}
            todayWorkout={todayWorkout}
            mobility={mobility}
            nightlyRoutine={nightlyRoutine}
            plyometricsRoutine={plyometricsRoutine}
            schoolLog={schoolLog}
            dailyStreak={dailyStreak}
            volumeTracking={volumeTracking}
            scheduledEvents={scheduledEvents}
            workoutHistory={workoutHistory}
            isAiGenerating={isAiGenerating}
            isRegeneratingMorning={isRegeneratingMorning}
            isRegeneratingNightly={isRegeneratingNightly}
            onRegenerateWorkout={(focus) => generateWorkoutWithAI(user, readiness, scheduledEvents, focus)}
            onRegenerateMorning={() => generateMorningRoutineWithAI(user, readiness)}
            onRegenerateNightly={() => generateNightlyRoutineWithAI(user, readiness, todayWorkout)}
            onStartWorkout={() => setIsWorkingOut(true)}
            onStartMobility={() => setIsDoingMobility(true)}
            onStartNightly={() => setIsDoingNightly(true)}
            onStartPlyometrics={() => setIsDoingPlyometrics(true)}
            onOpenSchoolLog={() => setShowSchoolLogModal(true)}
            onOpenCheckIn={() => setShowCheckInModal(true)}
            onSwapExercise={handleSwapExercise}
            onQuickAdjustTime={handleQuickAdjustTime}
            onOpenCustomWorkout={() => setShowCustomWorkoutModal(true)}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarScreen
            user={user}
            scheduledEvents={scheduledEvents}
            workoutHistory={workoutHistory}
            onAddEvent={handleAddEvent}
            onRemoveEvent={handleRemoveEvent}
            todayWorkout={todayWorkout}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            workoutHistory={workoutHistory}
            onDeleteWorkout={handleDeletePastWorkout}
          />
        )}

        {activeTab === 'progress' && <ProgressScreen user={user} history={workoutHistory} />}

        {activeTab === 'coach' && (
          <AICoachScreen
            user={user}
            currentPlan={todayWorkout}
            scheduledEvents={scheduledEvents}
            chatMessages={chatMessages}
            onSaveMessages={handleSaveMessages}
          />
        )}
      </main>

      {/* MODALS */}
      {/* 1. Active Workout Runner */}
      {isWorkingOut && (
        <ActiveWorkoutModal
          workout={todayWorkout}
          user={user}
          workoutHistory={workoutHistory}
          onFinishWorkout={handleFinishWorkout}
          onClose={() => setIsWorkingOut(false)}
        />
      )}

      {/* 2. Morning Mobility Player */}
      {isDoingMobility && (
        <MobilityModal
          mobility={mobility}
          onComplete={handleCompleteMobility}
          onClose={() => setIsDoingMobility(false)}
        />
      )}

      {/* 2b. Nightly Restorative Stretching Player */}
      {isDoingNightly && nightlyRoutine && (
        <NightlyRoutineModal
          routine={nightlyRoutine}
          onComplete={handleCompleteNightly}
          onClose={() => setIsDoingNightly(false)}
        />
      )}

      {/* 2c. Daily At-Home Plyometrics Player */}
      {isDoingPlyometrics && plyometricsRoutine && (
        <PlyometricsModal
          routine={plyometricsRoutine}
          onComplete={handleCompletePlyometrics}
          onClose={() => setIsDoingPlyometrics(false)}
        />
      )}

      {/* 2d. School Basketball Weightlifting & Practice Log Modal */}
      {showSchoolLogModal && (
        <LogSchoolWorkoutModal
          existingLog={schoolLog}
          onSave={handleSaveSchoolLog}
          onClose={() => setShowSchoolLogModal(false)}
        />
      )}

      {/* 3. 30-Second Daily Check-in with Specific Injury Feelings */}
      {showCheckInModal && (
        <DailyCheckInModal
          user={user}
          initialReadiness={readiness}
          onSave={handleSaveCheckIn}
          onClose={() => setShowCheckInModal(false)}
        />
      )}

      {/* 4. Settings & Specific Typed Injuries */}
      {showSettingsModal && (
        <SettingsModal
          user={user}
          onSave={handleSaveSettings}
          onResetData={handleResetData}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* 5. Cloud Sync & Multi-Device Auth Modal */}
      {showAuthModal && (
        <AuthModal
          currentAccount={currentAccount}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* 6. First-Time Onboarding Modal (If not completed) */}
      {!user.onboardingCompleted && (
        <OnboardingModal
          onComplete={(profile) => {
            setUser(profile);
            storageService.saveUserProfile(profile);
            generateWorkoutWithAI(profile, readiness, scheduledEvents);
          }}
        />
      )}

      {/* 7. Custom Workout Builder Modal */}
      {showCustomWorkoutModal && (
        <CustomWorkoutModal
          user={user}
          workoutHistory={workoutHistory}
          onSaveWorkout={handleSaveCustomWorkout}
          onClose={() => setShowCustomWorkoutModal(false)}
        />
      )}
    </div>
  );
}

export default App;
