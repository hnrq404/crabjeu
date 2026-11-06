import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MenuBackground } from '../components/backgrounds';
import { LevelBar, UserBadge } from '../components/hud';
import { BackButton, Btn, Message, Popup, Title, Txt } from '../components/ui';
import { DIFFICULTIES, REWARDS } from '../game';
import { COIN, colors, DIFFICULTY_STYLES } from '../theme';
import SettingsPopup from './SettingsPopup';

function DifficultyPopup({ onPick, onClose }) {
  return (
    <Popup style={{ alignItems: 'center' }}>
      <BackButton onPress={onClose} />
      <Title style={{ marginBottom: 14 }}>SELECIONE A DIFICULDADE</Title>
      {DIFFICULTIES.map(d => {
        const s = DIFFICULTY_STYLES[d];
        return (
          <Pressable
            key={d}
            onPress={() => onPick(d)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.diff,
              { backgroundColor: s.color, borderColor: s.border },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Txt weight="bold" style={styles.diffText}>
              {s.label}
            </Txt>
            <Txt style={styles.diffReward}>
              +{REWARDS[d]} {COIN} por acerto
            </Txt>
          </Pressable>
        );
      })}
      <Txt style={styles.note}>Obs.: quanto maior a dificuldade, mais recompensas você pode ganhar!</Txt>
    </Popup>
  );
}

export default function HomeScreen({ user, stats, sync, onStart, onLogout, onUserChange }) {
  const [popup, setPopup] = useState(null); // 'difficulty' | 'settings' | null

  return (
    <MenuBackground>
      <UserBadge user={user} coins={stats.coins} sync={sync} pending={stats.pending} />

      <View style={styles.center}>
        <Btn title="INICIAR" variant="menu" onPress={() => setPopup('difficulty')} style={styles.menuButton} />
        <Btn title="CONFIGURAÇÕES" variant="menu" onPress={() => setPopup('settings')} style={styles.menuButton} />
        <Btn title="SAIR" variant="menu" onPress={onLogout} style={styles.menuButton} />
        {!stats.hasContent ? (
          <Message text="Conecte-se à internet uma vez para baixar as fases." />
        ) : null}
      </View>

      <View style={styles.bottom}>
        <LevelBar {...stats} />
      </View>

      {popup === 'difficulty' ? (
        <DifficultyPopup
          onClose={() => setPopup(null)}
          onPick={d => {
            setPopup(null);
            onStart(d);
          }}
        />
      ) : null}
      {popup === 'settings' ? (
        <SettingsPopup user={user} onClose={() => setPopup(null)} onUserChange={onUserChange} />
      ) : null}
    </MenuBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 50, paddingHorizontal: 16 },
  menuButton: { marginVertical: 8 },
  bottom: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  diff: {
    width: 190,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  diffText: { fontSize: 18, color: colors.ink },
  diffReward: { fontSize: 11, color: colors.ink, opacity: 0.75 },
  note: { fontSize: 11, color: colors.muted, marginTop: 12, textAlign: 'center' },
});
