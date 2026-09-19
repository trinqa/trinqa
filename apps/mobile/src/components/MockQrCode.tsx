import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

const GRID = 21;

function seededCells(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Array.from({ length: GRID * GRID }, (_, index) => {
    hash ^= index + 1;
    hash = Math.imul(hash, 16777619);
    return (hash >>> 0) % 3 !== 0;
  });
}

function finderCell(row: number, column: number) {
  const origins = [[0, 0], [0, GRID - 7], [GRID - 7, 0]];
  for (const [startRow, startColumn] of origins) {
    const localRow = row - startRow;
    const localColumn = column - startColumn;
    if (localRow >= 0 && localRow < 7 && localColumn >= 0 && localColumn < 7) {
      const edge = localRow === 0 || localRow === 6 || localColumn === 0 || localColumn === 6;
      const center = localRow >= 2 && localRow <= 4 && localColumn >= 2 && localColumn <= 4;
      return edge || center;
    }
  }
  return null;
}

export function MockQrCode({ payload, size = 190 }: { payload: string; size?: number }) {
  const cells = seededCells(payload);
  const cellSize = size / GRID;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Receive QR code"
      style={[styles.root, { width: size, height: size }]}
    >
      {cells.map((active, index) => {
        const row = Math.floor(index / GRID);
        const column = index % GRID;
        const finder = finderCell(row, column);
        const visible = finder ?? active;
        return visible ? (
          <View
            key={`${row}-${column}`}
            style={[
              styles.cell,
              {
                left: column * cellSize,
                top: row * cellSize,
                width: Math.ceil(cellSize),
                height: Math.ceil(cellSize),
              },
            ]}
          />
        ) : null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    position: 'relative',
  },
  cell: {
    backgroundColor: colors.textPrimary,
    position: 'absolute',
  },
});
