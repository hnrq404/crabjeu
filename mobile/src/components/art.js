// Ilustrações vetoriais do Crabjeu. Desenhadas em SVG (e não com emoji) para
// ficarem iguais em qualquer aparelho: o emoji 🦀 muda de cor por sistema e o
// Windows não mostra bandeiras.

import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import { AVATARS, colors } from '../theme';

const W = 120;
const H = 90;

/** Metade esquerda do caranguejo; a direita é espelhada. */
function CrabHalf({ color }) {
  return (
    <G>
      <Path d="M36 54 L18 58 L10 70 M38 62 L24 72 L20 84 M44 67 L34 80 L33 88" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M38 46 Q24 42 20 30" stroke={color} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Ellipse cx={17} cy={16} rx={11} ry={8} transform="rotate(-35 17 16)" fill={color} />
      <Ellipse cx={12} cy={28} rx={8} ry={5} transform="rotate(18 12 28)" fill={color} />
      <Path d="M54 38 L50 22" stroke={color} strokeWidth={4} strokeLinecap="round" />
    </G>
  );
}

export const CRAB_W = W;
export const CRAB_H = H;

export function Crab({ size = 48, color = colors.orange, face = true, style }) {
  return (
    <Svg width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} style={style}>
      <CrabShape color={color} face={face} />
    </Svg>
  );
}

export function CrabShape({ color, face }) {
  return (
    <G>
      <CrabHalf color={color} />
      <G transform={`translate(${W} 0) scale(-1 1)`}>
        <CrabHalf color={color} />
      </G>
      <Ellipse cx={60} cy={54} rx={30} ry={20} fill={color} />
      {face ? (
        <G>
          <Circle cx={50} cy={19} r={7.5} fill={colors.white} stroke={color} strokeWidth={2} />
          <Circle cx={70} cy={19} r={7.5} fill={colors.white} stroke={color} strokeWidth={2} />
          <Circle cx={51} cy={20} r={3.6} fill={colors.ink} />
          <Circle cx={69} cy={20} r={3.6} fill={colors.ink} />
          <Path d="M51 58 Q60 65 69 58" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" fill="none" />
          <Ellipse cx={45} cy={50} rx={5} ry={3} fill="#FFFFFF" opacity={0.25} />
        </G>
      ) : (
        <G>
          <Circle cx={50} cy={19} r={6.5} fill={color} />
          <Circle cx={70} cy={19} r={6.5} fill={color} />
        </G>
      )}
    </G>
  );
}

function FlagFR({ size }) {
  return (
    <Svg width={size} height={size * 0.66} viewBox="0 0 30 20">
      <Rect width={10} height={20} fill="#0055A4" />
      <Rect x={10} width={10} height={20} fill="#FFFFFF" />
      <Rect x={20} width={10} height={20} fill="#EF4135" />
    </Svg>
  );
}

function FlagBR({ size }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 30 21">
      <Rect width={30} height={21} fill="#009C3B" />
      <Polygon points="15,2 28,10.5 15,19 2,10.5" fill="#FFDF00" />
      <Circle cx={15} cy={10.5} r={4.8} fill="#002776" />
      <Path d="M10.4 9.6 Q15 8.2 19.6 11" stroke="#FFFFFF" strokeWidth={0.9} fill="none" />
    </Svg>
  );
}

/** Desenha um avatar pela chave (bandeiras e caranguejo em SVG, demais em emoji). */
export function AvatarIcon({ avatarKey, size = 24 }) {
  const avatar = AVATARS.find(a => a.key === avatarKey) || AVATARS.find(a => a.key === 'crab');
  if (avatar.art === 'crab') return <Crab size={size * 1.25} color="#E0431B" />;
  if (avatar.art === 'fr') return <FlagFR size={size * 1.2} />;
  if (avatar.art === 'br') return <FlagBR size={size * 1.2} />;
  return (
    <View>
      <Text style={{ fontSize: size }}>{avatar.emoji}</Text>
    </View>
  );
}
