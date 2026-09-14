import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { RuntimeErrorBoundary } from './components/RuntimeErrorBoundary';
import { DEFAULT_PROFILE } from './services/storage';
import './services/api';
import './services/storageRoutines';
import './index.css';
import './modern-theme.css';

try {
  const key = 'ai_coach_user_profile_v1';
  const raw = localStorage.getItem(key);
  if (raw) {
    const saved = JSON.parse(raw);
    const normalized = {
      ...DEFAULT_PROFILE, ...saved,
      goals: Array.isArray(saved.goals) ? saved.goals : DEFAULT_PROFILE.goals,
      availableEquipment: Array.isArray(saved.availableEquipment) ? saved.availableEquipment : DEFAULT_PROFILE.availableEquipment,
      limitations: Array.isArray(saved.limitations) ? saved.limitations : [],
      specificInjuries: Array.isArray(saved.specificInjuries) ? saved.specificInjuries : [],
      dislikedExercises: Array.isArray(saved.dislikedExercises) ? saved.dislikedExercises : [],
      favoriteExercises: Array.isArray(saved.favoriteExercises) ? saved.favoriteExercises : [],
      neverRecommendExercises: Array.isArray(saved.neverRecommendExercises) ? saved.neverRecommendExercises : [],
    };
    localStorage.setItem(key, JSON.stringify(normalized));
  }
} catch (error) { console.warn('Lifted profile normalization skipped:', error); }

const root = document.getElementById('root');
if (!root) throw new Error('Lifted root element was not found.');

createRoot(root).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <App />
    </RuntimeErrorBoundary>
  </StrictMode>,
);
