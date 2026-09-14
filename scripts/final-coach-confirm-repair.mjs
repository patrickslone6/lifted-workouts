import fs from 'node:fs';

const replaceOnce = (file, pattern, replacement, label) => {
  const source = fs.readFileSync(file, 'utf8');
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Could not patch ${label} in ${file}`);
  fs.writeFileSync(file, next, 'utf8');
};

replaceOnce(
  'src/components/AICoachScreen.tsx',
  /body: JSON\.stringify\(\{[\s\S]*?\n\s*\}\) \}\);/,
  `body: JSON.stringify({
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
      }) });`,
  'Coach request payload'
);

replaceOnce(
  'src/App.tsx',
  /const handleDeleteWorkout = \(id: string\) => \{[^\n]*\};/,
  `const handleDeleteWorkout = (id: string) => { if (!window.confirm('Delete this workout from History? This cannot be undone.')) return; const history = workoutHistory.filter((w) => w.id !== id); setWorkoutHistory(history); storageService.deleteWorkoutHistoryItem(id); storageService.rebuildExercisePerformanceMap(history); syncToCloud(currentAccount, { history }); refreshStats(); };`,
  'workout deletion confirmation'
);
replaceOnce(
  'src/App.tsx',
  /const handleDeleteActivity = \(type: 'mobility' \| 'nightly' \| 'plyometrics', date: string\) => \{[^\n]*\};/,
  `const handleDeleteActivity = (type: 'mobility' | 'nightly' | 'plyometrics', date: string) => { if (!window.confirm('Delete this completed activity from History? This cannot be undone.')) return; const activityLog = storageService.removeActivity(type, date); refreshStats(); syncToCloud(currentAccount, { activityLog }); };`,
  'activity deletion confirmation'
);
replaceOnce(
  'src/App.tsx',
  /onDeleteAdditionalWorkout=\{\(\) => \{ if \(!additionalWorkout\) return; storageService\.deleteAdditionalWorkout\(\); setAdditionalWorkout\(null\); \}\}/,
  `onDeleteAdditionalWorkout={() => { if (!additionalWorkout) return; if (!window.confirm('Delete this additional workout? This cannot be undone.')) return; storageService.deleteAdditionalWorkout(); setAdditionalWorkout(null); syncToCloud(currentAccount, { additionalWorkout: null }); }}`,
  'additional workout deletion confirmation'
);
replaceOnce(
  'src/App.tsx',
  /const handleResetData = \(\) => \{ storageService\.clearAll\(\); window\.location\.reload\(\); \};/,
  `const handleResetData = () => { if (!window.confirm('Delete all Lifted data on this device? This cannot be undone.')) return; storageService.clearAll(); window.location.reload(); };`,
  'reset confirmation'
);

console.log('Coach payload and delete confirmations patched.');
