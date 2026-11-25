// Área do educador: acompanha o progresso dos alunos a partir dos dados do servidor.
// Precisa de internet (os dados consolidados ficam no servidor). O token fica só na memória.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { api, WAKE_TIMEOUT_MS } from '../api';
import { Logo } from '../components/art';
import { MenuBackground } from '../components/backgrounds';
import { DailyChart, ErrorMeters, Section, chartColors, percent } from '../components/charts';
import { ChevronIcon, CoinIcon, FlameIcon } from '../components/icons';
import { BackButton, Btn, Field, Message, Txt } from '../components/ui';
import { colors, radius, space } from '../theme';

const DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVE_DAYS = 7;

const SORTS = [
  { key: 'name', label: 'Nome' },
  { key: 'level', label: 'Nível' },
  { key: 'streak', label: 'Ofensiva' },
  { key: 'sync', label: 'Sem sincronizar' },
];

function parseDate(value) {
  if (!value) return null;
  // Datas sem fuso vindas do servidor estão em UTC.
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(date, now = Date.now()) {
  return date ? Math.floor((now - date.getTime()) / DAY_MS) : null;
}

export function syncLabel(date, now = Date.now()) {
  if (!date) return 'Nunca sincronizou';
  const days = daysSince(date, now);
  if (days <= 0) {
    const hours = Math.floor((now - date.getTime()) / (60 * 60 * 1000));
    return hours < 1 ? 'Sincronizou agora há pouco' : `Sincronizou há ${hours} h`;
  }
  return days === 1 ? 'Sincronizou ontem' : `Sincronizou há ${days} dias`;
}

function friendlyError(e) {
  if (e?.offline) return 'Sem conexão com o servidor. A área do educador precisa de internet.';
  if (e?.status === 401) return 'Usuário ou senha inválidos.';
  return e?.message || 'Não foi possível carregar os dados.';
}

export default function EducatorScreen({ onBack }) {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState(null);
  const [overview, setOverview] = useState(null);
  const [openStudent, setOpenStudent] = useState(null); // aluno com os detalhes abertos
  const [loadedAt, setLoadedAt] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');

  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [busy]);

  const load = useCallback(async currentToken => {
    setBusy(true);
    setError('');
    try {
      const [data, stats] = await Promise.all([
        api.educatorStudents(currentToken),
        api.educatorOverview(currentToken),
      ]);
      setStudents(data.map(s => ({ ...s, syncDate: parseDate(s.last_sync) })));
      setOverview(stats);
      setLoadedAt(Date.now());
    } catch (e) {
      if (e?.status === 401 || e?.status === 403) {
        setToken(null);
        setError('Sua sessão de educador expirou. Entre de novo.');
      } else {
        setError(friendlyError(e));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  async function login() {
    setError('');
    if (!username.trim() || !password) {
      setError('Preencha usuário e senha.');
      return;
    }
    setBusy(true);
    let result;
    try {
      result = await api.login(username.trim().toLowerCase(), password, { timeoutMs: WAKE_TIMEOUT_MS });
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    if (result.user.role !== 'educator') {
      setError('Esta conta é de aluno. Use uma conta de educador.');
      return;
    }
    setPassword('');
    setToken(result.token);
    load(result.token);
  }

  function logout() {
    setToken(null);
    setStudents(null);
    setOverview(null);
    setOpenStudent(null);
    setQuery('');
  }

  const now = loadedAt ?? Date.now();

  const summary = useMemo(() => {
    const list = students ?? [];
    const active = list.filter(s => s.syncDate && daysSince(s.syncDate, now) < INACTIVE_DAYS).length;
    return { total: list.length, active, inactive: list.length - active };
  }, [students, now]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (students ?? []).filter(s => !q || s.name.toLowerCase().includes(q));
    const byName = (a, b) => a.name.localeCompare(b.name);
    const sorters = {
      name: byName,
      level: (a, b) => b.level - a.level || b.coins - a.coins || byName(a, b),
      streak: (a, b) => b.streak - a.streak || b.best_streak - a.best_streak || byName(a, b),
      sync: (a, b) => (a.syncDate?.getTime() ?? 0) - (b.syncDate?.getTime() ?? 0) || byName(a, b),
    };
    return [...list].sort(sorters[sort]);
  }, [students, query, sort]);

  if (!token) {
    return (
      <MenuBackground>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <BackButton onPress={onBack} color={colors.orange} label="Voltar para o login dos alunos" />
              <Logo size={72} style={{ marginBottom: space.xs }} />
              <Txt weight="bold" style={styles.title}>Área do educador</Txt>
              <Txt weight="semibold" style={styles.subtitle}>
                Acompanhe o progresso dos alunos. Precisa de internet.
              </Txt>
              <Field label="Usuário" placeholder="Usuário do educador" value={username} onChangeText={setUsername} textContentType="username" />
              <Field
                label="Senha"
                placeholder="Sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                onSubmitEditing={login}
              />
              <Message text={error} />
              <Message kind="info" text={slow ? 'Acordando o servidor… pode levar até 1 minuto.' : ''} />
              <Btn title="Entrar" onPress={login} loading={busy} style={styles.stretch} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </MenuBackground>
    );
  }

  if (openStudent) {
    return <StudentDetail token={token} student={openStudent} now={now} onBack={() => setOpenStudent(null)} />;
  }

  return (
    <MenuBackground>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" style={styles.pageTitle}>Painel do educador</Txt>
              <Txt style={styles.pageSub}>
                {loadedAt ? `Atualizado às ${new Date(loadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Carregando…'}
              </Txt>
            </View>
            <Btn title="Atualizar" small variant="light" onPress={() => load(token)} loading={busy} />
            <Btn title="Sair" small variant="secondary" onPress={logout} style={{ marginLeft: space.sm }} />
          </View>

          <View style={styles.summaryRow}>
            <SummaryTile value={summary.total} label="alunos" />
            <SummaryTile value={summary.active} label={`ativos (${INACTIVE_DAYS} dias)`} color={colors.correctDark} />
            <SummaryTile value={summary.inactive} label="sem sincronizar" color={summary.inactive ? colors.wrongDark : colors.muted} />
          </View>

          <Message text={error} />
          <Message kind="info" text={slow ? 'Acordando o servidor… pode levar até 1 minuto.' : ''} />

          {overview ? (
            <>
              <Section title="Respostas da turma" hint="Últimos 30 dias. Toque numa coluna para ver o dia.">
                <DailyChart daily={overview.daily} />
              </Section>
              <Section
                title="Onde a turma mais erra"
                hint={`Taxa de erro por tema · ${percent(overview.correct, overview.answered)}% de acerto no geral`}
              >
                <ErrorMeters rows={overview.by_module} ranked limit={5} />
              </Section>
              <Section title="Erros por tipo de pergunta">
                <ErrorMeters rows={overview.by_kind} />
              </Section>
            </>
          ) : null}

          <Txt weight="bold" style={styles.listTitle}>Alunos</Txt>
          <Field placeholder="Buscar aluno pelo nome" value={query} onChangeText={setQuery} accessibilityLabel="Buscar aluno" />

          <View style={styles.sortRow} accessibilityRole="radiogroup" accessibilityLabel="Ordenar por">
            <Txt weight="semibold" style={styles.sortLabel}>Ordenar:</Txt>
            {SORTS.map(s => (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: sort === s.key }}
                style={[styles.chip, sort === s.key && styles.chipOn]}
              >
                <Txt weight="semibold" style={[styles.chipText, sort === s.key && styles.chipTextOn]}>{s.label}</Txt>
              </Pressable>
            ))}
          </View>

          {students && visible.length === 0 ? (
            <Txt style={styles.empty}>
              {students.length === 0 ? 'Nenhum aluno cadastrado ainda.' : 'Nenhum aluno encontrado com esse nome.'}
            </Txt>
          ) : null}

          {visible.map(s => (
            <StudentCard key={s.student_id} student={s} now={now} onPress={() => setOpenStudent(s)} />
          ))}
        </View>
      </ScrollView>
    </MenuBackground>
  );
}

function SummaryTile({ value, label, color = colors.ink }) {
  return (
    <View style={styles.tile}>
      <Txt weight="bold" style={[styles.tileValue, { color }]}>{value}</Txt>
      <Txt style={styles.tileLabel}>{label}</Txt>
    </View>
  );
}

function StudentCard({ student: s, now, onPress }) {
  const days = daysSince(s.syncDate, now);
  const stale = days === null || days >= INACTIVE_DAYS;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Abre os gráficos e os erros deste aluno"
      style={({ pressed, hovered }) => [styles.student, stale && styles.studentStale, (pressed || hovered) && styles.studentHover]}
    >
      <View style={styles.studentTop}>
        <Txt weight="bold" style={styles.studentName} numberOfLines={1}>{s.name}</Txt>
        <View style={styles.levelPill}>
          <Txt weight="bold" style={styles.levelText}>Nível {s.level}</Txt>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat icon={<CoinIcon size={14} />} text={`${s.coins} moedas`} />
        <Stat text={`${s.correct_activities_count} acertos`} />
        <Stat text={`${s.completed_activities_count} concluídas`} />
        <Stat icon={<FlameIcon size={14} off={!s.streak} />} text={`${s.streak} ${s.streak === 1 ? 'dia' : 'dias'} (recorde ${s.best_streak})`} />
      </View>
      <View style={styles.cardFoot}>
        <Txt weight="semibold" style={[styles.sync, { color: stale ? colors.wrongDark : colors.muted }]}>
          {syncLabel(s.syncDate, now)}
        </Txt>
        <View style={styles.details}>
          <Txt weight="semibold" style={styles.detailsText}>Gráficos e erros</Txt>
          <ChevronIcon size={16} color={colors.orangeDark} />
        </View>
      </View>
    </Pressable>
  );
}

function formatDateTime(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
}

function StudentDetail({ token, student, now, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setData(await api.educatorStudent(token, student.student_id));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, [token, student.student_id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <MenuBackground>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <BackButton onPress={onBack} color={colors.orange} label="Voltar para a lista de alunos" style={styles.inlineBack} />
            <View style={{ flex: 1 }}>
              <Txt weight="bold" style={styles.pageTitle} numberOfLines={1}>{student.name}</Txt>
              <Txt style={styles.pageSub}>Nível {student.level} · {syncLabel(student.syncDate, now)}</Txt>
            </View>
            <Btn title="Atualizar" small variant="light" onPress={load} loading={busy} />
          </View>

          <Message text={error} />
          {!data && busy ? <Txt style={styles.empty}>Carregando…</Txt> : null}

          {data ? (
            <>
              <View style={styles.summaryRow}>
                <SummaryTile value={data.answered} label="respostas" />
                <SummaryTile value={`${percent(data.correct, data.answered)}%`} label="de acerto" color={chartColors.correct} />
                <SummaryTile value={data.wrong} label="erros" color={chartColors.wrong} />
              </View>

              <Section title="Acertos e erros por dia" hint="Últimos 30 dias. Toque numa coluna para ver o dia.">
                <DailyChart daily={data.daily} />
              </Section>

              <Section title="Dificuldade por tema" hint="Temas com maior taxa de erro primeiro.">
                <ErrorMeters rows={data.by_module} ranked limit={5} emptyText="Este aluno ainda não respondeu perguntas." />
              </Section>

              <Section title="Por nível de dificuldade">
                <ErrorMeters rows={data.by_difficulty} />
              </Section>

              <Section title="Por tipo de pergunta">
                <ErrorMeters rows={data.by_kind} />
              </Section>

              <Section
                title="Últimos erros"
                hint={data.mistakes.length ? 'O que o aluno respondeu e qual era a resposta certa.' : undefined}
              >
                {data.mistakes.length ? (
                  data.mistakes.map((m, i) => <MistakeItem key={`${m.activity_id}-${i}`} mistake={m} />)
                ) : (
                  <Txt style={styles.empty}>Nenhum erro registrado. 🎉</Txt>
                )}
              </Section>
            </>
          ) : null}
        </View>
      </ScrollView>
    </MenuBackground>
  );
}

function MistakeItem({ mistake: m }) {
  return (
    <View style={styles.mistake}>
      <Txt weight="semibold" style={styles.mistakeQ}>
        {m.question}
        {m.prompt ? <Txt weight="bold" style={styles.mistakePrompt}>{`  ${m.prompt}`}</Txt> : null}
      </Txt>
      <View style={styles.answerRow}>
        <View style={[styles.answerTag, { backgroundColor: '#FBE9E1' }]}>
          <Txt weight="bold" style={[styles.answerTagText, { color: colors.wrongDark }]}>Respondeu</Txt>
        </View>
        <Txt style={styles.answerText}>{m.answer || '(sem resposta)'}</Txt>
      </View>
      <View style={styles.answerRow}>
        <View style={[styles.answerTag, { backgroundColor: '#E7F6EC' }]}>
          <Txt weight="bold" style={[styles.answerTagText, { color: colors.correctDark }]}>Correto</Txt>
        </View>
        <Txt style={styles.answerText}>{m.correct_answer}</Txt>
      </View>
      <Txt style={styles.mistakeMeta}>
        {m.module} · {m.difficulty} · {m.kind} · {formatDateTime(m.completed_at)}
      </Txt>
    </View>
  );
}

function Stat({ icon, text }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Txt style={styles.statText}>{text}</Txt>
    </View>
  );
}

const cardBase = {
  backgroundColor: colors.cardGlass,
  borderRadius: radius.lg,
  borderBottomWidth: 6,
  borderBottomColor: colors.cardShadow,
};

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { ...cardBase, width: '100%', maxWidth: 380, padding: space.xl, alignItems: 'center' },
  title: { fontSize: 22, color: colors.orangeDark },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: space.lg, textAlign: 'center' },
  stretch: { alignSelf: 'stretch', marginTop: space.sm },

  page: { flexGrow: 1, alignItems: 'center', padding: space.lg },
  panel: { ...cardBase, width: '100%', maxWidth: 760, padding: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md, flexWrap: 'wrap', gap: space.sm },
  pageTitle: { fontSize: 22, color: colors.orangeDark },
  pageSub: { fontSize: 13, color: colors.muted },

  summaryRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  tile: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, alignItems: 'center' },
  tileValue: { fontSize: 26 },
  tileLabel: { fontSize: 12, color: colors.muted, textAlign: 'center' },

  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, marginBottom: space.md },
  sortLabel: { fontSize: 13, color: colors.muted, marginRight: space.xs },
  chip: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: space.md, paddingVertical: 6 },
  chipOn: { borderColor: colors.orangeDark, backgroundColor: colors.peach },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.orangeDark },

  empty: { textAlign: 'center', color: colors.muted, paddingVertical: space.xl },

  student: { backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, marginBottom: space.sm, borderLeftWidth: 5, borderLeftColor: colors.correct },
  studentStale: { borderLeftColor: colors.wrong },
  studentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  studentName: { fontSize: 17, color: colors.ink, flexShrink: 1 },
  levelPill: { backgroundColor: colors.peach, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  levelText: { fontSize: 13, color: colors.orangeDark },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 2, marginTop: space.xs },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, color: colors.ink },
  sync: { fontSize: 12 },
  studentHover: { backgroundColor: '#FFF9F4' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xs, gap: space.sm, flexWrap: 'wrap' },
  details: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailsText: { fontSize: 12, color: colors.orangeDark },
  inlineBack: { position: 'relative', top: 0, left: 0 },
  listTitle: { fontSize: 18, color: colors.ink, marginBottom: space.sm, marginTop: space.xs },

  mistake: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: space.sm },
  mistakeQ: { fontSize: 14, color: colors.ink },
  mistakePrompt: { fontSize: 14, color: colors.orangeDark },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  answerTag: { borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, minWidth: 78, alignItems: 'center' },
  answerTagText: { fontSize: 11 },
  answerText: { fontSize: 14, color: colors.ink, flexShrink: 1 },
  mistakeMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
