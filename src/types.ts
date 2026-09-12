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
  name: string;
  description: string;
  aggravatingMovements?: string;
  severity: 'mild' | 'moderate' | 'severe';
  todayStatus?: 'pain_free' | 'mild_stiffness' | 'moderate_ache' | 'severe_flare';
}

export interface UserAccount {
  id: string;
  identifier: string;
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
  date: string;
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
  equipmentRequired: string[];
  difficulty: ExperienceLevel;
  instructions: string[];
  techniqueCues: string[];
  breathingCue: string;
  contraindications: string[];
  alternativeExerciseId?: string;
  hypertrophyFocus: string;
  injuryPreventionNote: string;
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
  date: string;
  energyLevel: 'great' | 'good' | 'okay' | 'tired' | 'very_tired';
  sorenessLevel: 'none' | 'mild' | 'moderate' | 'high';
  soreAreas?: string[];
  practiceEarlierToday: boolean;
  practiceLaterToday: boolean;
  practiceIntensity?: 'light' | 'moderate' | 'hard' | 'extreme';
  practiceDurationMinutes?: number;
  upcomingGameDaysAway?: number;
  availableMinutes: number;
  readinessScore: number;
  injuryStatus?: Record<string, 'pain_free' | 'mild_stiffness' | 'moderate_ache' | 'severe_flare'>;
  newPainDescription?: string;
}

export interface WorkoutPlan {
  id: string;
  date: string;
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
  bestVolume: number;
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
  repsOrDuration: string;
  restSeconds: number;
  instructions: string;
  coachingCue: string;
  targetFocus: string;
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
  date: string;
  timestamp: string;
  weightliftingDate?: string;
  practiceDate?: string;
  hadWeightliftingClass: boolean;
  classType?: string;
  mainLiftExercise?: string;
  weightClassIntensity?: 'easy' | 'moderate' | 'heavy' | 'exhausting';
  bodyPartsSoreOrWorked: string[];
  hadPractice: boolean;
  practiceSport?: string;
  practiceIntensity?: 'light_shootaround' | 'moderate' | 'hard_scrimmage' | 'exhausting_sprints';
  practiceDurationMinutes?: number;
  howHardItLeftMe: string;
  notes?: string;
}
