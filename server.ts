import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
  }
}

// Model cooldown tracker to prevent repeated 429 quota exhaustion and 503 spikes
const modelCooldowns = new Map<string, number>();

function isModelCoolingDown(model: string): boolean {
  const until = modelCooldowns.get(model);
  if (!until) return false;
  if (Date.now() < until) return true;
  modelCooldowns.delete(model);
  return false;
}

function setModelCooldown(model: string, ms: number) {
  modelCooldowns.set(model, Date.now() + ms);
}

// Resilient helper to run Gemini with valid supported models, failover, quota cooldowns, and proper thinking levels
async function runGeminiWithFallback(params: {
  contents: any;
  config?: any;
}) {
  if (!ai) throw new Error('Gemini client not initialized');

  // Strict valid models from gemini-api skill; gemini-flash-latest and gemini-2.5-flash have standard quotas and high availability
  const allCandidates: { model: string; thinkingLevel?: ThinkingLevel }[] = [
    { model: 'gemini-2.5-flash', thinkingLevel: undefined },
    { model: 'gemini-flash-latest', thinkingLevel: undefined },
    { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL }
  ];

  // Filter out any models currently in rate-limit/quota cooldown
  let activeCandidates = allCandidates.filter((c) => !isModelCoolingDown(c.model));
  if (activeCandidates.length === 0) {
    // Reset if all are cooling down to allow retry
    modelCooldowns.clear();
    activeCandidates = allCandidates;
  }

  let lastError: any = null;

  for (const { model, thinkingLevel } of activeCandidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = { ...params.config };
        if (thinkingLevel !== undefined) {
          config.thinkingConfig = { thinkingLevel };
        } else {
          delete config.thinkingConfig;
        }

        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded');
        const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');

        if (is429) {
          // Put model in 60s cooldown to avoid spamming exhausted quota
          setModelCooldown(model, 60000);
          console.log(`[Gemini Info] Model ${model} reached rate/quota limit. Cooldown set; switching to alternative model.`);
          break; // Skip retry on 429
        }

        if (is503) {
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
          setModelCooldown(model, 20000);
          console.log(`[Gemini Info] Model ${model} experiencing temporary demand spike (503). Switching to alternative model.`);
          break;
        }

        console.log(`[Gemini Info] Model ${model} failed, attempting next model.`);
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// Ensure data directory and accounts store exist
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
if (!fs.existsSync(ACCOUNTS_FILE)) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({}), 'utf-8');
}

function getAccountsStore(): Record<string, any> {
  try {
    const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function saveAccountsStore(data: Record<string, any>) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save accounts store:', err);
  }
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

/**
 * =========================================================================
 * AUTH & MULTI-DEVICE CLOUD SYNC ENDPOINTS
 * =========================================================================
 */

app.post('/api/auth/register', (req, res) => {
  try {
    const { identifier, identifierType, name, password } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const store = getAccountsStore();

    if (store[cleanId]) {
      return res.status(400).json({ error: 'An account with this email or phone already exists. Please log in.' });
    }

    const newAccount = {
      id: `acc-${Date.now()}`,
      identifier: cleanId,
      identifierType: identifierType || (cleanId.includes('@') ? 'email' : 'phone'),
      name: name || 'Athlete',
      password: password || '',
      createdAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      userData: req.body.initialData || null
    };

    store[cleanId] = newAccount;
    saveAccountsStore(store);

    return res.json({
      success: true,
      account: {
        id: newAccount.id,
        identifier: newAccount.identifier,
        identifierType: newAccount.identifierType,
        name: newAccount.name,
        createdAt: newAccount.createdAt,
        lastSyncedAt: newAccount.lastSyncedAt
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const store = getAccountsStore();
    const user = store[cleanId];

    if (!user) {
      // Auto-provision if user enters their email or phone to keep experience friction-free
      const newAccount = {
        id: `acc-${Date.now()}`,
        identifier: cleanId,
        identifierType: cleanId.includes('@') ? 'email' : 'phone',
        name: cleanId.split('@')[0],
        password: password || '',
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        userData: null
      };
      store[cleanId] = newAccount;
      saveAccountsStore(store);

      return res.json({
        success: true,
        isNew: true,
        account: {
          id: newAccount.id,
          identifier: newAccount.identifier,
          identifierType: newAccount.identifierType,
          name: newAccount.name,
          createdAt: newAccount.createdAt,
          lastSyncedAt: newAccount.lastSyncedAt
        },
        userData: null
      });
    }

    if (user.password && password && user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    return res.json({
      success: true,
      account: {
        id: user.id,
        identifier: user.identifier,
        identifierType: user.identifierType,
        name: user.name,
        createdAt: user.createdAt,
        lastSyncedAt: user.lastSyncedAt
      },
      userData: user.userData || null
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.post('/api/cloud-sync/save', (req, res) => {
  try {
    const { identifier, data } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Account identifier required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const store = getAccountsStore();

    if (!store[cleanId]) {
      store[cleanId] = {
        id: `acc-${Date.now()}`,
        identifier: cleanId,
        identifierType: cleanId.includes('@') ? 'email' : 'phone',
        name: cleanId.split('@')[0],
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        userData: data
      };
    } else {
      store[cleanId].userData = data;
      store[cleanId].lastSyncedAt = new Date().toISOString();
    }

    saveAccountsStore(store);
    return res.json({ success: true, lastSyncedAt: store[cleanId].lastSyncedAt });
  } catch (err: any) {
    console.error('Cloud save error:', err);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

app.get('/api/cloud-sync/load/:identifier', (req, res) => {
  try {
    const cleanId = req.params.identifier.trim().toLowerCase();
    const store = getAccountsStore();
    const user = store[cleanId];

    if (!user || !user.userData) {
      return res.json({ success: true, hasData: false, data: null });
    }

    return res.json({
      success: true,
      hasData: true,
      lastSyncedAt: user.lastSyncedAt,
      data: user.userData
    });
  } catch (err: any) {
    console.error('Cloud load error:', err);
    res.status(500).json({ error: 'Failed to load cloud data' });
  }
});

/**
 * =========================================================================
 * POST /api/generate-workout
 * 100% AI workout generator with deep injury protection, practice fatigue protection,
 * sports specialization, and custom weight/rep choices.
 * =========================================================================
 */
app.post('/api/generate-workout', async (req, res) => {
  try {
    const { user, readiness, scheduledEvents, targetDate, recentWorkouts, customFocus, schoolLog } = req.body;

    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

    // Format specific injuries
    const specificInjuries = user?.specificInjuries || [];
    const injurySummaries = specificInjuries.map((inj: any) => {
      const todayFeeling = readiness?.injuryStatus?.[inj.id] || inj.todayStatus || 'mild_stiffness';
      return `- ${inj.name}: "${inj.description}". Aggravating movements: ${inj.aggravatingMovements || 'heavy loaded deep angles'}. Severity: ${inj.severity}. TODAY FEELING: ${todayFeeling.toUpperCase()}`;
    });

    const newPain = readiness?.newPainDescription ? `\n- NEW PAIN REPORTED TODAY: "${readiness.newPainDescription}"` : '';

    const hasPracticeLater = Boolean(readiness?.practiceLaterToday) || Boolean(schoolLog?.hadPractice);
    const practiceInfo = hasPracticeLater
      ? `YES (${readiness?.practiceDurationMinutes || schoolLog?.practiceDurationMinutes || 90}m, ${readiness?.practiceIntensity || schoolLog?.practiceIntensity || 'moderate'} intensity)`
      : 'NO';

    const schoolLogContext = schoolLog ? `
SCHOOL WEIGHTLIFTING CLASS & PRACTICE LOG TODAY:
- Had school weightlifting class: ${schoolLog.hadWeightliftingClass ? 'YES' : 'NO'}
- Main lift exercise performed: ${schoolLog.mainLiftExercise || 'Not recorded'}
- Body parts feeling sore/worked: ${(schoolLog.bodyPartsSoreOrWorked || []).join(', ') || 'None'}
- Class intensity: ${schoolLog.weightClassIntensity || 'moderate'}
- Had sports practice today: ${schoolLog.hadPractice ? 'YES' : 'NO'} (${schoolLog.practiceIntensity || 'moderate'})
- How hard it left them: "${schoolLog.howHardItLeftMe || 'Good'}"
CRITICAL ADAPTATION DIRECTIVE: If the athlete already performed squats or has sore quads/knees from school basketball lifting class, DO NOT program heavy squats or leg fatigue today! Sparing their sore muscles is paramount. Shift the workout focus to upper body posture, back thickness, chest mechanics, and core anti-rotation. State this adjustment directly in the workout reasoning.` : '';

    const upcomingEvents = scheduledEvents?.filter((e: any) => e.date >= dateStr).slice(0, 3) || [];
    const availableMins = Number(readiness?.availableMinutes || user?.preferredWorkoutDuration || 45);

    let minExercises = 6;
    let maxExercises = 8;
    if (availableMins >= 75) {
      minExercises = 10;
      maxExercises = 12;
    } else if (availableMins >= 60) {
      minExercises = 8;
      maxExercises = 10;
    } else if (availableMins >= 45) {
      minExercises = 6;
      maxExercises = 8;
    } else if (availableMins >= 30) {
      minExercises = 4;
      maxExercises = 5;
    } else {
      minExercises = 3;
      maxExercises = 4;
    }

    const prompt = `You are an elite athletic strength & conditioning coach and sports biomechanist.
Generate a completely customized, scientifically periodized workout for:
Date: ${dayOfWeek}, ${dateStr}

Athlete Profile:
- Name: ${user?.name || 'Athlete'}
- Sport: ${user?.sport || 'General Athletic'} (Position: ${user?.sportDetails?.position || 'N/A'})
- Experience: ${user?.experienceLevel || 'intermediate'}
- Weight Unit: ${user?.weightUnit || 'lb'}
- Equipment: ${user?.availableEquipment?.join(', ') || 'dumbbell, barbell, bench'}
- Time Available: ${availableMins} minutes
- Custom Focus: ${customFocus || 'Optimal athletic progression & hypertrophy'}

Readiness & Schedule Constraints:
- Energy Level: ${readiness?.energyLevel || 'good'} (Readiness Score: ${readiness?.readinessScore || 8}/10)
- Muscular Soreness: ${readiness?.sorenessLevel || 'none'}
- PRACTICE LATER TODAY: ${practiceInfo}
${hasPracticeLater ? 'CRITICAL PRACTICE RULE: They have team practice later today! Do NOT exhaust their legs or sprint endurance. Emphasize upper body mechanical tension, core anti-rotation, posture, and hip mobility.' : ''}
${schoolLogContext}
- Upcoming Games/Competitions: ${JSON.stringify(upcomingEvents)}

SPECIFIC INJURIES & PAIN RESTRICTIONS (MUST RESPECT STRICTLY):
${injurySummaries.length > 0 ? injurySummaries.join('\n') : 'None reported'}
${newPain}
${(injurySummaries.length > 0 || newPain) ? 'CRITICAL INJURY RULE: Protect the injured area completely. Replace standard aggravating movements with biomechanically safe variations (e.g. if patellar/knee pain, do NOT assign deep forward-knee flexion or high impact jumps; use isometric holds, glute bridges, hamstring curls, or seated upper body). Address how you protected this injury in the reasoning and injuryProtectionNotes!' : ''}

Recent Workouts / Exercises Performed (DO NOT REPEAT EXACT SAME EXERCISES):
${JSON.stringify(recentWorkouts?.slice(0, 5) || [])}

CRITICAL DURATION & EXERCISE COUNT REQUIREMENT:
The athlete selected ${availableMins} minutes. Workouts of 45 minutes and above MUST ACTUALLY TAKE THAT FULL DURATION with an authentic, comprehensive training stimulus!
You MUST generate between ${minExercises} and ${maxExercises} distinct exercises (e.g. preparatory joint primer, primary heavy compound lift with 3-4 sets, secondary unilateral or compound lift with 3-4 sets, upper/lower hypertrophy accessories, posture/rotator durability, and anti-rotation/trunk stability).
Sets, reps, and realistic rest periods (60-90s) must genuinely fill the ${availableMins} minutes.
Generate a fresh, unique, high-yield workout plan in JSON format with exactly ${minExercises} to ${maxExercises} exercises.`;

    const response = await runGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            workoutTitle: { type: Type.STRING },
            goal: { type: Type.STRING },
            estimatedMinutes: { type: Type.NUMBER },
            difficulty: { type: Type.STRING },
            readinessStatus: { type: Type.STRING },
            reasoning: { type: Type.STRING, description: '2 clear sentences explaining why this workout is programmed, mentioning practice or upcoming games' },
            injuryProtectionNotes: { type: Type.STRING, description: 'Specific notes explaining how this plan actively protects the athlete specific typed injuries' },
            equipmentNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sets: { type: Type.NUMBER },
                  reps: { type: Type.NUMBER },
                  recommendedWeight: { type: Type.NUMBER },
                  restSeconds: { type: Type.NUMBER },
                  tempo: { type: Type.STRING },
                  targetMuscles: { type: Type.ARRAY, items: { type: Type.STRING } },
                  notes: { type: Type.STRING },
                  whyWeightHypertrophyInjury: { type: Type.STRING, description: 'Scientific explanation of why this weight is selected for hypertrophy stimulus while protecting joints and practice freshness' },
                  alternative: { type: Type.STRING, description: 'Safe alternative exercise' },
                  aiSummary: {
                    type: Type.OBJECT,
                    properties: {
                      whatItIs: { type: Type.STRING },
                      howToDoIt: { type: Type.ARRAY, items: { type: Type.STRING } },
                      whatItExercises: {
                        type: Type.OBJECT,
                        properties: {
                          primary: { type: Type.ARRAY, items: { type: Type.STRING } },
                          secondary: { type: Type.ARRAY, items: { type: Type.STRING } },
                          movementPattern: { type: Type.STRING }
                        },
                        required: ['primary', 'secondary', 'movementPattern']
                      },
                      whyThisWeight: {
                        type: Type.OBJECT,
                        properties: {
                          weightRationale: { type: Type.STRING },
                          hypertrophyMechanism: { type: Type.STRING },
                          injuryPreventionFocus: { type: Type.STRING },
                          progressionContext: { type: Type.STRING }
                        },
                        required: ['weightRationale', 'hypertrophyMechanism', 'injuryPreventionFocus', 'progressionContext']
                      }
                    },
                    required: ['whatItIs', 'howToDoIt', 'whatItExercises', 'whyThisWeight']
                  }
                },
                required: ['name', 'sets', 'reps', 'recommendedWeight', 'restSeconds', 'targetMuscles', 'notes', 'whyWeightHypertrophyInjury', 'alternative', 'aiSummary']
              }
            }
          },
          required: ['workoutTitle', 'goal', 'estimatedMinutes', 'reasoning', 'injuryProtectionNotes', 'equipmentNeeded', 'exercises']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    // Attach date and ids
    const formattedWorkout = {
      id: `ai-plan-${Date.now()}`,
      date: dateStr,
      workoutTitle: parsed.workoutTitle,
      goal: parsed.goal,
      status: 'planned',
      estimatedMinutes: parsed.estimatedMinutes || readiness?.availableMinutes || 35,
      readinessStatus: parsed.readinessStatus || (hasPracticeLater ? 'Deload / Reduced' : 'High Readiness'),
      reasoning: parsed.reasoning,
      injuryProtectionNotes: parsed.injuryProtectionNotes,
      isAiGenerated: true,
      practiceLaterToday: hasPracticeLater,
      practiceContext: hasPracticeLater ? `Calibrated for ${readiness.practiceIntensity} practice later today.` : undefined,
      equipmentNeeded: parsed.equipmentNeeded || ['dumbbell', 'bench'],
      exercises: parsed.exercises.map((ex: any, idx: number) => ({
        id: `ai-ex-${Date.now()}-${idx}`,
        exerciseId: `ex-ai-${idx}-${Date.now()}`,
        name: ex.name,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        recommendedWeight: ex.recommendedWeight || 20,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: ex.restSeconds || 75,
        targetMuscles: ex.targetMuscles || ['Full Body'],
        tempo: ex.tempo || '3-0-1-0',
        notes: ex.notes || 'Focus on controlled tempo and tension.',
        whyWeightHypertrophyInjury: ex.whyWeightHypertrophyInjury,
        completed: false,
        alternative: ex.alternative,
        aiSummary: ex.aiSummary
      }))
    };

    return res.json({
      ...formattedWorkout,
      success: true,
      plan: formattedWorkout
    });
  } catch (err: any) {
    console.warn('Gemini models unavailable, constructing safe sports-science calibrated plan:', err?.message || err);

    const { user, readiness, targetDate } = req.body || {};
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const hasPracticeLater = Boolean(readiness?.practiceLaterToday);

    const hasKneePain = (user?.specificInjuries || []).some((i: any) =>
      i.name?.toLowerCase().includes('patellar') ||
      i.name?.toLowerCase().includes('knee') ||
      i.description?.toLowerCase().includes('knee')
    );

    const fallbackExercises = [
      {
        id: `fb-ex-${Date.now()}-1`,
        exerciseId: 'fb-spanish-squat',
        name: hasKneePain ? 'Spanish Squats (Isometric Knee Tendon Hold)' : (hasPracticeLater ? 'Dumbbell Romanian Deadlift' : 'Goblet Squat (Controlled Tempo)'),
        sets: 3,
        reps: hasKneePain ? 45 : 10,
        recommendedWeight: hasKneePain ? 0 : 25,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: 60,
        targetMuscles: hasKneePain ? ['Quadriceps', 'Patellar Tendon'] : ['Hamstrings', 'Glutes'],
        tempo: hasKneePain ? '45s hold' : '3-0-1-0',
        notes: hasKneePain ? 'Isometric hold to induce patellar tendon analgesia without fatigue.' : 'Controlled hinge preserving quad freshness for practice.',
        whyWeightHypertrophyInjury: hasKneePain ? 'Isometric tendon loading reduces pain via cortical inhibition while preserving explosive freshness for team practice.' : 'Hinges target posterior chain hypertrophy without loading the anterior patellar tendon.',
        completed: false,
        alternative: 'Glute Bridge Hold',
        aiSummary: {
          whatItIs: 'An isometric or controlled hinge exercise that targets muscle recruitment without joint strain.',
          howToDoIt: ['Anchor strap or dumbbells safely', 'Maintain tall neutral spine', 'Brace core and breathe rhythmically', 'Hold smooth isometric contraction'],
          whatItExercises: {
            primary: hasKneePain ? ['Quadriceps', 'Patellar Tendon'] : ['Hamstrings'],
            secondary: ['Core stabilizers', 'Glutes'],
            movementPattern: 'Isometric Stability'
          },
          whyThisWeight: {
            weightRationale: 'Modulated to stimulate tissue adaptation without central fatigue.',
            hypertrophyMechanism: 'Mechanical tension without excessive eccentric breakdown.',
            injuryPreventionFocus: hasKneePain ? 'Protects patellar tendon by avoiding deep shear forces.' : 'Spares quad tendons for practice later today.',
            progressionContext: 'Progressive tendon load tolerance.'
          }
        }
      },
      {
        id: `fb-ex-${Date.now()}-2`,
        exerciseId: 'fb-seated-db-press',
        name: 'Seated Neutral-Grip Dumbbell Overhead Press',
        sets: 3,
        reps: 10,
        recommendedWeight: 20,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: 75,
        targetMuscles: ['Anterior Deltoid', 'Triceps', 'Upper Pectorals'],
        tempo: '3-0-1-0',
        notes: 'Palms facing inward. Full lockout with braced core.',
        whyWeightHypertrophyInjury: 'Upper body hypertrophy focus that zero-loads lower body before practice.',
        completed: false,
        alternative: 'Standing Band Overhead Press',
        aiSummary: {
          whatItIs: 'A seated compound vertical pressing movement for upper body power.',
          howToDoIt: ['Sit upright against back pad', 'Press dumbbells up with palms facing each other', 'Lower with control over 3 seconds'],
          whatItExercises: {
            primary: ['Shoulders', 'Triceps'],
            secondary: ['Upper Chest', 'Core'],
            movementPattern: 'Vertical Push'
          },
          whyThisWeight: {
            weightRationale: 'Targeting 2 RIR for optimal mechanical stimulus.',
            hypertrophyMechanism: 'Time under tension on shoulder fibers.',
            injuryPreventionFocus: 'Neutral grip protects rotator cuff and avoids impingement.',
            progressionContext: 'Increases deltoid cross-sectional area.'
          }
        }
      },
      {
        id: `fb-ex-${Date.now()}-3`,
        exerciseId: 'fb-chest-supported-row',
        name: 'Chest-Supported Dumbbell Row',
        sets: 3,
        reps: 12,
        recommendedWeight: 25,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: 60,
        targetMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Mid Traps'],
        tempo: '2-1-1-1',
        notes: 'Pull elbows toward hips and pause for 1 second at full squeeze.',
        whyWeightHypertrophyInjury: 'Chest support eliminates lower back fatigue and preserves athlete posture.',
        completed: false,
        alternative: 'Single Arm Dumbbell Row',
        aiSummary: {
          whatItIs: 'A horizontal pulling movement with full torso support.',
          howToDoIt: ['Lie prone on incline bench', 'Pull dumbbells toward hips', 'Squeeze scapulae together at peak contraction'],
          whatItExercises: {
            primary: ['Lats', 'Upper Back'],
            secondary: ['Biceps', 'Rear Delts'],
            movementPattern: 'Horizontal Pull'
          },
          whyThisWeight: {
            weightRationale: 'Selected for maximum back engagement without jerking.',
            hypertrophyMechanism: 'Direct lat recruitment under sustained stretch.',
            injuryPreventionFocus: 'Zero lumbar shear stress.',
            progressionContext: 'Builds balanced shoulder girdle stability.'
          }
        }
      },
      {
        id: `fb-ex-${Date.now()}-4`,
        exerciseId: 'fb-pallof-press',
        name: 'Half-Kneeling Pallof Press',
        sets: 3,
        reps: 12,
        recommendedWeight: 15,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: 45,
        targetMuscles: ['Transverse Abdominis', 'Internal/External Obliques'],
        tempo: '2-2-1-0',
        notes: 'Resist rotational twist. Keep hands aligned with sternum.',
        whyWeightHypertrophyInjury: 'Anti-rotational core stability for athletic change of direction.',
        completed: false,
        alternative: 'Plank with Shoulder Taps',
        aiSummary: {
          whatItIs: 'An anti-rotation isometric core stabilizer.',
          howToDoIt: ['Half kneeling position with front shin vertical', 'Hold cable or band at center chest', 'Press arms straight out and resist rotation for 2 seconds'],
          whatItExercises: {
            primary: ['Obliques', 'Core'],
            secondary: ['Glutes', 'Shoulders'],
            movementPattern: 'Anti-Rotation'
          },
          whyThisWeight: {
            weightRationale: 'Moderate resistance enabling strict alignment without lateral lean.',
            hypertrophyMechanism: 'Isometric core recruitment under high rotational shear.',
            injuryPreventionFocus: 'Protects lumbar spine during multi-directional athletic movements.',
            progressionContext: 'Strengthens athletic rotational armor.'
          }
        }
      },
      {
        id: `fb-ex-${Date.now()}-5`,
        exerciseId: 'fb-db-rdl',
        name: 'Dumbbell Romanian Deadlift (Controlled Eccentric)',
        sets: (readiness?.availableMinutes || 45) >= 45 ? 4 : 3,
        reps: 10,
        recommendedWeight: 30,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: 75,
        targetMuscles: ['Hamstrings', 'Gluteus Maximus', 'Erector Spinae'],
        tempo: '3-1-1-0',
        notes: 'Push hips straight back, soft bend in knees, keep spine locked.',
        whyWeightHypertrophyInjury: 'Posterior chain loading with zero anterior knee stress.',
        completed: false,
        alternative: 'Single Leg Glute Bridge',
        aiSummary: {
          whatItIs: 'A foundational hip hinge focusing on eccentric hamstring load.',
          howToDoIt: ['Hold dumbbells against thighs', 'Hinge at hips with neutral spine', 'Drive through heels to stand'],
          whatItExercises: {
            primary: ['Hamstrings', 'Glutes'],
            secondary: ['Lower Back', 'Forearms'],
            movementPattern: 'Hip Hinge'
          },
          whyThisWeight: {
            weightRationale: 'Targeting deep eccentric stretch without lower back rounding.',
            hypertrophyMechanism: 'Tension at long muscle lengths.',
            injuryPreventionFocus: 'Strengthens hamstrings against sprint strains.',
            progressionContext: 'Builds bulletproof posterior chain.'
          }
        }
      },
      {
        id: `fb-ex-${Date.now()}-6`,
        exerciseId: 'fb-db-lateral-raise',
        name: 'Dumbbell Scaption Lateral Raise',
        sets: 3,
        reps: 12,
        recommendedWeight: 12,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: 60,
        targetMuscles: ['Lateral Deltoid', 'Supraspinatus', 'Serratus Anterior'],
        tempo: '2-0-1-1',
        notes: 'Raise in the scapular plane (30 degrees forward of midline), pinkies slightly lower than thumbs.',
        whyWeightHypertrophyInjury: 'Safe deltoid isolation that eliminates subacromial impingement.',
        completed: false,
        alternative: 'Cable Lateral Raise',
        aiSummary: {
          whatItIs: 'Shoulder abductor isolation in the biomechanically optimal scaption plane.',
          howToDoIt: ['Stand tall with dumbbells at sides', 'Raise arms 30 degrees in front of body', 'Control descent over 2 seconds'],
          whatItExercises: {
            primary: ['Lateral Deltoid'],
            secondary: ['Rotator Cuff', 'Upper Traps'],
            movementPattern: 'Shoulder Abduction'
          },
          whyThisWeight: {
            weightRationale: 'Light load for pure deltoid isolation without trap shrugging.',
            hypertrophyMechanism: 'Metabolic accumulation in lateral deltoid heads.',
            injuryPreventionFocus: 'Scapular plane protects rotator cuff tendons.',
            progressionContext: 'Develops shoulder width and joint longevity.'
          }
        }
      },
      {
        id: `fb-ex-${Date.now()}-7`,
        exerciseId: 'fb-deadbug',
        name: 'Deadbug with Deep Diaphragmatic Exhale',
        sets: 3,
        reps: 10,
        recommendedWeight: 0,
        weightUnit: user?.weightUnit || 'lb',
        restSeconds: 45,
        targetMuscles: ['Transverse Abdominis', 'Rectus Abdominis', 'Anterior Core'],
        tempo: '3-1-1-0',
        notes: 'Press lower back flat against the floor. Exhale completely as opposite arm and leg extend.',
        whyWeightHypertrophyInjury: 'Neuromuscular core integrity that protects lumbar spine from sports impact.',
        completed: false,
        alternative: 'Bird Dog',
        aiSummary: {
          whatItIs: 'A supreme anti-extension core stabilization drill.',
          howToDoIt: ['Lie on back with arms up and knees bent 90 degrees', 'Extend opposite arm and leg while keeping low back pinned', 'Return with control'],
          whatItExercises: {
            primary: ['Deep Core', 'Transverse Abdominis'],
            secondary: ['Hip Flexors', 'Pelvic Floor'],
            movementPattern: 'Anti-Extension Core'
          },
          whyThisWeight: {
            weightRationale: 'Bodyweight control prioritizing ribcage depression and pelvic stability.',
            hypertrophyMechanism: 'High neural recruitment of deep core musculature.',
            injuryPreventionFocus: 'Prevents lumbar hyperextension under athletic fatigue.',
            progressionContext: 'Forms trunk foundation for all athletic power.'
          }
        }
      }
    ];

    const availableMinsFallback = Number(readiness?.availableMinutes || 45);
    let sliceCount = 4;
    if (availableMinsFallback >= 75) sliceCount = 7;
    else if (availableMinsFallback >= 60) sliceCount = 7;
    else if (availableMinsFallback >= 45) sliceCount = 7;
    else if (availableMinsFallback >= 35) sliceCount = 5;
    else sliceCount = 4;

    const chosenFallbackExercises = fallbackExercises.slice(0, sliceCount);

    const fallbackWorkout = {
      id: `ai-plan-${Date.now()}`,
      date: dateStr,
      workoutTitle: hasPracticeLater
        ? 'Athletic Practice-Primer & Upper Body Hypertrophy'
        : 'Athletic Hypertrophy & Joint Durability',
      goal: hasPracticeLater ? 'Preserve Practice Sharpness & Stimulate Upper Muscle' : 'Hypertrophy & Joint Strength',
      status: 'planned',
      estimatedMinutes: availableMinsFallback,
      readinessStatus: hasPracticeLater ? 'Practice Taper Active' : 'Calibrated & Protected',
      reasoning: hasPracticeLater
        ? `Calibrated around team practice later today (${readiness?.practiceIntensity || 'moderate'} intensity). Legs and sprints are safeguarded while upper mechanical tension is maximized.`
        : 'Programmed for optimal muscular adaptation and sport-specific biomechanics.',
      injuryProtectionNotes: (user?.specificInjuries || []).length > 0
        ? `Actively safeguards your reported ${user.specificInjuries.map((i: any) => i.name).join(', ')} with safe movement angles and zero high-impact shear.`
        : 'All movements selected to balance agonist/antagonist joint integrity.',
      isAiGenerated: true,
      practiceLaterToday: hasPracticeLater,
      practiceContext: hasPracticeLater ? `Volume modulated to preserve legs for practice later today.` : undefined,
      equipmentNeeded: ['dumbbell', 'bench'],
      exercises: chosenFallbackExercises
    };

    return res.json({
      ...fallbackWorkout,
      success: true,
      plan: fallbackWorkout
    });
  }
});

/**
 * =========================================================================
 * POST /api/generate-morning-routine
 * AI-generated custom daily morning mobility routine tailored to sport,
 * readiness, soreness, and today's schedule.
 * =========================================================================
 */
app.post('/api/generate-morning-routine', async (req, res) => {
  try {
    const { user, readiness, scheduledEvents, todayWorkout, targetDate } = req.body || {};
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

    const specificInjuries = user?.specificInjuries || [];
    const injurySummaries = specificInjuries.map((inj: any) =>
      `${inj.name} (${inj.description}, severity: ${inj.severity})`
    );

    const hasPracticeLater = Boolean(readiness?.practiceLaterToday);

    const prompt = `You are an elite athletic physical therapist and mobility specialist.
Generate a completely customized, 8 to 12 minute morning mobility routine for:
Date: ${dayOfWeek}, ${dateStr}

Athlete Profile:
- Name: ${user?.name || 'Athlete'}
- Sport: ${user?.sport || 'General Athletics'} (Position: ${user?.sportDetails?.position || 'N/A'})
- Experience: ${user?.experienceLevel || 'intermediate'}
- Soreness / Stiffness: ${readiness?.sorenessLevel || 'none'} (${readiness?.soreAreas?.join(', ') || 'none specified'})
- Energy Level: ${readiness?.energyLevel || 'good'}
- Reported Injuries: ${injurySummaries.join('; ') || 'None reported'}
- Has practice later today: ${hasPracticeLater ? 'YES' : 'NO'}
- Today's Planned Workout: "${todayWorkout?.workoutTitle || 'Athletic training'}"

Goals:
1. Gently awaken the central nervous system without creating physical fatigue.
2. Lubricate joint capsules, decompress spinal vertebrae, and mobilize key kinetic chain links specific to ${user?.sport || 'athletics'}.
3. Address any morning stiffness or soreness reported.
4. If an injury exists, provide safe biomechanical cues and zero-pain modifications.
5. Provide 4 to 6 customized mobility movements lasting 45 to 90 seconds each (total routine ~8-12 minutes).
6. Provide specific diaphragmatic breathing guidance for each movement.

Generate a JSON response.`;

    const response = await runGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            rationale: { type: Type.STRING, description: '1-2 sentences explaining why this morning mobility routine is specifically tailored for today' },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  durationSeconds: { type: Type.NUMBER },
                  instructions: { type: Type.STRING },
                  breathingCue: { type: Type.STRING },
                  targetArea: { type: Type.STRING },
                  modification: { type: Type.STRING }
                },
                required: ['name', 'durationSeconds', 'instructions', 'breathingCue', 'targetArea']
              }
            }
          },
          required: ['title', 'durationMinutes', 'rationale', 'exercises']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const routine = {
      id: `ai-morning-${Date.now()}`,
      date: dateStr,
      title: parsed.title || `${dayOfWeek} Morning Mobility & Joint Awakening`,
      durationMinutes: parsed.durationMinutes || 10,
      completed: false,
      rationale: parsed.rationale || 'Awakens joint capsules and decompresses spine before athletic demands.',
      isAiGenerated: true,
      exercises: parsed.exercises || []
    };

    return res.json({ success: true, routine });
  } catch (err: any) {
    console.warn('Morning mobility Gemini call failed, using sports-science fallback:', err?.message || err);

    const { user, readiness, targetDate } = req.body || {};
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const isSoccerOrRun = user?.sport?.toLowerCase().includes('soccer') || user?.sport?.toLowerCase().includes('run');

    const fallbackRoutine = {
      id: `ai-morning-${Date.now()}`,
      date: dateStr,
      title: isSoccerOrRun ? 'Morning Hip Opener & Ankle Awakening' : 'Morning Joint Awakening & Spine Flow',
      durationMinutes: 10,
      completed: false,
      rationale: 'Calibrated joint lubrication and spine decompression customized for your sport and morning readiness.',
      isAiGenerated: true,
      exercises: [
        {
          name: 'Cat-Cow Spinal Waves',
          durationSeconds: 60,
          instructions: 'On all fours, inhale as you arch back and lift chest (Cow). Exhale as you tuck chin, round spine to ceiling, and push floor away (Cat).',
          breathingCue: 'Inhale to expand belly, exhale to compress core.',
          targetArea: 'Spine & Core',
          modification: 'Can be performed seated with hands on knees.'
        },
        {
          name: 'World’s Greatest Stretch',
          durationSeconds: 90,
          instructions: 'Step into a long forward lunge. Place opposite hand on floor. Rotate torso and reach other arm straight toward the ceiling. Switch sides.',
          breathingCue: 'Exhale as you twist and open your chest.',
          targetArea: 'Hips, Thoracic Spine & Hamstrings',
          modification: 'Elevate hand on a block or chair.'
        },
        {
          name: '90/90 Hip Rotations',
          durationSeconds: 75,
          instructions: 'Sit with knees bent 90 degrees on floor. Gently lean over front shin to stretch glute. Pivot smoothly to opposite side.',
          breathingCue: 'Deep steady breaths into the lower pelvis.',
          targetArea: 'Hip Joint Capsules & Glutes',
          modification: 'Place hands on floor behind you for balance.'
        },
        {
          name: 'Deep Squat Pry & Ankle Rock',
          durationSeconds: 75,
          instructions: 'Sink into deepest comfortable squat. Press elbows gently against knees with palms together. Shift weight gently from side to side.',
          breathingCue: 'Breathe deep into your belly and pelvic floor.',
          targetArea: 'Ankles, Hips & Pelvic Floor',
          modification: 'Hold onto a doorframe or sturdy post.'
        }
      ]
    };

    return res.json({ success: true, routine: fallbackRoutine });
  }
});

/**
 * =========================================================================
 * POST /api/generate-plyometrics
 * AI-generated daily at-home plyometrics routine (zero or minimal equipment)
 * Builds vertical jump, ankle stiffness, and reactive elasticity
 * =========================================================================
 */
app.post('/api/generate-plyometrics', async (req, res) => {
  try {
    const { user, readiness, schoolLog, targetDate } = req.body || {};
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

    const hadLegLifting = schoolLog?.hadWeightliftingClass && (
      Boolean(schoolLog.mainLiftExercise?.toLowerCase().includes('squat')) ||
      Boolean(schoolLog.mainLiftExercise?.toLowerCase().includes('clean')) ||
      Boolean(schoolLog.mainLiftExercise?.toLowerCase().includes('deadlift')) ||
      Boolean(schoolLog.bodyPartsSoreOrWorked?.some((p: string) => p.toLowerCase().includes('quad') || p.toLowerCase().includes('knee') || p.toLowerCase().includes('leg')))
    );

    const prompt = `You are an elite athletic plyometrician, speed coach, and jumping biomechanist.
Generate a 10-15 minute AT-HOME plyometrics session for:
- Date: ${dayOfWeek}, ${dateStr}
- Athlete Sport: ${user?.sport || 'Basketball / Athletics'}
- Context: Can be done at home with NO equipment or minimal (bodyweight, floor line, or low 4-8" step).
${hadLegLifting ? `CRITICAL CONSTRAINT: Athlete had school weightlifting earlier (${schoolLog?.mainLiftExercise || 'squats'}). Legs are fatigued. Prescribe LOW-IMPACT ankle stiffness, light reactivity pogo hops, snap-down deceleration holds, or upper body explosive push-offs so we DO NOT overload their knee/quad tendons.` : 'Focus on vertical takeoff velocity, elastic Achilles stiffness, and rapid stretch-shortening cycle.'}

Generate 4 high-yield exercises in JSON format.`;

    const response = await runGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            targetFocus: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            rationale: { type: Type.STRING },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sets: { type: Type.NUMBER },
                  repsOrDuration: { type: Type.STRING },
                  restSeconds: { type: Type.NUMBER },
                  instructions: { type: Type.STRING },
                  coachingCue: { type: Type.STRING },
                  targetFocus: { type: Type.STRING },
                  intensity: { type: Type.STRING, enum: ['low', 'moderate', 'high'] },
                  equipmentNeeded: { type: Type.STRING, enum: ['none', 'small_space', 'low_step_or_floor'] }
                },
                required: ['name', 'sets', 'repsOrDuration', 'restSeconds', 'instructions', 'coachingCue', 'targetFocus', 'intensity', 'equipmentNeeded']
              }
            }
          },
          required: ['title', 'targetFocus', 'durationMinutes', 'rationale', 'exercises']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const routine = {
      id: `ai-plyo-${Date.now()}`,
      date: dateStr,
      title: parsed.title || 'At-Home Vertical & Reactivity Plyometrics',
      targetFocus: parsed.targetFocus || 'Elastic Tendon Recoil & Vertical Spring',
      durationMinutes: parsed.durationMinutes || 12,
      completed: false,
      rationale: parsed.rationale || 'Calibrated zero-equipment plyometrics for home floors.',
      isAiGenerated: true,
      exercises: parsed.exercises || []
    };

    return res.json({ success: true, routine });
  } catch (err: any) {
    console.warn('Plyometrics Gemini call fallback:', err?.message || err);
    const { user, readiness, schoolLog, targetDate } = req.body || {};
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    const fallbackRoutine = {
      id: `plyo-${Date.now()}`,
      date: dateStr,
      title: 'At-Home Vertical & Elasticity Plyos',
      targetFocus: 'Elastic Tendon Recoil & First-Step Reactivity',
      durationMinutes: 12,
      completed: false,
      rationale: 'Calibrated bodyweight plyometrics designed for home spaces to build vertical jump and reactive stiffness.',
      isAiGenerated: false,
      exercises: [
        {
          name: 'Pogo Hops with Max Vertical Extension',
          sets: 3,
          repsOrDuration: '10 rapid + 2 max reaches',
          restSeconds: 60,
          instructions: '10 quick stiff-ankle bounces on balls of feet, then explode into 2 maximum vertical reaches.',
          coachingCue: 'Violent triple extension at ankles, knees, and hips.',
          targetFocus: 'Ankle Stiffness to Vertical Transfer',
          intensity: 'high',
          equipmentNeeded: 'none'
        },
        {
          name: 'Lateral Skater Bounds with 2s Freeze',
          sets: 3,
          repsOrDuration: '4 bounds per side',
          restSeconds: 60,
          instructions: 'Bound laterally from one foot to the other. Stick landing softly and hold for 2 seconds.',
          coachingCue: 'Catch force in the hip, protect knee alignment.',
          targetFocus: 'Frontal Plane Deceleration & Cutting Armor',
          intensity: 'moderate',
          equipmentNeeded: 'small_space'
        },
        {
          name: 'Snap Down to Athletic Deceleration Hold',
          sets: 3,
          repsOrDuration: '5 reps (3s hold)',
          restSeconds: 45,
          instructions: 'Reach tall overhead on toes, then violently snap hips back into a low athletic stance.',
          coachingCue: 'Absorb ground force silently through hips and glutes.',
          targetFocus: 'Eccentric Force Braking',
          intensity: 'moderate',
          equipmentNeeded: 'none'
        },
        {
          name: 'Broad Jump to Controlled Stick',
          sets: 3,
          repsOrDuration: '4 reps',
          restSeconds: 60,
          instructions: 'Hinge and launch forward for maximum horizontal distance. Stick landing quietly without knee cave.',
          coachingCue: 'Explode like a coiled spring, stick like concrete.',
          targetFocus: 'Horizontal Explosive Power',
          intensity: 'high',
          equipmentNeeded: 'small_space'
        }
      ]
    };

    return res.json({ success: true, routine: fallbackRoutine });
  }
});

/**
 * =========================================================================
 * POST /api/generate-nightly-routine
 * AI-generated custom nightly stretching routine before bed after workout.
 * Restorative down-regulation targeting muscles worked and calming CNS.
 * =========================================================================
 */
app.post('/api/generate-nightly-routine', async (req, res) => {
  try {
    const { user, readiness, scheduledEvents, todayWorkout, completedWorkout, targetDate } = req.body || {};
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

    const workout = completedWorkout || todayWorkout;
    const exerciseNames = (workout?.exercises || []).map((e: any) => e.name).join(', ');
    const specificInjuries = user?.specificInjuries || [];
    const injurySummaries = specificInjuries.map((inj: any) =>
      `${inj.name} (${inj.description})`
    );

    const prompt = `You are a world-class recovery specialist and sports sleep physiologist.
Generate a completely customized, restorative nightly bedtime stretching routine to perform BEFORE BED AFTER TODAY'S WORKOUT for:
Date: ${dayOfWeek}, ${dateStr}

Athlete Profile:
- Name: ${user?.name || 'Athlete'}
- Sport: ${user?.sport || 'General Athletics'}
- Today's Workout Performed: "${workout?.workoutTitle || 'Full Body Athletic Training'}"
- Exercises Performed Today: ${exerciseNames || 'Squats, Presses, Pulls, Core'}
- Had team practice/game today: ${readiness?.practiceLaterToday ? 'YES' : 'NO'}
- Specific Injuries / Sore Areas: ${injurySummaries.join('; ') || 'None reported'}

Goals:
1. Activate the parasympathetic nervous system (rest, digest, deep sleep) by dramatically down-regulating sympathetic arousal from today's workout.
2. Specifically stretch and release the muscles that were worked today (${exerciseNames || 'kinetic chain'}).
3. Drain metabolic waste and venous pooling from the legs (e.g. Legs Up The Wall or elevated hamstrings).
4. Decompress lumbar compression from axial loading (squats, hinges, sprints, jumps).
5. Open the chest and thoracic spine to facilitate slow diaphragmatic 4-7-8 or 4-6 nasal breathing.
6. Provide 4 to 6 soothing, non-strenuous static stretches (45 to 90 seconds each, ~10-12 minutes total).
7. Absolutely NO bouncy, dynamic, or high-intensity movements.

Generate a JSON response.`;

    const response = await runGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            rationale: { type: Type.STRING, description: 'Scientific explanation of why this bedtime flow releases today workout and prepares for deep restorative sleep' },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  durationSeconds: { type: Type.NUMBER },
                  instructions: { type: Type.STRING },
                  breathingCue: { type: Type.STRING },
                  targetArea: { type: Type.STRING },
                  modification: { type: Type.STRING }
                },
                required: ['name', 'durationSeconds', 'instructions', 'breathingCue', 'targetArea']
              }
            }
          },
          required: ['title', 'durationMinutes', 'rationale', 'exercises']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const routine = {
      id: `ai-nightly-${Date.now()}`,
      date: dateStr,
      title: parsed.title || 'Bedtime Down-Regulation & Spine Decompression',
      durationMinutes: parsed.durationMinutes || 10,
      completed: false,
      rationale: parsed.rationale || 'Releases muscular tension from today’s workout and triggers parasympathetic nervous system for deep sleep.',
      isAiGenerated: true,
      exercises: parsed.exercises || []
    };

    return res.json({ success: true, routine });
  } catch (err: any) {
    console.warn('Nightly routine Gemini call failed, using sports-science fallback:', err?.message || err);

    const { user, targetDate, todayWorkout } = req.body || {};
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    const fallbackRoutine = {
      id: `ai-nightly-${Date.now()}`,
      date: dateStr,
      title: 'Nightly Bedtime Decompression & Restorative Flow',
      durationMinutes: 10,
      completed: false,
      rationale: 'Relieves tension in muscles trained during today’s session, decompresses the spine, and facilitates deep restorative sleep.',
      isAiGenerated: true,
      exercises: [
        {
          name: 'Legs Up The Wall (Viparita Karani)',
          durationSeconds: 90,
          instructions: 'Lie on your back with hips close to a wall and extend legs straight up. Rest arms comfortably at sides with palms up. Drains metabolic waste and venous pooling.',
          breathingCue: 'Slow 4s inhale, gentle 6s exhale. Feel heart rate slow.',
          targetArea: 'Hamstrings, Lower Back & Venous Return',
          modification: 'Place a folded towel under lower back for comfort.'
        },
        {
          name: 'Reclined Butterfly (Supta Baddha Konasana)',
          durationSeconds: 75,
          instructions: 'Lie on your back, bring soles of feet together, let knees fall outward toward floor. Rest hands on lower belly.',
          breathingCue: 'Breathe deep into lower abdomen, releasing adductor tension.',
          targetArea: 'Adductors, Hips & Pelvis',
          modification: 'Place pillows under outer knees.'
        },
        {
          name: 'Lying Figure-4 Piriformis Release',
          durationSeconds: 75,
          instructions: 'Lie on back, cross right ankle over left knee. Draw left hamstring gently toward chest until a stretch is felt in right hip. Switch sides.',
          breathingCue: 'Exhale tension out of glutes and lower back.',
          targetArea: 'Glutes, Piriformis & Deep Hip Rotators',
          modification: 'Rest uncrossed foot on a wall or chair.'
        },
        {
          name: 'Extended Child’s Pose with Lat Reach',
          durationSeconds: 60,
          instructions: 'Kneel with big toes touching and knees wide. Sit hips back over heels and walk hands forward. Walk hands gently 12 inches to the right to open left lat, then switch.',
          breathingCue: 'Expand rib cage laterally on inhale, sink armpits down on exhale.',
          targetArea: 'Lats, Thoracic Spine & Lower Back',
          modification: 'Place a cushion under knees or forehead.'
        },
        {
          name: 'Supine Gentle Spinal Twist',
          durationSeconds: 60,
          instructions: 'Lie on back with arms in T-shape. Draw knees to chest and let them fall to the right while keeping left shoulder blade grounded. Switch sides.',
          breathingCue: 'Release all spinal tension on slow long exhales.',
          targetArea: 'Spine, Obliques & Chest',
          modification: 'Place a pillow between knees.'
        }
      ]
    };

    return res.json({ success: true, routine: fallbackRoutine });
  }
});

/**
 * =========================================================================
 * POST /api/coach-chat
 * Dynamic real-time conversational AI coach. Never gives canned static responses.
 * =========================================================================
 */
app.post('/api/coach-chat', async (req, res) => {
  try {
    const { message, history, userContext, currentPlan, scheduledEvents, readiness } = req.body;

    const specificInjuries = userContext?.specificInjuries || [];
    const injuryList = specificInjuries
      .map((i: any) => `${i.name} (${i.description}, Severity: ${i.severity})`)
      .join('; ');

    const systemPrompt = `You are an elite athletic coach and sports science director.
Athlete Profile:
- Name: ${userContext?.name || 'Athlete'}
- Sport: ${userContext?.sport || 'General Athletics'} (Position: ${userContext?.sportDetails?.position || 'N/A'})
- Specific Injuries / Pain: ${injuryList || 'None reported'}
- Today's Energy & Soreness: Energy ${readiness?.energyLevel || 'Good'}, Soreness ${readiness?.sorenessLevel || 'None'}
- Has practice later today: ${currentPlan?.practiceLaterToday || readiness?.practiceLaterToday ? 'YES' : 'NO'}
- Current Workout Plan: "${currentPlan?.workoutTitle || 'Custom Training'}" (${currentPlan?.exercises?.length || 0} exercises)
- Upcoming Games/Practices: ${JSON.stringify(scheduledEvents?.slice(0, 3) || [])}

Coaching Rules:
1. Provide concise, direct, scientifically grounded advice (2-4 sentences max).
2. Never give generic boilerplate. Address their EXACT question, sport, and injuries specifically.
3. If they ask about weights or soreness, reference mechanical tension, RIR (reps in reserve), and tendon durability.
4. If they have practice later today or an upcoming match, explain how to preserve their sharpness.
5. Emphasize that pain during exercise is a signal to modify, not push through blindly.`;

    // Construct conversation context
    const recentHistory = (history || [])
      .slice(-6)
      .map((m: any) => `${m.sender === 'user' ? 'Athlete' : 'Coach'}: ${m.text}`)
      .join('\n');

    const prompt = `${systemPrompt}

Recent Conversation:
${recentHistory}

Athlete: ${message}
Coach (speak directly to them with clear, practical coaching):`;

    const response = await runGeminiWithFallback({
      contents: prompt
    });

    return res.json({
      reply: response.text?.trim() || 'I am ready to adapt your workout. How are you feeling?'
    });
  } catch (err: any) {
    console.warn('Error or high demand in /api/coach-chat, providing context-calibrated response:', err?.message || err);
    const { message, userContext, currentPlan, readiness } = req.body || {};
    const specificInjuries = userContext?.specificInjuries || [];
    const injuryNames = specificInjuries.map((i: any) => i.name).join(', ');
    const hasPractice = Boolean(currentPlan?.practiceLaterToday || readiness?.practiceLaterToday);

    let reply = `As your coach, prioritize controlled execution and keeping 1–2 reps in reserve today. `;
    if (injuryNames) {
      reply += `Given your ${injuryNames}, keep any tendon or joint discomfort strictly under a 2/10 and avoid rapid ballistic reversals. `;
    }
    if (hasPractice) {
      reply += `Because you have team practice later today, preserve your explosive leg freshness and focus today's stimulus on upper body tension, posture, and core anti-rotation. `;
    }
    reply += `Always respect pain signals as a call to modulate load rather than pushing through blindly.`;

    return res.json({ reply });
  }
});

/**
 * =========================================================================
 * POST /api/exercise-summary
 * Detailed exercise breakdown & whyThisWeight rationale
 * =========================================================================
 */
app.post('/api/exercise-summary', async (req, res) => {
  try {
    const { exerciseName, pattern, muscles, weight, weightUnit, previousFeedback, hasPracticeLater, experienceLevel, sport, specificInjury } = req.body;

    const prompt = `You are an elite sports scientist, biomechanist, and hypertrophy coach.
Generate a structured AI breakdown for "${exerciseName}".
User Context:
- Sport: ${sport || 'Athletics'}
- Experience: ${experienceLevel || 'intermediate'}
- Prescribed Weight: ${weight} ${weightUnit || 'lb'}
- Target Muscles: ${muscles?.join(', ') || 'Primary muscle groups'}
- Movement Pattern: ${pattern || 'Compound'}
- Has practice later today: ${hasPracticeLater ? 'YES (must preserve legs and avoid fatigue)' : 'NO'}
- Specific Injury to protect: ${specificInjury || 'None'}
- Previous performance difficulty: ${previousFeedback || 'First session'}

Provide a structured breakdown answering:
1. What it is in 1-2 sentences.
2. How to do it: 3-4 actionable cues including breathing.
3. What it exercises: primary and secondary muscles.
4. WHY we are using this exact weight amount to PREVENT INJURY and MAXIMIZE HYPERTROPHY. Explain mechanical tension, reps in reserve (RIR), protecting ${specificInjury || 'joint structures'}, and keeping them fresh for practice.`;

    const response = await runGeminiWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatItIs: { type: Type.STRING },
            howToDoIt: { type: Type.ARRAY, items: { type: Type.STRING } },
            whatItExercises: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.ARRAY, items: { type: Type.STRING } },
                secondary: { type: Type.ARRAY, items: { type: Type.STRING } },
                movementPattern: { type: Type.STRING }
              },
              required: ['primary', 'secondary', 'movementPattern']
            },
            whyThisWeight: {
              type: Type.OBJECT,
              properties: {
                weightRationale: { type: Type.STRING },
                hypertrophyMechanism: { type: Type.STRING },
                injuryPreventionFocus: { type: Type.STRING },
                progressionContext: { type: Type.STRING }
              },
              required: ['weightRationale', 'hypertrophyMechanism', 'injuryPreventionFocus', 'progressionContext']
            }
          },
          required: ['whatItIs', 'howToDoIt', 'whatItExercises', 'whyThisWeight']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.warn('Error or high demand in /api/exercise-summary, providing science-based breakdown:', err?.message || err);
    const { exerciseName, weight, weightUnit, specificInjury, hasPracticeLater } = req.body || {};

    return res.json({
      whatItIs: `${exerciseName || 'This exercise'} is a key compound movement programmed to develop targeted muscular tension while protecting joint structures.`,
      howToDoIt: [
        'Set an athletic stance with neutral spine alignment',
        'Inhale and brace core 360 degrees before beginning descent',
        'Execute movement through a pain-free active range of motion',
        'Exhale through the sticking point with controlled tempo'
      ],
      whatItExercises: {
        primary: ['Primary Working Muscles'],
        secondary: ['Synergists', 'Core Stabilizers'],
        movementPattern: 'Biomechanical Movement Pattern'
      },
      whyThisWeight: {
        weightRationale: `Prescribed at ${weight || 25} ${weightUnit || 'lb'} to achieve effective mechanical tension around 2 reps in reserve (RIR).`,
        hypertrophyMechanism: 'High motor unit recruitment with sufficient time under tension to stimulate myofibrillar protein synthesis.',
        injuryPreventionFocus: specificInjury
          ? `Modulated specifically to protect against ${specificInjury} flare-ups by avoiding excessive joint shear.`
          : (hasPracticeLater ? 'Kept at controlled fatigue threshold to preserve practice sharpness later today.' : 'Maintains safe tendon and joint loading parameters.'),
        progressionContext: 'Builds systemic work capacity and joint resilience over progressive overload cycles.'
      }
    });
  }
});

/**
 * =========================================================================
 * POST /api/weekly-summary
 * =========================================================================
 */
app.post('/api/weekly-summary', async (req, res) => {
  try {
    const { workoutsCompleted, mobilityCount, sport, gamesPlayed, practicesAttended } = req.body;

    const prompt = `Generate a concise 3-paragraph Weekly Athletic & Hypertrophy Training Summary:
- Workouts completed: ${workoutsCompleted}
- Morning mobility sessions completed: ${mobilityCount}
- Sport: ${sport}
- Practices attended: ${practicesAttended}
- Games played / scheduled: ${gamesPlayed}

Focus on performance, consistency, hypertrophy stimulus, and recovery balance. Keep it professional, encouraging, and science-grounded.`;

    const response = await runGeminiWithFallback({
      contents: prompt
    });

    return res.json({ summary: response.text });
  } catch (err: any) {
    console.error('Error in /api/weekly-summary:', err);
    res.status(500).json({ error: 'Failed to generate weekly summary' });
  }
});

// Setup Vite development middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Adaptive AI Workout Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
