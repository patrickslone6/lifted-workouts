import fs from 'node:fs';

function read(file){return fs.readFileSync(file,'utf8')}
function write(file,s){fs.writeFileSync(file,s,'utf8')}
function once(file, pattern, replacement){
  const s=read(file); const re=pattern instanceof RegExp?pattern:new RegExp(pattern,'s');
  if(!re.test(s)) throw new Error(`Missing pattern in ${file}: ${pattern}`);
  write(file,s.replace(re,replacement));
}

// Persist the complete training snapshot for cloud sync and AI context.
const storage = 'src/services/storage.ts';
let s = read(storage);
if (!s.includes('getTrainingSnapshot(){')) {
  const marker = "  calculateDailyStreak(){";
  if (!s.includes(marker)) throw new Error('storage marker missing');
  s = s.replace(marker, "  getTrainingSnapshot(){return {activityLog:this.getActivityLog(),mobility:this.getMorningMobility(),nightlyRoutine:this.getNightlyRoutine(),plyometricsRoutine:this.getPlyometricsRoutine()};},\n" + marker);
  write(storage,s);
}

// App: send, save, and restore every activity/routine.
once('src/App.tsx',
  /      schoolLogs: storageService\.getSchoolWorkoutLogs\(\), chatMessages: customState\.chatMessages \|\| chatMessages\n/,
  '      schoolLogs: storageService.getSchoolWorkoutLogs(), chatMessages: customState.chatMessages || chatMessages,\n      activityLog: customState.activityLog || storageService.getActivityLog(), mobility: customState.mobility || mobility, nightlyRoutine: customState.nightlyRoutine || nightlyRoutine, plyometricsRoutine: customState.plyometricsRoutine || plyometricsRoutine\n'
);
once('src/App.tsx',
  /recentHistory: workoutHistory\.slice\(0, 30\), recentSchoolLogs: storageService\.getRecentSchoolLogs\(30\), customFocus: focusPrompt, schoolLog: schoolLogData, targetDate: todayKey\(\)/,
  'recentHistory: workoutHistory.slice(0, 30), recentSchoolLogs: storageService.getRecentSchoolLogs(30), activityLog: storageService.getActivityLog(), trainingSnapshot: storageService.getTrainingSnapshot(), customFocus: focusPrompt, schoolLog: schoolLogData, targetDate: todayKey()'
);
once('src/App.tsx',
  /      if \(cloudData\.chatMessages\) \{ setChatMessages\(cloudData\.chatMessages\); storageService\.saveChatMessages\(cloudData\.chatMessages\); \}\n/,
  '      if (cloudData.chatMessages) { setChatMessages(cloudData.chatMessages); storageService.saveChatMessages(cloudData.chatMessages); }\n      if (cloudData.activityLog) localStorage.setItem(\'lifted_activity_completion_v1\', JSON.stringify(cloudData.activityLog));\n      if (cloudData.mobility) { setMobility(cloudData.mobility); storageService.saveMorningMobility(cloudData.mobility); }\n      if (cloudData.nightlyRoutine) { setNightlyRoutine(cloudData.nightlyRoutine); storageService.saveNightlyRoutine(cloudData.nightlyRoutine); }\n      if (cloudData.plyometricsRoutine) { setPlyometricsRoutine(cloudData.plyometricsRoutine); storageService.savePlyometricsRoutine(cloudData.plyometricsRoutine); }\n'
);
once('src/App.tsx',
  /<HistoryScreen workoutHistory=\{workoutHistory\} onDeleteWorkout=\{handleDeleteWorkout\} \/>/,
  '<HistoryScreen workoutHistory={workoutHistory} activityLog={storageService.getActivityLog()} onDeleteWorkout={handleDeleteWorkout} />'
);
once('src/App.tsx',
  /\{isDoingMobility && <MobilityModal mobility=\{mobility\} onComplete=\{\(\) => \{ const next = \{ \.\.\.mobility, completed: true \}; setMobility\(next\); storageService\.saveMorningMobility\(next\); storageService\.recordActivity\('mobility', next\.date, 1\); setIsDoingMobility\(false\); refreshStats\(\); \}\} onClose=/,
  "{isDoingMobility && <MobilityModal mobility={mobility} onComplete={() => { const next = { ...mobility, completed: true, completedAt: new Date().toISOString() }; setMobility(next); storageService.saveMorningMobility(next); storageService.recordActivity('mobility', next.date, 1); setIsDoingMobility(false); refreshStats(); syncToCloud(currentAccount, { mobility: next, activityLog: storageService.getActivityLog() }); }} onClose="
);
once('src/App.tsx',
  /\{isDoingNightly && <NightlyRoutineModal routine=\{nightlyRoutine\} onComplete=\{\(\) => \{ const next = \{ \.\.\.nightlyRoutine, completed: true \}; setNightlyRoutine\(next\); storageService\.saveNightlyRoutine\(next\); storageService\.recordActivity\('nightly', next\.date, 1\); setIsDoingNightly\(false\); refreshStats\(\); \}\} onClose=/,
  "{isDoingNightly && <NightlyRoutineModal routine={nightlyRoutine} onComplete={() => { const next = { ...nightlyRoutine, completed: true, completedAt: new Date().toISOString() }; setNightlyRoutine(next); storageService.saveNightlyRoutine(next); storageService.recordActivity('nightly', next.date, 1); setIsDoingNightly(false); refreshStats(); syncToCloud(currentAccount, { nightlyRoutine: next, activityLog: storageService.getActivityLog() }); }} onClose="
);
once('src/App.tsx',
  /\{isDoingPlyometrics && <PlyometricsModal routine=\{plyometricsRoutine\} onComplete=\{\(\) => \{ const next = \{ \.\.\.plyometricsRoutine, completed: true \}; setPlyometricsRoutine\(next\); storageService\.savePlyometricsRoutine\(next\); setIsDoingPlyometrics\(false\); refreshStats\(\); \}\} onClose=/,
  "{isDoingPlyometrics && <PlyometricsModal routine={plyometricsRoutine} onComplete={() => { const next = { ...plyometricsRoutine, completed: true, completedAt: new Date().toISOString() }; setPlyometricsRoutine(next); storageService.savePlyometricsRoutine(next); storageService.recordActivity('plyometrics', next.date, 1); setIsDoingPlyometrics(false); refreshStats(); syncToCloud(currentAccount, { plyometricsRoutine: next, activityLog: storageService.getActivityLog() }); }} onClose="
);

// Strength workout: persist immediately when navigating and before final save.
once('src/components/ActiveWorkoutModal.tsx',
  /  const handlePauseAndResumeLater = \(\) => \{/,
  "  const persistNow = (nextExercises = exercises) => onSaveInProgress?.({ ...workout, status: 'in_progress', exercises: nextExercises });\n  const handleNextExercise = (delta: number) => { persistNow(); setCurrentIdx((p) => Math.max(0, Math.min(exercises.length - 1, p + delta))); setTimerRunning(false); };\n\n  const handlePauseAndResumeLater = () => {"
);
once('src/components/ActiveWorkoutModal.tsx', /onFinishWorkout\(completed\);/, 'onSaveInProgress?.(completed);\n    onFinishWorkout(completed);');
once('src/components/ActiveWorkoutModal.tsx', /onClick=\{\(\) => setCurrentIdx\(\(p\) => Math\.max\(0, p - 1\)\)\} disabled=\{currentIdx === 0\}/, 'onClick={() => handleNextExercise(-1)} disabled={currentIdx === 0}');
once('src/components/ActiveWorkoutModal.tsx', /onClick=\{\(\) => setCurrentIdx\(\(p\) => p \+ 1\)\} className="px-5 py-2\.5 rounded-xl bg-emerald-600 text-xs font-bold">Next Exercise/, 'onClick={() => handleNextExercise(1)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold">Next Exercise');

// History: show completed mobility, plyometrics, and nightly routines.
once('src/components/HistoryScreen.tsx', /interface Props \{\n  workoutHistory: WorkoutPlan\[\];\n  onDeleteWorkout: \(id: string\) => void;/, "interface Props {\n  workoutHistory: WorkoutPlan[];\n  activityLog?: Array<{date:string;type:'mobility'|'nightly'|'plyometrics';amount?:number}>;\n  onDeleteWorkout: (id: string) => void;");
once('src/components/HistoryScreen.tsx', /export const HistoryScreen: React\.FC<Props> = \(\{ workoutHistory, onDeleteWorkout \}\) => \{/, "export const HistoryScreen: React.FC<Props> = ({ workoutHistory, activityLog = [], onDeleteWorkout }) => {\n  const completedActivities = activityLog.filter((a) => a.amount !== 0);");
once('src/components/HistoryScreen.tsx', /\{workoutHistory\.length === 0 \? \(/, '{workoutHistory.length === 0 && completedActivities.length === 0 ? (');
once('src/components/HistoryScreen.tsx', /      \) : \(\n        <div className="space-y-4">\n          \{workoutHistory\.map\(\(workout\) => \{/,
  "      ) : (\n        <div className=\"space-y-4\">\n          {completedActivities.map((a) => { const title = a.type === 'mobility' ? 'Morning Mobility' : a.type === 'plyometrics' ? 'Plyometrics' : 'Nightly Stretching'; return <div key={`${a.type}-${a.date}`} className=\"bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex items-center gap-3\"><div className=\"p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20\"><CheckCircle className=\"w-5 h-5\" /></div><div><div className=\"text-xs font-bold text-emerald-400 uppercase tracking-wider\">{new Date(a.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</div><div className=\"text-lg font-bold text-white\">{title}</div><div className=\"text-xs text-zinc-400\">Completed and saved to training history</div></div></div>; })}\n          {workoutHistory.map((workout) => {"
);

// Server: completed activity is available to AI, and AI chooses restSeconds for every AI-generated exercise.
once('server.ts', /  const schoolLogs = Array\.isArray\(body\.recentSchoolLogs\) \? body\.recentSchoolLogs : \(body\.schoolLog \? \[body\.schoolLog\] : \[\]\);/, '  const schoolLogs = Array.isArray(body.recentSchoolLogs) ? body.recentSchoolLogs : (body.schoolLog ? [body.schoolLog] : []);\n  const activityLog = Array.isArray(body.activityLog) ? body.activityLog : [];\n  const trainingSnapshot = body.trainingSnapshot || {};');
once('server.ts', /recentSchoolAndSportLoad: schoolWorkload, upcoming14DayEvents:/, 'recentSchoolAndSportLoad: schoolWorkload, completedMobilityPlyometricActivity: activityLog.filter((a:any) => a.amount !== 0).slice(-30), trainingSnapshot, upcoming14DayEvents:');
once('server.ts', /Include realistic rest and age-appropriate technique\/recovery\. Return ONLY valid JSON/, 'Choose restSeconds with the same care as sets, reps, and load. Rest is AI-generated per exercise: use movement type, reps, intensity, power-vs-strength goal, current readiness, and recent workload. Do not use one generic rest time for the whole workout. Short explosive drills may need brief recovery when quality is maintained; heavier strength movements generally need longer recovery; accessories usually need less. Give a specific restSeconds value for EVERY exercise and make it exercise-specific. Include realistic rest and age-appropriate technique/recovery. Return ONLY valid JSON');

console.log('training persistence + AI rest patch applied');
