// Identidade visual extraída do protótipo no Figma (interface/interface_figma.png).

export const colors = {
  orange: '#C64817', // fundo das telas de jogo
  orangeDark: '#A8380C', // botões principais / chips
  orangePattern: '#B23E10',
  jungle: '#26331C', // fundo das telas de menu
  jungleLight: '#3B4A27',
  cream: '#FFF8F0',
  card: '#F2F2F2',
  cardGlass: 'rgba(242, 242, 242, 0.93)',
  white: '#FFFFFF',
  ink: '#1C1C1C',
  muted: '#6B6B6B',
  line: '#CFCFCF',
  label: '#C64817',
  correct: '#2BD94A',
  wrong: '#F02B2B',
  gold: '#F2B705',
  overlay: 'rgba(20, 26, 14, 0.62)',
  // Tons de apoio (sombras sólidas dos botões "3D" e superfícies).
  orangeShadow: '#7E2A08',
  whiteShadow: '#C9BBAE',
  cardShadow: '#BDB3A8',
  peach: '#FFF1E6',
  correctDark: '#1E8E3E',
  wrongDark: '#B71C1C',
  focus: '#F2B705',
};

// Escala de espaçamento (grade de 4/8 px) e raios.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const fonts = {
  regular: 'Fredoka_400Regular',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};

// A moeda é desenhada em SVG: veja CoinIcon em components/icons.js.

// Avatares da aba "Avatar" das configurações.
export const AVATARS = [
  { key: 'france', art: 'fr' },
  { key: 'shark', emoji: '🦈' },
  { key: 'crab', art: 'crab' },
  { key: 'lobster', emoji: '🦞' },
  { key: 'trex', emoji: '🦖' },
  { key: 'brazil', art: 'br' },
  { key: 'eiffel', emoji: '🗼' },
  { key: 'unicorn', emoji: '🦄' },
  { key: 'lion', emoji: '🦁' },
  { key: 'dino', emoji: '🦕' },
];

export const DIFFICULTY_STYLES = {
  facil: { label: 'FÁCIL', color: '#DDF7B5', border: '#9BCB55', stars: 1 },
  medio: { label: 'MÉDIO', color: '#FFE08A', border: '#E3B92E', stars: 2 },
  dificil: { label: 'DIFÍCIL', color: '#FFA6A6', border: '#E06666', stars: 3 },
};
