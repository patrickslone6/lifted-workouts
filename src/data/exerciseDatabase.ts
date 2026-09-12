import { ExerciseDefinition } from '../types';

export const EXERCISE_DATABASE: ExerciseDefinition[] = [
  // --- LOWER BODY SQUAT / UNILATERAL ---
  {
    id: 'db-goblet-squat',
    name: 'Dumbbell Goblet Squat',
    pattern: 'squat',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Core', 'Adductors', 'Upper Back'],
    equipmentRequired: ['dumbbell'],
    difficulty: 'beginner',
    instructions: [
      'Hold a single dumbbell vertically against your chest with both hands cup-gripping the top bell.',
      'Set your feet shoulder-width apart with toes turned out slightly (15-30 degrees).',
      'Inhale deep into your belly, brace your core, and descend by pushing hips back and knees out in line with your toes.',
      'Hit parallel or just below while keeping your torso upright and heels pinned to the floor.',
      'Drive through midfoot and heels to stand up, exhaling at the top.'
    ],
    techniqueCues: [
      'Keep elbows pointing down inside the knees at the bottom.',
      'Maintain three points of contact on your foot: big toe, pinky toe, heel.',
      'Do not let knees cave inward (valgus collapse).'
    ],
    breathingCue: 'Inhale and brace core before descending. Exhale past the sticking point on the way up.',
    contraindications: ['acute_knee_pain', 'lumbar_herniation'],
    alternativeExerciseId: 'db-box-squat',
    hypertrophyFocus: 'Provides exceptional quad and glute mechanical tension in the deep stretched position. Pause for 1 second at the bottom to maximize hypertrophy.',
    injuryPreventionNote: 'Front-loaded weight keeps the torso upright, drastically reducing spinal shear forces compared to back squats.',
    defaultWeightLb: 25,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 90
  },
  {
    id: 'db-box-squat',
    name: 'Dumbbell Box Squat',
    pattern: 'squat',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipmentRequired: ['dumbbell', 'bench'],
    difficulty: 'beginner',
    instructions: [
      'Stand facing away from a knee-height box or bench with a dumbbell held goblet-style.',
      'Hinge hips backward with control until gently contacting the bench without relaxing.',
      'Pause for a split-second, maintain full core tension, and drive straight up.'
    ],
    techniqueCues: [
      'Do not rock backward or bounce off the box.',
      'Control the 3-second descent.'
    ],
    breathingCue: 'Breathe in on descent, hold brace through the box touch, exhale as you ascend.',
    contraindications: [],
    alternativeExerciseId: 'bodyweight-squat',
    hypertrophyFocus: 'Breaks the eccentric-concentric chain, forcing maximum concentric motor unit recruitment from a dead stop.',
    injuryPreventionNote: 'Regulates depth safely, protecting patellar tendons and hips from uncontrolled excessive flexion.',
    defaultWeightLb: 20,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 75
  },
  {
    id: 'db-bulgarian-split-squat',
    name: 'Dumbbell Bulgarian Split Squat',
    pattern: 'unilateral_leg',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Adductors', 'Calves', 'Core Stabilizers'],
    equipmentRequired: ['dumbbell', 'bench'],
    difficulty: 'intermediate',
    instructions: [
      'Place top of rear foot laces-down on a bench behind you, front foot roughly 2-3 feet in front.',
      'Hold a dumbbell in each hand by your sides with chest tall.',
      'Descend smoothly until your back knee almost kisses the floor, keeping front shin relatively vertical.',
      'Push firmly through your front heel to return to top without locking out harshly.'
    ],
    techniqueCues: [
      'Slight forward torso lean (15-20 deg) shifts massive load directly onto glutes.',
      'Keep pelvis square to the front; do not rotate hips.'
    ],
    breathingCue: 'Inhale on the 3-second eccentric down; exhale as you push back up.',
    contraindications: ['acute_patellar_tendinitis'],
    alternativeExerciseId: 'db-reverse-lunge',
    hypertrophyFocus: 'Unbeatable unilateral hypertrophy builder that stretches the glute and quad under high load without heavy spinal compression.',
    injuryPreventionNote: 'Corrects left-to-right leg strength imbalances that often lead to ACL, hamstring, and groin tears in athletes.',
    defaultWeightLb: 15,
    defaultReps: 8,
    defaultSets: 3,
    restSeconds: 90
  },
  {
    id: 'db-reverse-lunge',
    name: 'Dumbbell Reverse Lunge',
    pattern: 'unilateral_leg',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipmentRequired: ['dumbbell'],
    difficulty: 'beginner',
    instructions: [
      'Stand upright holding dumbbells at sides.',
      'Step one leg straight back, bending both knees to roughly 90 degrees.',
      'Lightly touch or hover back knee above floor.',
      'Drive powerfully through front heel to step back to starting position.'
    ],
    techniqueCues: ['Keep front knee stacked directly over ankle.'],
    breathingCue: 'Inhale as you step back, exhale as you return to standing.',
    contraindications: [],
    alternativeExerciseId: 'bodyweight-reverse-lunge',
    hypertrophyFocus: 'Continuous tension on the working quad and glute throughout the entire range of motion.',
    injuryPreventionNote: 'Stepping backward produces far less shearing force on the knee cap than forward stepping lunges.',
    defaultWeightLb: 15,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 75
  },
  {
    id: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    pattern: 'squat',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Erector Spinae', 'Core'],
    equipmentRequired: ['barbell', 'squat_rack'],
    difficulty: 'advanced',
    instructions: [
      'Unrack barbell across upper traps or rear delts with hands gripping firmly.',
      'Take 2-3 steps back into shoulder-width stance.',
      'Take a deep 360-degree diaphragmatic breath, brace abdominal wall.',
      'Squat down to hip crease below kneecap with controlled 2-second tempo.',
      'Drive floor away to stand upright.'
    ],
    techniqueCues: [
      'Keep chest proud and elbows pinned down into lats.',
      'Maintain rigid neutral lumbar spine throughout.'
    ],
    breathingCue: 'Valsalva maneuver: deep breath in, hold brace through bottom, exhale 2/3 of the way up.',
    contraindications: ['acute_lower_back_pain', 'cervical_spine_issues'],
    alternativeExerciseId: 'db-goblet-squat',
    hypertrophyFocus: 'Highest systemic motor unit recruitment and full-body mechanical overload potential.',
    injuryPreventionNote: 'Reinforces kinetic chain stability; safe progression requires leaving 1-2 reps in reserve (RIR).',
    defaultWeightLb: 95,
    defaultReps: 6,
    defaultSets: 3,
    restSeconds: 120
  },

  // --- LOWER BODY HINGE / HAMSTRINGS ---
  {
    id: 'db-romanian-deadlift',
    name: 'Dumbbell Romanian Deadlift (RDL)',
    pattern: 'hinge',
    primaryMuscles: ['Hamstrings', 'Gluteus Maximus'],
    secondaryMuscles: ['Erector Spinae', 'Lats', 'Forearms'],
    equipmentRequired: ['dumbbell'],
    difficulty: 'intermediate',
    instructions: [
      'Stand hip-width apart holding dumbbells in front of thighs with slight soft bend in knees.',
      'Lock your knees in that fixed slight bend and push your hips straight back toward the wall behind you.',
      'Lower dumbbells down along your shins until you feel a deep, intense stretch in hamstrings (around mid-shin).',
      'Drive hips forward and squeeze glutes hard to return to upright posture.'
    ],
    techniqueCues: [
      'The knees do not bend further as you descend; this is a pure hip hinge, not a squat.',
      'Keep dumbbells skimming tight against thighs and shins.',
      'Do not round your lower back at the bottom.'
    ],
    breathingCue: 'Inhale and brace spine before hinging backward. Exhale as hips snap forward to lockout.',
    contraindications: ['acute_lower_back_pain', 'hamstring_tear_acute'],
    alternativeExerciseId: 'glute-bridge',
    hypertrophyFocus: 'Targeting hamstrings at long muscle lengths under heavy eccentric load produces supreme hypertrophic remodeling.',
    injuryPreventionNote: 'Strengthening hamstrings in eccentric lengthened positions is the gold standard for preventing sprint hamstring pulls.',
    defaultWeightLb: 25,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 90
  },
  {
    id: 'barbell-deadlift',
    name: 'Conventional Barbell Deadlift',
    pattern: 'hinge',
    primaryMuscles: ['Hamstrings', 'Gluteus Maximus', 'Erector Spinae'],
    secondaryMuscles: ['Lats', 'Traps', 'Quadriceps', 'Forearms'],
    equipmentRequired: ['barbell'],
    difficulty: 'advanced',
    instructions: [
      'Stand with midfoot directly under bar, feet hip-width.',
      'Hinge hips down, grip bar just outside knees.',
      'Pull chest up, engage lats (imagine bending the bar around shins), flatten spine.',
      'Push floor away with legs until bar clears knees, then lock out hips and glutes.'
    ],
    techniqueCues: ['Do not let hips shoot up before shoulders.', 'Keep bar in direct contact with legs.'],
    breathingCue: 'Deep breath at bottom, lock ribcage down, exhale at lockout.',
    contraindications: ['acute_lower_back_pain', 'disc_herniation'],
    alternativeExerciseId: 'db-romanian-deadlift',
    hypertrophyFocus: 'Complete posterior chain development and full-body structural integrity.',
    injuryPreventionNote: 'Builds bulletproof spinal erectors and hip extensors when performed with strict neutral spine and submaximal load.',
    defaultWeightLb: 115,
    defaultReps: 5,
    defaultSets: 3,
    restSeconds: 150
  },
  {
    id: 'glute-bridge',
    name: 'Bodyweight / Weighted Glute Bridge',
    pattern: 'hinge',
    primaryMuscles: ['Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipmentRequired: ['bodyweight', 'dumbbell'],
    difficulty: 'beginner',
    instructions: [
      'Lie supine on mat with knees bent at 90 degrees, feet flat on floor hip-width apart.',
      'Optional: hold a dumbbell safely over your hips with hands.',
      'Brace core and drive through heels to elevate hips until body forms straight line from shoulders to knees.',
      'Squeeze glutes intensely for 2 seconds at the peak, then lower slowly.'
    ],
    techniqueCues: ['Do not hyperextend lower back at the top; keep ribs down.'],
    breathingCue: 'Exhale as you thrust hips up; inhale as you lower down.',
    contraindications: [],
    alternativeExerciseId: 'db-romanian-deadlift',
    hypertrophyFocus: 'Isolates glutes in fully shortened position with zero spinal compression.',
    injuryPreventionNote: 'Prevents hamstring dominance and unlocks dormant glute recruitment for sprinters and field athletes.',
    defaultWeightLb: 0,
    defaultReps: 12,
    defaultSets: 3,
    restSeconds: 60
  },

  // --- UPPER BODY PUSH (HORIZONTAL & VERTICAL) ---
  {
    id: 'db-flat-bench-press',
    name: 'Dumbbell Flat Bench Press',
    pattern: 'push_horizontal',
    primaryMuscles: ['Pectoralis Major', 'Anterior Deltoid'],
    secondaryMuscles: ['Triceps Brachii', 'Serratus Anterior'],
    equipmentRequired: ['dumbbell', 'bench'],
    difficulty: 'beginner',
    instructions: [
      'Lie flat on bench holding dumbbells over chest with arms extended and palms facing forward.',
      'Retract and depress shoulder blades, keeping feet planted firmly on ground.',
      'Lower dumbbells with control at a 45-degree angle to your torso until you feel a comfortable chest stretch.',
      'Press back up in a slight arc, bringing dumbbells toward center without clanking.'
    ],
    techniqueCues: [
      'Keep wrists stacked directly above elbows.',
      'Do not flare elbows out wide at 90 degrees (protects shoulder labrum).'
    ],
    breathingCue: 'Inhale on the 2-3 second lower; exhale powerfully as you press up.',
    contraindications: ['acute_rotator_cuff_impingement'],
    alternativeExerciseId: 'push-up',
    hypertrophyFocus: 'Independent dumbbell arm movement allows deeper pectoral stretch at the bottom and convergent contraction at peak.',
    injuryPreventionNote: 'Free range of motion accommodates natural individual glenohumeral mechanics better than a fixed straight barbell.',
    defaultWeightLb: 25,
    defaultReps: 8,
    defaultSets: 3,
    restSeconds: 90
  },
  {
    id: 'push-up',
    name: 'Standard Push-Up (or Knee / Elevated)',
    pattern: 'push_horizontal',
    primaryMuscles: ['Pectoralis Major', 'Anterior Deltoid'],
    secondaryMuscles: ['Triceps Brachii', 'Core (Abs & Obliques)', 'Serratus Anterior'],
    equipmentRequired: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Start in high plank position with hands slightly wider than shoulders.',
      'Lock glutes and quads tight to form an unbending rigid plank from head to heels.',
      'Lower your chest to within an inch of floor with elbows tracking at a 45-degree angle.',
      'Push floor away with authority until arms reach full extension.'
    ],
    techniqueCues: ['Do not let lower back sag or hips pike up.'],
    breathingCue: 'Inhale on descent, exhale as you push the ground away.',
    contraindications: ['acute_wrist_sprain'],
    alternativeExerciseId: 'db-flat-bench-press',
    hypertrophyFocus: 'Excellent closed-kinetic-chain hypertrophy stimulus for chest and triceps with zero joint shearing.',
    injuryPreventionNote: 'Allows scapulae to protract and retract freely, promoting healthy scapulohumeral rhythm and rotator cuff longevity.',
    defaultWeightLb: 0,
    defaultReps: 12,
    defaultSets: 3,
    restSeconds: 60
  },
  {
    id: 'db-seated-overhead-press',
    name: 'Dumbbell Seated Overhead Press',
    pattern: 'push_vertical',
    primaryMuscles: ['Anterior Deltoid', 'Lateral Deltoid'],
    secondaryMuscles: ['Triceps Brachii', 'Upper Trapezius', 'Upper Chest'],
    equipmentRequired: ['dumbbell', 'bench'],
    difficulty: 'intermediate',
    instructions: [
      'Sit on an upright bench with dumbbells at shoulder height, palms angled slightly inward (scapular plane).',
      'Plant feet flat, brace core against bench backrest.',
      'Press dumbbells overhead until arms are extended but not locked out aggressively.',
      'Lower with strict 3-second control back to ear level.'
    ],
    techniqueCues: [
      'Press in the scapular plane (elbows 30 degrees forward of midline), not flared wide.'
    ],
    breathingCue: 'Exhale driving weights upward; inhale controlling down.',
    contraindications: ['subacromial_impingement', 'cervical_disc_issue'],
    alternativeExerciseId: 'db-lateral-raise',
    hypertrophyFocus: 'Direct mechanical overload on the anterior and lateral deltoid heads for upper body width.',
    injuryPreventionNote: 'Seated position eliminates lumbar arching and momentum, safeguarding the lower back and shoulder joints.',
    defaultWeightLb: 20,
    defaultReps: 8,
    defaultSets: 3,
    restSeconds: 90
  },
  {
    id: 'db-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    pattern: 'push_vertical',
    primaryMuscles: ['Lateral Deltoid'],
    secondaryMuscles: ['Anterior Deltoid', 'Upper Traps'],
    equipmentRequired: ['dumbbell'],
    difficulty: 'beginner',
    instructions: [
      'Stand tall with dumbbells resting at your outer thighs, slight bend in elbows.',
      'Leading with elbows, raise arms out to sides in a wide arc until parallel with floor.',
      'Briefly pause at top, then lower with a strict 2-second negative.'
    ],
    techniqueCues: ['Do not shrug traps up to your ears; depress shoulder blades.'],
    breathingCue: 'Exhale raising, inhale lowering.',
    contraindications: [],
    alternativeExerciseId: 'db-seated-overhead-press',
    hypertrophyFocus: 'Isolates the lateral deltoid head for cannonball shoulders without loading the spine or elbow joints.',
    injuryPreventionNote: 'Light controlled loads preserve the supraspinatus tendon from impingement.',
    defaultWeightLb: 10,
    defaultReps: 12,
    defaultSets: 3,
    restSeconds: 60
  },

  // --- UPPER BODY PULL (HORIZONTAL & VERTICAL) ---
  {
    id: 'db-single-arm-row',
    name: 'Dumbbell Single-Arm Bench Row',
    pattern: 'pull_horizontal',
    primaryMuscles: ['Latissimus Dorsi', 'Rhomboids'],
    secondaryMuscles: ['Biceps Brachii', 'Rear Deltoid', 'Core Obliques'],
    equipmentRequired: ['dumbbell', 'bench'],
    difficulty: 'beginner',
    instructions: [
      'Place one knee and same-side hand firmly on a flat bench, other foot planted wide for tripod support.',
      'Hold a dumbbell in free hand with arm hanging straight down under shoulder.',
      'Initiate pull by retracting shoulder blade, pulling elbow back toward your hip crease in a smooth arc.',
      'Squeeze back musculature hard for 1 second at top.',
      'Lower slowly to full arm hang, feeling a complete stretch in lat.'
    ],
    techniqueCues: [
      'Pull to the hip, not up to the armpit.',
      'Keep shoulders square to the bench; do not twist torso excessively.'
    ],
    breathingCue: 'Exhale as you row up; inhale as you lower and stretch the lat.',
    contraindications: [],
    alternativeExerciseId: 'cable-seated-row',
    hypertrophyFocus: 'Provides massive stretch and contraction on lats with unilateral focus, curing back imbalances.',
    injuryPreventionNote: 'Tripod bench support offloads the spine completely, making it the safest compound row for athletes.',
    defaultWeightLb: 25,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 75
  },
  {
    id: 'pull-up',
    name: 'Pull-Up / Assisted Pull-Up',
    pattern: 'pull_vertical',
    primaryMuscles: ['Latissimus Dorsi', 'Teres Major'],
    secondaryMuscles: ['Biceps Brachii', 'Brachialis', 'Lower Traps', 'Abs'],
    equipmentRequired: ['pull_up_bar'],
    difficulty: 'intermediate',
    instructions: [
      'Grip overhead bar with overhand grip slightly wider than shoulder-width.',
      'Hang with arms fully extended and shoulders engaged.',
      'Drive elbows down toward ribs while pulling upper chest toward bar.',
      'Clear chin over bar with control.',
      'Lower under complete control for 3 seconds back to dead hang.'
    ],
    techniqueCues: ['Do not kick or kipp legs; maintain hollow body position.'],
    breathingCue: 'Exhale pulling up, inhale lowering down with control.',
    contraindications: ['acute_shoulder_labral_tear'],
    alternativeExerciseId: 'lat-pulldown',
    hypertrophyFocus: 'The undisputed king of upper back width and bicep recruitment.',
    injuryPreventionNote: 'Hanging and controlled pulling decompression realigns spinal discs and builds bulletproof rotator cuff stabilizers.',
    defaultWeightLb: 0,
    defaultReps: 6,
    defaultSets: 3,
    restSeconds: 90
  },
  {
    id: 'lat-pulldown',
    name: 'Cable Lat Pulldown',
    pattern: 'pull_vertical',
    primaryMuscles: ['Latissimus Dorsi', 'Teres Major'],
    secondaryMuscles: ['Biceps Brachii', 'Rhomboids'],
    equipmentRequired: ['cable_machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit facing cable station with thighs secured under roller pads.',
      'Grip wide bar with overhand grip.',
      'Lean back slightly (10-15 degrees), pull bar smoothly down to upper chest.',
      'Squeeze shoulder blades together, then return slowly to top stretch.'
    ],
    techniqueCues: ['Keep chest arched slightly toward ceiling.'],
    breathingCue: 'Exhale pulling down, inhale letting arms rise smoothly.',
    contraindications: [],
    alternativeExerciseId: 'db-single-arm-row',
    hypertrophyFocus: 'Scalable load allows training lats directly to hypertrophic failure in 8-12 rep range.',
    injuryPreventionNote: 'No risk of falling or swinging; ideal for progressive overload without form breakdown.',
    defaultWeightLb: 70,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 75
  },
  {
    id: 'db-chest-supported-row',
    name: 'Dumbbell Incline Chest-Supported Row',
    pattern: 'pull_horizontal',
    primaryMuscles: ['Rhomboids', 'Mid Trapezius', 'Rear Deltoids'],
    secondaryMuscles: ['Latissimus Dorsi', 'Biceps Brachii'],
    equipmentRequired: ['dumbbell', 'bench'],
    difficulty: 'beginner',
    instructions: [
      'Set bench to 30-45 degree incline. Lie face-down with chest resting on pad.',
      'Hold dumbbells hanging straight down.',
      'Row dumbbells up by flaring elbows 45-60 degrees out to hit upper back.',
      'Pinch shoulder blades hard at top for 1 full second, then lower slowly.'
    ],
    techniqueCues: ['Do not lift chest off the bench pad.'],
    breathingCue: 'Exhale on row, inhale on negative.',
    contraindications: [],
    alternativeExerciseId: 'db-single-arm-row',
    hypertrophyFocus: 'Strictly eliminates cheating momentum, generating pure mechanical tension on mid-back fibers.',
    injuryPreventionNote: 'Zero lower back torque. The chest support prevents spinal flexion under heavy pulling.',
    defaultWeightLb: 20,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 75
  },

  // --- CORE, CARRY & POSTURAL STABILITY ---
  {
    id: 'deadbug',
    name: 'Deadbug Anti-Extension Core',
    pattern: 'core',
    primaryMuscles: ['Transverse Abdominis', 'Rectus Abdominis'],
    secondaryMuscles: ['Hip Flexors', 'Obliques'],
    equipmentRequired: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Lie on your back with arms pointing straight toward ceiling and knees/hips bent at 90 degrees.',
      'Press your lower back hard down into the floor so there is zero daylight under your spine.',
      'Slowly extend right arm overhead and left leg straight out until both hover 2 inches above floor.',
      'Pause for 1 second while maintaining active floor-crushing back pressure.',
      'Return to center and switch opposite limbs.'
    ],
    techniqueCues: [
      'If your lower back arches or lifts off floor, shorten your leg extension range immediately.'
    ],
    breathingCue: 'Exhale through pursed lips as limbs extend; inhale as you return to center.',
    contraindications: [],
    alternativeExerciseId: 'plank',
    hypertrophyFocus: 'Deep neuromuscular recruitment of the transverse abdominis wall, narrowing the waist and locking pelvis in place.',
    injuryPreventionNote: 'The gold-standard physical therapy drill for stabilizing the lumbar spine and preventing sports-related lower back spasms.',
    defaultWeightLb: 0,
    defaultReps: 12,
    defaultSets: 3,
    restSeconds: 60
  },
  {
    id: 'plank',
    name: 'Forearm Plank with Active Squeeze',
    pattern: 'core',
    primaryMuscles: ['Rectus Abdominis', 'Transverse Abdominis'],
    secondaryMuscles: ['Glutes', 'Serratus Anterior', 'Shoulders'],
    equipmentRequired: ['bodyweight'],
    difficulty: 'beginner',
    instructions: [
      'Set forearms on floor with elbows directly under shoulders.',
      'Step feet back, squeeze glutes, pull kneecaps up into quads.',
      'Actively drag elbows toward toes and toes toward elbows without moving limbs (hard isometric pull).',
      'Hold rigid bridge for 30-45 seconds.'
    ],
    techniqueCues: ['Keep neck neutral looking down between wrists.'],
    breathingCue: 'Steady rhythmic diaphragmatic breaths while maintaining firm abdominal brace.',
    contraindications: [],
    alternativeExerciseId: 'deadbug',
    hypertrophyFocus: 'Intense isometric abdominal tension.',
    injuryPreventionNote: 'Teaches pelvic neutrality, shielding against lumbar hyperextension during sprinting and jumping.',
    defaultWeightLb: 0,
    defaultReps: 35, // seconds
    defaultSets: 3,
    restSeconds: 60
  },
  {
    id: 'db-farmers-carry',
    name: 'Dumbbell Heavy Farmer’s Carry',
    pattern: 'carry',
    primaryMuscles: ['Forearms / Grip', 'Trapezius', 'Core Stabilizers'],
    secondaryMuscles: ['Glutes', 'Calves'],
    equipmentRequired: ['dumbbell'],
    difficulty: 'intermediate',
    instructions: [
      'Deadlift a pair of heavy dumbbells safely off floor.',
      'Stand tall: pull shoulders back and down, ribs tucked, eyes forward.',
      'Walk forward with smooth, deliberate, heel-to-toe strides for 40-50 steps.',
      'Do not allow dumbbells to swing or slap against thighs.'
    ],
    techniqueCues: ['Do not shrug up or slouch forward; walk like royalty.'],
    breathingCue: 'Breathe into abdominal cylinder while maintaining constant brace.',
    contraindications: ['acute_neck_strain'],
    alternativeExerciseId: 'plank',
    hypertrophyFocus: 'Immense trap, upper back, and forearm muscle growth from prolonged heavy isometric loading.',
    injuryPreventionNote: 'Stabilizes the shoulder girdle, SI joint, and hip complex against sudden athletic impacts.',
    defaultWeightLb: 35,
    defaultReps: 40, // steps or seconds
    defaultSets: 3,
    restSeconds: 75
  },
  {
    id: 'paloff-press',
    name: 'Band / Cable Pallof Press Anti-Rotation',
    pattern: 'core',
    primaryMuscles: ['Internal & External Obliques', 'Transverse Abdominis'],
    secondaryMuscles: ['Glutes', 'Deltoids'],
    equipmentRequired: ['resistance_bands', 'cable_machine'],
    difficulty: 'beginner',
    instructions: [
      'Stand perpendicular to anchor holding band/handle at chest height with both hands.',
      'Step out to create tension. Set feet shoulder-width, knees soft.',
      'Press hands straight out in front of chest. Fight the lateral twist forcefully.',
      'Hold 2 seconds, return smoothly to chest.'
    ],
    techniqueCues: ['Do not let torso or hips rotate toward the anchor.'],
    breathingCue: 'Exhale on press out, hold brace, inhale returning to chest.',
    contraindications: [],
    alternativeExerciseId: 'deadbug',
    hypertrophyFocus: 'Deep rotational core hypertrophy, creating athletic core stiffness.',
    injuryPreventionNote: 'Builds anti-rotational stability required to absorb hits and change direction safely on the field.',
    defaultWeightLb: 15,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 60
  },

  // --- ARM ACCESSORY & HYPERTROPHY ---
  {
    id: 'db-bicep-curl',
    name: 'Dumbbell Incline / Standing Bicep Curl',
    pattern: 'pull_vertical',
    primaryMuscles: ['Biceps Brachii', 'Brachialis'],
    secondaryMuscles: ['Forearms'],
    equipmentRequired: ['dumbbell'],
    difficulty: 'beginner',
    instructions: [
      'Stand or sit holding dumbbells at arm’s length with palms facing forward.',
      'Keep elbows pinned to sides, curl weights upward while supinating wrists.',
      'Squeeze biceps hard at top without letting elbows swing forward.',
      'Lower under 3-second control back to full extension.'
    ],
    techniqueCues: ['Do not lean back or use hips to swing weight.'],
    breathingCue: 'Exhale curling up, inhale lowering down.',
    contraindications: ['distal_bicep_tendon_strain'],
    alternativeExerciseId: 'pull-up',
    hypertrophyFocus: 'Direct bicep peak and brachialis thickness via controlled stretch and supinated contraction.',
    injuryPreventionNote: 'Strengthens bicep tendons which protect the elbow during throwing, catching, and pulling.',
    defaultWeightLb: 20,
    defaultReps: 10,
    defaultSets: 3,
    restSeconds: 60
  },
  {
    id: 'db-overhead-tricep-extension',
    name: 'Dumbbell Overhead Tricep Extension',
    pattern: 'push_vertical',
    primaryMuscles: ['Triceps Brachii (Long Head)'],
    secondaryMuscles: ['Anconeus'],
    equipmentRequired: ['dumbbell'],
    difficulty: 'beginner',
    instructions: [
      'Hold a single dumbbell overhead with both hands cupping the upper plate.',
      'Keep upper arms close to head and elbows pointing forward.',
      'Lower weight behind your head by bending elbows until you feel a deep tricep stretch.',
      'Extend arms back to top, squeezing triceps.'
    ],
    techniqueCues: ['Keep ribs from flaring out; brace core.'],
    breathingCue: 'Inhale lowering behind head, exhale driving up to lockout.',
    contraindications: ['elbow_tendinitis'],
    alternativeExerciseId: 'push-up',
    hypertrophyFocus: 'Puts the triceps long head on maximum stretch, stimulating rapid arm muscle development.',
    injuryPreventionNote: 'Balances elbow joint forces against repetitive bicep pulling.',
    defaultWeightLb: 20,
    defaultReps: 12,
    defaultSets: 3,
    restSeconds: 60
  }
];

// Curated Morning Mobility Exercises
export const MORNING_MOBILITY_LIBRARY = [
  {
    name: 'Cat-Cow Spinal Waves',
    targetArea: 'Spine & Core',
    durationSeconds: 60,
    instructions: 'On all fours, inhale as you arch your back and lift your chest/gaze (Cow). Exhale as you tuck your chin, round your spine toward the ceiling, and push the floor away (Cat). Move vertebra by vertebra.',
    breathingCue: 'Inhale to expand the belly in Cow, exhale completely to compress the core in Cat.',
    modification: 'Can be done seated in a chair hands-on-knees.'
  },
  {
    name: 'World’s Greatest Stretch',
    targetArea: 'Hips, Thoracic Spine & Hamstrings',
    durationSeconds: 90,
    instructions: 'Step into a long forward lunge. Place opposite hand on floor. Rotate your torso and reach your other arm straight up toward the sky, following your hand with your eyes. Drop back knee and shift back into a hamstring stretch. Repeat 4-5 times each side.',
    breathingCue: 'Exhale as you twist and open your chest to the ceiling.',
    modification: 'Elevate front hand on a yoga block or low bench.'
  },
  {
    name: '90/90 Hip Internal & External Rotations',
    targetArea: 'Hip Joint Capsules & Glutes',
    durationSeconds: 75,
    instructions: 'Sit with both knees bent at 90 degrees on the floor (one in front, one out to the side). Keeping tall posture, gently lean forward over the front shin to stretch the glute. Sit up and pivot smoothly to the opposite side without using your hands if possible.',
    breathingCue: 'Deep steady breaths into the lower pelvis as you sink into the hip socket.',
    modification: 'Place hands on the floor behind you for balance.'
  },
  {
    name: 'Thoracic Thread the Needle',
    targetArea: 'Upper Back & Shoulder Blades',
    durationSeconds: 60,
    instructions: 'From hands and knees, reach your right arm under your chest and slide the back of your shoulder and ear gently down to the floor. Breathe into the space between your shoulder blades. Hold for 30s, then switch sides.',
    breathingCue: 'Slow 4-second inhales and 6-second exhales to release upper back tension.',
    modification: 'Place a pillow or foam roller under the shoulder.'
  },
  {
    name: 'Deep Squat Pry & Ankle Rock',
    targetArea: 'Ankles, Hips & Pelvic Floor',
    durationSeconds: 75,
    instructions: 'Sink into the deepest comfortable squat you can achieve. Press your elbows gently against the insides of your knees with palms together. Shift weight gently from side to side, mobilizing ankle dorsiflexion.',
    breathingCue: 'Breathe deep into your belly and pelvic floor to relax adductors.',
    modification: 'Hold onto a doorframe or sturdy post for assistance.'
  },
  {
    name: 'Cobra / Sphinx to Child’s Pose Flow',
    targetArea: 'Lumbar Spine, Lats & Hips',
    durationSeconds: 60,
    instructions: 'Lower to your stomach, press palms down and gently lift your chest into a comfortable Sphinx or Cobra extension. Then push hips back over your heels into Child’s pose with arms stretched forward. Flow smoothly between the two.',
    breathingCue: 'Inhale lifting into Cobra; exhale melting hips back into Child’s pose.',
    modification: 'Keep Cobra low on forearms if lower back is sensitive.'
  }
];

// Curated Nightly Bedtime Restorative Stretching Library
export const NIGHTLY_STRETCHING_LIBRARY = [
  {
    name: 'Legs Up The Wall (Viparita Karani)',
    targetArea: 'Hamstrings, Lower Back & Venous Return',
    durationSeconds: 90,
    instructions: 'Lie flat on your back with your hips close to a wall and extend both legs straight up the wall. Rest your arms comfortably at your sides, palms facing up. Allow gravity to drain pooled blood and metabolic waste from your legs after training.',
    breathingCue: 'Slow 4-second nasal inhale, gentle 6-second exhale. Feel your heart rate slow down.',
    modification: 'Place a folded towel or pillow under your lower back for elevated lumbar support.'
  },
  {
    name: 'Reclined Butterfly (Supta Baddha Konasana)',
    targetArea: 'Adductors, Hips & Pelvis',
    durationSeconds: 75,
    instructions: 'Lie on your back, bend your knees, bring the soles of your feet together, and let your knees fall gently outward toward the floor. Rest one hand on your chest and one on your belly.',
    breathingCue: 'Breathe deep into your lower belly, feeling the gentle release across inner thighs on each out-breath.',
    modification: 'Place pillows under your outer knees so your hips can completely relax without pulling.'
  },
  {
    name: 'Lying Figure-4 Piriformis Release',
    targetArea: 'Glutes, Piriformis & Deep Hip Rotators',
    durationSeconds: 75,
    instructions: 'Lie on your back with knees bent. Cross your right ankle over your left knee. Reach through to clasp your hands behind your left hamstring and gently draw it toward your chest until a deep, soothing stretch is felt in the right hip. Hold 35s, then switch sides.',
    breathingCue: 'Exhale tension out of the glutes and lower back with every breath.',
    modification: 'Rest your uncrossed foot on a wall or chair if reaching feels strenuous.'
  },
  {
    name: 'Extended Child’s Pose with Lat Reach',
    targetArea: 'Latissimus Dorsi, Thoracic Spine & Lumbar',
    durationSeconds: 60,
    instructions: 'Kneel on the floor with big toes touching and knees wide apart. Sit hips back toward your heels and walk hands forward until your forehead rests on the floor. Walk both hands gently 12 inches to the right to stretch the left lat for 30s, then switch sides.',
    breathingCue: 'Expand your rib cage laterally on inhale, sink your armpits toward the floor on exhale.',
    modification: 'Place a cushion under your knees or forehead for added comfort.'
  },
  {
    name: 'Supine Gentle Spinal Twist',
    targetArea: 'Spine, Obliques, Chest & Shoulders',
    durationSeconds: 60,
    instructions: 'Lie on your back with arms extended out in a T-shape. Draw knees to your chest and let them gently fall to the right side while keeping your left shoulder blade pinned to the floor. Turn gaze softly to the left. Hold 30s, then reverse sides.',
    breathingCue: 'Release all tension through the rotational axis of your spine with each long exhale.',
    modification: 'Place a pillow between your knees to keep hips and sacrum neutral.'
  },
  {
    name: 'Supported Forward Fold / Ragdoll',
    targetArea: 'Posterior Chain, Hamstrings & Cervical Spine',
    durationSeconds: 60,
    instructions: 'Stand with feet hip-width apart and a soft bend in your knees. Fold forward from the hips, letting your upper body drape completely over your thighs. Clasp opposite elbows with hands and let your head and neck hang heavy like a ragdoll.',
    breathingCue: 'Allow gravity to decompress every vertebra in your spine with each slow exhale.',
    modification: 'Bend knees deeply and rest your chest fully on your thighs.'
  }
];

