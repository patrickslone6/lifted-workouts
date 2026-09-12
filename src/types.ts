export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'lb' | 'kg';
export type EquipmentTier = 'full_gym' | 'home_gym' | 'minimal' | 'bodyweight';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'push_horizontal'
  | 'push_vertical'
  | 'pull_horizontal'
  | 'pull_vertical'
  | 'unilateral_leg'
  | 'carry'
  | 'core'
  | 'mobility'
  | 'power';

export type DifficultyRating =
  | 'too_easy'
  | 'easy'
  | 'just_right'
  | 'hard'
  | 'too_hard';

export interface SpecificInjury {
  id: string;
  name: string; // e.g. "Patellar Tendonitis (Left Knee)"
  description: string; // e.g. "Sharp pain when landing from jumps or deep squats"
  aggravatingMovements?: string; // e.g. "Deep knee flexion, jumping"
  severity: 'mild' | 'moderate' | 'severe';
  todayStatus?: 'pain_free' | 'mild_stiffness' | 'moderate_ache' | 'severe_flare';
}

export interface UserAccount {
  id: string;
  identifier: string; // Email or Phone number
  identifierType: 'email' | 'phone';
  name: string;
  createdAt: string;
  lastSyncedAt?: string;
}

export interface PhysicalLimitation {
  id: string;
  area: 'knee' | 'shoulder' | 'lower_back' | 'ankle' | 'wrist' | 'hip' | 'neck' | 'other';
  description: string;
  isNew: boolean;
  aggravatingMovements: string[];
  exercisesToAvoid: string[];
}

export interface ScheduledEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'practice' | 'game' | 'scrimmage' | 'tournament' | 'other_hard_activity';
  sport: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'later_today' | 'earlier_today';
  expectedIntensity: 'light' | 'moderate' | 'hard' | 'extreme';
  durationMinutes: number;
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  height: string;
  weight: string;
  experienceLevel: ExperienceLevel;
  goals: string[];
  sport: string;
  sportDetails?: {
    position?: string;
    trainingFrequency?: string;
    mainPerformanceGoals?: string;
  };
  equipmentProfile: EquipmentTier;
  availableEquipment: string[];
  weightUnit: WeightUnit;
  limitations: PhysicalLimitation[];
  specificInjuries?: SpecificInjury[];
  dislikedExercises: string[];
  favoriteExercises: string[];
  neverRecommendExercises: string[];
  preferredWorkoutDuration: number;
  onboardingCompleted: boolean;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  pattern: MovementPattern;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipmentRequired: string[]; // 'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', etc.
  difficulty: ExperienceLevel;
  instructions: string[];
  techniqueCues: string[];
  breathingCue: string;
  contraindications: string[]; // 'knee_pain', 'shoulder_overhead', etc.
  alternativeExerciseId?: string;
  hypertrophyFocus: string; // Stretch under load, mechanical tension cue
  injuryPreventionNote: string; // Joint stability, alignment, safety cue
  defaultWeightLb: number;
  defaultReps: number;
  defaultSets: number;
  restSeconds: number;
}

export interface AIExerciseSummary {
  whatItIs: string;
  howToDoIt: string[];
  whatItExercises: {
    primary: string[];
    secondary: string[];
    movementPattern: string;
  };
  whyThisWeight: {
    weightRationale: string;
    hypertrophyMechanism: string;
    injuryPreventionFocus: string;
    progressionContext: string;
  };
}

export interface PlannedExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  recommendedWeight: number;
  actualWeightUsed?: number;
  weightUnit: WeightUnit;
  restSeconds: number;
  targetMuscles: string[];
  previousPerformance?: {
    weight: number;
    reps: number;
    difficulty: DifficultyRating;
    date: string;
  };
  completed: boolean;
  completedSets?: {
    setNumber: number;
    weight: number;
    reps: number;
    completed: boolean;
  }[];
  feedbackDifficulty?: DifficultyRating;
  feedbackNote?: string;
  painReported?: boolean;
  alternative?: string;
  alternativeId?: string;
  notes?: string;
  aiSummary?: AIExerciseSummary;
}

export interface DailyReadiness {
  date: string; // YYYY-MM-DD
  energyLevel: 'great' | 'good' | 'okay' | 'tired' | 'very_tired';
  sorenessLevel: 'none' | 'mild' | 'moderate' | 'high';
  soreAreas?: string[];
  practiceEarlierToday: boolean;
  practiceLaterToday: boolean;
  practiceIntensity?: 'light' | 'moderate' | 'hard' | 'extreme';
  practiceDurationMinutes?: number;
  upcomingGameDaysAway?: number; // e.g. 0 if today, 1 if tomorrow, 2, 3...
  availableMinutes: number;
  readinessScore: number; // 1 - 10
  injuryStatus?: Record<string, 'pain_free' | 'mild_stiffness' | 'moderate_ache' | 'severe_flare'>;
  newPainDescription?: string;
}

export interface WorkoutPlan {
  id: string;
  date: string; // YYYY-MM-DD
  workoutTitle: string;
  goal: string;
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  estimatedMinutes: number;
  actualMinutes?: number;
  readinessStatus: 'High Readiness' | 'Moderate Readiness' | 'Deload / Reduced' | 'Active Recovery' | 'Rest Day';
  reasoning: string;
  practiceLaterToday: boolean;
  practiceContext?: string;
  upcomingGameContext?: string;
  injuryProtectionNotes?: string;
  isAiGenerated?: boolean;
  equipmentNeeded: string[];
  exercises: PlannedExercise[];
  completedAt?: string;
  userNotes?: string;
}

export interface MorningMobilityExercise {
  name: string;
  durationSeconds: number;
  instructions: string;
  breathingCue: string;
  targetArea: string;
  modification?: string;
}

export interface MorningMobilityRoutine {
  id: string;
  date: string;
  title: string;
  durationMinutes: number;
  completed: boolean;
  completedAt?: string;
  rationale: string;
  isAiGenerated?: boolean;
  exercises: MorningMobilityExercise[];
}

export interface NightlyStretchingExercise {
  name: string;
  durationSeconds: number;
  instructions: string;
  breathingCue: string;
  targetArea: string;
  modification?: string;
}

export interface NightlyStretchingRoutine {
  id: string;
  date: string;
  title: string;
  durationMinutes: number;
  completed: boolean;
  completedAt?: string;
  rationale: string;
  isAiGenerated?: boolean;
  exercises: NightlyStretchingExercise[];
}

export interface ExerciseHistoryRecord {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  weightUnit: WeightUnit;
  difficulty: DifficultyRating;
  painReported: boolean;
  notes?: string;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  heaviestWeight: number;
  repsAtHeaviest: number;
  weightUnit: WeightUnit;
  dateAchieved: string;
  bestVolume: number; // weight * reps * sets
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface PlyometricsExercise {
  name: string;
  sets: number;
  repsOrDuration: string; // e.g. "8 jumps", "10 hops per leg", "25s"
  restSeconds: number;
  instructions: string;
  coachingCue: string;
  targetFocus: string; // e.g. "Ankle Stiffness & Reactivity", "Vertical Power", "Deceleration"
  intensity: 'low' | 'moderate' | 'high';
  equipmentNeeded: 'none' | 'small_space' | 'low_step_or_floor';
}

export interface PlyometricsRoutine {
  id: string;
  date: string;
  title: string;
  durationMinutes: number;
  completed: boolean;
  completedAt?: string;
  rationale: string;
  isAiGenerated?: boolean;
  targetFocus: string;
  exercises: PlyometricsExercise[];
}

export interface SchoolWorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  hadWeightliftingClass: boolean;
  classType?: string; // e.g. "Basketball Weightlifting Class"
  mainLiftExercise?: string; // e.g. "Back Squat", "Bench Press", "Trap Bar Deadlift", "Power Clean"
  weightClassIntensity?: 'easy' | 'moderate' | 'heavy' | 'exhausting';
  bodyPartsSoreOrWorked: string[]; // e.g. ["Quads", "Lower Back", "Knees", "Hamstrings"]
  hadPractice: boolean;
  practiceSport?: string; // e.g. "Basketball"
  practiceIntensity?: 'light_shootaround' | 'moderate' | 'hard_scrimmage' | 'exhausting_sprints';
  practiceDurationMinutes?: number;
  howHardItLeftMe: string; // e.g. "Legs feel heavy, upper body fresh"
  notes?: string;
}

