import fs from 'node:fs';
const file='server.ts';
let s=fs.readFileSync(file,'utf8');
const start=s.indexOf("app.post('/api/coach-chat'");
if(start<0) throw new Error('coach endpoint not found');
const end=s.indexOf('\n});',start);
if(end<0) throw new Error('coach endpoint end not found');
const block = String.raw`app.post('/api/coach-chat', async (req, res) => {
  const body = req.body || {};
  const question = String(body.message || body.question || '').trim();
  if (!question) return res.status(400).json({ error: 'A coaching question is required.' });
  const fullContext = athleteContext(body);
  const prompt = String.raw\`You are Lifted Coach AI. Answer the athlete's question using the complete context below. Give practical, concise, age-appropriate coaching advice based on past workouts, exact weights/sets/reps, difficulty feedback, readiness, injuries, school lifting, practice, games, future events, mobility and plyometric activity. Do not invent data. If the question involves pain or an injury, recommend stopping an aggravating movement and involving a qualified adult/clinician rather than diagnosing. Context: \${fullContext}\\nQuestion: \${question}. Return JSON {reply:string,actionItems:string[],relevantData:string[]} .\`;
  try {
    return res.json({ success: true, ...(await askAI(prompt, 'low')) });
  } catch (firstError) {
    console.warn('Coach AI primary request failed:', firstError);
    try {
      const compact = JSON.stringify({ athlete: body.user || {}, readiness: body.readiness || {}, recentHistory: (body.recentHistory || []).slice(0,10), recentSchoolLogs: (body.recentSchoolLogs || []).slice(0,10), activityLog: (body.activityLog || []).slice(-10), question });
      const retryPrompt = String.raw\`You are Lifted Coach AI. Give a concise, age-appropriate answer to the athlete's question from this compact training context. Do not invent data. Return ONLY JSON: {"reply":"string","actionItems":[],"relevantData":[]}. Context: \${compact}\`;
      return res.json({ success: true, ...(await askAI(retryPrompt, 'minimal')) });
    } catch (secondError) {
      console.warn('Coach AI retry failed:', secondError);
      return res.status(503).json({ error: 'Coach AI is temporarily unavailable. Please try again in a moment.' });
    }
  }
});`;
s=s.slice(0,start)+block+s.slice(end+4);
fs.writeFileSync(file,s,'utf8');
console.log('coach AI retry patch applied');
