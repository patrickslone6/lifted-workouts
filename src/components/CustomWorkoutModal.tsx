import React, { useState } from 'react';
import { PlannedExercise, UserProfile, WorkoutPlan } from '../types';
import { EXERCISE_DATABASE } from '../data/exerciseDatabase';
import { getExerciseProgression, ExerciseProgressionInfo } from '../utils/exerciseProgression';
import { getTodayDateString } from '../utils/dateUtils';
import {
  X,
  Plus,
  Trash2,
  Play,
  Bookmark,
  Check,
  ChevronUp,
  ChevronDown,
  Search,
  Dumbbell,
  Clock,
  Sparkles,
  TrendingUp,
  History,
  FolderOpen
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  workoutHistory: WorkoutPlan[];
  savedTemplates?: WorkoutPlan[];
  onSaveWorkout: (workout: WorkoutPlan, startImmediately: boolean) => void;
  onSaveTemplate?: (template: WorkoutPlan) => void;
}

const PRESET_SPLITS = [
  {
    name: 'Push Day (Chest, Shoulders, Triceps)',
    goal: 'Hypertrophy & Upper Body Pressing',
    duration: 45,
    exercises: ['db-flat-bench-press', 'db-seated-shoulder-press', 'db-incline-press', 'bodyweight-pushup']
  },
  {
    name: 'Pull Day (Back & Biceps)',
    goal: 'Posterior Chain & Pulling Strength',
    duration: 45,
    exercises: ['db-single-arm-row', 'db-chest-supported-row', 'bodyweight-pullup', 'db-bicep-curl']
  },
  {
    name: 'Leg Hypertrophy & Knee Shield',
    goal: 'Quad, Glute & Knee Tendon Strength',
    duration: 40,
    exercises: ['db-goblet-squat', 'db-romanian-deadlift', 'db-bulgarian-split-squat', 'bw-isometric-wall-sit']
  },
  {
    name: 'Upper Body Power & Core',
    goal: 'Athletic Upper Body & Core Bracing',
    duration: 35,
    exercises: ['db-flat-bench-press', 'db-single-arm-row', 'db-kneeling-pallof-press', 'side-plank-hold']
  }
];

export const CustomWorkoutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  workoutHistory,
  savedTemplates = [],
  onSaveWorkout,
  onSaveTemplate
}) => {
  const [workoutTitle, setWorkoutTitle] = useState('Custom Workout');
  const [goal, setGoal] = useState('Hypertrophy & Strength');
  const [estimatedMinutes, setEstimatedMinutes] = useState(40);
  const [exercises, setExercises] = useState<PlannedExercise[]>([]);

  // Exercise picker state
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customTargetMuscles, setCustomTargetMuscles] = useState('');

  if (!isOpen) return null;

  // Filter available exercises from catalog
  const filteredCatalog = EXERCISE_DATABASE.filter((ex) => {
    const matchesQuery =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.primaryMuscles.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'legs') return ex.pattern === 'squat' || ex.pattern === 'hinge' || ex.pattern === 'unilateral_leg';
    if (selectedCategory === 'chest') return ex.pattern === 'push_horizontal';
    if (selectedCategory === 'back') return ex.pattern === 'pull_horizontal' || ex.pattern === 'pull_vertical';
    if (selectedCategory === 'shoulders') return ex.pattern === 'push_vertical';
    if (selectedCategory === 'core') return ex.pattern === 'core';
    return true;
  });

  const loadPreset = (preset: (typeof PRESET_SPLITS)[0]) => {
    setWorkoutTitle(preset.name);
    setGoal(preset.goal);
    setEstimatedMinutes(preset.duration);

    const planned: PlannedExercise[] = preset.exercises.map((id, idx) => {
      const dbEx = EXERCISE_DATABASE.find((e) => e.id === id);
      const prog = getExerciseProgression(dbEx?.name || id, workoutHistory);
      const startWeight = prog.lastWeight !== null ? prog.lastWeight : (dbEx?.defaultWeightLb || 20);

      return {
        id: `cust-ex-${Date.now()}-${idx}`,
        exerciseId: id,
        name: dbEx?.name || id,
        sets: dbEx?.defaultSets || 3,
        reps: dbEx?.defaultReps || 10,
        recommendedWeight: startWeight,
        weightUnit: user.weightUnit || 'lb',
        restSeconds: dbEx?.restSeconds || 60,
        targetMuscles: dbEx?.primaryMuscles || ['General Strength'],
        completed: false,
        completedSets: Array.from({ length: dbEx?.defaultSets || 3 }).map((_, sIdx) => ({
          setNumber: sIdx + 1,
          weight: startWeight,
          reps: dbEx?.defaultReps || 10,
          completed: false
        }))
      };
    });

    setExercises(planned);
  };

  const handleAddFromCatalog = (exDef: (typeof EXERCISE_DATABASE)[0]) => {
    const prog = getExerciseProgression(exDef.name, workoutHistory);
    const startWeight = prog.lastWeight !== null ? prog.lastWeight : exDef.defaultWeightLb;

    const newEx: PlannedExercise = {
      id: `cust-ex-${Date.now()}-${exercises.length}`,
      exerciseId: exDef.id,
      name: exDef.name,
      sets: exDef.defaultSets || 3,
      reps: exDef.defaultReps || 10,
      recommendedWeight: startWeight,
      weightUnit: user.weightUnit || 'lb',
      restSeconds: exDef.restSeconds || 60,
      targetMuscles: exDef.primaryMuscles || ['Target Muscle'],
      completed: false,
      completedSets: Array.from({ length: exDef.defaultSets || 3 }).map((_, idx) => ({
        setNumber: idx + 1,
        weight: startWeight,
        reps: exDef.defaultReps || 10,
        completed: false
      }))
    };

    setExercises([...exercises, newEx]);
    setIsAddingExercise(false);
    setSearchQuery('');
  };

  const handleAddCustomExercise = () => {
    if (!customExerciseName.trim()) return;

    const prog = getExerciseProgression(customExerciseName.trim(), workoutHistory);
    const startWeight = prog.lastWeight !== null ? prog.lastWeight : 20;

    const newEx: PlannedExercise = {
      id: `cust-ex-${Date.now()}-${exercises.length}`,
      exerciseId: `custom-${Date.now()}`,
      name: customExerciseName.trim(),
      sets: 3,
      reps: 10,
      recommendedWeight: startWeight,
      weightUnit: user.weightUnit || 'lb',
      restSeconds: 60,
      targetMuscles: customTargetMuscles.trim()
        ? customTargetMuscles.split(',').map((m) => m.trim())
        : ['Target Muscle'],
      completed: false,
      completedSets: [
        { setNumber: 1, weight: startWeight, reps: 10, completed: false },
        { setNumber: 2, weight: startWeight, reps: 10, completed: false },
        { setNumber: 3, weight: startWeight, reps: 10, completed: false }
      ]
    };

    setExercises([...exercises, newEx]);
    setCustomExerciseName('');
    setCustomTargetMuscles('');
    setIsAddingExercise(false);
  };

  const updateExerciseField = (index: number, field: keyof PlannedExercise, value: any) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Update completedSets structure if sets or recommendedWeight changed
      if (field === 'sets' || field === 'recommendedWeight' || field === 'reps') {
        const numSets = field === 'sets' ? Number(value) : updated[index].sets;
        const curWeight = field === 'recommendedWeight' ? Number(value) : updated[index].recommendedWeight;
        const curReps = field === 'reps' ? Number(value) : updated[index].reps;

        updated[index].completedSets = Array.from({ length: Math.max(1, numSets) }).map((_, idx) => ({
          setNumber: idx + 1,
          weight: curWeight,
          reps: curReps,
          completed: false
        }));
      }

      return updated;
    });
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;
    const copy = [...exercises];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setExercises(copy);
  };

  const buildWorkoutObject = (): WorkoutPlan => {
    const dateStr = getTodayDateString();
    return {
      id: `custom-workout-${Date.now()}`,
      date: dateStr,
      workoutTitle: workoutTitle.trim() || 'Custom Workout',
      goal: goal.trim() || 'Hypertrophy & Strength',
      status: 'planned',
      estimatedMinutes: estimatedMinutes || 40,
      readinessStatus: 'High Readiness',
      reasoning: 'Custom athlete-curated session configured in Lifted workout builder.',
      practiceLaterToday: false,
      equipmentNeeded: ['dumbbell', 'bench'],
      exercises,
      isAiGenerated: false
    };
  };

  const handleFinish = (startNow: boolean) => {
    if (exercises.length === 0) {
      alert('Please add at least one exercise to your workout.');
      return;
    }
    const workout = buildWorkoutObject();
    onSaveWorkout(workout, startNow);
    onClose();
  };

  const handleSaveAsTemplate = () => {
    if (exercises.length === 0) {
      alert('Please add at least one exercise.');
      return;
    }
    const workout = buildWorkoutObject();
    if (onSaveTemplate) {
      onSaveTemplate(workout);
    }
    alert(`Saved "${workout.workoutTitle}" as template!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Create Custom Workout</h2>
              <p className="text-xs text-zinc-400">Build your routine • Past weights & progress saved</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
          {/* Quick presets row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Presets</span>
              {savedTemplates.length > 0 && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5" /> {savedTemplates.length} Saved Template{savedTemplates.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_SPLITS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(p)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-left transition group"
                >
                  <div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 truncate">
                    {p.name.split('(')[0]}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{p.duration} min • {p.exercises.length} moves</div>
                </button>
              ))}
            </div>
          </div>

          {/* Workout Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Workout Name</label>
              <input
                type="text"
                value={workoutTitle}
                onChange={(e) => setWorkoutTitle(e.target.value)}
                placeholder="e.g. Upper Body Strength"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Duration</label>
              <select
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={40}>40 min</option>
                <option value={50}>50 min</option>
                <option value={60}>60 min</option>
                <option value={75}>75 min</option>
              </select>
            </div>
          </div>

          {/* Exercises Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Exercises ({exercises.length})
              </span>
              <button
                onClick={() => setIsAddingExercise(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
              >
                <Plus className="w-3.5 h-3.5" /> Add Exercise
              </button>
            </div>

            {/* Exercise List */}
            {exercises.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center space-y-2">
                <Dumbbell className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-400">No exercises added yet</p>
                <p className="text-xs text-zinc-400">
                  Pick a preset above or click &quot;Add Exercise&quot; to build your workout.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exercises.map((ex, idx) => {
                  const prog = getExerciseProgression(ex.name, workoutHistory);

                  return (
                    <div
                      key={ex.id || idx}
                      className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-400">#{idx + 1}</span>
                            <span className="text-sm font-bold text-white truncate">{ex.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                              {ex.targetMuscles[0]}
                            </span>
                          </div>

                          {/* Progressive Overload & Past Weight Badge */}
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            {prog.hasDoneBefore ? (
                              <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <History className="w-3 h-3" />
                                {prog.badgeSummary}
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-400 flex items-center gap-1 bg-zinc-800/60 px-2 py-0.5 rounded-md">
                                ★ First time doing this
                              </span>
                            )}

                            {prog.weightIncreased && prog.weightIncreaseDetail && (
                              <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/25">
                                <TrendingUp className="w-3 h-3" />
                                {prog.weightIncreaseDetail}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Order & Remove controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => moveExercise(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveExercise(idx, 'down')}
                            disabled={idx === exercises.length - 1}
                            className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeExercise(idx)}
                            className="p-1 text-red-400/80 hover:text-red-300 ml-1"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sets, Reps, Weight Inputs */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/60">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-0.5">Sets</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={ex.sets}
                            onChange={(e) => updateExerciseField(idx, 'sets', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-white text-center focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-0.5">Reps</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={ex.reps}
                            onChange={(e) => updateExerciseField(idx, 'reps', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-white text-center focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-0.5">
                            Weight ({ex.weightUnit || 'lb'})
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={2.5}
                            value={ex.recommendedWeight}
                            onChange={(e) => updateExerciseField(idx, 'recommendedWeight', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-emerald-400 text-center focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Exercise Modal / Drawer */}
          {isAddingExercise && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-emerald-500/30 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Select Exercise or Add Custom</span>
                <button
                  onClick={() => setIsAddingExercise(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search catalog (e.g. bench, squat, row)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {['all', 'chest', 'back', 'legs', 'shoulders', 'core'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg capitalize font-medium shrink-0 transition ${
                      selectedCategory === cat
                        ? 'bg-emerald-500 text-black font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Exercise results list */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredCatalog.slice(0, 15).map((exDef) => {
                  const prog = getExerciseProgression(exDef.name, workoutHistory);
                  return (
                    <button
                      key={exDef.id}
                      onClick={() => handleAddFromCatalog(exDef)}
                      className="w-full p-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-emerald-500/40 text-left transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400">
                          {exDef.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span>{exDef.primaryMuscles.join(', ')}</span>
                          {prog.hasDoneBefore && (
                            <span className="text-emerald-400 font-semibold">• Past: {prog.lastWeight} lb</span>
                          )}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400" />
                    </button>
                  );
                })}
              </div>

              {/* Custom exercise creator */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-400">Can&apos;t find it? Add Custom Movement</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Exercise name (e.g. Incline Hammer Curls)"
                    value={customExerciseName}
                    onChange={(e) => setCustomExerciseName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleAddCustomExercise}
                    disabled={!customExerciseName.trim()}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500 hover:text-black text-xs font-bold text-zinc-200 transition disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-zinc-800/80 bg-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleSaveAsTemplate}
            disabled={exercises.length === 0}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Bookmark className="w-3.5 h-3.5" /> Save Template
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleFinish(false)}
              disabled={exercises.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition disabled:opacity-40"
            >
              Set as Today&apos;s Workout
            </button>

            <button
              onClick={() => handleFinish(true)}
              disabled={exercises.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Start Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
