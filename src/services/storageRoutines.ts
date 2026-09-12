import { MorningMobilityRoutine, NightlyStretchingRoutine, PlyometricsRoutine } from '../types';
import { storageService } from './storage';
import {
  generateMorningMobilityRoutine,
  generateNightlyStretchingRoutine,
  generateDailyPlyometricsRoutine,
} from './fitnessEngine';
import { getTodayDateString } from '../utils/dateUtils';

// Compatibility layer for the current storage service. These routines existed in
// the original app but were accidentally omitted from the condensed storage file.
const service = storageService as any;
const today = () => getTodayDateString();

if (!service.getMorningMobility) {
  service.getMorningMobility = (): MorningMobilityRoutine => {
    const date = today();
    try {
      const raw = localStorage.getItem('ai_coach_morning_mobility_v1');
      if (raw) {
        const routine = JSON.parse(raw) as MorningMobilityRoutine;
        if (routine?.date === date) return routine;
      }
    } catch {}
    const routine = generateMorningMobilityRoutine(service.getUserProfile(), service.getDailyReadiness(), 10);
    service.saveMorningMobility(routine);
    return routine;
  };
}

if (!service.saveMorningMobility) {
  service.saveMorningMobility = (routine: MorningMobilityRoutine): void => {
    try { localStorage.setItem('ai_coach_morning_mobility_v1', JSON.stringify(routine)); } catch {}
  };
}

if (!service.getNightlyRoutine) {
  service.getNightlyRoutine = (): NightlyStretchingRoutine => {
    const date = today();
    try {
      const raw = localStorage.getItem('ai_coach_nightly_routine_v1');
      if (raw) {
        const routine = JSON.parse(raw) as NightlyStretchingRoutine;
        if (routine?.date === date) return routine;
      }
    } catch {}
    const routine = generateNightlyStretchingRoutine(
      service.getUserProfile(),
      service.getDailyReadiness(),
      10,
      service.getTodayWorkout(),
    );
    service.saveNightlyRoutine(routine);
    return routine;
  };
}

if (!service.saveNightlyRoutine) {
  service.saveNightlyRoutine = (routine: NightlyStretchingRoutine): void => {
    try { localStorage.setItem('ai_coach_nightly_routine_v1', JSON.stringify(routine)); } catch {}
  };
}

if (!service.getPlyometricsRoutine) {
  service.getPlyometricsRoutine = (): PlyometricsRoutine => {
    const date = today();
    try {
      const raw = localStorage.getItem('lifted_plyometrics_routine_v1');
      if (raw) {
        const routine = JSON.parse(raw) as PlyometricsRoutine;
        if (routine?.date === date) return routine;
      }
    } catch {}
    const routine = generateDailyPlyometricsRoutine(
      service.getUserProfile(),
      service.getDailyReadiness(),
      service.getTodaySchoolWorkoutLog(),
      12,
    );
    service.savePlyometricsRoutine(routine);
    return routine;
  };
}

if (!service.savePlyometricsRoutine) {
  service.savePlyometricsRoutine = (routine: PlyometricsRoutine): void => {
    try { localStorage.setItem('lifted_plyometrics_routine_v1', JSON.stringify(routine)); } catch {}
  };
}
