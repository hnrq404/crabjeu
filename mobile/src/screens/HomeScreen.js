import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Crab } from '../components/art';
import { MenuBackground } from '../components/backgrounds';
import { LevelBar, TopBar } from '../components/hud';
import { CrownIcon, LockIcon, PlayIcon, StarIcon } from '../components/icons';
import { StreakPopup } from '../components/streak';
import { Message, Txt, useReducedMotion } from '../components/ui';
import { colors, DIFFICULTY_STYLES, radius, space } from '../theme';
import SettingsPopup from './SettingsPopup';

const NATIVE_DRIVER = Platform.OS !== 'web';
const NODE = 76;
const RING = NODE + 18;
// Deslocamento horizontal de cada nó: a trilha faz curvas em zigue-zague.
const ZIGZAG = [0, 56, 84, 56, 0, -56, -84, -56];

const NODE_COLORS = {
  done: { bg: colors.gold, edge: '#C98F00' },
  current: { bg: colors.orangeDark, edge: colors.orangeShadow },
  open: { bg: '#D9622E', edge: '#9C3A10' },
  locked: { bg: '#5E6650', edge: '#3E4535' },
};

function ProgressRing({ pct, color }) {
  const r = RING / 2 - 4;
  const length = 2 * Math.PI * r;
  return (
    <Svg width={RING} height={RING} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={6} fill="none" />
      {pct > 0 ? (
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${length * pct} ${length}`}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      ) : null}
    </Svg>
  );
}

/** Balão "COMEÇAR" que flutua sobre o tema atual. */
function StartBubble() {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <Animated.View pointerEvents="none" style={[styles.bubble, { transform: [{ translateY }] }]}>
      <Txt weight="bold" style={styles.bubbleText}>
        COMEÇAR
      </Txt>
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
}

function DiffStars({ difficulty, dim }) {
  const n = DIFFICULTY_STYLES[difficulty].stars;
  return (
    <View style={[styles.diffStars, dim && { opacity: 0.45 }]}>
      {[0, 1, 2].map(i => (
        <StarIcon key={i} size={11} color={i < n ? colors.gold : 'rgba(255,255,255,0.25)'} />
      ))}
    </View>
  );
}

function PathNode({ phase, offset, onPress }) {
  const c = NODE_COLORS[phase.state];
  const icon =
    phase.state === 'locked' ? (
      <LockIcon size={28} color="#C9CDBF" />
    ) : phase.state === 'done' ? (
      <CrownIcon size={36} color={colors.white} />
    ) : (
      <PlayIcon size={30} color={colors.white} />
    );
  const diffLabel = DIFFICULTY_STYLES[phase.difficulty].label.toLowerCase();
  const label =
    phase.state === 'locked'
      ? `Fase ${phase.number}, ${phase.module.title}, ${diffLabel}, trancada`
      : `Fase ${phase.number}, ${phase.module.title}, ${diffLabel}, ${phase.done} de ${phase.total} perguntas`;

  return (
    <View style={[styles.nodeRow, phase.state === 'current' && styles.nodeRowCurrent, { transform: [{ translateX: offset }] }]}>
      {phase.state === 'current' ? <StartBubble /> : null}
      <View style={styles.ringWrap}>
        {phase.state !== 'locked' ? <ProgressRing pct={phase.pct} color={phase.state === 'done' ? colors.gold : '#FFB13B'} /> : null}
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed, focused }) => [
            styles.node,
            { backgroundColor: c.bg, borderBottomColor: c.edge },
            pressed && styles.nodePressed,
            focused && styles.focused,
          ]}
        >
          {icon}
        </Pressable>
      </View>
      <Txt weight="bold" style={[styles.nodeLabel, phase.state === 'locked' && { color: 'rgba(255,255,255,0.5)' }]} numberOfLines={1}>
        {phase.module.title}
      </Txt>
      <DiffStars difficulty={phase.difficulty} dim={phase.state === 'locked'} />
    </View>
  );
}

/** Faixa que separa as unidades da trilha. */
function UnitHeader({ unit, titles, locked }) {
  return (
    <View style={[styles.unit, locked && { opacity: 0.6 }]}>
      <View style={styles.unitLine} />
      <View style={styles.unitPill}>
        <Txt weight="bold" style={styles.unitKicker}>
          UNIDADE {unit}
        </Txt>
        <Txt weight="semibold" style={styles.unitTitles} numberOfLines={2}>
          {titles.join(' · ')}
        </Txt>
      </View>
      <View style={styles.unitLine} />
    </View>
  );
}

/** Cartão da fase atual no topo da trilha. */
function PhaseBanner({ phase }) {
  if (!phase) return null;
  const diff = DIFFICULTY_STYLES[phase.difficulty];
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Txt weight="bold" style={styles.bannerKicker}>
          FASE {phase.number} · {diff.label}
        </Txt>
        <Txt weight="bold" style={styles.bannerTitle}>
          {phase.module.title}
        </Txt>
        {phase.module.description ? <Txt style={styles.bannerText}>{phase.module.description}</Txt> : null}
        <View style={styles.bannerTrack}>
          <View style={[styles.bannerFill, { width: `${Math.round(phase.pct * 100)}%` }]} />
        </View>
        <Txt weight="semibold" style={styles.bannerText}>
          {phase.done}/{phase.total} perguntas respondidas
        </Txt>
      </View>
      <Crab size={64} color="#FFD3BF" />
    </View>
  );
}

export default function HomeScreen({ user, stats, sync, onStart, onLogout, onUserChange }) {
  const [popup, setPopup] = useState(null); // 'settings' | 'streak' | null
  const [toast, setToast] = useState('');
  const scroll = useRef(null);
  const currentY = useRef(null);
  const scrolled = useRef(false);
  const { height } = useWindowDimensions();

  const phases = stats.phases ?? [];
  const current = phases.find(p => p.state === 'current') ?? null;

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function pressPhase(phase) {
    if (phase.state === 'locked') {
      setToast(`Conclua a fase ${current?.number ?? phase.number - 1} (${current?.module.title ?? 'anterior'}) para liberar esta.`);
      return;
    }
    if (phase.state === 'done') {
      setToast('Fase concluída! As perguntas não se repetem: siga para a próxima fase.');
      return;
    }
    onStart(phase.id);
  }

  return (
    <MenuBackground>
      <TopBar user={user} stats={stats} sync={sync} onAvatar={() => setPopup('settings')} onStreak={() => setPopup('streak')} />

      {!stats.hasContent ? (
        <View style={styles.empty}>
          <Crab size={110} color="#E0431B" />
          <Message text="Conecte-se à internet uma vez para baixar as perguntas." style={{ maxWidth: 340 }} />
        </View>
      ) : (
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.path}
          onContentSizeChange={() => {
            if (!scrolled.current && currentY.current !== null) {
              scrolled.current = true;
              // Só rola se o tema atual estiver fora da tela (o cartão do topo continua visível no começo).
              const target = currentY.current - height * 0.35;
              if (currentY.current > height - 320 && target > 0) scroll.current?.scrollTo({ y: target, animated: false });
            }
          }}
        >
          <PhaseBanner phase={current} />
          {phases.map((phase, i) => (
            <View
              key={phase.id}
              style={styles.nodeSlot}
              onLayout={e => {
                if (phase.state === 'current') currentY.current = e.nativeEvent.layout.y;
              }}
            >
              {i === 0 || phases[i - 1].unit !== phase.unit ? (
                <UnitHeader unit={phase.unit} titles={phase.unitTitles} locked={phase.state === 'locked'} />
              ) : null}
              <PathNode phase={phase} offset={ZIGZAG[i % ZIGZAG.length]} onPress={() => pressPhase(phase)} />
            </View>
          ))}
          <View style={styles.pathEnd}>
            <Crab size={72} color="#D4501B" />
            <Txt weight="semibold" style={styles.pathEndText}>
              {current ? 'Mais fases em breve!' : 'Você concluiu todas as fases!'}
            </Txt>
          </View>
        </ScrollView>
      )}

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Message text={toast} />
        </View>
      ) : null}

      <View style={styles.bottom}>
        <LevelBar {...stats} />
      </View>

      {popup === 'settings' ? (
        <SettingsPopup user={user} onClose={() => setPopup(null)} onUserChange={onUserChange} onLogout={onLogout} />
      ) : null}
      {popup === 'streak' ? (
        <StreakPopup
          streak={stats.streak}
          week={stats.week}
          onClose={() => setPopup(null)}
          onPlay={
            current
              ? () => {
                  setPopup(null);
                  onStart(current.id);
                }
              : null
          }
        />
      ) : null}
    </MenuBackground>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  path: { alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.orangeDark,
    borderRadius: radius.lg,
    borderBottomWidth: 5,
    borderBottomColor: colors.orangeShadow,
    padding: space.lg,
    marginBottom: space.xl,
  },
  bannerKicker: { color: '#FFD3BF', fontSize: 12, letterSpacing: 1 },
  bannerTitle: { color: colors.white, fontSize: 22 },
  bannerText: { color: '#FFE6DA', fontSize: 12, marginTop: 2 },
  bannerTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden', marginTop: space.sm },
  bannerFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.gold, borderRadius: 4 },
  nodeSlot: { alignItems: 'center', alignSelf: 'stretch' },
  diffStars: { flexDirection: 'row', marginTop: 2 },
  unit: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 420, marginVertical: space.lg },
  unitLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  unitPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginHorizontal: space.sm,
    maxWidth: 280,
  },
  unitKicker: { color: colors.gold, fontSize: 12, letterSpacing: 1 },
  unitTitles: { color: colors.white, fontSize: 12, textAlign: 'center' },
  nodeRow: { alignItems: 'center', marginBottom: space.lg, width: 160 },
  nodeRowCurrent: { marginTop: 30 },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 7,
  },
  nodePressed: { transform: [{ translateY: 4 }], borderBottomWidth: 3 },
  focused: { outlineWidth: 3, outlineColor: colors.focus, outlineStyle: 'solid', outlineOffset: 2 },
  nodeLabel: { color: colors.white, fontSize: 14, marginTop: 2, textAlign: 'center' },
  bubble: {
    position: 'absolute',
    top: -36,
    zIndex: 3,
    backgroundColor: colors.white,
    borderRadius: radius.sm + 2,
    borderBottomWidth: 3,
    borderBottomColor: colors.whiteShadow,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    alignItems: 'center',
  },
  bubbleText: { color: colors.orangeDark, fontSize: 14, letterSpacing: 1 },
  bubbleTail: {
    position: 'absolute',
    bottom: -9,
    width: 12,
    height: 12,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
  pathEnd: { alignItems: 'center', marginTop: space.md, opacity: 0.8 },
  pathEndText: { color: colors.white, marginTop: space.xs },
  toast: { position: 'absolute', left: space.lg, right: space.lg, bottom: 120, alignItems: 'center', zIndex: 20 },
  bottom: { alignItems: 'center', paddingHorizontal: space.md, paddingBottom: space.md, paddingTop: space.xs },
});
