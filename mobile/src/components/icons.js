// Ícones de interface em SVG (traço arredondado, um único estilo).
// Usados no lugar de emoji para ficarem iguais em qualquer aparelho.

import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

function Base({ size = 24, color = colors.ink, strokeWidth = 2.4, children, style }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </Svg>
  );
}

export const BackIcon = p => (
  <Base {...p}>
    <Path d="M9 14 4 9l5-5" />
    <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Base>
);

export const SpeakerIcon = p => (
  <Base {...p}>
    <Path d="M11 5 6 9H2v6h4l5 4V5Z" fill={p.color ?? colors.ink} />
    <Path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <Path d="M19 5a10 10 0 0 1 0 14" />
  </Base>
);

export const MicIcon = p => (
  <Base {...p}>
    <Rect x={9} y={2} width={6} height={12} rx={3} fill={p.color ?? colors.ink} />
    <Path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <Path d="M12 18v4M8 22h8" />
  </Base>
);

export const CheckIcon = p => (
  <Base {...p}>
    <Path d="M20 6 9 17l-5-5" />
  </Base>
);

export const CrossIcon = p => (
  <Base {...p}>
    <Path d="M18 6 6 18M6 6l12 12" />
  </Base>
);

export const ChevronIcon = p => (
  <Base {...p}>
    <Path d="m9 18 6-6-6-6" />
  </Base>
);

export const PlayIcon = p => (
  <Base {...p}>
    <Path d="M7 4v16l13-8L7 4Z" fill={p.color ?? colors.ink} />
  </Base>
);

export const GearIcon = p => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Base>
);

export const LogoutIcon = p => (
  <Base {...p}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="m16 17 5-5-5-5M21 12H9" />
  </Base>
);

export const CloudIcon = p => (
  <Base {...p}>
    <Path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </Base>
);

export const CloudOffIcon = p => (
  <Base {...p}>
    <Path d="m2 2 20 20" />
    <Path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.2" />
    <Path d="M21.53 16.4A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 10.2 5.1" />
  </Base>
);

export const SyncIcon = p => (
  <Base {...p}>
    <Path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <Path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <Path d="M3 21v-5h5M21 3v5h-5" />
  </Base>
);

export const ClockIcon = p => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={9} />
    <Path d="M12 7v5l3 2" />
  </Base>
);

export const AlertIcon = p => (
  <Base {...p}>
    <Path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <Path d="M12 9v4M12 17h.01" />
  </Base>
);

export const KeyIcon = p => (
  <Base {...p}>
    <Circle cx={7.5} cy={15.5} r={4.5} />
    <Path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2" />
  </Base>
);

export const StarIcon = ({ size = 24, color = colors.gold, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <Path
      d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"
      fill={color}
      stroke="#C98F00"
      strokeWidth={1.2}
      strokeLinejoin="round"
    />
  </Svg>
);

/** Moeda do jogo (substitui o emoji 🪙, que não aparece em todo aparelho). */
export function CoinIcon({ size = 16, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <G>
        <Circle cx={12} cy={12.8} r={10} fill="#C98F00" />
        <Circle cx={12} cy={11.2} r={10} fill={colors.gold} />
        <Circle cx={12} cy={11.2} r={6.6} fill="none" stroke="#FFD94D" strokeWidth={1.6} />
        <Path d="M8.6 8.4a5 5 0 0 1 3.4-1.8" stroke="#FFF3B0" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </G>
    </Svg>
  );
}

/** Foguinho da ofensiva. `off` = ainda não jogou hoje (cinza). */
export function FlameIcon({ size = 24, off = false, style }) {
  const outer = off ? '#B9B2AA' : '#FF7A1A';
  const inner = off ? '#DCD6CF' : colors.gold;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path
        d="M12 1.8c.6 3.2 2.6 4.9 4.3 6.8 1.7 1.9 3.2 4 3.2 6.9A7.5 7.5 0 0 1 12 23a7.5 7.5 0 0 1-7.5-7.5c0-2.9 1.5-4.9 2.7-6.3.3 1.6 1.1 2.7 2.2 3.3C9 9 10.2 5.2 12 1.8Z"
        fill={outer}
        stroke={off ? '#9C948B' : colors.orangeDark}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path d="M12 11.5c1.9 1.6 3.5 3.1 3.5 5.2a3.5 3.5 0 0 1-7 0c0-1.3.6-2.3 1.3-3 .2.8.6 1.3 1.1 1.5-.1-1.5.3-2.7 1.1-3.7Z" fill={inner} />
    </Svg>
  );
}

export const LockIcon = p => (
  <Base {...p}>
    <Rect x={4} y={11} width={16} height={10} rx={2.5} fill={p.color ?? colors.ink} />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Base>
);

export const CloseIcon = p => (
  <Base {...p}>
    <Path d="M18 6 6 18M6 6l12 12" />
  </Base>
);

export const CrownIcon = ({ size = 24, color = colors.gold, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <Path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" fill={color} stroke="#C98F00" strokeWidth={1.3} strokeLinejoin="round" />
    <Circle cx={12} cy={14.5} r={1.6} fill="#FFF3B0" />
  </Svg>
);

export const TargetIcon = p => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={9} />
    <Circle cx={12} cy={12} r={5} />
    <Circle cx={12} cy={12} r={1.5} fill={p.color ?? colors.ink} />
  </Base>
);
