import React, { useState } from 'react';
import { UserProfile, ExperienceLevel, EquipmentTier } from '../types';
import { Sparkles, ArrowRight, ShieldCheck, Dumbbell, Trophy } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingModal: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('Alex Rivera');
  const [age, setAge] = useState(24);
  const [height, setHeight] = useState(`5'10"`);
  const [weight, setWeight] = useState('165');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [goals, setGoals] = useState<string[]>([
    'Hypertrophy / Muscle Growth',
    'Athletic Performance',
    'Injury Prevention'
  ]);
  const [sport, setSport] = useState('Soccer');
  const [position, setPosition] = useState('Midfielder');
  const [equipmentProfile, setEquipmentProfile] = useState<EquipmentTier>('full_gym');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([
    'barbell',
    'dumbbell',
    'cable_machine',
    'bench',
    'squat_rack',
    'pull_up_bar',
    'resistance_bands'
  ]);

  const toggleGoal = (g: string) => {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const handleFinish = () => {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name,
      age,
      height,
      weight,
      experienceLevel,
      goals,
      sport,
      sportDetails: {
        position,
        trainingFrequency: '3-4x/week',
        mainPerformanceGoals: 'Injury prevention, endurance, explosive unilateral power'
      },
      equipmentProfile,
      availableEquipment,
      weightUnit: 'lb',
      limitations: [],
      dislikedExercises: [],
      favoriteExercises: ['db-goblet-squat', 'db-single-arm-row'],
      neverRecommendExercises: [],
      preferredWorkoutDuration: 35,
      onboardingCompleted: true
    };
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-left">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-100">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-black text-xs font-black flex items-center justify-center">
              {step}
            </span>
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Step {step} of 3
            </span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Coach Setup
          </span>
        </div>

        {/* Step 1: Athlete Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-black text-white">Welcome! What should we call you?</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Your profile helps the AI recommend safe, age-appropriate progressions.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Name or Nickname
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Height
                  </label>
                  <input
                    type="text"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Weight (lb)
                  </label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Training Experience
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperienceLevel(lvl)}
                      className={`p-3 rounded-xl border text-xs font-bold capitalize transition ${
                        experienceLevel === lvl
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 mt-4"
            >
              Continue to Goals &amp; Sport <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Goals & Sport */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-black text-white">What are you training for?</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Select your primary goals and sport so workouts adapt to your schedule.
              </p>
            </div>

            {/* Goals Chips */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Core Training Goals (Select Multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Hypertrophy / Muscle Growth',
                  'Athletic Performance',
                  'Injury Prevention',
                  'Speed & Power',
                  'Strength',
                  'Mobility & Flexibility'
                ].map((g) => {
                  const active = goals.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGoal(g)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                        active
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sport & Position */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Sport
                </label>
                <input
                  type="text"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  placeholder="Soccer, Basketball, Track..."
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Position / Specialty
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Midfielder, Guard, Sprinter..."
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
              >
                Equipment Setup <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Equipment */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-black text-white">Where do you train?</h2>
              <p className="text-xs text-zinc-400 mt-1">
                The AI will only program exercises matching what you actually have.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'full_gym' as const, label: 'Full Commercial Gym', desc: 'Barbells, cables, racks, dumbbells' },
                { id: 'home_gym' as const, label: 'Home Gym', desc: 'Dumbbells, bench, pull-up bar' },
                { id: 'minimal' as const, label: 'Minimal Equipment', desc: 'Resistance bands & dumbbells' },
                { id: 'bodyweight' as const, label: 'Bodyweight Only', desc: 'No equipment needed' }
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setEquipmentProfile(tier.id)}
                  className={`p-3 rounded-xl border text-left transition space-y-1 ${
                    equipmentProfile === tier.id
                      ? 'border-emerald-500 bg-emerald-950/40 text-white'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">{tier.label}</span>
                  <span className="text-[11px] text-zinc-400 block">{tier.desc}</span>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300 flex items-start gap-2 mt-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>
                <strong>Safety Guarantee:</strong> Recommendations use conservative progression algorithms. If you have practice or a game, workloads will automatically scale back.
              </span>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
              >
                Generate My Custom Training Plan <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
