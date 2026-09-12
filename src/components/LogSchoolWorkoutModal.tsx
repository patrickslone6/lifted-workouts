import React, { useState } from 'react';
import { SchoolWorkoutLog } from '../types';
import { getTodayDateString } from '../utils/dateUtils';
import {
  GraduationCap,
  Dumbbell,
  Activity,
  Flame,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface Props {
  existingLog?: SchoolWorkoutLog | null;
  onSave: (log: SchoolWorkoutLog) => void;
  onClose: () => void;
}

const COMMON_MAIN_LIFTS = [
  'Back Squat',
  'Bench Press',
  'Trap Bar Deadlift',
  'Power Clean',
  'Incline DB Press',
  'Leg Press',
  'Pull-ups / Chin-ups',
  'Overhead / Push Press'
];

const BODY_PARTS = [
  'Quads',
  'Knees / Patellar',
  'Lower Back',
  'Chest',
  'Shoulders',
  'Hamstrings',
  'Glutes',
  'Arms / Triceps',
  'Calves / Shins'
];

export const LogSchoolWorkoutModal: React.FC<Props> = ({ existingLog, onSave, onClose }) => {
  const [hadWeightliftingClass, setHadWeightliftingClass] = useState(
    existingLog ? existingLog.hadWeightliftingClass : true
  );
  const [classType, setClassType] = useState(
    existingLog?.classType || 'Basketball Weightlifting Class'
  );
  const [mainLiftExercise, setMainLiftExercise] = useState(
    existingLog?.mainLiftExercise || 'Back Squat'
  );
  const [customMainLift, setCustomMainLift] = useState('');
  const [weightClassIntensity, setWeightClassIntensity] = useState<
    'easy' | 'moderate' | 'heavy' | 'exhausting'
  >(existingLog?.weightClassIntensity || 'heavy');
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>(
    existingLog?.bodyPartsSoreOrWorked || ['Quads', 'Knees / Patellar']
  );

  const [hadPractice, setHadPractice] = useState(
    existingLog ? existingLog.hadPractice : true
  );
  const [practiceSport, setPracticeSport] = useState(
    existingLog?.practiceSport || 'Basketball'
  );
  const [practiceIntensity, setPracticeIntensity] = useState<
    'light_shootaround' | 'moderate' | 'hard_scrimmage' | 'exhausting_sprints'
  >(existingLog?.practiceIntensity || 'hard_scrimmage');
  const [howHardItLeftMe, setHowHardItLeftMe] = useState(
    existingLog?.howHardItLeftMe || 'Legs feel heavy from squats and defense drills'
  );

  const toggleBodyPart = (part: string) => {
    setSelectedBodyParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  };

  const handleSave = () => {
    const finalLift = customMainLift.trim() ? customMainLift.trim() : mainLiftExercise;
    const log: SchoolWorkoutLog = {
      id: existingLog?.id || `school-log-${Date.now()}`,
      date: existingLog?.date || getTodayDateString(),
      timestamp: new Date().toISOString(),
      hadWeightliftingClass,
      classType: hadWeightliftingClass ? classType : undefined,
      mainLiftExercise: hadWeightliftingClass ? finalLift : undefined,
      weightClassIntensity: hadWeightliftingClass ? weightClassIntensity : undefined,
      bodyPartsSoreOrWorked: hadWeightliftingClass ? selectedBodyParts : [],
      hadPractice,
      practiceSport: hadPractice ? practiceSport : undefined,
      practiceIntensity: hadPractice ? practiceIntensity : undefined,
      howHardItLeftMe
    };

    onSave(log);
    onClose();
  };

  return (
    <div
      id="log-school-workout-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="log-school-workout-card"
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Log School Lift & Practice</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Adaptive Memory
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                You don't need exact weights—just what you worked and what feels sore.
              </p>
            </div>
          </div>
          <button
            id="close-school-log-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: School Weightlifting Class */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">School Weightlifting Class</span>
              </div>
              <button
                id="toggle-weight-class-btn"
                type="button"
                onClick={() => setHadWeightliftingClass(!hadWeightliftingClass)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  hadWeightliftingClass
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {hadWeightliftingClass ? 'Yes, Had Class' : 'No Class Today'}
              </button>
            </div>

            {hadWeightliftingClass && (
              <div className="space-y-4 pt-2 border-t border-zinc-800/50">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                    What was the main lift exercise you remember doing?
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_MAIN_LIFTS.map((lift) => (
                      <button
                        key={lift}
                        type="button"
                        onClick={() => {
                          setMainLiftExercise(lift);
                          setCustomMainLift('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                          mainLiftExercise === lift && !customMainLift
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        {lift}
                      </button>
                    ))}
                  </div>
                  <input
                    id="custom-main-lift-input"
                    type="text"
                    placeholder="Or type custom lift (e.g. Hex Bar Jump Shrugs)..."
                    value={customMainLift}
                    onChange={(e) => setCustomMainLift(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                    What body parts feel worked or sore right now? (Multi-select)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BODY_PARTS.map((part) => {
                      const isSelected = selectedBodyParts.includes(part);
                      return (
                        <button
                          key={part}
                          type="button"
                          onClick={() => toggleBodyPart(part)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-medium'
                              : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-transparent'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-rose-400" />}
                          {part}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                    How heavy / demanding did the class feel?
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['easy', 'moderate', 'heavy', 'exhausting'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setWeightClassIntensity(level)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize text-center transition-all ${
                          weightClassIntensity === level
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Team Practice / Basketball */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Basketball / Team Practice</span>
              </div>
              <button
                id="toggle-practice-btn"
                type="button"
                onClick={() => setHadPractice(!hadPractice)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  hadPractice
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {hadPractice ? 'Yes, Had Practice' : 'No Practice'}
              </button>
            </div>

            {hadPractice && (
              <div className="space-y-4 pt-2 border-t border-zinc-800/50">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                    Practice Intensity / Format
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'light_shootaround', label: 'Light Shootaround' },
                      { id: 'moderate', label: 'Moderate Drills' },
                      { id: 'hard_scrimmage', label: 'Hard Scrimmage' },
                      { id: 'exhausting_sprints', label: 'Heavy Sprints' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setPracticeIntensity(fmt.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                          practiceIntensity === fmt.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                    How did it leave your body feeling?
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Legs feel like jelly',
                      'Knees slightly stiff',
                      'Upper body fresh, legs tired',
                      'High energy, felt explosive',
                      'General fatigue'
                    ].map((cue) => (
                      <button
                        key={cue}
                        type="button"
                        onClick={() => setHowHardItLeftMe(cue)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                          howHardItLeftMe === cue
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        {cue}
                      </button>
                    ))}
                  </div>
                  <input
                    id="how-hard-input"
                    type="text"
                    value={howHardItLeftMe}
                    onChange={(e) => setHowHardItLeftMe(e.target.value)}
                    placeholder="Describe in your own words..."
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* AI Adaptation Guarantee */}
          <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300 leading-relaxed">
              <strong>How Lifted adapts:</strong> If you did heavy squats in school weightlifting, Lifted
              deloads your quads and knees for home lifting, programs low-impact ankle stiffness plyos,
              and targets complementary upper body and restorative hip mobility.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between gap-3">
          <button
            id="cancel-school-log-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-school-log-btn"
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save & Adapt Workouts
          </button>
        </div>
      </div>
    </div>
  );
};
