import React from 'react';
import { StyleSheet, View } from 'react-native';

import { COIN, colors } from '../theme';
import { AvatarIcon } from './art';
import { Txt } from './ui';

const SYNC_LABELS = {
  synced: '☁️ Progresso salvo no servidor',
  offline: '📴 Offline — progresso salvo no aparelho',
  auth: '🔑 Entre com internet para sincronizar',
  error: '⚠️ Falha ao sincronizar',
  syncing: '🔄 Sincronizando...',
};

/** Selo do canto superior direito: avatar + nome + moedas (+ estado da sincronização). */
export function UserBadge({ user, coins, sync, pending }) {
  let label = SYNC_LABELS[sync?.state] ?? '';
  if (pending > 0 && sync?.state !== 'syncing') {
    label = `⏳ ${pending} resposta${pending > 1 ? 's' : ''} aguardando internet`;
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <View style={styles.avatar}>
          <AvatarIcon avatarKey={user.avatar_key} size={20} />
        </View>
        <View style={styles.chip}>
          <Txt weight="bold" style={styles.chipText} numberOfLines={1}>
            {user.username} | {coins} {COIN}
          </Txt>
        </View>
      </View>
      {label ? <Txt style={styles.sync}>{label}</Txt> : null}
    </View>
  );
}

/** Barra "Nível N" da tela inicial. */
export function LevelBar({ level, into, needed, remaining }) {
  return (
    <View style={styles.level}>
      <Txt weight="bold" style={styles.levelTitle}>
        Nível {level}
      </Txt>
      <View style={styles.track}>
        <View style={[styles.fillBar, { width: `${(into / needed) * 100}%` }]} />
        <Txt weight="semibold" style={styles.trackText}>
          {into}/{needed}
        </Txt>
      </View>
      <Txt style={styles.levelHint}>
        Você está a apenas {remaining} {COIN} do nível {level + 1}!
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 10, right: 12, alignItems: 'flex-end', zIndex: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    padding: 3,
    paddingRight: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1E6',
    marginRight: 4,
  },
  chip: { backgroundColor: colors.orangeDark, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, maxWidth: 220 },
  chipText: { color: colors.white, fontSize: 13 },
  sync: {
    marginTop: 4,
    color: colors.white,
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  level: { alignItems: 'center', width: '100%', maxWidth: 360 },
  levelTitle: { color: colors.white, fontSize: 16, marginBottom: 4 },
  track: {
    width: '100%',
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fillBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.gold },
  trackText: { textAlign: 'center', fontSize: 11 },
  levelHint: { color: colors.white, fontSize: 12, marginTop: 4, textAlign: 'center' },
});
