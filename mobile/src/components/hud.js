import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme';
import { AvatarIcon } from './art';
import { AlertIcon, ClockIcon, CloudIcon, CloudOffIcon, FlameIcon, KeyIcon, StarIcon, SyncIcon } from './icons';
import { Coins, Txt } from './ui';

const SYNC_STATES = {
  synced: { Icon: CloudIcon, text: 'Progresso salvo no servidor' },
  offline: { Icon: CloudOffIcon, text: 'Offline — progresso salvo no aparelho' },
  auth: { Icon: KeyIcon, text: 'Entre com internet para sincronizar' },
  error: { Icon: AlertIcon, text: 'Falha ao sincronizar' },
  syncing: { Icon: SyncIcon, text: 'Sincronizando...' },
};

function syncStatus(sync, pending) {
  if (pending > 0 && sync?.state !== 'syncing') {
    return { Icon: ClockIcon, text: `${pending} resposta${pending > 1 ? 's' : ''} aguardando internet` };
  }
  return SYNC_STATES[sync?.state] ?? null;
}

function Stat({ children, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed, focused }) => [styles.stat, pressed && { transform: [{ scale: 0.94 }] }, focused && styles.focused]}
    >
      {children}
    </Pressable>
  );
}

/** Barra do topo da trilha: avatar (abre configurações), ofensiva, moedas e nível. */
export function TopBar({ user, stats, sync, onAvatar, onStreak }) {
  const status = syncStatus(sync, stats.pending);
  const streak = stats.streak ?? { current: 0, activeToday: false };
  return (
    <View style={styles.topWrap}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onAvatar}
          accessibilityRole="button"
          accessibilityLabel={`${user.username}: abrir configurações`}
          style={({ pressed, focused }) => [styles.topAvatar, pressed && { transform: [{ scale: 0.94 }] }, focused && styles.focused]}
        >
          <AvatarIcon avatarKey={user.avatar_key} size={22} />
        </Pressable>
        <View style={styles.stats}>
          <Stat onPress={onStreak} label={`Ofensiva: ${streak.current} dias`}>
            <FlameIcon size={24} off={!streak.activeToday} />
            <Txt weight="bold" style={[styles.statText, { color: streak.activeToday ? '#FFB13B' : '#D8D2CA' }]}>
              {streak.current}
            </Txt>
          </Stat>
          <Stat label={`${stats.coins} moedas`}>
            <Coins value={stats.coins} size={16} textStyle={[styles.statText, { color: colors.gold }]} />
          </Stat>
          <Stat label={`Nível ${stats.level}`}>
            <StarIcon size={22} />
            <Txt weight="bold" style={[styles.statText, { color: colors.white }]}>
              {stats.level}
            </Txt>
          </Stat>
        </View>
      </View>
      {status ? (
        <View style={styles.topSync} accessibilityLiveRegion="polite">
          <status.Icon size={12} color="rgba(255,255,255,0.85)" strokeWidth={2.6} />
          <Txt weight="semibold" style={styles.topSyncText}>
            {status.text}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/** Barra "Nível N" da tela inicial. */
export function LevelBar({ level, into, needed, remaining, tier, nextTier, phases }) {
  const doneCount = (phases ?? []).filter(p => p.state === 'done').length;
  const pct = Math.max(0, Math.min(1, needed ? into / needed : 0));
  return (
    <View style={styles.level}>
      <View style={styles.levelHead}>
        <View style={styles.levelBadge}>
          <StarIcon size={18} />
          <Txt weight="bold" style={styles.levelTitle}>
            Nível {level}
          </Txt>
          {tier ? (
            <Txt weight="semibold" style={styles.tierTitle} numberOfLines={1}>
              {tier.title}
            </Txt>
          ) : null}
        </View>
        <Coins value={`${into}/${needed}`} size={13} textStyle={{ color: colors.white }} />
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: needed, now: into }}
        accessibilityLabel={`Progresso do nível ${level}`}
      >
        <View style={[styles.fillBar, { width: `${pct * 100}%` }]}>
          <View style={styles.fillShine} />
        </View>
      </View>
      <View style={styles.hintRow}>
        <Txt style={styles.levelHint}>Faltam </Txt>
        <Coins value={remaining} size={12} weight="bold" textStyle={{ color: colors.white }} />
        <Txt style={styles.levelHint}> para o nível {level + 1}!</Txt>
      </View>
      {phases?.length ? (
        <Txt style={styles.tierHint}>
          {doneCount} de {phases.length} fases concluídas
          {nextTier ? ` · No nível ${nextTier.minLevel} você vira ${nextTier.title}` : ''}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topWrap: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.xs, zIndex: 10, alignItems: 'center' },
  topBar: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: space.sm,
  },
  topAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderColor: colors.white,
  },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: space.sm, borderRadius: radius.pill },
  statText: { fontSize: 17, marginLeft: 4 },
  focused: { outlineWidth: 3, outlineColor: colors.focus, outlineStyle: 'solid', outlineOffset: 2 },
  topSync: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 4 },
  topSyncText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginLeft: 4 },
  level: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  levelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  levelBadge: { flexDirection: 'row', alignItems: 'center' },
  levelTitle: { color: colors.white, fontSize: 16, marginLeft: 6 },
  track: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
  },
  fillBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.gold, borderRadius: 6, overflow: 'hidden' },
  fillShine: { position: 'absolute', left: 4, right: 4, top: 2, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' },
  levelHint: { color: colors.white, fontSize: 12 },
  tierTitle: {
    color: colors.ink,
    backgroundColor: colors.gold,
    fontSize: 11,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 1,
    marginLeft: space.sm,
    flexShrink: 1,
  },
  tierHint: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', marginTop: 4 },
});
