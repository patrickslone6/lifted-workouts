import fs from 'node:fs';

const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, s) => fs.writeFileSync(f, s, 'utf8');
const fail = (m) => { throw new Error(m); };

{
  const f = 'src/services/storage.ts';
  let s = read(f);
  const start = s.indexOf('  getActivityLog(){');
  const end = s.indexOf('  getTrainingSnapshot()', start);
  if (start < 0 || end < 0) fail(`Could not locate activity storage section in ${f}`);
  const replacement = `  getActivityLog(){return parse<Array<{date:string;type:'mobility'|'nightly'|'plyometrics';amount?:number}>>(STORAGE_KEYS.ACTIVITY_LOG,[]);},recordActivity(type:'mobility'|'nightly'|'plyometrics',date:string,amount=1){const a=this.getActivityLog();const n={date,type,amount};const i=a.findIndex(x=>x.date===date&&x.type===type);if(i>=0)a[i]=n;else a.push(n);save(STORAGE_KEYS.ACTIVITY_LOG,a);},removeActivity(type:'mobility'|'nightly'|'plyometrics',date:string){const next=this.getActivityLog().filter(x=>!(x.type===type&&x.date===date));save(STORAGE_KEYS.ACTIVITY_LOG,next);return next;},\n`;
  s = s.slice(0, start) + replacement + s.slice(end);
  write(f, s);
}

{
  const f = 'src/components/HistoryScreen.tsx';
  let s = read(f);
  if (!s.includes('onDeleteActivity')) {
    s = s.replace('  onDeleteWorkout: (id: string) => void;\n}', '  onDeleteWorkout: (id: string) => void;\n  onDeleteActivity?: (type: \'mobility\' | \'nightly\' | \'plyometrics\', date: string) => void;\n}');
    s = s.replace('export const HistoryScreen: React.FC<Props> = ({ workoutHistory, activityLog = [], onDeleteWorkout }) => {', 'export const HistoryScreen: React.FC<Props> = ({ workoutHistory, activityLog = [], onDeleteWorkout, onDeleteActivity }) => {');
    s = s.replace('  const handleDelete = (id: string, e: React.MouseEvent) => {', '  const handleDeleteActivity = (type: \'mobility\' | \'nightly\' | \'plyometrics\', date: string, e: React.MouseEvent) => {\n    e.stopPropagation();\n    onDeleteActivity?.(type, date);\n  };\n\n  const handleDelete = (id: string, e: React.MouseEvent) => {');
    const marker = '          {completedActivities.map((a) => {';
    const nextMarker = '          {workoutHistory.map((workout) => {';
    const a = s.indexOf(marker);
    const b = s.indexOf(nextMarker, a);
    if (a < 0 || b < 0) fail(`Could not locate completed activity renderer in ${f}`);
    const block = `          {completedActivities.map((a) => { const title = a.type === 'mobility' ? 'Morning Mobility' : a.type === 'plyometrics' ? 'Plyometrics' : 'Nightly Stretching'; return <div key={a.type + '-' + a.date} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex items-center gap-3"><div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-5 h-5" /></div><div className="flex-1"><div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{new Date(a.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</div><div className="text-lg font-bold text-white">{title}</div><div className="text-xs text-zinc-400">Completed and saved to training history</div></div><button type="button" onClick={(e) => handleDeleteActivity(a.type, a.date, e)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition" title="Delete history entry" aria-label={title}><Trash2 className="w-4 h-4" /></button></div>; })}\n`;
    s = s.slice(0, a) + block + s.slice(b);
  }
  write(f, s);
}

{
  const f = 'src/App.tsx';
  let s = read(f);
  if (!s.includes('const handleDeleteActivity =')) {
    const marker = '  const handleDeleteWorkout = (id: string) => { const history = workoutHistory.filter((w) => w.id !== id); setWorkoutHistory(history); storageService.deleteWorkoutHistoryItem(id); syncToCloud(currentAccount, { history }); refreshStats(); };';
    const insert = marker + `\n  const handleDeleteActivity = (type: 'mobility' | 'nightly' | 'plyometrics', date: string) => { const activityLog = storageService.removeActivity(type, date); refreshStats(); syncToCloud(currentAccount, { activityLog }); };`;
    if (!s.includes(marker)) fail(`Could not locate workout delete handler in ${f}`);
    s = s.replace(marker, insert);
  }
  const oldProp = '<HistoryScreen workoutHistory={workoutHistory} activityLog={storageService.getActivityLog()} onDeleteWorkout={handleDeleteWorkout} />';
  const newProp = '<HistoryScreen workoutHistory={workoutHistory} activityLog={storageService.getActivityLog()} onDeleteWorkout={handleDeleteWorkout} onDeleteActivity={handleDeleteActivity} />';
  if (!s.includes(oldProp) && !s.includes(newProp)) fail(`Could not locate HistoryScreen call in ${f}`);
  s = s.replace(oldProp, newProp);
  write(f, s);
}

{
  const f = 'server.ts';
  let s = read(f);
  const start = s.indexOf("app.post('/api/coach-chat'");
  const end = s.indexOf("\napp.post('/api/weekly-summary'", start);
  if (start < 0 || end < 0) fail(`Could not locate Coach endpoint in ${f}`);
  const replacement = `app.post('/api/coach-chat', async (req, res) => {\n  const body = req.body || {};\n  const question = String(body.message || body.question || '').trim();\n  const fullPrompt = \`You are Lifted Coach AI. Answer the athlete's question using the complete context below. Give practical, concise, age-appropriate coaching advice based on past workouts, exact weights/sets/reps, difficulty feedback, readiness, injuries, school lifting, practice, games, future events, mobility and plyometric activity. Do not invent data. If the question involves pain or an injury, recommend stopping an aggravating movement and involving a qualified adult/clinician rather than diagnosing. Context: \${athleteContext(body)}\\nQuestion: \${question}. Return JSON {reply:string,actionItems:string[],relevantData:string[]}.\`;\n  try {\n    const answer = await askAI(fullPrompt, 'minimal');\n    return res.json({ success: true, ...answer });\n  } catch (firstError) {\n    console.warn('Coach AI primary attempt failed:', firstError);\n    try {\n      const compact = {\n        athlete: body.user || {}, readiness: body.readiness || {}, todayWorkout: body.todayWorkout || {},\n        recentHistory: Array.isArray(body.recentHistory) ? body.recentHistory.slice(0, 8) : [],\n        scheduledEvents: Array.isArray(body.scheduledEvents) ? body.scheduledEvents.slice(0, 10) : [],\n        recentSchoolLogs: Array.isArray(body.recentSchoolLogs) ? body.recentSchoolLogs.slice(0, 10) : [],\n        activityLog: Array.isArray(body.activityLog) ? body.activityLog.slice(-10) : [],\n        trainingSnapshot: body.trainingSnapshot || {}\n      };\n      const retryPrompt = \`You are Lifted Coach AI. Give a concise, useful, age-appropriate answer to the athlete's question. Use only the supplied facts, do not invent training history, and do not diagnose injuries. If pain is involved, advise stopping the aggravating movement and involving a qualified adult/clinician. Return JSON {reply:string,actionItems:string[],relevantData:string[]}. Athlete context: \${JSON.stringify(compact)}\\nQuestion: \${question}\`;\n      const answer = await askAI(retryPrompt, 'minimal');\n      return res.json({ success: true, ...answer, retried: true });\n    } catch (retryError) {\n      console.error('Coach AI retry failed:', retryError);\n      return res.status(503).json({ error: 'Coach AI is temporarily unavailable. Please try again.' });\n    }\n  }\n});\n`;
  s = s.slice(0, start) + replacement + s.slice(end);
  write(f, s);
}

console.log('Final Lifted repair applied successfully.');
