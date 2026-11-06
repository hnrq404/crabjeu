import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, G, Use } from 'react-native-svg';

import { colors } from '../theme';
import { CRAB_H, CRAB_W, CrabShape } from './art';

// Um único SVG com o caranguejo definido uma vez e reutilizado (<Use>):
// leve mesmo em aparelhos simples.
function CrabField({ width, height, crabs, color, face, opacity }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <G id="crab">
          <CrabShape color={color} face={face} />
        </G>
      </Defs>
      <G opacity={opacity}>
        {crabs.map((c, i) => (
          <Use
            key={i}
            href="#crab"
            transform={`translate(${c.x} ${c.y}) rotate(${c.rot} ${CRAB_W / 2} ${CRAB_H / 2}) scale(${c.scale})`}
          />
        ))}
      </G>
    </Svg>
  );
}

// Caranguejos espalhados sobre a "selva" do mangue (telas de menu).
const MENU_CRABS = [
  { x: 0.02, y: 0.08, s: 1.1, rot: -12 },
  { x: 0.2, y: 0.42, s: 0.8, rot: 8 },
  { x: 0.04, y: 0.68, s: 1.3, rot: 15 },
  { x: 0.72, y: 0.06, s: 1.0, rot: 10 },
  { x: 0.83, y: 0.4, s: 1.2, rot: -8 },
  { x: 0.62, y: 0.66, s: 0.9, rot: -18 },
  { x: 0.38, y: 0.8, s: 0.7, rot: 5 },
  { x: 0.46, y: 0.1, s: 0.6, rot: -4 },
];

export function MenuBackground({ children }) {
  const { width, height } = useWindowDimensions();
  const crabs = useMemo(() => {
    const base = Math.min(Math.max(width, height) / 8, 140);
    return MENU_CRABS.map(c => ({ x: c.x * width, y: c.y * height, rot: c.rot, scale: (c.s * base) / CRAB_W }));
  }, [width, height]);

  return (
    <View style={[styles.fill, { backgroundColor: colors.jungle }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.band, { top: '18%', transform: [{ rotate: '-8deg' }] }]} />
        <View style={[styles.band, { top: '58%', transform: [{ rotate: '6deg' }] }]} />
        <CrabField width={width} height={height} crabs={crabs} color="#D4501B" face opacity={0.85} />
      </View>
      {children}
    </View>
  );
}

// Padrão de silhuetas de caranguejo sobre laranja (telas de jogo).
export function GameBackground({ children }) {
  const { width, height } = useWindowDimensions();
  const crabs = useMemo(() => {
    const step = 92;
    const out = [];
    for (let row = 0; row * step * 0.8 < height + step; row++) {
      for (let col = 0; col * step < width + step; col++) {
        out.push({
          x: col * step + (row % 2 ? step / 2 : 0) - 30,
          y: row * step * 0.8 - 20,
          rot: ((row * 7 + col * 13) % 5) * 10 - 20,
          scale: 0.55,
        });
      }
    }
    return out;
  }, [width, height]);

  return (
    <View style={[styles.fill, { backgroundColor: colors.orange }]}>
      <CrabField width={width} height={height} crabs={crabs} color={colors.orangePattern} face={false} opacity={0.7} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  band: {
    position: 'absolute',
    left: '-10%',
    width: '120%',
    height: 70,
    backgroundColor: colors.jungleLight,
    opacity: 0.7,
    borderRadius: 40,
  },
});
