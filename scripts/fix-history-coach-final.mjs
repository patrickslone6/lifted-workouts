import fs from 'node:fs';

function replaceRequired(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) throw new Error(`Missing ${label} in ${file}`);
  fs.writeFileSync(file, s.replace(from, to), 'utf8');
}

// History activity deletion: keep the activity log, routine state, and cloud copy in sync.
replaceRequired(
  'src/services/storage.ts',
  "recordActivity(type:'mobility'|'nightly'|'plyometrics',date:string,amount=1){const a=this.getActivityLog();const n={date,type,amount};const i=a.findIndex(x=>x.date===date&&x.type===type);if(i>=0)a[i]=n;else a.push(n);save(STORAGE_KEYS.ACTIVITY_LOG,a);},",
  "recordActivity(type:'mobility'|'nightly'|'plyometrics',date:string,amount=1){const a=this.getActivityLog();const n={date,type,amount};const i=a.findIndex(x=>x.date===date&&x.type===type);if(i>=0)a[i]=n;else a.push(n);save(STORAGE_KEYS.ACTIVITY_LOG,a);}, removeActivity(type:'mobility'|'nightly'|'plyometrics',date:string){save(STORAGE_KEYS.ACTIVITY_LOG,this.getActivityLog().filter(x=>!(x.type===type&&x.date===date)));},",
  'removeActivity method'
);

replaceRequired(
  'src/components/HistoryScreen.tsx',
  "  onDeleteWorkout: (id: string) => void;\n}",
  "  onDeleteWorkout: (id: string) => void;\n  onDeleteActivity?: (type: 'mobility'|'nightly'|'plyometrics', date: string) => void;\n}",
  'History activity delete prop'
);

replaceRequired(
  'src/components/HistoryScreen.tsx',
  "export const HistoryScreen: React.FC<Props> = ({ workoutHistory, activityLog = [], onDeleteWorkout }) => {",
  "export const HistoryScreen: React.FC<Props> = ({ workoutHistory, activityLog = [], onDeleteWorkout, onDeleteActivity }) => {",
  'History activity delete handler prop'
);

const history = fs.readFileSync('src/components/HistoryScreen.tsx', 'utf8');
const activityRegex = /\{completedActivities\.map\(\(a\) => \{[\s\S]*?\}\)\}/;
if (!activityRegex.test(history)) throw new Error('Missing completed activity renderer in HistoryScreen.tsx');
const activityReplacement = `{completedActivities.map((a) => { const title = a.type === 'mobility' ? 'Morning Mobility' : a.type === 'plyometrics' ? 'Plyometrics' : 'Nightly Stretching'; return <div key={\`${'${'}a.type}-${'${'}a.date}\`} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex items-center gap-3"><div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-5 h-5" /></div><div className="flex-1"><div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{new Date(a.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</div><div className="text-lg font-bold text-white">{title}</div><div className="text-xs text-zinc-400">Completed and saved to training history</div></div>{onDeleteActivity && <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteActivity(a.type, a.date); }} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition" title="Delete history activity"><Trash2 className="w-4 h-4" /></button>}</div>; })}`;
fs.writeFileSync('src/components/HistoryScreen.tsx', history.replace(activityRegex, activityReplacement), 'utf8');

// App: delete the activity locally, undo its completion state, rebuild AI context, and sync cloud.
replaceRequired(
  'src/App.tsx',
  "  const handleDeleteWorkout = (id: string) => { const history = workoutHistory.filter((w) => w.id !== id); setWorkoutHistory(history); storageService.deleteWorkoutHistoryItem(id); syncToCloud(currentAccount, { history }); refreshStats(); };",
  "  const handleDeleteWorkout = (id: string) => { const history = workoutHistory.filter((w) => w.id !== id); setWorkoutHistory(history); storageService.deleteWorkoutHistoryItem(id); syncToCloud(currentAccount, { history }); refreshStats(); };\n  const handleDeleteActivity = (type: 'mobility'|'nightly'|'plyometrics', date: string) => { storageService.removeActivity(type, date); if (type === 'mobility') { const next = { ...mobility, completed: false, completedAt: undefined }; setMobility(next); storageService.saveMorningMobility(next); syncToCloud(currentAccount, { mobility: next, activityLog: storageService.getActivityLog() }); } else if (type === 'nightly') { const next = { ...nightlyRoutine, completed: false, completedAt: undefined }; setNightlyRoutine(next); storageService.saveNightlyRoutine(next); syncToCloud(currentAccount, { nightlyRoutine: next, activityLog: storageService.getActivityLog() }); } else { const next = { ...plyometricsRoutine, completed: false, completedAt: undefined }; setPlyometricsRoutine(next); storageService.savePlyometricsRoutine(next); syncToCloud(currentAccount, { plyometricsRoutine: next, activityLog: storageService.getActivityLog() }); } refreshStats(); };",
  'App activity delete handler'
);

replaceRequired(
  'src/App.tsx',
  "{activeTab === 'history' && <HistoryScreen workoutHistory={workoutHistory} activityLog={storageService.getActivityLog()} onDeleteWorkout={handleDeleteWorkout} />}",
  "{activeTab === 'history' && <HistoryScreen workoutHistory={workoutHistory} activityLog={storageService.getActivityLog()} onDeleteWorkout={handleDeleteWorkout} onDeleteActivity={handleDeleteActivity} />}",
  'HistoryScreen activity delete prop wiring'
);

// Coach AI: retry once with compact context, and surface a real error instead of a fake success.
const server = fs.readFileSync('server.ts', 'utf8');
const coachStart = server.indexOf("app.post('/api/coach-chat'");
if (coachStart < 0) throw new Error('Coach endpoint not found');
const coachEnd = server.indexOf('\n});', coachStart);
if (coachEnd < 0) throw new Error('Coach endpoint end not found');
const coachBlock = [
  "app.post('/api/coach-chat', async (req, res) => {",
  "  const body = req.body || {};",
  "  const question = String(body.message || body.question || '').trim();",
  "  if (!question) return res.status(400).json({ error: 'A coaching question is required.' });",
  "  const base = { athlete: body.user || {}, readiness: body.readiness || {}, recentHistory: (body.recentHistory || []).slice(0, 30), recentSchoolLogs: (body.recentSchoolLogs || []).slice(0, 30), activityLog: (body.activityLog || []).slice(-30), trainingSnapshot: body.trainingSnapshot || {}, scheduledEvents: body.scheduledEvents || [], todayWorkout: body.todayWorkout || {}, question };",
  "  const prompt = `You are Lifted Coach AI. Give practical, concise, age-appropriate coaching advice using the athlete's actual training history, exact weights/sets/reps, feedback, readiness, schedule, mobility and plyometric activity. Do not invent data. If pain or injury is mentioned, recommend stopping the aggravating movement and involving a qualified adult/clinician rather than diagnosing. Context: ${JSON.stringify(base)}\\nQuestion: ${question}. Return JSON {reply:string,actionItems:string[],relevantData:string[]}.`;",
  "  try { return res.json({ success: true, ...(await askAI(prompt, 'low')) }); }",
  "  catch (firstError) {",
  "    console.warn('Coach AI primary request failed:', firstError);",
  "    try { const compact = { athlete: base.athlete, readiness: base.readiness, recentHistory: base.recentHistory.slice(0,10), recentSchoolLogs: base.recentSchoolLogs.slice(0,10), activityLog: base.activityLog.slice(-10), question }; const retry = `You are Lifted Coach AI. Give a concise, age-appropriate answer from this training context. Do not invent data. Return ONLY JSON: {\"reply\":\"string\",\"actionItems\":[],\"relevantData\":[]}. Context: ${JSON.stringify(compact)}`; return res.json({ success: true, ...(await askAI(retry, 'minimal')) }); }",
  "    catch (secondError) { console.warn('Coach AI retry failed:', secondError); return res.status(503).json({ error: 'Coach AI is temporarily unavailable. Please try again in a moment.' }); }",
  "  }",
  "});"
].join('\n');
fs.writeFileSync('server.ts', server.slice(0, coachStart) + coachBlock + server.slice(coachEnd + 3), 'utf8');

console.log('Final history deletion + Coach AI patch applied');
