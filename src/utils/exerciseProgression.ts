import { WorkoutPlan, PlannedExercise } from '../types';
import { formatDateDisplay } from './dateUtils';

export interface ExerciseLogEntry {
  date: string;
  weight: number;
  reps: number;
  sets: number;
  difficulty?: string;
}

export interface ExerciseProgressionInfo {
  hasDoneBefore: boolean;
  timesCompleted: number;
  lastWeight: number | null;
  lastReps: number | null;
  lastDate: string | null;
  formattedLastDate: string | null;
  maxWeight: number | null;
  maxWeightDate: string | null;
  weightIncreased: boolean;
  weightIncreaseDetail: string | null; // e.g. "Increased 20 → 25 lb (+5 lb) on Sep 4"
  badgeSummary: string; // e.g. "Logged 3x • Last: 25 lb" or "First time"
  allLogs: ExerciseLogEntry[];
}

/**
 * Normalizes an exercise name or ID for consistent matching
 */
export function normalizeExerciseKey(key: string): string {
  return (key || '')
    .toLowerCase()
    .replace(/^db-|^bb-|^barbell-|^dumbbell-/, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Computes progression and past performance history for any exercise
 * based on saved completed workout history.
 */
export function getExerciseProgression(
  exerciseKeyOrName: string,
  workoutHistory: WorkoutPlan[] = []
): ExerciseProgressionInfo {
  const normKey = normalizeExerciseKey(exerciseKeyOrName);
  if (!normKey || !workoutHistory || workoutHistory.length === 0) {
    return {
      hasDoneBefore: false,
      timesCompleted: 0,
      lastWeight: null,
      lastReps: null,
      lastDate: null,
      formattedLastDate: null,
      maxWeight: null,
      maxWeightDate: null,
      weightIncreased: false,
      weightIncreaseDetail: null,
      badgeSummary: 'First time doing this',
      allLogs: []
    };
  }

  // Find all instances of this exercise in completed workouts
  const entries: ExerciseLogEntry[] = [];

  // Sort history chronologically (oldest to newest) to detect progression
  const sorted = [...workoutHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const workout of sorted) {
    if (workout.status === 'skipped') continue;

    const matchedEx = (workout.exercises || []).find((ex) => {
      const exIdNorm = normalizeExerciseKey(ex.exerciseId);
      const exNameNorm = normalizeExerciseKey(ex.name);
      return exIdNorm === normKey || exNameNorm === normKey;
    });

    if (matchedEx) {
      // Find logged weight
      let weightUsed: number | null = null;
      let repsUsed: number = matchedEx.reps || 10;
      let completedSetsCount: number = matchedEx.sets || 3;

      if (matchedEx.completedSets && matchedEx.completedSets.length > 0) {
        const completedOnly = matchedEx.completedSets.filter((s) => s.completed !== false);
        if (completedOnly.length > 0) {
          weightUsed = Math.max(...completedOnly.map((s) => s.weight || 0));
          repsUsed = completedOnly[completedOnly.length - 1].reps || repsUsed;
          completedSetsCount = completedOnly.length;
        }
      }

      if (weightUsed === null && matchedEx.actualWeightUsed !== undefined) {
        weightUsed = matchedEx.actualWeightUsed;
      }

      if (weightUsed === null && matchedEx.recommendedWeight !== undefined) {
        weightUsed = matchedEx.recommendedWeight;
      }

      if (weightUsed !== null) {
        entries.push({
          date: workout.date,
          weight: weightUsed,
          reps: repsUsed,
          sets: completedSetsCount,
          difficulty: matchedEx.feedbackDifficulty
        });
      }
    }
  }

  if (entries.length === 0) {
    return {
      hasDoneBefore: false,
      timesCompleted: 0,
      lastWeight: null,
      lastReps: null,
      lastDate: null,
      formattedLastDate: null,
      maxWeight: null,
      maxWeightDate: null,
      weightIncreased: false,
      weightIncreaseDetail: null,
      badgeSummary: 'First time doing this',
      allLogs: []
    };
  }

  const timesCompleted = entries.length;
  const lastEntry = entries[entries.length - 1];
  const lastWeight = lastEntry.weight;
  const lastReps = lastEntry.reps;
  const lastDate = lastEntry.date;
  const formattedLastDate = formatDateDisplay(lastDate);

  // Find max weight
  let maxWeight = lastWeight;
  let maxWeightDate = lastDate;
  for (const entry of entries) {
    if (entry.weight >= maxWeight) {
      maxWeight = entry.weight;
      maxWeightDate = entry.date;
    }
  }

  // Detect if weight increased in latest sessions or along progression
  let weightIncreased = false;
  let weightIncreaseDetail: string | null = null;

  if (entries.length >= 2) {
    // Check if the most recent session was higher than the previous session
    const prevEntry = entries[entries.length - 2];
    if (lastEntry.weight > prevEntry.weight) {
      weightIncreased = true;
      const diff = lastEntry.weight - prevEntry.weight;
      weightIncreaseDetail = `Increased ${prevEntry.weight} → ${lastEntry.weight} lb (+${diff} lb) on ${formattedLastDate}`;
    } else {
      // Check if any earlier increase occurred
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].weight > entries[i - 1].weight) {
          weightIncreased = true;
          const diff = entries[i].weight - entries[i - 1].weight;
          const dateStr = formatDateDisplay(entries[i].date);
          weightIncreaseDetail = `Increased ${entries[i - 1].weight} → ${entries[i].weight} lb (+${diff} lb) on ${dateStr}`;
        }
      }
    }
  }

  let badgeSummary = `Done ${timesCompleted}x • Last: ${lastWeight} lb`;
  if (maxWeight > lastWeight) {
    badgeSummary += ` • Best: ${maxWeight} lb`;
  }

  return {
    hasDoneBefore: true,
    timesCompleted,
    lastWeight,
    lastReps,
    lastDate,
    formattedLastDate,
    maxWeight,
    maxWeightDate,
    weightIncreased,
    weightIncreaseDetail,
    badgeSummary,
    allLogs: entries
  };
}
