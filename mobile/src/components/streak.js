import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme';
import { FlameIcon } from './icons';
import { Btn, Popup, Txt } from './ui';

/** Fileira com os últimos 7 dias: foguinho aceso nos dias em que o aluno jogou. */
export function StreakWeek({ week, dark = false }) {
  return (
    <View style={styles.week} accessibilityLabel={`Dias jogados na semana: ${week.filter(d => d.active).length} de 7`}>
      {week.map(day => (
        <View key={day.key} style={styles.day}>
          <Txt weight="bold" style={[styles.dayLabel, { color: dark ? colors.white : colors.muted }, day.isToday && styles.today]}>
            {day.label}
          </Txt>
          <View style={[styles.dayDot, day.active && styles.dayDotOn, day.isToday && !day.active && styles.dayDotToday]}>
            <FlameIcon size={20} off={!day.active} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function streakMessage(streak) {
  if (streak.activeToday) return 'Você já jogou hoje! Volte amanhã para o foguinho continuar aceso.';
  if (streak.current > 0) return 'Jogue uma rodada hoje para não perder sua ofensiva!';
  return 'Jogue uma rodada para acender o primeiro foguinho!';
}

/** Pop-up da ofensiva (aberto ao tocar no foguinho da barra do topo). */
export function StreakPopup({ streak, week, onClose, onPlay }) {
  return (
    <Popup style={{ alignItems: 'center' }}>
      <View style={styles.bigFlame}>
        <FlameIcon size={84} off={!streak.activeToday} />
        <Txt weight="bold" style={[styles.bigNumber, !streak.activeToday && { color: colors.muted }]}>
          {streak.current}
        </Txt>
      </View>
      <Txt weight="bold" style={styles.title}>
        {streak.current === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}
      </Txt>
      <Txt style={styles.message}>{streakMessage(streak)}</Txt>
      <View style={styles.weekCard}>
        <StreakWeek week={week} />
      </View>
      <Txt style={styles.best}>
        Seu recorde: <Txt weight="bold">{streak.best} {streak.best === 1 ? 'dia' : 'dias'}</Txt>
      </Txt>
      <View style={styles.actions}>
        <Btn title="Fechar" variant="light" onPress={onClose} style={styles.action} />
        {!streak.activeToday && onPlay ? <Btn title="JOGAR AGORA" onPress={onPlay} style={styles.action} /> : null}
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  day: { alignItems: 'center', flex: 1 },
  dayLabel: { fontSize: 12, marginBottom: 4 },
  today: { color: colors.orangeDark },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEAE4',
  },
  dayDotOn: { backgroundColor: '#FFE7C2' },
  dayDotToday: { borderWidth: 2, borderColor: colors.orangeDark, borderStyle: 'dashed' },
  bigFlame: { alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  bigNumber: { fontSize: 44, color: colors.orangeDark, marginTop: -6 },
  title: { fontSize: 18, marginBottom: space.xs },
  message: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: space.md },
  weekCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  best: { fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: space.md },
  action: { marginHorizontal: space.xs, marginVertical: space.xs },
});
