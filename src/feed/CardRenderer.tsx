import type { CardData } from '../cards/types';
import { FactCard } from '../cards/FactCard';
import { HigherLowerCard } from '../cards/HigherLowerCard';
import { ChoiceCard } from '../cards/ChoiceCard';
import { SizeItCard } from '../cards/SizeItCard';
import { EstimateCard } from '../cards/EstimateCard';
import { OrderItCard } from '../cards/OrderItCard';
import { QuickMathCard } from '../cards/QuickMathCard';
import { AnagramCard } from '../cards/AnagramCard';
import { RealFakeCard } from '../cards/RealFakeCard';
import { WordGuessCard } from '../cards/WordGuessCard';
import { OrderMemoryCard } from '../cards/OrderMemoryCard';
import { PatternCard } from '../cards/PatternCard';
import { StroopCard } from '../cards/StroopCard';
import { RotationCard } from '../cards/RotationCard';
import { SudokuCard } from '../cards/SudokuCard';
import { GroupSortCard } from '../cards/GroupSortCard';
import { CountryHuntCard } from '../cards/CountryHuntCard';
import { WordHiveCard } from '../cards/WordHiveCard';
import { CodeBreakerCard } from '../cards/CodeBreakerCard';
import { NonogramCard } from '../cards/NonogramCard';
import { BreakCard } from '../cards/BreakCard';

/** Picks the right component for a card. key={card.key} gives every card fresh state. */
export function CardRenderer({ card, active, height }: { card: CardData; active: boolean; height: number }) {
  switch (card.kind) {
    case 'fact':
      return <FactCard key={card.key} card={card} active={active} height={height} />;
    case 'higherLower':
      return <HigherLowerCard key={card.key} card={card} height={height} />;
    case 'choice':
      return <ChoiceCard key={card.key} card={card} height={height} />;
    case 'sizeIt':
      return <SizeItCard key={card.key} card={card} height={height} />;
    case 'estimate':
      return <EstimateCard key={card.key} card={card} height={height} />;
    case 'orderIt':
      return <OrderItCard key={card.key} card={card} height={height} />;
    case 'quickMath':
      return <QuickMathCard key={card.key} card={card} active={active} height={height} />;
    case 'anagram':
      return <AnagramCard key={card.key} card={card} height={height} />;
    case 'realFake':
      return <RealFakeCard key={card.key} card={card} height={height} />;
    case 'wordGuess':
      return <WordGuessCard key={card.key} card={card} height={height} />;
    case 'orderMemory':
      return <OrderMemoryCard key={card.key} card={card} height={height} />;
    case 'pattern':
      return <PatternCard key={card.key} card={card} height={height} />;
    case 'stroop':
      return <StroopCard key={card.key} card={card} active={active} height={height} />;
    case 'rotation':
      return <RotationCard key={card.key} card={card} height={height} />;
    case 'sudoku':
      return <SudokuCard key={card.key} card={card} height={height} />;
    case 'groupSort':
      return <GroupSortCard key={card.key} card={card} height={height} />;
    case 'countryHunt':
      return <CountryHuntCard key={card.key} card={card} height={height} />;
    case 'wordHive':
      return <WordHiveCard key={card.key} card={card} height={height} />;
    case 'codeBreaker':
      return <CodeBreakerCard key={card.key} card={card} height={height} />;
    case 'nonogram':
      return <NonogramCard key={card.key} card={card} height={height} />;
    case 'break':
      return <BreakCard key={card.key} card={card} height={height} />;
  }
}
