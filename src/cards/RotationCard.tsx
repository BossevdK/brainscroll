import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RotationCardData } from './types';
import { CardShell } from './CardShell';
import { OptionButton, Result } from '../ui/Buttons';
import { answered } from '../ui/feedback';
import { categoryTheme, colors } from '../theme';

const CELL = 22;

function Shape({ cells, color, size }: { cells: [number, number][]; color: string; size: number }) {
  return (
    <View style={styles.shapeBox}>
      {Array.from({ length: size }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {Array.from({ length: size }, (__, c) => {
            const on = cells.some(([rr, cc]) => rr === r && cc === c);
            return <View key={c} style={[styles.cell, on && { backgroundColor: color, borderColor: color }]} />;
          })}
        </View>
      ))}
    </View>
  );
}

/** Is the right shape the left one turned around, or its mirror image? (mental rotation) */
export const RotationCard = memo(function RotationCard({ card, height }: { card: RotationCardData; height: number }) {
  const accent = categoryTheme[card.category].accent;
  const [pick, setPick] = useState<boolean | null>(null); // true = "mirrored"
  const revealed = pick !== null;
  const ok = pick === card.mirrored;
  // 4×4 boxes for small shapes, 5×5 for the big ones at higher levels.
  const gridSize = Math.max(4, ...[...card.a, ...card.b].map(([r, c]) => Math.max(r, c) + 1));

  const choose = (mirrored: boolean) => {
    setPick(mirrored);
    answered(card, mirrored === card.mirrored);
  };

  return (
    <CardShell category={card.category} level={card.level} label="Same or mirrored?" height={height}>
      <Text style={styles.prompt}>Turn the left shape in your head. Can it become the right one?</Text>
      <View style={styles.shapes}>
        <Shape cells={card.a} color={accent} size={gridSize} />
        <Text style={styles.arrow}>↻</Text>
        <Shape cells={card.b} color={accent} size={gridSize} />
      </View>
      <View style={styles.buttons}>
        <OptionButton
          label="Same shape, turned"
          disabled={revealed}
          state={!revealed ? 'idle' : !card.mirrored ? 'correct' : pick === false ? 'wrong' : 'dim'}
          onPress={() => choose(false)}
        />
        <OptionButton
          label="Mirror image"
          disabled={revealed}
          state={!revealed ? 'idle' : card.mirrored ? 'correct' : pick ? 'wrong' : 'dim'}
          onPress={() => choose(true)}
        />
      </View>
      {revealed && (
        <Result
          ok={ok}
          title={ok ? 'Correct!' : 'Not quite.'}
          text={card.mirrored ? 'It was flipped: no amount of turning makes them match.' : 'Just rotated: turn it and it fits exactly.'}
        />
      )}
    </CardShell>
  );
});

const styles = StyleSheet.create({
  prompt: { color: colors.text, fontSize: 22, lineHeight: 29, fontWeight: '800' },
  shapes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 28 },
  shapeBox: { padding: 8, borderRadius: 12, backgroundColor: colors.surface },
  cell: { width: CELL, height: CELL, margin: 1.5, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  arrow: { color: colors.textDim, fontSize: 30 },
  buttons: { gap: 10 },
});
