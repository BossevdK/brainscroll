import { create } from 'zustand';

type SessionState = {
  answered: number;
  correct: number;
  streak: number;
  bestStreak: number;
  recordResult: (correct: boolean) => void;
};

export const useSession = create<SessionState>((set) => ({
  answered: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  recordResult: (ok) =>
    set((s) => {
      const streak = ok ? s.streak + 1 : 0;
      return {
        answered: s.answered + 1,
        correct: s.correct + (ok ? 1 : 0),
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      };
    }),
}));

/**
 * 0 = easy, 1 = hard. Starts easy and climbs with your streak and hit rate.
 * (Phase 3 replaces this with per-puzzle-type difficulty stored on the device.)
 */
export function currentDifficulty(): number {
  const { answered, correct, streak } = useSession.getState();
  if (answered < 3) return 0.1;
  const hitRate = correct / answered;
  return Math.min(1, Math.max(0, (hitRate - 0.5) * 1.2 + streak * 0.08));
}
