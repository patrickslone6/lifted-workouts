import fs from 'node:fs';
const file = 'src/App.tsx';
let s = fs.readFileSync(file, 'utf8');
const bad = "yesterday\\\\'s";
const good = "yesterday\\'s";
if (!s.includes(bad)) throw new Error('Expected malformed apostrophe escape was not found');
s = s.replace(bad, good);
fs.writeFileSync(file, s, 'utf8');
console.log('Fixed App.tsx apostrophe escape.');
// Trigger commit after the one-shot workflow exists on main.
