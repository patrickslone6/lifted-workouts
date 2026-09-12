import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();
const app = express();

// GitHub Pages hosts the frontend separately from this Render API. Allow the
// production frontend plus local development to call the API.
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

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try { ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); }
  catch (e) { console.warn('Gemini initialization failed:', e); }
}

async function askAI(prompt: string): Promise<any> {
  if (!ai) throw new Error('GEMINI_API_KEY is not configured');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', temperature: 0.35 }
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
  const events = body.scheduledEvents || [];
  const history = body.recentHistory || body.recentWorkouts || [];
  const schoolLogs = body.recentSchoolLogs || (body.schoolLog ? [body.schoolLog] : []);
  return JSON.stringify({
    athlete: user,
    readiness,
    scheduledEvents: events,
    recentWorkouts: history.slice(0, 12),
    recentSchoolActivities: schoolLogs.slice(0, 10),
    targetDate: body.targetDate || today(),
    customFocus: body.customFocus || ''
  });
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
    id: `fallback-${Date.now()}`, date,
    workoutTitle: hasPractice ? 'Practice-Smart Strength Session' : 'Adaptive Athletic Strength Session',
    goal: user.goals?.join(', ') || 'Strength and athletic performance', status: 'planned',
    estimatedMinutes: readiness.availableMinutes || 35,
    readinessStatus: hasPractice ? 'Moderate Readiness' : 'High Readiness',
    reasoning: hasPractice
      ? 'Practice is part of today\'s load, so the plan preserves freshness and avoids unnecessary lower-body fatigue.'
      : 'No practice was reported today, so the plan can use the available training time for a normal progressive strength stimulus.',
    practiceLaterToday: hasPractice,
    injuryProtectionNotes: injured.length
      ? `Adjust around the reported concern: ${injured.join(', ')}. Stop any movement that causes pain and use the listed alternative.`
      : 'No specific injury restrictions were reported.',
    isAiGenerated: false,
    equipmentNeeded: ['dumbbell', 'bench', 'cable'],
    exercises: exercises.map(([name, sets, reps], i) => ({
      id: `fb-${i}`, exerciseId: `fb-${i}`, name, sets, reps,
      recommendedWeight: 0, weightUnit: user.weightUnit || 'lb', restSeconds: 75,
      targetMuscles: ['Full Body'],
      notes: 'Choose a comfortable load that allows controlled technique and leaves a few good reps in reserve.',
      whyWeightHypertrophyInjury: 'Adjust load to technique, recent performance, readiness, and any pain; do not force a number.',
      completed: false, alternative: 'Choose a pain-free equivalent movement.'
    }))
  };
}

app.get('/api/health', (_req, res) => res.json({
  status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY), ai: Boolean(ai), model: 'gemini-2.5-flash'
}));

app.post('/api/auth/register', (req, res) => {
  try {
    const { identifier, identifierType, name, password } = req.body || {};
    const id = String(identifier || '').trim().toLowerCase();
    if (!id) return res.status(400).json({ error: 'Email or phone number is required' });
    const accounts = readAccounts();
    if (accounts[id]) return res.status(400).json({ error: 'An account with this email or phone already exists. Please log in.' });
    const account = {
      id: `acc-${Date.now()}`, identifier: id,
      identifierType: identifierType || (id.includes('@') ? 'email' : 'phone'),
      name: name || 'Athlete', password: password || '',
      createdAt: new Date().toISOString(), lastSyncedAt: new Date().toISOString(),
      userData: req.body.initialData || null
    };
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

app.post('/api/cloud-sync/save', (req, res) => {
  try {
    const id = String(req.body?.identifier || '').trim().toLowerCase();
    if (!id) return res.status(400).json({ error: 'Account identifier required' });
    const accounts = readAccounts();
    const existing = accounts[id] || {
      id: `acc-${Date.now()}`, identifier: id,
      identifierType: id.includes('@') ? 'email' : 'phone', name: id.split('@')[0],
      createdAt: new Date().toISOString()
    };
    existing.userData = req.body.data || null;
    existing.lastSyncedAt = new Date().toISOString();
    accounts[id] = existing; writeAccounts(accounts);
    return res.json({ success: true, lastSyncedAt: existing.lastSyncedAt });
  } catch { return res.status(500).json({ error: 'Failed to sync data' }); }
});

app.get('/api/cloud-sync/load/:identifier', (req, res) => {
  const id = decodeURIComponent(req.params.identifier || '').trim().toLowerCase();
  const user = readAccounts()[id];
  return res.json({ success: true, hasData: Boolean(user?.userData), lastSyncedAt: user?.lastSyncedAt, data: user?.userData || null });
});

app.post('/api/generate-workout', async (req, res) => {
  const body = req.body || {};
  try {
    const prompt = `You are Lifted, a careful high-quality strength and conditioning coach. Create one personalized workout as JSON. Use the athlete's completed sets, weights, difficulty feedback, injuries, readiness, school lifting, practice history, and future scheduled events. Do not invent past performance. Progress weights conservatively from demonstrated performance; if no reliable weight history exists, use a range or recommend a starting load based on technique and RIR rather than pretending it is exact. If practice is today, preserve practice freshness. If no practice is today, do not falsely claim there is practice. For any reported pain/injury, avoid movements the athlete says aggravate it and provide a pain-free alternative; do not diagnose injuries. Include every activity needed for the selected duration, realistic rest, warm-up/prep, strength/hypertrophy work, core or durability work, and a brief cooldown when useful. The athlete is a youth athlete, so prioritize sound technique, recovery, and coach/clinician input over maximal loading. Return ONLY valid JSON with this shape: {workoutTitle,goal,estimatedMinutes,readinessStatus,reasoning,injuryProtectionNotes,equipmentNeeded,exercises:[{name,sets,reps,recommendedWeight,weightUnit,restSeconds,tempo,targetMuscles,notes,whyWeightHypertrophyInjury,alternative,aiSummary:{whatItIs,howToDoIt,whatItExercises:{primary,secondary,movementPattern},whyThisWeight:{weightRationale,hypertrophyMechanism,injuryPreventionFocus,progressionContext}}}]}. Context: ${athleteContext(body)}`;
    const plan = await askAI(prompt);
    const result = {
      id: `ai-plan-${Date.now()}`, date: body.targetDate || today(), status: 'planned',
      practiceLaterToday: Boolean(body.readiness?.practiceLaterToday || body.schoolLog?.hadPractice),
      isAiGenerated: true, ...plan,
      exercises: (plan.exercises || []).map((x: any, i: number) => ({
        id: `ai-ex-${Date.now()}-${i}`, exerciseId: x.exerciseId || `ai-${i}`,
        weightUnit: body.user?.weightUnit || 'lb', completed: false, ...x
      }))
    };
    return res.json({ success: true, plan: result, ...result });
  } catch (e: any) {
    console.warn('Workout AI fallback:', e?.message || e);
    const fallback = safeFallbackWorkout(body);
    return res.json({ success: true, plan: fallback, ...fallback });
  }
});

app.post('/api/generate-morning-routine', async (req, res) => {
  try {
    const prompt = `You are Lifted's mobility coach. Generate an 8-12 minute morning mobility routine as JSON using this athlete context: ${athleteContext(req.body)}. Account for soreness, reported injuries, sport demands, today's practice, recent training, and future events. Do not diagnose. Avoid movements that aggravate reported pain. Keep it gentle and technically clear. Return {title,durationMinutes,rationale,exercises:[{name,durationSeconds,instructions,breathingCue,targetArea,modification}]}.`;
    const routine = await askAI(prompt);
    return res.json({ success: true, routine: { id: `mobility-${Date.now()}`, date: today(), completed: false, isAiGenerated: true, ...routine } });
  } catch (e) { console.warn('Morning AI unavailable:', e); return res.status(503).json({ error: 'AI mobility unavailable' }); }
});

app.post('/api/generate-nightly-routine', async (req, res) => {
  try {
    const prompt = `You are Lifted's recovery coach. Generate an 8-12 minute evening stretching/recovery routine as JSON from this context: ${athleteContext(req.body)}. Use today's completed workout, school lifting, practice, soreness, injuries, and tomorrow/future events. Keep stretches gentle and pain-free. Return {title,durationMinutes,rationale,exercises:[{name,durationSeconds,instructions,breathingCue,targetArea,modification}]}.`;
    const routine = await askAI(prompt);
    return res.json({ success: true, routine: { id: `nightly-${Date.now()}`, date: today(), completed: false, isAiGenerated: true, ...routine } });
  } catch (e) { console.warn('Nightly AI unavailable:', e); return res.status(503).json({ error: 'AI nightly routine unavailable' }); }
});

app.post('/api/generate-plyometrics', async (req, res) => {
  try {
    const prompt = `You are Lifted's youth athletic power coach. Generate a short, age-appropriate, low-volume plyometric routine as JSON from this context: ${athleteContext(req.body)}. Respect injuries, soreness, school lifting and practice load. Never use plyometrics to push through pain. If recovery is poor or there was hard practice/lifting, reduce impact or make the routine mobility/landing-technique focused. Return {title,durationMinutes,rationale,targetFocus,exercises:[{name,sets,repsOrDuration,restSeconds,instructions,coachingCue,targetFocus,intensity,equipmentNeeded}]}.`;
    const routine = await askAI(prompt);
    return res.json({ success: true, routine: { id: `plyo-${Date.now()}`, date: today(), completed: false, isAiGenerated: true, ...routine } });
  } catch (e) { console.warn('Plyometric AI unavailable:', e); return res.status(503).json({ error: 'AI plyometrics unavailable' }); }
});

app.post('/api/coach-chat', async (req, res) => {
  try {
    const prompt = `You are Lifted Coach AI. Answer the athlete's question using the complete context below. Give practical, concise, age-appropriate coaching advice based on past workouts, completed weights/sets, readiness, injuries, school lifting, practice, future events, mobility and plyometric activity. Do not invent data. If the question involves pain or an injury, recommend stopping an aggravating movement and involving a qualified adult/clinician rather than diagnosing. Context: ${athleteContext(req.body)}\nQuestion: ${req.body?.message || req.body?.question || ''}. Return JSON {reply:string,actionItems:string[],relevantData:string[]}.`;
    return res.json({ success: true, ...(await askAI(prompt)) });
  } catch (e) {
    console.warn('Coach AI unavailable:', e);
    return res.json({ success: true, reply: 'Coach AI is temporarily unavailable. Your saved training data is still safe.', actionItems: [], relevantData: [] });
  }
});

app.post('/api/exercise-summary', async (req, res) => {
  try {
    const prompt = `Explain this exercise for a youth athlete in a clear coaching format. Use the supplied athlete context and injury restrictions. Never diagnose. Return JSON {whatItIs,howToDoIt,whatItExercises:{primary,secondary,movementPattern},whyThisWeight:{weightRationale,hypertrophyMechanism,injuryPreventionFocus,progressionContext}}. Exercise: ${JSON.stringify(req.body?.exercise || req.body?.name)} Context: ${athleteContext(req.body)}`;
    return res.json({ success: true, summary: await askAI(prompt) });
  } catch (e) { console.warn('Exercise AI unavailable:', e); return res.status(503).json({ error: 'AI exercise summary unavailable' }); }
});

app.post('/api/weekly-summary', async (req, res) => {
  try {
    const prompt = `Review this athlete's recent training and produce a short weekly coaching report. Identify real trends in completed work, weights, difficulty, recovery, school lifting, practice, mobility and plyometrics. Do not invent statistics. Return JSON {headline,summary,highlights,adjustments,nextWeekFocus}. Context: ${athleteContext(req.body)}`;
    return res.json({ success: true, ...(await askAI(prompt)) });
  } catch (e) { console.warn('Weekly AI unavailable:', e); return res.status(503).json({ error: 'AI weekly summary unavailable' }); }
});

async function start() {
  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(process.cwd(), 'dist');
    if (fs.existsSync(dist)) app.use(express.static(dist));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => console.log(`Lifted server listening on http://localhost:${PORT}`));
}

start().catch((err) => { console.error(err); process.exit(1); });
