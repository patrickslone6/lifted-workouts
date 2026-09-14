import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

dotenv.config();
const app = express();

const allowedOrigins = new Set([
  'https://patrickslone6.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10mb' }));
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.join(process.cwd(), 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ACCOUNTS_FILE)) fs.writeFileSync(ACCOUNTS_FILE, '{}', 'utf8');

const readAccounts = () => {
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8') || '{}'); }
  catch { return {}; }
};
const writeAccounts = (data: any) => {
  try { fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error(e); }
};
const today = () => new Date().toISOString().slice(0, 10);

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) : null;

async function saveCloudData(identifier: string, data: unknown) {
  if (!supabase) return false;
  const { error } = await supabase.from('lifted_user_data').upsert({
    account_key: identifier,
    data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'account_key' });
  if (error) { console.error('Supabase cloud save:', error.message); return false; }
  return true;
}

async function loadCloudData(identifier: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('lifted_user_data').select('data,updated_at').eq('account_key', identifier).maybeSingle();
  if (error) { console.error('Supabase cloud load:', error.message); return null; }
  return data || null;
}

async function deleteCloudData(identifier: string) {
  if (!supabase) return false;
  const { error } = await supabase.from('lifted_user_data').delete().eq('account_key', identifier);
  if (error) { console.error('Supabase cloud delete:', error.message); return false; }
  return true;
}

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try { ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); }
  catch (e) { console.warn('Gemini initialization failed:', e); }
}

async function askAI(prompt: string, thinkingLevel: 'minimal' | 'low' = 'minimal'): Promise<any> {
  if (!ai) throw new Error('GEMINI_API_KEY is not configured');
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash', contents: prompt,
    config: { responseMimeType: 'application/json', temperature: 0.35, thinkingConfig: { thinkingLevel: thinkingLevel as any } }
  });
  const text = response.text || '{}';
  try { return JSON.parse(text); }
  catch {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  }
}

function athleteContext(body: any) {
  const user = body.user || {};
  const readiness = body.readiness || {};
  const events = Array.isArray(body.scheduledEvents) ? body.scheduledEvents : [];
  const history = Array.isArray(body.recentHistory || body.recentWorkouts) ? (body.recentHistory || body.recentWorkouts) : [];
  const schoolLogs = Array.isArray(body.recentSchoolLogs) ? body.recentSchoolLogs : (body.schoolLog ? [body.schoolLog] : []);
  const activityLog = Array.isArray(body.activityLog) ? body.activityLog : [];
  const trainingSnapshot = body.trainingSnapshot || {};
  const targetDate = body.targetDate || today();
  const target = new Date(targetDate + 'T12:00:00');
  const dateShift = (days: number) => { const d = new Date(target); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-CA'); };
  const dayOfWeek = target.toLocaleDateString('en-US', { weekday: 'long' });
  const recentStart = dateShift(-14);
  const futureEnd = dateShift(14);
  const recentWorkouts = history.filter((w: any) => w.date >= recentStart && w.date <= targetDate);
  const upcomingEvents = events.filter((e: any) => e.date >= targetDate && e.date <= futureEnd).sort((a: any,b: any) => a.date.localeCompare(b.date));
  const weekEvents = events.filter((e: any) => e.date >= dateShift(0) && e.date <= dateShift(6)).sort((a: any,b: any) => a.date.localeCompare(b.date));
  const workload = recentWorkouts.map((w: any) => ({ date: w.date, title: w.workoutTitle, status: w.status, minutes: w.actualMinutes || w.estimatedMinutes || 0, exercises: (w.exercises || []).length, completedSets: (w.exercises || []).reduce((n: number, ex: any) => n + (ex.completedSets || []).filter((s: any) => s.completed).length, 0) }));
  const schoolWorkload = schoolLogs.filter((l: any) => (l.weightliftingDate || l.practiceDate || l.date) >= recentStart).map((l: any) => ({ date: l.weightliftingDate || l.practiceDate || l.date, weightlifting: l.hadWeightliftingClass, practice: l.hadPractice, liftIntensity: l.weightClassIntensity, practiceIntensity: l.practiceIntensity, duration: l.practiceDurationMinutes, soreAreas: l.bodyPartsSoreOrWorked || [], notes: l.notes || '' }));
  return JSON.stringify({ athlete: user, targetDate, dayOfWeek, readiness, recent14DayWorkload: workload, recentSchoolAndSportLoad: schoolWorkload, completedMobilityPlyometricActivity: activityLog.filter((a:any) => a.amount !== 0).slice(-30), trainingSnapshot, upcoming14DayEvents: upcomingEvents, currentWeekSchedule: weekEvents, exercisePerformance: body.exercisePerformanceMap || {}, customFocus: body.customFocus || '' });
}

function safeFallbackWorkout(body: any) {
  const user = body.user || {};
  const readiness = body.readiness || {};
  const date = body.targetDate || today();
  const hasPractice = Boolean(readiness.practiceLaterToday) || Boolean(body.schoolLog?.hadPractice);
  const injured = (user.specificInjuries || []).map((x: any) => x.name).filter(Boolean);
  const exercises = hasPractice
    ? [['DB Bench Press', 3, 8], ['Chest-Supported DB Row', 3, 10], ['Seated DB Press', 2, 10], ['Cable Pallof Press', 3, 10], ['Hip Mobility Flow', 2, 30]]
    : [['Goblet Squat', 3, 8], ['DB Romanian Deadlift', 3, 10], ['DB Bench Press', 3, 8], ['Chest-Supported DB Row', 3, 10], ['Split Squat', 2, 8], ['Pallof Press', 2, 10]];
  return {
    id: `fallback-${Date.now()}`, date, workoutTitle: hasPractice ? 'Practice-Smart Strength Session' : 'Adaptive Athletic Strength Session',
    goal: user.goals?.join(', ') || 'Strength and athletic performance', status: 'planned', estimatedMinutes: readiness.availableMinutes || 35,
    readinessStatus: hasPractice ? 'Moderate Readiness' : 'High Readiness',
    reasoning: hasPractice ? 'Practice is part of today\'s load, so the plan preserves freshness and avoids unnecessary lower-body fatigue.' : 'No practice was reported today, so the plan can use the available training time for a normal progressive strength stimulus.',
    practiceLaterToday: hasPractice,
    injuryProtectionNotes: injured.length ? `Adjust around the reported concern: ${injured.join(', ')}. Stop any movement that causes pain and use the listed alternative.` : 'No specific injury restrictions were reported.',
    isAiGenerated: false, equipmentNeeded: ['dumbbell', 'bench', 'cable'],
    exercises: exercises.map(([name, sets, reps], i) => ({
      id: `fb-${i}`, exerciseId: `fb-${i}`, name, sets, reps, recommendedWeight: 0, weightUnit: user.weightUnit || 'lb', restSeconds: 75,
      targetMuscles: ['Full Body'], notes: 'Choose a comfortable load that allows controlled technique and leaves a few good reps in reserve.',
      whyWeightHypertrophyInjury: 'Adjust load to technique, recent performance, readiness, and any pain; do not force a number.', completed: false, alternative: 'Choose a pain-free equivalent movement.'
    }))
  };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY), ai: Boolean(ai), supabase: Boolean(supabase), model: 'gemini-3.6-flash' }));

app.post('/api/auth/register', (req, res) => {
  try {
    const { identifier, identifierType, name, password } = req.body || {};
    const id = String(identifier || '').trim().toLowerCase();
    if (!id) return res.status(400).json({ error: 'Email or phone number is required' });
    const accounts = readAccounts();
    if (accounts[id]) return res.status(400).json({ error: 'An account with this email or phone already exists. Please log in.' });
    const account = { id: `acc-${Date.now()}`, identifier: id, identifierType: identifierType || (id.includes('@') ? 'email' : 'phone'), name: name || 'Athlete', password: password || '', createdAt: new Date().toISOString(), lastSyncedAt: new Date().toISOString(), userData: req.body.initialData || null };
    accounts[id] = account; writeAccounts(accounts);
    return res.json({ success: true, account: { ...account, password: undefined }, userData: account.userData });
  } catch { return res.status(500).json({ error: 'Failed to create account' }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const id = String(req.body?.identifier || '').trim().toLowerCase();
    if (!id) return res.status(400).json({ error: 'Email or phone number is required' });
    const user = readAccounts()[id];
    if (!user) return res.status(404).json({ error: 'Account not found. Create an account first.' });
    if (user.password && req.body?.password && user.password !== req.body.password) return res.status(401).json({ error: 'Incorrect password' });
    return res.json({ success: true, account: { ...user, password: undefined }, userData: user.userData || null });
  } catch { return res.status(500).json({ error: 'Failed to log in' }); }
});

app.post('/api/cloud-sync/save', async (req, res) => {
  try {
    const id = String(req.body?.identifier || '').trim().toLowerCase();
    if (!id) return res.status(400).json({ error: 'Account identifier required' });
    const data = req.body.data || null;
    const durable = await saveCloudData(id, data);
    if (durable) return res.json({ success: true, durable: true, lastSyncedAt: new Date().toISOString() });
    const accounts = readAccounts();
    const existing = accounts[id] || { id: `acc-${Date.now()}`, identifier: id, identifierType: id.includes('@') ? 'email' : 'phone', name: id.split('@')[0], createdAt: new Date().toISOString() };
    existing.userData = data; existing.lastSyncedAt = new Date().toISOString(); accounts[id] = existing; writeAccounts(accounts);
    return res.json({ success: true, durable: false, lastSyncedAt: existing.lastSyncedAt });
  } catch { return res.status(500).json({ error: 'Failed to sync data' }); }
});

app.get('/api/cloud-sync/load/:identifier', async (req, res) => {
  const id = decodeURIComponent(req.params.identifier || '').trim().toLowerCase();
  const cloud = await loadCloudData(id);
  if (cloud) return res.json({ success: true, hasData: true, lastSyncedAt: cloud.updated_at, data: cloud.data });
  const user = readAccounts()[id];
  return res.json({ success: true, hasData: Boolean(user?.userData), durable: false, lastSyncedAt: user?.lastSyncedAt, data: user?.userData || null });
});

app.post('/api/cloud-sync/delete', async (req, res) => {
  const id = String(req.body?.identifier || '').trim().toLowerCase();
  if (!id) return res.status(400).json({ error: 'Account identifier required' });
  const durable = await deleteCloudData(id);
  const accounts = readAccounts();
  if (accounts[id]) { accounts[id].userData = null; accounts[id].lastSyncedAt = new Date().toISOString(); writeAccounts(accounts); }
  return res.json({ success: true, durable });
});

app.post('/api/generate-workout', async (req, res) => {
  const body = req.body || {};
  try {
    const prompt = `You are Lifted, a careful high-quality strength and conditioning coach. Create one personalized workout as JSON. First identify the target weekday and inspect the full recent workload plus the next 7-14 days. Use the athlete's height, body weight, completed sets, exact weights, reps, difficulty feedback, exercise notes, pain flags, readiness check-ins, soreness, yesterday's workload, school weightlifting history, practices, games, scrimmages, tournaments, future scheduled events, goals, equipment, and sport. For EVERY exercise, recommend one exact starting weight in the athlete's unit when there is enough reliable history. Calibrate it from the athlete's demonstrated load and reps, difficulty feedback, and current readiness; use body size only as a secondary sanity check, never as a reason to force a load. If reliable history is missing, choose a conservative technique-first starting load and clearly explain that it is a starting estimate. Do not invent past performance. Prefer small, conservative progressions after easy/just-right work and hold or reduce load after hard/too-hard work, high soreness, hard practice, or upcoming games. Never use pain as a reason to increase load. If practice or a game is today or soon, preserve freshness. If a Sunday weekly plan shows a demanding week ahead, use a shorter/lighter strength session or recovery day as appropriate; if a Friday is followed by a rest weekend and recent workload is reasonable, a normal stronger training stimulus may be appropriate, but never prescribe maximal testing or excessive volume. Always consider several hard days in a row before increasing training stress. Avoid movements that aggravate reported pain and provide a pain-free alternative; do not diagnose injuries. Choose restSeconds with the same care as sets, reps, and load. Rest is AI-generated per exercise: use movement type, reps, intensity, power-vs-strength goal, current readiness, and recent workload. Do not use one generic rest time for the whole workout. Short explosive drills may need brief recovery when quality is maintained; heavier strength movements generally need longer recovery; accessories usually need less. Give a specific restSeconds value for EVERY exercise and make it exercise-specific. Include realistic rest and age-appropriate technique/recovery. Return ONLY valid JSON with {workoutTitle,goal,estimatedMinutes,readinessStatus,reasoning,injuryProtectionNotes,equipmentNeeded,exercises:[{name,sets,reps,recommendedWeight,weightUnit,restSeconds,tempo,targetMuscles,notes,whyWeightHypertrophyInjury,alternative,aiSummary:{whatItIs,howToDoIt,whatItExercises:{primary,secondary,movementPattern},whyThisWeight:{weightRationale,hypertrophyMechanism,injuryPreventionFocus,progressionContext}}}]}. Context: ${athleteContext(body)}`;
    const plan = await askAI(prompt, 'low');
    const result = { id: `ai-plan-${Date.now()}`, date: body.targetDate || today(), status: 'planned', practiceLaterToday: Boolean(body.readiness?.practiceLaterToday || body.schoolLog?.hadPractice), isAiGenerated: true, ...plan,
      exercises: (plan.exercises || []).map((x: any, i: number) => ({ id: `ai-ex-${Date.now()}-${i}`, exerciseId: x.exerciseId || `ai-${i}`, weightUnit: body.user?.weightUnit || 'lb', completed: false, ...x })) };
    return res.json({ success: true, plan: result, ...result });
  } catch (e: any) {
    console.warn('Workout AI fallback:', e?.message || e);
    const fallback = safeFallbackWorkout(body); return res.json({ success: true, plan: fallback, ...fallback });
  }
});

app.post('/api/generate-morning-routine', async (req, res) => {
  try { const routine = await askAI(`You are Lifted's mobility coach. Generate an 8-12 minute morning mobility routine as JSON using this athlete context: ${athleteContext(req.body)}. Account for soreness, reported injuries, sport demands, today's practice, recent training, and future events. Do not diagnose. Avoid movements that aggravate reported pain. Keep it gentle and technically clear. Return {title,durationMinutes,rationale,exercises:[{name,durationSeconds,instructions,breathingCue,targetArea,modification}]}.`); return res.json({ success: true, routine: { id: `mobility-${Date.now()}`, date: today(), completed: false, isAiGenerated: true, ...routine } }); }
  catch (e) { console.warn('Morning AI unavailable:', e); return res.status(503).json({ error: 'AI mobility unavailable' }); }
});

app.post('/api/generate-nightly-routine', async (req, res) => {
  try { const routine = await askAI(`You are Lifted's recovery coach. Generate an 8-12 minute evening stretching/recovery routine as JSON from this context: ${athleteContext(req.body)}. Use today's completed workout, school lifting, practice, soreness, injuries, and tomorrow/future events. Keep stretches gentle and pain-free. Return {title,durationMinutes,rationale,exercises:[{name,durationSeconds,instructions,breathingCue,targetArea,modification}]}.`); return res.json({ success: true, routine: { id: `nightly-${Date.now()}`, date: today(), completed: false, isAiGenerated: true, ...routine } }); }
  catch (e) { console.warn('Nightly AI unavailable:', e); return res.status(503).json({ error: 'AI nightly routine unavailable' }); }
});

app.post('/api/generate-plyometrics', async (req, res) => {
  try { const routine = await askAI(`You are Lifted's youth athletic power coach. Generate a short, age-appropriate, low-volume plyometric routine as JSON from this context: ${athleteContext(req.body)}. Respect injuries, soreness, school lifting and practice load. Never use plyometrics to push through pain. If recovery is poor or there was hard practice/lifting, reduce impact or make the routine landing-technique focused. Use meaningful but not excessive recovery between power sets; avoid unnecessarily long rests. Return {title,durationMinutes,rationale,targetFocus,exercises:[{name,sets,repsOrDuration,restSeconds,instructions,coachingCue,targetFocus,intensity,equipmentNeeded}]}.`); return res.json({ success: true, routine: { id: `plyo-${Date.now()}`, date: today(), completed: false, isAiGenerated: true, ...routine } }); }
  catch (e) { console.warn('Plyometric AI unavailable:', e); return res.status(503).json({ error: 'AI plyometrics unavailable' }); }
});

app.post('/api/coach-chat', async (req, res) => {
  try {
    const prompt = `You are Lifted Coach AI. Answer the athlete's question using the complete context below. Give practical, concise, age-appropriate coaching advice based on past workouts, exact weights/sets/reps, difficulty feedback, readiness, injuries, school lifting, practice, games, future events, mobility and plyometric activity. Do not invent data. If the question involves pain or an injury, recommend stopping an aggravating movement and involving a qualified adult/clinician rather than diagnosing. Context: ${athleteContext(req.body)}\nQuestion: ${req.body?.message || req.body?.question || ''}. Return JSON {reply:string,actionItems:string[],relevantData:string[]}.`;
    return res.json({ success: true, ...(await askAI(prompt)) });
  } catch (e) { console.warn('Coach AI unavailable:', e); return res.json({ success: true, reply: 'Coach AI is temporarily unavailable. Your saved training data is still safe.', actionItems: [], relevantData: [] }); }
});

app.post('/api/exercise-summary', async (req, res) => {
  try { const summary = await askAI(`Explain this exercise for a youth athlete in a clear coaching format. Use the supplied athlete context and injury restrictions. Never diagnose. Return JSON {whatItIs,howToDoIt,whatItExercises:{primary,secondary,movementPattern},whyThisWeight:{weightRationale,hypertrophyMechanism,injuryPreventionFocus,progressionContext}}. Exercise: ${JSON.stringify(req.body?.exercise || req.body?.name)} Context: ${athleteContext(req.body)}`); return res.json({ success: true, summary }); }
  catch (e) { console.warn('Exercise AI unavailable:', e); return res.status(503).json({ error: 'AI exercise summary unavailable' }); }
});

app.post('/api/weekly-summary', async (req, res) => {
  try { return res.json({ success: true, ...(await askAI(`Review this athlete's recent training and produce a short weekly coaching report. Identify real trends in completed work, weights, difficulty, recovery, school lifting, practice, mobility and plyometrics. Do not invent statistics. Return JSON {headline,summary,highlights,adjustments,nextWeekFocus}. Context: ${athleteContext(req.body)}`)) }); }
  catch (e) { console.warn('Weekly AI unavailable:', e); return res.status(503).json({ error: 'AI weekly summary unavailable' }); }
});

async function start() {
  if (process.env.NODE_ENV === 'production') { const dist = path.join(process.cwd(), 'dist'); if (fs.existsSync(dist)) app.use(express.static(dist)); }
  else { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); }
  app.listen(PORT, () => console.log(`Lifted server listening on http://localhost:${PORT}`));
}
start().catch((err) => { console.error(err); process.exit(1); });
