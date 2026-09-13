import '../types';

declare module '../types' {
  interface WorkoutPlan {
    /** True until the athlete explicitly starts Lift for the day. */
    needsGeneration?: boolean;
  }
}
