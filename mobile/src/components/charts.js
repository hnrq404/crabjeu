// Gráficos do painel do educador, feitos com Views (funcionam igual no app e na web).
// Cores validadas (inclusive para daltonismo): acertos em azul, erros no laranja do Crabjeu.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from './ui';
import { colors, radius, space } from '../theme';

export const chartColors = {
  correct: '#257DE0',
  wrong: '#C64817',
  track: '#F6E7DD',
  grid: '#E4E4E4',
};

const CHART_H = 120;
const MIN_SAMPLE = 5;

function shortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function Legend() {
  return (
    <View style={styles.legend}>
      {[
        ['Acertos', chartColors.correct],
        ['Erros', chartColors.wrong],
      ].map(([label, color]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Txt style={styles.legendText}>{label}</Txt>
        </View>
      ))}
    </View>
  );
}

/** Colunas empilhadas por dia: acertos (base) + erros (topo). Toque/passe o mouse para ver o dia. */
export function DailyChart({ daily }) {
  const [selected, setSelected] = useState(null);
  const max = Math.max(1, ...daily.map(d => d.correct + d.wrong));
  const total = daily.reduce((sum, d) => sum + d.correct + d.wrong, 0);
  const activeDays = daily.filter(d => d.correct + d.wrong > 0).length;
  const day = selected !== null ? daily[selected] : null;

  return (
    <View>
      <View style={styles.chartHeader}>
        <Legend />
        <Txt weight="semibold" style={styles.readout} accessibilityLiveRegion="polite">
          {day
            ? `${shortDate(day.date)}: ${day.correct} ${day.correct === 1 ? 'acerto' : 'acertos'} · ${day.wrong} ${day.wrong === 1 ? 'erro' : 'erros'}`
            : `${total} respostas em ${activeDays} ${activeDays === 1 ? 'dia' : 'dias'}`}
        </Txt>
      </View>

      <View style={styles.plot}>
        <View style={styles.axis}>
          <Txt style={styles.axisText}>{max}</Txt>
          <Txt style={styles.axisText}>0</Txt>
        </View>
        <View style={styles.bars}>
          <View style={[styles.gridLine, { top: 0 }]} />
          {daily.map((d, i) => {
            const sum = d.correct + d.wrong;
            const height = (sum / max) * CHART_H;
            const wrongH = sum ? (d.wrong / sum) * height : 0;
            const correctH = height - wrongH;
            const on = selected === i;
            return (
              <Pressable
                key={d.date}
                onPress={() => setSelected(i)}
                onHoverIn={() => setSelected(i)}
                onHoverOut={() => setSelected(null)}
                accessibilityRole="button"
                accessibilityLabel={`${shortDate(d.date)}: ${d.correct} acertos e ${d.wrong} erros`}
                style={[styles.column, on && styles.columnOn]}
              >
                {d.wrong ? (
                  <View style={[styles.segment, styles.top, { height: Math.max(2, wrongH - (d.correct ? 2 : 0)), backgroundColor: chartColors.wrong }]} />
                ) : null}
                {d.correct && d.wrong ? <View style={styles.gap} /> : null}
                {d.correct ? (
                  <View style={[styles.segment, !d.wrong && styles.top, { height: Math.max(2, correctH), backgroundColor: chartColors.correct }]} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.xAxis}>
        <Txt style={styles.axisText}>{shortDate(daily[0].date)}</Txt>
        <Txt style={styles.axisText}>{shortDate(daily[Math.floor(daily.length / 2)].date)}</Txt>
        <Txt style={styles.axisText}>hoje</Txt>
      </View>
    </View>
  );
}

/**
 * Lista de medidores: uma linha por grupo (tema, dificuldade, tipo) com a taxa de erro.
 * ranked = ordena da maior taxa de erro para a menor.
 */
export function ErrorMeters({ rows, ranked = false, limit, emptyText = 'Ainda sem respostas.' }) {
  const [expanded, setExpanded] = useState(false);
  const data = rows.filter(r => r.answered > 0);
  if (!data.length) return <Txt style={styles.empty}>{emptyText}</Txt>;

  const sorted = ranked
    ? [...data].sort((a, b) => b.wrong / b.answered - a.wrong / a.answered || b.wrong - a.wrong)
    : data;
  const visible = limit && !expanded ? sorted.slice(0, limit) : sorted;

  return (
    <View>
      {visible.map(r => {
        const pct = percent(r.wrong, r.answered);
        const few = r.answered < MIN_SAMPLE;
        return (
          <View key={r.key} style={styles.meterRow} accessible accessibilityLabel={`${r.label}: ${r.wrong} erros em ${r.answered} respostas, ${pct}%`}>
            <View style={styles.meterHead}>
              <Txt weight="semibold" style={styles.meterLabel} numberOfLines={1}>{r.label}</Txt>
              <Txt weight="bold" style={styles.meterPct}>{pct}%</Txt>
            </View>
            <View style={styles.track}>
              {pct > 0 ? <View style={[styles.fill, { width: `${Math.max(pct, 2)}%` }]} /> : null}
            </View>
            <Txt style={styles.meterSub}>
              {r.wrong} {r.wrong === 1 ? 'erro' : 'erros'} em {r.answered} {r.answered === 1 ? 'resposta' : 'respostas'}
              {few ? ' · poucas respostas ainda' : ''}
            </Txt>
          </View>
        );
      })}
      {limit && sorted.length > limit ? (
        <Pressable onPress={() => setExpanded(e => !e)} accessibilityRole="button" hitSlop={8} style={styles.more}>
          <Txt weight="semibold" style={styles.moreText}>
            {expanded ? 'Mostrar menos' : `Ver todos (${sorted.length})`}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Section({ title, hint, children }) {
  return (
    <View style={styles.section}>
      <Txt weight="bold" style={styles.sectionTitle}>{title}</Txt>
      {hint ? <Txt style={styles.sectionHint}>{hint}</Txt> : null}
      <View style={{ marginTop: space.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  sectionTitle: { fontSize: 16, color: colors.ink },
  sectionHint: { fontSize: 12, color: colors.muted, marginTop: 2 },

  chartHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: space.xs, marginBottom: space.sm },
  legend: { flexDirection: 'row', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.ink },
  readout: { fontSize: 12, color: colors.ink },

  plot: { flexDirection: 'row', height: CHART_H },
  axis: { justifyContent: 'space-between', paddingRight: 6, marginTop: -6, marginBottom: -6 },
  axisText: { fontSize: 11, color: colors.muted },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.line },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: chartColors.grid },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 1, borderRadius: 3 },
  columnOn: { backgroundColor: 'rgba(0,0,0,0.06)' },
  segment: { width: '100%' },
  top: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  gap: { height: 2 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginLeft: 22 },

  meterRow: { marginBottom: space.md },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm },
  meterLabel: { fontSize: 14, color: colors.ink, flexShrink: 1 },
  meterPct: { fontSize: 14, color: colors.ink },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: chartColors.track, marginTop: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: chartColors.wrong },
  meterSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  more: { alignSelf: 'flex-start', paddingVertical: 4 },
  moreText: { fontSize: 13, color: colors.orangeDark, textDecorationLine: 'underline' },

  empty: { fontSize: 13, color: colors.muted, paddingVertical: space.sm },
});
