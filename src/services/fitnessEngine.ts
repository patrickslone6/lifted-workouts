import {
  DifficultyRating,
  ExerciseDefinition,
  MorningMobilityRoutine,
  NightlyStretchingRoutine,
  PlannedExercise,
  ScheduledEvent,
  UserProfile,
  WorkoutPlan,
  DailyReadiness,
  AIExerciseSummary,
  PlyometricsRoutine,
  PlyometricsExercise,
  SchoolWorkoutLog
} from '../types';
import { EXERCISE_DATABASE, MORNING_MOBILITY_LIBRARY, NIGHTLY_STRETCHING_LIBRARY } from '../data/exerciseDatabase';
import { getTodayDateString, getDaysDifference } from '../utils/dateUtils';

/**
 * Filter exercises by user equipment and injury contraindications
 */
export function getAvailableExercises(
  user: UserProfile,
  allExercises: ExerciseDefinition[] = EXERCISE_DATABASE
): ExerciseDefinition[] {
  const userEquip = new Set(user.availableEquipment);
  const neverRecommend = new Set(user.neverRecommendExercises);

  return allExercises.filter((ex) => {
    if (neverRecommend.has(ex.id)) return false;

    // Check equipment requirements
    const hasEquipment = ex.equipmentRequired.every(
      (eq) => eq === 'bodyweight' || userEquip.has(eq)
    );
    if (!hasEquipment) return false;

    // Check limitations & contraindications
    for (const lim of user.limitations) {
      if (lim.area === 'knee' && ex.contraindications.includes('acute_knee_pain')) {
        return false;
      }
      if (
        lim.area === 'shoulder' &&
        (ex.contraindications.includes('subacromial_impingement') ||
          ex.contraindications.includes('acute_shoulder_labral_tear'))
      ) {
        return false;
      }
      if (
        lim.area === 'lower_back' &&
        (ex.contraindications.includes('acute_lower_back_pain') ||
          ex.contraindications.includes('disc_herniation'))
      ) {
        return false;
      }
      if (lim.exercisesToAvoid.includes(ex.name) || lim.exercisesToAvoid.includes(ex.id)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compute intelligent load recommendation based on history, difficulty feedback, and user overrides
 */
export function calculateRecommendedWeight(
  exercise: ExerciseDefinition,
  historyPerformance?: {
    weight: number;
    reps: number;
    difficulty: DifficultyRating;
    painReported?: boolean;
  },
  userUnit: 'lb' | 'kg' = 'lb',
  isReducedLoadToday: boolean = false
): number {
  let baseWeight = exercise.defaultWeightLb;

  if (historyPerformance) {
    baseWeight = historyPerformance.weight;

    if (historyPerformance.painReported) {
      baseWeight = Math.max(0, Math.round(baseWeight * 0.7));
    } else if (historyPerformance.difficulty === 'too_easy') {
      // Conservative progression: +5 lb for compounds, +2.5 lb for accessories
      const increment = exercise.pattern === 'squat' || exercise.pattern === 'hinge' ? 5 : 2.5;
      baseWeight += increment;
    } else if (historyPerformance.difficulty === 'just_right') {
      // Small micro-load or maintain
      baseWeight = historyPerformance.weight;
    } else if (historyPerformance.difficulty === 'hard') {
      // Consolidate current load to build technical mastery
      baseWeight = historyPerformance.weight;
    } else if (historyPerformance.difficulty === 'too_hard') {
      // Reduce by 10-15% for recovery and form preservation
      baseWeight = Math.max(0, Math.round(baseWeight * 0.85 / 2.5) * 2.5);
    }
  }

  if (isReducedLoadToday) {
    // Deload / practice later today: trim load ~15-20% to avoid CNS and muscle fatigue
    baseWeight = Math.round((baseWeight * 0.82) / 2.5) * 2.5;
  }

  if (userUnit === 'kg') {
    return Math.round((baseWeight * 0.453592) * 2) / 2;
  }
  return baseWeight;
}

/**
 * Generate in-depth AI Summary for an exercise explaining how to do it, what it exercises,
 * and WHY this exact weight amount is selected to prevent injury and maximize hypertrophy gains.
 */
export function generateExerciseAISummary(
  exercise: ExerciseDefinition,
  recommendedWeight: number,
  weightUnit: 'lb' | 'kg',
  user: UserProfile,
  previousDifficulty?: DifficultyRating,
  hasPracticeLater?: boolean
): AIExerciseSummary {
  const isBeginner = user.experienceLevel === 'beginner';
  let weightRationale = '';
  let hypertrophyMechanism = '';
  let injuryPreventionFocus = '';

  if (recommendedWeight === 0) {
    weightRationale = `Prescribed as bodyweight load (${exercise.defaultReps} reps). Master the eccentric tempo and full range of motion before adding external resistance.`;
    hypertrophyMechanism = `${exercise.hypertrophyFocus} At this bodyweight stage, maximizing the mind-muscle connection and taking repetitions within 1-2 reps of technical failure maximizes sarcoplasmic and myofibrillar hypertrophy.`;
    injuryPreventionFocus = `${exercise.injuryPreventionNote} Without external compressive loading, you build connective tissue resilience, ligament tensile strength, and movement autonomy safely.`;
  } else {
    const practiceContext = hasPracticeLater
      ? ' Modulated down slightly (~15-20%) because you have practice later today to keep RPE at 6-7, preserving energy and avoiding hamstring/quad tightness on the field.'
      : '';

    const progressionContext = previousDifficulty === 'too_easy'
      ? ' Increased by a conservative increment following your previous "Too Easy" feedback.'
      : previousDifficulty === 'too_hard'
      ? ' Adjusted downward to ensure you maintain strict bar path and prevent compensations.'
      : ' Matched to your established working baseline to build volume tolerance.';

    weightRationale = `Targeted working load: ${recommendedWeight} ${weightUnit}.${progressionContext}${practiceContext}`;
    hypertrophyMechanism = `${exercise.hypertrophyFocus} This load recruits high-threshold motor units (Henneman's size principle) while allowing 8-12 repetitions in the hypertrophy sweet spot (0-3 RIR), ensuring maximum mechanical tension without excessive systemic fatigue.`;
    injuryPreventionFocus = `${exercise.injuryPreventionNote} The weight is specifically calibrated to keep your joint alignment intact (preventing valgus collapse or spinal flexion) so the tension stays directly on the target muscle fibers rather than your passive joint capsules and tendons.`;
  }

  return {
    whatItIs: `${exercise.name} is a premier ${exercise.pattern.replace('_', ' ')} movement designed to train ${exercise.primaryMuscles.join(' and ')}.`,
    howToDoIt: exercise.instructions,
    whatItExercises: {
      primary: exercise.primaryMuscles,
      secondary: exercise.secondaryMuscles,
      movementPattern: exercise.pattern.replace('_', ' ').toUpperCase()
    },
    whyThisWeight: {
      weightRationale,
      hypertrophyMechanism,
      injuryPreventionFocus,
      progressionContext: previousDifficulty ? `Previous session felt "${previousDifficulty.replace('_', ' ')}"` : 'Initial calibrated starting baseline'
    }
  };
}

/**
 * Generate Daily Workout Plan with deep practice & upcoming game awareness
 */
export function generateLocalWorkoutPlan(
  user: UserProfile,
  readiness: DailyReadiness,
  scheduledEvents: ScheduledEvent[] = [],
  exerciseHistory: Record<string, { weight: number; reps: number; difficulty: DifficultyRating; painReported?: boolean }> = {},
  dateOrSchoolLog?: string | SchoolWorkoutLog | null,
  maybeSchoolLog?: SchoolWorkoutLog | null
): WorkoutPlan {
  const dateStr = typeof dateOrSchoolLog === 'string' ? dateOrSchoolLog : getTodayDateString();
  const schoolLog = (typeof dateOrSchoolLog === 'object' && dateOrSchoolLog !== null ? dateOrSchoolLog : maybeSchoolLog) || null;
  const available = getAvailableExercises(user);
  const time = readiness.availableMinutes || 45;

  // School lift & soreness contextual flags
  const hadSchoolLift = Boolean(schoolLog?.hadWeightliftingClass);
  const mainLiftName = schoolLog?.mainLiftExercise?.trim() || '';
  const soreAreas = (schoolLog?.bodyPartsSoreOrWorked || []).map((s) => s.toLowerCase());
  const soreLegs =
    soreAreas.some((s) => s.includes('quad') || s.includes('knee') || s.includes('leg') || s.includes('hamstring') || s.includes('glute')) ||
    mainLiftName.toLowerCase().includes('squat') ||
    mainLiftName.toLowerCase().includes('leg press') ||
    mainLiftName.toLowerCase().includes('clean');
  const soreUpper =
    soreAreas.some((s) => s.includes('chest') || s.includes('shoulder') || s.includes('bench') || s.includes('tricep') || s.includes('arm')) ||
    mainLiftName.toLowerCase().includes('bench');
  const hadToughPractice = Boolean(
    schoolLog?.hadPractice &&
    (schoolLog.practiceIntensity === 'hard_scrimmage' || schoolLog.practiceIntensity === 'exhausting_sprints')
  );

  // Check for practice later today
  const practiceLater = readiness.practiceLaterToday ||
    Boolean(schoolLog?.hadPractice) ||
    scheduledEvents.some(
      (e) => e.date === dateStr && (e.type === 'practice' || e.type === 'scrimmage') && (e.timeOfDay === 'later_today' || e.timeOfDay === 'afternoon' || e.timeOfDay === 'evening')
    );

  // Check for upcoming game in next 0-3 days
  let daysToGame: number | null = null;
  let upcomingGameEvent: ScheduledEvent | null = null;

  for (const event of scheduledEvents) {
    if (event.type === 'game' || event.type === 'tournament') {
      const diffDays = getDaysDifference(event.date, dateStr);
      if (diffDays >= 0 && diffDays <= 4) {
        if (daysToGame === null || diffDays < daysToGame) {
          daysToGame = diffDays;
          upcomingGameEvent = event;
        }
      }
    }
  }

  // Determine workout style and volume
  let workoutTitle = 'Full Body Hypertrophy & Athletic Foundation';
  let goal = user.goals[0] || 'Hypertrophy & Strength';
  let readinessStatus: WorkoutPlan['readinessStatus'] = 'High Readiness';
  let reasoning = 'Balanced full-body stimulus targeted for progressive overload and joint stability.';
  let upcomingGameContext: string | undefined = undefined;
  let practiceContext: string | undefined = undefined;

  // Adaptive logic for school weightlifting class & soreness
  if (hadSchoolLift && soreLegs) {
    workoutTitle = 'Upper Body & Core Power (School Squats / Legs Protected)';
    readinessStatus = 'Moderate Readiness';
    goal = 'Upper body hypertrophy while resting fatigue from school lift';
    reasoning = `Calibrated for your ${schoolLog?.classType || 'school basketball weightlifting class'}. Because you performed ${mainLiftName || 'squats'} and have sore ${schoolLog?.bodyPartsSoreOrWorked?.join(', ') || 'legs'}, today's workout completely deloads your quads and knees while focusing on posture, back thickness, chest mechanics, and anti-rotational core.`;
  } else if (hadSchoolLift && soreUpper) {
    workoutTitle = 'Lower Chain Power & Stability (School Upper Work Deloaded)';
    readinessStatus = 'Moderate Readiness';
    goal = 'Lower body athletic power while resting chest/shoulders';
    reasoning = `Adjusted based on your school weightlifting class where you performed ${mainLiftName || 'bench press'}. Sparing your pressing muscles and sore ${schoolLog?.bodyPartsSoreOrWorked?.join(', ') || 'upper body'} while targeting hips, glutes, hamstrings, and trunk stiffness.`;
  } else if (daysToGame === 0) {
    workoutTitle = 'Game Day Pre-Activation & Mobility Primer';
    readinessStatus = 'Active Recovery';
    goal = 'Neuromuscular priming & joint lubrication';
    reasoning = `You have a ${upcomingGameEvent?.sport || user.sport || 'game'} today! We have stripped heavy eccentric loads and scheduled a rapid CNS neural activation and mobility primer so your legs are fast and fresh.`;
    upcomingGameContext = `Game scheduled today! Heavy lifting paused to peak in-game performance.`;
  } else if (daysToGame === 1) {
    workoutTitle = 'Pre-Game Primer & Core Stability';
    readinessStatus = 'Deload / Reduced';
    goal = 'Fast twitch activation without soreness (DOMS)';
    reasoning = `Game is tomorrow! Today's session is dialed down by 30% to prevent Delayed Onset Muscle Soreness (DOMS) while keeping your hips, glutes, and shoulders explosive and firing.`;
    upcomingGameContext = `Game tomorrow (${upcomingGameEvent?.sport || user.sport}). Keeping volume low to avoid heavy fatigue.`;
  } else if (daysToGame === 2) {
    workoutTitle = 'Pre-Game Taper & Upper Body Hypertrophy';
    readinessStatus = 'Moderate Readiness';
    reasoning = `With a game 2 days away, we prioritize upper body strength and core rotational stability, resting your primary sprinting muscles so you are 100% fresh for competition.`;
    upcomingGameContext = `Game in 2 days. Shifting heavy lower body work to post-game recovery cycles.`;
  } else if (hadToughPractice || practiceLater) {
    workoutTitle = 'Upper Body & Core Primer (Practice Context)';
    readinessStatus = 'Moderate Readiness';
    goal = 'Upper body hypertrophy without fatiguing legs for practice';
    reasoning = `Adjusted for sports practice. Eliminates heavy quad and hamstring fatigue and focuses on upper body pressing, back posture, and core control so your legs remain springy and fast.`;
    practiceContext = 'Tailored light-to-moderate volume because you have sports practice.';
  } else if (readiness.energyLevel === 'tired' || readiness.energyLevel === 'very_tired' || readiness.sorenessLevel === 'high') {
    workoutTitle = 'Deload & Joint Longevity Session';
    readinessStatus = 'Deload / Reduced';
    reasoning = `Your check-in reported high fatigue / soreness. We reduced overall volume and lowered recommended weights to prioritize joint recovery while maintaining consistency.`;
  }

  // Select appropriate exercises
  let targetCount = 5;
  if (time >= 75) targetCount = 8;
  else if (time >= 60) targetCount = 7;
  else if (time >= 45) targetCount = 6;
  else if (time >= 35) targetCount = 5;
  else if (time >= 25) targetCount = 4;
  else targetCount = 3;

  const selectedDefs: ExerciseDefinition[] = [];

  // If sore legs from school lift or game day, select upper body + core only
  if ((hadSchoolLift && soreLegs) || daysToGame === 0) {
    const upperIds = [
      'db-flat-bench-press',
      'db-single-arm-row',
      'push-up',
      'lat-pulldown',
      'paloff-press',
      'db-lateral-raise',
      'deadbug',
      'db-bicep-curl'
    ];
    for (const id of upperIds) {
      if (selectedDefs.length >= targetCount) break;
      const found = available.find((e) => e.id === id);
      if (found && !selectedDefs.includes(found)) selectedDefs.push(found);
    }
  } else if (hadSchoolLift && soreUpper) {
    // Sparing upper body, selecting lower body & core
    const lowerIds = [
      'db-goblet-squat',
      'db-romanian-deadlift',
      'db-bulgarian-split-squat',
      'glute-bridge',
      'paloff-press',
      'deadbug'
    ];
    for (const id of lowerIds) {
      if (selectedDefs.length >= targetCount) break;
      const found = available.find((e) => e.id === id);
      if (found && !selectedDefs.includes(found)) selectedDefs.push(found);
    }
  } else if (practiceLater || daysToGame === 1 || daysToGame === 2) {
    // Upper push, upper pull, core, light accessory
    const upperIds = [
      'db-flat-bench-press',
      'push-up',
      'db-single-arm-row',
      'lat-pulldown',
      'deadbug',
      'paloff-press',
      'db-lateral-raise',
      'db-bicep-curl'
    ];
    for (const id of upperIds) {
      if (selectedDefs.length >= targetCount) break;
      const found = available.find((e) => e.id === id);
      if (found && !selectedDefs.includes(found)) selectedDefs.push(found);
    }
  } else {
    // Standard balanced split: Squat/Lunge -> Hinge -> Push -> Pull -> Core/Accessory
    const patterns: ExerciseDefinition['pattern'][] = ['squat', 'hinge', 'push_horizontal', 'pull_horizontal', 'core', 'unilateral_leg'];
    for (const pat of patterns) {
      if (selectedDefs.length >= targetCount) break;
      const match = available.find((e) => e.pattern === pat && !selectedDefs.includes(e));
      if (match) selectedDefs.push(match);
    }
  }

  // Fill in any remaining slots if needed
  for (const ex of available) {
    if (selectedDefs.length >= targetCount) break;
    if (!selectedDefs.includes(ex)) {
      selectedDefs.push(ex);
    }
  }

  // Build planned exercise objects with AI summary & weight recommendations
  const plannedExercises: PlannedExercise[] = selectedDefs.map((def, idx) => {
    const hist = exerciseHistory[def.id];
    const isReduced = practiceLater || daysToGame === 0 || daysToGame === 1;
    const recWeight = calculateRecommendedWeight(def, hist, user.weightUnit, isReduced);

    // Adjusted sets/reps based on time and practice
    let sets = def.defaultSets;
    let reps = def.defaultReps;
    if (time <= 20) {
      sets = 2;
    } else if (time >= 45 && idx < 4) {
      sets = 4;
    } else {
      sets = 3;
    }
    if (practiceLater) sets = Math.min(sets, 3);
    if (daysToGame === 0) {
      sets = 2;
      reps = 8;
    }

    const aiSummary = generateExerciseAISummary(
      def,
      recWeight,
      user.weightUnit,
      user,
      hist?.difficulty,
      practiceLater
    );

    const altDef = def.alternativeExerciseId
      ? available.find((e) => e.id === def.alternativeExerciseId)
      : undefined;

    return {
      id: `pe-${Date.now()}-${idx}`,
      exerciseId: def.id,
      name: def.name,
      sets,
      reps,
      recommendedWeight: recWeight,
      actualWeightUsed: recWeight,
      weightUnit: user.weightUnit,
      restSeconds: practiceLater ? 60 : def.restSeconds,
      targetMuscles: def.primaryMuscles,
      completed: false,
      completedSets: [],
      previousPerformance: hist ? {
        weight: hist.weight,
        reps: hist.reps,
        difficulty: hist.difficulty,
        date: 'Last Session'
      } : undefined,
      alternative: altDef?.name,
      alternativeId: altDef?.id,
      notes: def.techniqueCues[0],
      aiSummary
    };
  });

  const equipmentSet = new Set<string>();
  for (const ex of selectedDefs) {
    for (const eq of ex.equipmentRequired) {
      if (eq !== 'bodyweight') equipmentSet.add(eq);
    }
  }

  return {
    id: `workout-${Date.now()}`,
    date: dateStr,
    workoutTitle,
    goal,
    status: 'planned',
    estimatedMinutes: Math.min(time, plannedExercises.length * 7 + 5),
    readinessStatus,
    reasoning,
    practiceLaterToday: practiceLater,
    practiceContext,
    upcomingGameContext,
    equipmentNeeded: Array.from(equipmentSet),
    exercises: plannedExercises
  };
}

/**
 * Generate Morning Mobility Routine customized to user's sport and soreness
 */
export function generateMorningMobilityRoutine(
  user: UserProfile,
  readiness?: DailyReadiness,
  durationMinutes: number = 10
): MorningMobilityRoutine {
  const isSoccerOrRunning = user.sport?.toLowerCase().includes('soccer') || user.sport?.toLowerCase().includes('run');
  const isBasketball = user.sport?.toLowerCase().includes('basketball');

  let title = 'Morning Joint Awakening & Spine Decompression';
  let rationale = 'Gently awakens the central nervous system, lubricates joint capsules, and relieves morning tissue stiffness without generating fatigue.';

  if (isSoccerOrRunning) {
    title = 'Morning Hip Opener & Ankle Mobility Flow';
    rationale = 'Targets hip capsule rotational range, hamstring compliance, and ankle dorsiflexion for soccer/running athletes.';
  } else if (isBasketball) {
    title = 'Ankle, Hip & Thoracic Mobility Primer';
    rationale = 'Promotes rotational mobility, deep squat hip clearance, and ankle durability for jumping and rapid court cuts.';
  }

  // Pick 3-5 exercises to fit chosen duration
  const count = durationMinutes <= 5 ? 3 : durationMinutes <= 10 ? 4 : 5;
  const exercises = MORNING_MOBILITY_LIBRARY.slice(0, count);

  return {
    id: `mobility-${Date.now()}`,
    date: getTodayDateString(),
    title,
    durationMinutes,
    completed: false,
    rationale,
    isAiGenerated: false,
    exercises
  };
}

/**
 * Generate Nightly Restorative Stretching Routine customized to user's sport, today's workout, and soreness
 */
export function generateNightlyStretchingRoutine(
  user: UserProfile,
  readiness?: DailyReadiness,
  durationMinutes: number = 10,
  todayWorkout?: WorkoutPlan
): NightlyStretchingRoutine {
  const isSoccerOrRunning = user.sport?.toLowerCase().includes('soccer') || user.sport?.toLowerCase().includes('run');
  const isBasketball = user.sport?.toLowerCase().includes('basketball');

  let title = 'Nightly Bedtime Down-Regulation & Spine Decompression';
  let rationale = 'Gently lowers heart rate, drains metabolic waste from legs, and releases spinal tension from today’s workout before sleep.';

  if (isSoccerOrRunning) {
    title = 'Bedtime Hip & Posterior Chain Recovery Flow';
    rationale = 'Decompresses hamstrings, calves, and hip flexors, down-regulating the central nervous system after high running and training output.';
  } else if (isBasketball) {
    title = 'Bedtime Ankle, Patellar & Lower Back Release';
    rationale = 'Relieves high joint impacts from court cuts and landings, promoting deep restorative REM sleep and muscular repair.';
  } else if (todayWorkout?.workoutTitle?.toLowerCase().includes('upper')) {
    title = 'Bedtime Upper Body & Cervical Spine Release';
    rationale = 'Releases tension from chest, shoulders, and lat engagement, opening thoracic posture for deep restorative breathing.';
  }

  const count = durationMinutes <= 5 ? 3 : durationMinutes <= 10 ? 4 : 5;
  const exercises = NIGHTLY_STRETCHING_LIBRARY.slice(0, count);

  return {
    id: `nightly-${Date.now()}`,
    date: getTodayDateString(),
    title,
    durationMinutes,
    completed: false,
    rationale,
    isAiGenerated: false,
    exercises
  };
}

/**
 * Swap an individual exercise with a safe alternative from the database
 */
export function swapExercise(workout: WorkoutPlan, exerciseId: string, user: UserProfile): WorkoutPlan {
  const available = getAvailableExercises(user);
  const currentIds = new Set(workout.exercises.map((e) => e.exerciseId));
  const alternatives = available.filter((a) => !currentIds.has(a.id));

  if (alternatives.length === 0) return workout;

  const targetIdx = workout.exercises.findIndex((e) => e.exerciseId === exerciseId);
  if (targetIdx === -1) return workout;

  const oldEx = workout.exercises[targetIdx];
  const oldDef = available.find((a) => a.id === oldEx.exerciseId);

  // Try to find matching movement pattern or muscle
  const replacementDef =
    (oldDef && alternatives.find((a) => a.pattern === oldDef.pattern)) ||
    alternatives.find((a) => a.primaryMuscles.some((m) => oldEx.targetMuscles.includes(m))) ||
    alternatives[0];

  const newPlanned: PlannedExercise = {
    id: `plan-ex-${Date.now()}`,
    exerciseId: replacementDef.id,
    name: replacementDef.name,
    targetMuscles: replacementDef.primaryMuscles,
    sets: oldEx.sets,
    reps: replacementDef.defaultReps,
    recommendedWeight: oldEx.recommendedWeight,
    weightUnit: user.weightUnit,
    restSeconds: replacementDef.restSeconds,
    notes: replacementDef.techniqueCues[0],
    completed: false,
    aiSummary: {
      whatItIs: `${replacementDef.name} swapped in as an athletic alternative targeting ${replacementDef.primaryMuscles.join(', ')}.`,
      whatItExercises: {
        primary: replacementDef.primaryMuscles,
        secondary: replacementDef.secondaryMuscles,
        movementPattern: replacementDef.pattern.replace('_', ' ').toUpperCase()
      },
      howToDoIt: replacementDef.instructions,
      whyThisWeight: {
        weightRationale: `Selected to match your working baseline without overloading joint capsules.`,
        hypertrophyMechanism: `Stimulates progressive overload with high motor unit activation while keeping reps in reserve.`,
        injuryPreventionFocus: `Alternative exercise chosen to protect vulnerable joints and prevent excessive fatigue.`,
        progressionContext: `Preserves workout momentum.`
      }
    }
  };

  const updatedExercises = [...workout.exercises];
  updatedExercises[targetIdx] = newPlanned;

  return {
    ...workout,
    exercises: updatedExercises
  };
}

/**
 * Generate daily at-home plyometrics routine (zero or minimal equipment)
 * Calibrated for vertical power, ankle stiffness, and reactive elasticity
 */
export function generateDailyPlyometricsRoutine(
  user: UserProfile,
  readiness: DailyReadiness,
  schoolLog?: SchoolWorkoutLog | null,
  durationMinutes: number = 12
): PlyometricsRoutine {
  const isBasketball =
    user.sport?.toLowerCase().includes('basketball') ||
    schoolLog?.practiceSport?.toLowerCase().includes('basketball') ||
    Boolean(schoolLog?.classType?.toLowerCase().includes('basketball'));

  const hadLegLifting =
    Boolean(schoolLog?.hadWeightliftingClass) &&
    (Boolean(schoolLog?.mainLiftExercise?.toLowerCase().includes('squat')) ||
      Boolean(schoolLog?.mainLiftExercise?.toLowerCase().includes('clean')) ||
      Boolean(schoolLog?.mainLiftExercise?.toLowerCase().includes('deadlift')) ||
      Boolean(schoolLog?.bodyPartsSoreOrWorked?.some((p) => p.toLowerCase().includes('quad') || p.toLowerCase().includes('knee') || p.toLowerCase().includes('leg'))));

  const hadToughPractice = Boolean(
    schoolLog?.hadPractice &&
      (schoolLog.practiceIntensity === 'hard_scrimmage' || schoolLog.practiceIntensity === 'exhausting_sprints')
  );

  let title = 'At-Home Vertical & Reactivity Plyometrics';
  let targetFocus = 'Elastic Tendon Recoil & First-Step Explosiveness';
  let rationale =
    'Zero-equipment plyometrics designed for home floors to build vertical jump height, ankle stiffness, and reactive power.';
  let exercises: PlyometricsExercise[] = [];

  if (hadLegLifting || hadToughPractice) {
    title = 'At-Home Ankle Stiffness & Submaximal Reactivity';
    targetFocus = 'Submaximal Tendon Elasticity (Leg Fatigue Protected)';
    rationale = `Tailored because you had ${schoolLog?.classType || 'school weightlifting'} / practice earlier. Low-amplitude hops build reactive ankle stiffness and tendon health without deep knee fatigue.`;
    exercises = [
      {
        name: 'Double Leg Pogo Hops (Ankle Stiffness)',
        sets: 3,
        repsOrDuration: '15-20 hops',
        restSeconds: 45,
        instructions:
          'Bounce rapidly on the balls of your feet with stiff ankles and minimal knee bend. Treat the floor like a hot stove.',
        coachingCue: 'Stiff ankle joint, quick contact time. Zero heel collapse.',
        targetFocus: 'Achilles & Ankle Elastic Energy Return',
        intensity: 'low',
        equipmentNeeded: 'none'
      },
      {
        name: 'Lateral Line Fast Taps (Home Floor/Tape)',
        sets: 3,
        repsOrDuration: '20 seconds',
        restSeconds: 45,
        instructions:
          'Pick a seam or line on your floor. Rapidly hop side-to-side across the line with light, rhythmic foot strikes.',
        coachingCue: 'Keep center of mass quiet, quick feet under your hips.',
        targetFocus: 'Lateral Agility & Peroneal Stability',
        intensity: 'low',
        equipmentNeeded: 'none'
      },
      {
        name: 'Snap Down to Athletic Deceleration Hold',
        sets: 3,
        repsOrDuration: '5 reps (3s hold)',
        restSeconds: 45,
        instructions:
          'Reach high on toes with arms overhead, then rapidly snap hips back and drop into a rock-solid athletic defensive stance.',
        coachingCue: 'Absorb force silently through hips and glutes, not knees.',
        targetFocus: 'Eccentric Force Braking & Knee Protection',
        intensity: 'moderate',
        equipmentNeeded: 'none'
      },
      {
        name: 'Explosive Hands-Elevated Push-Offs (Bed, Couch, or Chair)',
        sets: 3,
        repsOrDuration: '6-8 reps',
        restSeconds: 60,
        instructions:
          'Hands on edge of bed or couch. Lower with control, then press explosively so your hands leave the surface for 1 inch.',
        coachingCue: 'High rate of force development for upper body pushing without leg fatigue.',
        targetFocus: 'Upper Body Explosive Power',
        intensity: 'moderate',
        equipmentNeeded: 'low_step_or_floor'
      }
    ];
  } else {
    // Normal / Fresh athletic session
    title = isBasketball
      ? 'Basketball Vertical Jump & Deceleration Plyometrics'
      : 'At-Home Athletic Power & Multi-Directional Plyos';
    targetFocus = 'Maximum Rate of Force Development & Vertical Spring';
    rationale =
      'High-yield bodyweight plyometrics to increase vertical takeoff velocity, reactive court speed, and landing joint protection.';
    exercises = [
      {
        name: 'Pogo Hops with Max Height Extension',
        sets: 3,
        repsOrDuration: '10 quick + 2 max height',
        restSeconds: 60,
        instructions:
          'Perform 10 rapid ankle stiffness pogo hops, then immediately load hips and launch into 2 maximum-effort vertical ceiling reaches.',
        coachingCue: 'Violent triple extension at ankles, knees, and hips.',
        targetFocus: 'Ankle Stiffness to Max Vertical Transfer',
        intensity: 'high',
        equipmentNeeded: 'none'
      },
      {
        name: 'Broad Jump to Stick (Horizontal Power)',
        sets: 3,
        repsOrDuration: '4 reps (reset each rep)',
        restSeconds: 60,
        instructions:
          'From standing athletic stance, swing arms back, hinge, and explode forward for maximum distance. Stick the landing with knees tracked over toes.',
        coachingCue: 'Explode horizontally like a coiled spring, freeze landing for 2 seconds.',
        targetFocus: 'Horizontal Force Production & Landing Mechanics',
        intensity: 'high',
        equipmentNeeded: 'none'
      },
      {
        name: 'Skater Bounds with 2-Second Freeze (Lateral Court Power)',
        sets: 3,
        repsOrDuration: '4 bounds per side',
        restSeconds: 60,
        instructions:
          'Push off your right foot to bound laterally to the left. Land softly on your left foot and freeze for 2 full seconds before pushing back.',
        coachingCue: 'Load the glute medius and catch your weight without knee valgus cave.',
        targetFocus: 'Frontal Plane Deceleration & Cutting Armor',
        intensity: 'moderate',
        equipmentNeeded: 'none'
      },
      {
        name: 'Low Step or Floor Depth Drop to Vertical Re-Jump',
        sets: 3,
        repsOrDuration: '4 reps',
        restSeconds: 60,
        instructions:
          'Step off a low stair or firm surface (4-8 inches). Upon touching the floor, immediately reverse momentum and explode vertically.',
        coachingCue: 'Minimum ground contact time, imagine the floor is electric.',
        targetFocus: 'Stretch-Shortening Cycle (SSC) & Reactive Explosiveness',
        intensity: 'high',
        equipmentNeeded: 'low_step_or_floor'
      }
    ];
  }

  return {
    id: `plyo-${Date.now()}`,
    date: getTodayDateString(),
    title,
    durationMinutes,
    completed: false,
    rationale,
    isAiGenerated: false,
    targetFocus,
    exercises
  };
}

export const fitnessEngine = {
  getAvailableExercises,
  calculateRecommendedWeight,
  generateExerciseAISummary,
  generateDailyWorkout: generateLocalWorkoutPlan,
  generateMorningMobility: generateMorningMobilityRoutine,
  generateNightlyStretching: generateNightlyStretchingRoutine,
  generateDailyPlyometrics: generateDailyPlyometricsRoutine,
  generateDailyPlyometricsRoutine,
  swapExercise
};

