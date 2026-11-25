import * as Haptics from 'expo-haptics';
import type { CardData } from '../cards/types';
import { useSession } from '../store/session';
import { recordGameResult } from '../store/progress';
import { useStats } from '../store/stats';
import { engagement } from '../store/engagement';
import { useDaily } from '../store/daily';
import { recordReview } from '../store/reviews';

/**
 * Called once when a card is answered. Records everything in one place:
 * streak, stats per category, the game's level, what you enjoy (smart mix),
 * daily challenge progress and spaced-repetition reviews.
 */
export function answered(card: CardData, ok: boolean) {
  const session = useSession.getState();
  session.recordResult(ok);
  useStats.getState().record(card.category, ok, useSession.getState().streak);
  engagement.done(card.game ?? card.kind, card.category);
  if (card.daily) useDaily.getState().record(card.key, ok);
  else if (card.game) recordGameResult(card.game, ok);
  if (card.reviewOf) recordReview(card.reviewOf, ok);
  Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
}

export function tick() {
  Haptics.selectionAsync();
}
