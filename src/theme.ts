import type { Category } from './cards/types.ts';

export const colors = {
  bg: '#0E0F13',
  text: '#F4F2EE',
  textDim: 'rgba(244,242,238,0.62)',
  surface: 'rgba(255,255,255,0.07)',
  surfaceStrong: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.14)',
  good: '#3DDC97',
  bad: '#FF6B6B',
};

/** Accent colour + a dark tinted background per category. */
export const categoryTheme: Record<Category, { accent: string; bg: string; label: string }> = {
  nature: { accent: '#7BD88F', bg: '#0F1A14', label: 'Nature' },
  language: { accent: '#F7B267', bg: '#1C150D', label: 'Language' },
  food: { accent: '#FF8C69', bg: '#1E110E', label: 'Food' },
  science: { accent: '#6EC6FF', bg: '#0D1620', label: 'Science' },
  history: { accent: '#E6C27A', bg: '#1A160D', label: 'History' },
  space: { accent: '#A78BFA', bg: '#130F22', label: 'Space' },
  culture: { accent: '#F472B6', bg: '#1E0F18', label: 'Culture' },
  tech: { accent: '#5EEAD4', bg: '#0C1A19', label: 'Tech' },
  body: { accent: '#FB7185', bg: '#1E0E12', label: 'Human body' },
  geography: { accent: '#60A5FA', bg: '#0D1424', label: 'Geography' },
  brain: { accent: '#FACC15', bg: '#1A170A', label: 'Brain training' },
  random: { accent: '#C4B5FD', bg: '#16141E', label: 'Random' },
};
