import React, { useState } from 'react';
import { SchoolWorkoutLog } from '../types';
import { getTodayDateString } from '../utils/dateUtils';
import { GraduationCap, Dumbbell, Activity, X, CheckCircle2, Sparkles } from 'lucide-react';

interface Props { existingLog?: SchoolWorkoutLog | null; onSave: (log: SchoolWorkoutLog) => void; onClose: () => void; }
const today = getTodayDateString();
const COMMON_MAIN_LIFTS = ['Back Squat','Bench Press','Trap Bar Deadlift','Power Clean','Incline DB Press','Leg Press','Pull-ups / Chin-ups','Overhead / Push Press'];
const BODY_PARTS = ['Quads','Knees / Patellar','Lower Back','Chest','Shoulders','Hamstrings','Glutes','Arms / Triceps','Calves / Shins'];

export const LogSchoolWorkoutModal: React.FC<Props> = ({ existingLog, onSave, onClose }) => {
  const [weightliftingDate, setWeightliftingDate] = useState(existingLog?.weightliftingDate || (existingLog?.hadWeightliftingClass ? existingLog.date : today));
  const [practiceDate, setPracticeDate] = useState(existingLog?.practiceDate || (existingLog?.hadPractice ? existingLog.date : today));
  const [hadWeightliftingClass, setHadWeightliftingClass] = useState(existingLog?.hadWeightliftingClass ?? false);
  const [classType, setClassType] = useState(existingLog?.classType || 'School Weightlifting Class');
  const [mainLiftExercise, setMainLiftExercise] = useState(existingLog?.mainLiftExercise || 'Back Squat');
  const [customMainLift, setCustomMainLift] = useState('');
  const [weightClassIntensity, setWeightClassIntensity] = useState<'easy'|'moderate'|'heavy'|'exhausting'>(existingLog?.weightClassIntensity || 'moderate');
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>(existingLog?.bodyPartsSoreOrWorked || []);
  const [hadPractice, setHadPractice] = useState(existingLog?.hadPractice ?? false);
  const [practiceSport, setPracticeSport] = useState(existingLog?.practiceSport || 'Basketball');
  const [practiceIntensity, setPracticeIntensity] = useState<'light_shootaround'|'moderate'|'hard_scrimmage'|'exhausting_sprints'>(existingLog?.practiceIntensity || 'moderate');
  const [practiceDurationMinutes, setPracticeDurationMinutes] = useState(existingLog?.practiceDurationMinutes || 90);
  const [howHardItLeftMe, setHowHardItLeftMe] = useState(existingLog?.howHardItLeftMe || 'Felt normal after activity');
  const [notes, setNotes] = useState(existingLog?.notes || '');
  const toggle = (p: string) => setSelectedBodyParts((x) => x.includes(p) ? x.filter((v) => v !== p) : [...x, p]);

  const saveLog = () => {
    const liftDate = hadWeightliftingClass ? weightliftingDate : undefined;
    const sportDate = hadPractice ? practiceDate : undefined;
    const log: SchoolWorkoutLog = {
      id: existingLog?.id || `school-log-${Date.now()}`,
      date: liftDate || sportDate || today,
      timestamp: new Date().toISOString(),
      weightliftingDate: liftDate,
      practiceDate: sportDate,
      hadWeightliftingClass,
      classType: hadWeightliftingClass ? classType : undefined,
      mainLiftExercise: hadWeightliftingClass ? (customMainLift.trim() || mainLiftExercise) : undefined,
      weightClassIntensity: hadWeightliftingClass ? weightClassIntensity : undefined,
      bodyPartsSoreOrWorked: hadWeightliftingClass ? selectedBodyParts : [],
      hadPractice,
      practiceSport: hadPractice ? practiceSport : undefined,
      practiceIntensity: hadPractice ? practiceIntensity : undefined,
      practiceDurationMinutes: hadPractice ? practiceDurationMinutes : undefined,
      howHardItLeftMe,
      notes: notes.trim() || undefined
    };
    onSave(log); onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md overflow-y-auto">
    <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden my-auto">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400"><GraduationCap className="w-5 h-5" /></div><div><h3 className="font-bold">Log School Lift &amp; Practice</h3><p className="text-xs text-zinc-400">Use the actual date for each activity so recovery is calculated correctly.</p></div></div><button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button></div>
      <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
        <section className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-indigo-400"/><b>School Weightlifting Class</b></div><button type="button" onClick={() => setHadWeightliftingClass(!hadWeightliftingClass)} className={`px-3 py-1 rounded-full text-xs font-semibold ${hadWeightliftingClass ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{hadWeightliftingClass ? 'Yes' : 'No'}</button></div>
        {hadWeightliftingClass && <div className="space-y-4 pt-2 border-t border-zinc-800"><div><label className="text-xs text-zinc-400 block mb-1.5">Date you did the class</label><input type="date" max={today} value={weightliftingDate} onChange={(e)=>setWeightliftingDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"/></div><div><label className="text-xs text-zinc-400 block mb-1.5">Class type</label><input value={classType} onChange={(e)=>setClassType(e.target.value)} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"/></div><div><label className="text-xs text-zinc-400 block mb-1.5">Main lift</label><div className="flex flex-wrap gap-1.5">{COMMON_MAIN_LIFTS.map((lift)=><button key={lift} type="button" onClick={()=>{setMainLiftExercise(lift);setCustomMainLift('')}} className={`px-2.5 py-1 rounded-lg text-xs ${mainLiftExercise===lift&&!customMainLift?'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40':'bg-zinc-800 text-zinc-400'}`}>{lift}</button>)}</div><input value={customMainLift} onChange={(e)=>setCustomMainLift(e.target.value)} placeholder="Custom lift" className="w-full mt-2 p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs"/></div><div><label className="text-xs text-zinc-400 block mb-1.5">Worked or sore areas</label><div className="flex flex-wrap gap-1.5">{BODY_PARTS.map((p)=><button key={p} type="button" onClick={()=>toggle(p)} className={`px-2.5 py-1 rounded-lg text-xs ${selectedBodyParts.includes(p)?'bg-rose-500/20 text-rose-300 border border-rose-500/40':'bg-zinc-800 text-zinc-400'}`}>{selectedBodyParts.includes(p)&&<CheckCircle2 className="inline w-3 h-3 mr-1"/>}{p}</button>)}</div></div><div><label className="text-xs text-zinc-400 block mb-1.5">Class intensity</label><div className="grid grid-cols-4 gap-1.5">{(['easy','moderate','heavy','exhausting'] as const).map(x=><button key={x} type="button" onClick={()=>setWeightClassIntensity(x)} className={`py-1.5 rounded-lg text-xs capitalize ${weightClassIntensity===x?'bg-amber-500/20 text-amber-300 border border-amber-500/40':'bg-zinc-800 text-zinc-400'}`}>{x}</button>)}</div></div></div>}</section>
        <section className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400"/><b>Team Practice</b></div><button type="button" onClick={()=>setHadPractice(!hadPractice)} className={`px-3 py-1 rounded-full text-xs font-semibold ${hadPractice?'bg-emerald-600 text-white':'bg-zinc-800 text-zinc-400'}`}>{hadPractice?'Yes':'No'}</button></div>
        {hadPractice && <div className="space-y-4 pt-2 border-t border-zinc-800"><div><label className="text-xs text-zinc-400 block mb-1.5">Date you had practice</label><input type="date" max={today} value={practiceDate} onChange={(e)=>setPracticeDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"/></div><div><label className="text-xs text-zinc-400 block mb-1.5">Sport</label><input value={practiceSport} onChange={(e)=>setPracticeSport(e.target.value)} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"/></div><div><label className="text-xs text-zinc-400 block mb-1.5">Practice intensity</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">{[['light_shootaround','Light'],['moderate','Moderate'],['hard_scrimmage','Hard'],['exhausting_sprints','Sprints']].map(([id,label])=><button key={id} type="button" onClick={()=>setPracticeIntensity(id as any)} className={`py-1.5 rounded-lg text-xs ${practiceIntensity===id?'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40':'bg-zinc-800 text-zinc-400'}`}>{label}</button>)}</div></div><div><label className="text-xs text-zinc-400 block mb-1.5">Duration (minutes)</label><input type="number" min={1} max={300} value={practiceDurationMinutes} onChange={(e)=>setPracticeDurationMinutes(Number(e.target.value)||90)} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"/></div><div><label className="text-xs text-zinc-400 block mb-1.5">How did it leave you feeling?</label><input value={howHardItLeftMe} onChange={(e)=>setHowHardItLeftMe(e.target.value)} className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"/></div></div>}</section>
        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex gap-2 text-xs text-zinc-300"><Sparkles className="w-4 h-4 text-indigo-400 shrink-0"/><span>Lifted uses both dates to adjust recovery, future workouts, mobility, plyometrics, and coach advice.</span></div>
        <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={2} placeholder="Optional notes" className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm"/>
      </div>
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex justify-between"><button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400">Cancel</button><button onClick={saveLog} className="px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold">Save &amp; Adapt</button></div>
    </div>
  </div>;
};
