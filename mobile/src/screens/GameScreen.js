import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Crab } from '../components/art';
import { GameBackground } from '../components/backgrounds';
import { CheckIcon, CloseIcon, CrossIcon, FlameIcon, MicIcon, SpeakerIcon, StarIcon, TargetIcon } from '../components/icons';
import { StreakWeek } from '../components/streak';
import { Btn, Coins, Popup, Txt, useReducedMotion } from '../components/ui';
import * as db from '../db';
import {
  bestTranscript,
  buildPhases,
  coinsFor,
  dayKey,
  isCorrect,
  lastWeek,
  levelInfo,
  makeId,
  nextQuestions,
  phaseProgress,
  REWARDS,
  shuffle,
  streakInfo,
} from '../game';
import * as session from '../session';
import * as speech from '../speech';
import { colors, DIFFICULTY_STYLES, radius, space } from '../theme';

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];
const NATIVE_DRIVER = Platform.OS !== 'web';
const PRAISE = ['Muito bem!', 'Excelente!', 'Isso aí!', 'Mandou bem!', 'Perfeito!'];

// O balão só tem botão de ouvir quando a frase destacada está em francês.
const speakable = q => q.prompt && !q.prompt.includes('___') && q.question_text !== 'Qual é a frase em francês?';

// ------------------------------------------------------------------- topo

function LessonTop({ progress, combo, onClose }) {
  const reduced = useReducedMotion();
  const width = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    if (reduced) width.setValue(progress);
    else Animated.timing(width, { toValue: progress, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [progress, reduced, width]);

  return (
    <View style={styles.top}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Sair da rodada" hitSlop={8} style={styles.close}>
        <CloseIcon size={26} color={colors.white} strokeWidth={3} />
      </Pressable>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <Animated.View style={[styles.trackFill, { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
          <View style={styles.trackShine} />
        </Animated.View>
      </View>
      <View style={[styles.combo, combo < 2 && { opacity: 0.35 }]} accessibilityLabel={`${combo} acertos seguidos`}>
        <FlameIcon size={22} off={combo < 2} />
        <Txt weight="bold" style={styles.comboText}>
          {combo}
        </Txt>
      </View>
    </View>
  );
}

/** Selo com a dificuldade da pergunta atual e quantas moedas ela vale. */
function DifficultyChip({ difficulty }) {
  const s = DIFFICULTY_STYLES[difficulty];
  return (
    <View style={[styles.diffChip, { backgroundColor: s.color, borderColor: s.border }]}>
      <View style={{ flexDirection: 'row', marginRight: 6 }}>
        {[0, 1, 2].map(i => (
          <StarIcon key={i} size={12} color={i < s.stars ? colors.gold : 'rgba(0,0,0,0.15)'} />
        ))}
      </View>
      <Txt weight="bold" style={styles.diffChipText}>
        {s.label}
      </Txt>
      <Coins value={REWARDS[difficulty]} prefix=" +" size={12} textStyle={styles.diffChipText} />
    </View>
  );
}

/** O caranguejo "fala" a frase da pergunta num balão. */
function CrabSays({ question }) {
  if (!question.prompt) return null;
  const canSpeak = speakable(question);
  return (
    <View style={styles.says}>
      <Crab size={86} color="#E0431B" />
      <View style={styles.saysBubble}>
        <View style={styles.saysTail} />
        {canSpeak ? (
          <Pressable
            onPress={() => speech.speak(question.prompt)}
            accessibilityRole="button"
            accessibilityLabel="Ouvir a frase"
            hitSlop={6}
            style={({ pressed }) => [styles.speaker, pressed && { transform: [{ scale: 0.92 }] }]}
          >
            <SpeakerIcon size={20} color={colors.white} />
          </Pressable>
        ) : null}
        <Txt weight="semibold" style={styles.saysText}>
          {question.prompt}
        </Txt>
      </View>
    </View>
  );
}

/** "Ouça e escolha": o caranguejo fala a frase (sem mostrar o texto). */
function ListenPrompt({ question }) {
  useEffect(() => {
    const t = setTimeout(() => speech.speak(question.prompt), 350);
    return () => clearTimeout(t);
  }, [question.id]);
  return (
    <View style={styles.says}>
      <Crab size={86} color="#E0431B" />
      <View style={[styles.saysBubble, styles.listenBubble]}>
        <View style={styles.saysTail} />
        <Pressable
          onPress={() => speech.speak(question.prompt)}
          accessibilityRole="button"
          accessibilityLabel="Ouvir de novo"
          style={({ pressed }) => [styles.listenBig, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <SpeakerIcon size={34} color={colors.white} />
        </Pressable>
        <Pressable
          onPress={() => speech.speak(question.prompt, { slow: true })}
          accessibilityRole="button"
          accessibilityLabel="Ouvir devagar"
          style={({ pressed }) => [styles.listenSlow, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <SpeakerIcon size={20} color={colors.orangeDark} />
          <Txt weight="bold" style={styles.listenSlowText}>
            devagar
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

// ------------------------------------------------------------ múltipla escolha

function Options({ question, selected, checked, onSelect }) {
  return (
    <View style={styles.options}>
      {question.shuffled.map((option, i) => {
        const isSelected = option === selected;
        const isRight = option === question.correct_answer;
        let state = isSelected ? 'selected' : null;
        if (checked && isRight) state = 'right';
        else if (checked && isSelected) state = 'wrong';
        return (
          <Pressable
            key={option}
            disabled={!!checked}
            onPress={() => onSelect(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled: !!checked }}
            accessibilityLabel={`Alternativa ${LETTERS[i]}: ${option}`}
            style={({ pressed, hovered, focused }) => [
              styles.option,
              hovered && !checked && !state && styles.optionHover,
              state && styles[`option_${state}`],
              checked && !state && { opacity: 0.55 },
              pressed && styles.optionPressed,
              focused && styles.focused,
            ]}
          >
            <View style={[styles.letter, state && styles[`letter_${state}`]]}>
              <Txt weight="bold" style={[styles.letterText, state && state !== 'selected' && { color: colors.white }]}>
                {LETTERS[i]}
              </Txt>
            </View>
            <Txt weight="semibold" style={[styles.optionText, state && styles[`optionText_${state}`]]}>
              {option}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------- voz

function PulseRing({ active }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reduced) {
      v.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduced, v]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulse,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
        },
      ]}
    />
  );
}

function VoiceArea({ question, onResult, disabled }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const availability = useMemo(() => speech.recognitionAvailable(), [question.id]);

  useEffect(() => () => speech.stopListening(), []);

  async function record() {
    setError('');
    setListening(true);
    try {
      const alternatives = await speech.listen();
      if (!alternatives.length) setError('Não ouvi nada. Tente de novo, falando perto do microfone.');
      else onResult(alternatives);
    } catch (e) {
      setError(e.message);
    } finally {
      setListening(false);
    }
  }

  if (!availability.ok) {
    return (
      <View style={styles.voiceArea}>
        <View style={styles.hintPill}>
          <Txt weight="semibold" style={styles.hintText}>
            {availability.reason}
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.voiceArea}>
      <View style={styles.micWrap}>
        <PulseRing active={listening} />
        <Pressable
          onPress={record}
          disabled={listening || disabled}
          accessibilityRole="button"
          accessibilityLabel="Gravar resposta"
          accessibilityState={{ busy: listening }}
          style={({ pressed, focused }) => [styles.mic, listening && styles.micActive, pressed && styles.micPressed, focused && styles.focused]}
        >
          {listening ? <ActivityIndicator color={colors.white} size="large" /> : <MicIcon size={40} color={colors.white} />}
        </Pressable>
      </View>
      <View style={styles.hintPill}>
        <Txt weight="semibold" style={styles.hintText} accessibilityLiveRegion="polite">
          {listening ? 'Ouvindo... fale agora!' : 'Toque no microfone e fale a frase'}
        </Txt>
      </View>
      {error ? (
        <Txt weight="semibold" style={styles.voiceError} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------- faixa de resultado

function FeedbackSheet({ feedback, combo, onContinue, onRetry }) {
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(reduced ? 0 : 1)).current;
  useEffect(() => {
    if (!reduced) Animated.timing(y, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_DRIVER }).start();
  }, [reduced, y]);

  const { correct, reward, alreadyEarned, said, kind, correctAnswer, praise, heard } = feedback;
  const tone = correct ? styles.sheetRight : styles.sheetWrong;
  const ink = correct ? colors.correctDark : colors.wrongDark;

  return (
    <Animated.View
      accessibilityLiveRegion="assertive"
      style={[styles.sheet, tone, { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }] }]}
    >
      <View style={styles.sheetInner}>
        <View style={styles.sheetHead}>
          <View style={[styles.sheetIcon, { backgroundColor: ink }]}>
            {correct ? <CheckIcon size={24} color={colors.white} strokeWidth={3.4} /> : <CrossIcon size={24} color={colors.white} strokeWidth={3.4} />}
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="bold" style={[styles.sheetTitle, { color: ink }]}>
              {correct ? praise : 'Resposta correta:'}
            </Txt>
            {!correct ? (
              <Txt weight="semibold" style={[styles.sheetAnswer, { color: ink }]}>
                {correctAnswer}
              </Txt>
            ) : null}
          </View>
          {correct && reward > 0 ? <Coins value={reward} prefix="+" size={18} textStyle={{ color: ink }} /> : null}
        </View>
        {said !== undefined ? <Txt style={[styles.sheetLine, { color: ink }]}>Você disse: “{said}”</Txt> : null}
        {correct && combo >= 3 ? (
          <View style={styles.sheetCombo}>
            <FlameIcon size={16} />
            <Txt weight="bold" style={[styles.sheetLine, { color: ink, marginLeft: 4 }]}>
              {combo} acertos seguidos!
            </Txt>
          </View>
        ) : null}
        {correct && alreadyEarned ? <Txt style={[styles.sheetLine, { color: ink }]}>As moedas desta pergunta já eram suas.</Txt> : null}
        {kind === 'listen' ? <Txt style={[styles.sheetLine, { color: ink }]}>A frase era: “{heard}”</Txt> : null}
        <View style={styles.sheetActions}>
          {!correct && kind === 'voice' ? (
            <Btn title="Tentar de novo" variant="light" onPress={onRetry} style={styles.sheetButton} />
          ) : null}
          <Btn title="CONTINUAR" variant={correct ? 'success' : 'danger'} onPress={onContinue} style={styles.sheetButton} />
        </View>
      </View>
    </Animated.View>
  );
}

// ------------------------------------------------------------- telas finais

function StreakScreen({ before, after, week, onContinue }) {
  return (
    <GameBackground>
      <View style={styles.endFill}>
        <FlameIcon size={140} />
        <Txt weight="bold" style={styles.streakNumber}>
          {after.current}
        </Txt>
        <Txt weight="bold" style={styles.endTitle}>
          {after.current === 1 ? 'dia de ofensiva!' : 'dias de ofensiva!'}
        </Txt>
        <Txt style={styles.endText}>
          {before.current === 0
            ? 'Você acendeu seu primeiro foguinho. Volte amanhã para ele continuar aceso!'
            : 'Você manteve o foguinho aceso. Continue jogando todo dia!'}
        </Txt>
        <View style={styles.weekCard}>
          <StreakWeek week={week} />
        </View>
      </View>
      <View style={styles.endFooter}>
        <Btn title="CONTINUAR" variant="menu" onPress={onContinue} style={styles.endButton} textStyle={{ color: colors.orangeDark }} />
      </View>
    </GameBackground>
  );
}

function StatCard({ label, color, icon, children }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <View style={[styles.statLabel, { backgroundColor: color }]}>
        <Txt weight="bold" style={styles.statLabelText}>
          {label}
        </Txt>
      </View>
      <View style={styles.statBody}>
        {icon}
        {children}
      </View>
    </View>
  );
}

function SummaryScreen({ summary, onNextRound, onNextPhase, onExit }) {
  const { firstTry, answered, coins, before, after, streak, phase, phaseDone, phaseCompleted, nextPhase } = summary;
  const accuracy = answered ? Math.round((firstTry / answered) * 100) : 0;
  const leveledUp = after.level > before.level;
  const newTier = after.tier.title !== before.tier.title;
  const title = phaseCompleted ? 'Fase concluída!' : accuracy === 100 && answered ? 'Rodada perfeita!' : 'Rodada completa!';
  const diff = DIFFICULTY_STYLES[phase.difficulty];

  return (
    <GameBackground>
      <ScrollView contentContainerStyle={styles.endFill}>
        <Crab size={120} color="#E0431B" />
        <Txt weight="bold" style={styles.endTitle}>
          {title}
        </Txt>
        <View style={styles.stats}>
          <StatCard label="MOEDAS" color="#D9A300">
            <Coins value={coins} prefix="+" size={20} />
          </StatCard>
          <StatCard label="PRECISÃO" color={colors.correctDark} icon={<TargetIcon size={18} color={colors.correctDark} />}>
            <Txt weight="bold" style={styles.statValue}>
              {accuracy}%
            </Txt>
          </StatCard>
          <StatCard label="OFENSIVA" color="#E8650F" icon={<FlameIcon size={20} />}>
            <Txt weight="bold" style={styles.statValue}>
              {streak.current}
            </Txt>
          </StatCard>
        </View>

        <View style={styles.levelCard}>
          <Txt weight="bold" style={{ fontSize: 14 }}>
            Fase {phase.number} · {phase.module.title} · {diff.label}
          </Txt>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${Math.round((phaseDone / phase.total) * 100)}%`, backgroundColor: colors.correctDark }]} />
          </View>
          <Txt style={styles.levelHint}>
            {phaseCompleted
              ? nextPhase
                ? `Nova fase liberada: ${nextPhase.module.title} · ${DIFFICULTY_STYLES[nextPhase.difficulty].label}`
                : 'Você concluiu todas as fases!'
              : `${phaseDone} de ${phase.total} perguntas da fase`}
          </Txt>
        </View>

        {leveledUp ? (
          <View style={styles.levelUp}>
            <StarIcon size={30} />
            <View style={{ flex: 1, marginLeft: space.sm }}>
              <Txt weight="bold" style={styles.levelUpTitle}>
                Você subiu para o nível {after.level}!
              </Txt>
              {newTier ? (
                <Txt style={styles.levelUpText}>
                  Novo título: <Txt weight="bold">{after.tier.title}</Txt>
                </Txt>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.row, { marginTop: space.md }]}>
            <Txt style={styles.endHint}>Nível {after.level} · faltam </Txt>
            <Coins value={after.remaining} size={13} textStyle={{ color: colors.white }} />
            <Txt style={styles.endHint}> para o nível {after.level + 1}</Txt>
          </View>
        )}
      </ScrollView>
      <View style={styles.endFooter}>
        {!phaseCompleted ? (
          <Btn title="PRÓXIMA RODADA" variant="menu" onPress={onNextRound} style={styles.endButton} textStyle={{ color: colors.orangeDark }} />
        ) : nextPhase ? (
          <Btn title="PRÓXIMA FASE" variant="menu" onPress={onNextPhase} style={styles.endButton} textStyle={{ color: colors.orangeDark }} />
        ) : null}
        <Btn title="Voltar à trilha" variant="light" small onPress={onExit} style={[styles.endButton, { marginTop: space.sm }]} />
      </View>
    </GameBackground>
  );
}

// ---------------------------------------------------------------------- tela

export default function GameScreen({ user, phaseId, onExit }) {
  const [activePhaseId, setActivePhaseId] = useState(phaseId);
  const [phase, setPhase] = useState(undefined); // undefined = carregando, null = sem conteúdo
  const [blocked, setBlocked] = useState(null); // 'locked' | 'done' quando não há o que jogar
  const [queue, setQueue] = useState([]); // perguntas desta rodada, na ordem do conteúdo
  const [pos, setPos] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [combo, setCombo] = useState(0);
  const [end, setEnd] = useState(null); // { stage: 'streak' | 'summary', summary }
  const [confirmExit, setConfirmExit] = useState(false);
  const [round, setRound] = useState(0);

  const earned = useRef(new Set()); // perguntas já acertadas (servidor + local)
  const results = useRef(new Map()); // id -> { firstTry, correct, reward, skipped }
  const start = useRef({ coins: 0, days: new Set(), seen: new Set(), phases: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [modules, activities, earnedIds, days, seen] = await Promise.all([
        db.getModules(),
        db.getActivities(),
        db.getEarnedIds(user.id),
        session.loadActiveDays(user.id),
        session.loadSeen(user.id),
      ]);
      if (!alive) return;
      const coins = coinsFor(earnedIds, new Map(activities.map(a => [a.id, a])));
      const phases = phaseProgress(buildPhases(modules, activities, session.deviceAbilities()), seen);
      const chosen = phases.find(p => p.id === activePhaseId) ?? phases.find(p => p.state === 'current') ?? null;
      start.current = { coins, days, seen, phases };
      earned.current = new Set(earnedIds);
      results.current = new Map();
      // Nunca repete: só entram perguntas que o aluno ainda não viu, na ordem da fase.
      const questions = chosen && chosen.state !== 'locked' ? nextQuestions(chosen, seen) : [];
      if (!chosen) setBlocked(phases.length ? 'all' : null);
      else setBlocked(chosen.state === 'locked' ? 'locked' : questions.length ? null : 'done');
      setPhase(phases.length ? chosen : null);
      setQueue(questions.map(q => ({ q: { ...q, shuffled: shuffle(q.options) } })));
      setPos(0);
      setSelected(null);
      setFeedback(null);
      setCombo(0);
      setEnd(null);
    })();
    return () => {
      alive = false;
    };
  }, [user.id, activePhaseId, round]);

  if (phase === undefined) {
    return (
      <GameBackground>
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.white} size="large" />
          <Txt weight="semibold" style={styles.loadingText}>
            Preparando a rodada...
          </Txt>
        </View>
      </GameBackground>
    );
  }

  if (phase === null) {
    return (
      <GameBackground>
        <View style={styles.centerFill}>
          <Popup style={{ alignItems: 'center' }}>
            <Crab size={72} color="#E0431B" style={{ marginBottom: space.sm }} />
            <Txt weight="bold" style={styles.popupTitle}>Ainda não há perguntas neste aparelho.</Txt>
            <Txt style={styles.popupLine}>Conecte-se à internet uma vez para baixar o conteúdo.</Txt>
            <Btn title="Voltar" onPress={onExit} style={{ marginTop: space.md }} />
          </Popup>
        </View>
      </GameBackground>
    );
  }

  if (blocked) {
    return (
      <GameBackground>
        <View style={styles.centerFill}>
          <Popup style={{ alignItems: 'center' }}>
            <Crab size={72} color="#E0431B" style={{ marginBottom: space.sm }} />
            <Txt weight="bold" style={styles.popupTitle}>
              {blocked === 'locked' ? 'Esta fase ainda está trancada.' : blocked === 'all' ? 'Você concluiu todas as fases!' : 'Você já concluiu esta fase!'}
            </Txt>
            <Txt style={styles.popupLine}>
              {blocked === 'locked'
                ? 'Conclua a fase anterior para liberar esta.'
                : blocked === 'all'
                  ? 'Parabéns! Novas perguntas chegam nas próximas atualizações.'
                  : 'As perguntas não se repetem. Siga para a próxima fase da trilha.'}
            </Txt>
            <Btn title="Voltar à trilha" onPress={onExit} style={{ marginTop: space.md }} />
          </Popup>
        </View>
      </GameBackground>
    );
  }

  if (end?.stage === 'streak') {
    return (
      <StreakScreen
        before={end.summary.streakBefore}
        after={end.summary.streak}
        week={end.summary.week}
        onContinue={() => setEnd({ ...end, stage: 'summary' })}
      />
    );
  }
  if (end?.stage === 'summary') {
    return (
      <SummaryScreen
        summary={end.summary}
        onNextRound={() => setRound(r => r + 1)}
        onNextPhase={() => setActivePhaseId(end.summary.nextPhase.id)}
        onExit={onExit}
      />
    );
  }

  const entry = queue[pos];
  const question = entry.q;
  const progress = (pos + (feedback ? 1 : 0)) / queue.length;

  async function registerAnswer(answer, extra = {}) {
    const correct = isCorrect(question.kind, answer, question.correct_answer);
    const alreadyEarned = earned.current.has(question.id);
    const reward = correct && !alreadyEarned ? REWARDS[question.difficulty] : 0;

    // Salva primeiro no banco local: funciona com ou sem internet.
    await db.saveAttempt({
      attemptId: makeId(),
      studentId: user.id,
      activityId: question.id,
      selectedAnswer: answer,
      isCorrect: correct,
      completedAt: new Date().toISOString(),
    });
    if (correct) earned.current.add(question.id);

    const prev = results.current.get(question.id);
    if (!prev || prev.skipped) results.current.set(question.id, { firstTry: correct, correct, reward, skipped: false });
    else results.current.set(question.id, { ...prev, correct: prev.correct || correct, reward: prev.reward + reward });

    setCombo(c => (correct ? c + 1 : 0));
    setFeedback({
      correct,
      reward,
      alreadyEarned,
      kind: question.kind,
      correctAnswer: question.correct_answer,
      praise: PRAISE[Math.floor(Math.random() * PRAISE.length)],
      heard: question.prompt,
      ...extra,
    });
  }

  function check() {
    if (selected !== null) registerAnswer(selected);
  }

  function voiceResult(alternatives) {
    const said = bestTranscript(alternatives, question.correct_answer);
    registerAnswer(said, { said });
  }

  function skip() {
    speech.stopListening();
    session.markSkipped(user.id, question.id);
    if (!results.current.has(question.id)) {
      results.current.set(question.id, { firstTry: false, correct: false, reward: 0, skipped: true });
    }
    next();
  }

  function finish() {
    const all = [...results.current.values()];
    const answered = all.filter(r => !r.skipped);
    const coins = all.reduce((sum, r) => sum + r.reward, 0);
    const days = new Set(start.current.days);
    if (answered.length) days.add(dayKey());
    const streakBefore = streakInfo(start.current.days);
    const streak = streakInfo(days);
    const seenAfter = new Set([...start.current.seen, ...results.current.keys()]);
    const phaseDone = phase.questions.filter(q => seenAfter.has(q.id)).length;
    const index = start.current.phases.findIndex(p => p.id === phase.id);
    const summary = {
      phase,
      phaseDone,
      phaseCompleted: phaseDone >= phase.total,
      nextPhase: start.current.phases[index + 1] ?? null,
      firstTry: answered.filter(r => r.firstTry).length,
      answered: answered.length,
      coins,
      before: levelInfo(start.current.coins),
      after: levelInfo(start.current.coins + coins),
      streakBefore,
      streak,
      week: lastWeek(days),
    };
    // Primeira rodada do dia: comemora o foguinho antes do resumo.
    setEnd({ stage: streak.activeToday && !streakBefore.activeToday ? 'streak' : 'summary', summary });
  }

  function next() {
    setFeedback(null);
    setSelected(null);
    if (pos + 1 < queue.length) setPos(pos + 1);
    else finish();
  }

  return (
    <GameBackground>
      <LessonTop progress={progress} combo={combo} onClose={() => setConfirmExit(true)} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.questionHead}>
          <View style={styles.row}>
            <DifficultyChip difficulty={question.difficulty} />
          </View>
          <Txt weight="bold" style={styles.questionTitle} accessibilityRole="header">
            {question.kind === 'voice' ? 'Fale esta frase em francês' : question.question_text}
          </Txt>
        </View>

        {question.kind === 'listen' ? <ListenPrompt question={question} /> : <CrabSays question={question} />}

        {question.kind === 'voice' ? (
          <VoiceArea key={`${question.id}-${pos}`} question={question} onResult={voiceResult} disabled={!!feedback} />
        ) : (
          <Options question={question} selected={selected} checked={feedback} onSelect={setSelected} />
        )}
      </ScrollView>

      {!feedback ? (
        <View style={styles.footer}>
          {question.kind === 'voice' ? (
            <Btn title="NÃO POSSO FALAR AGORA" variant="light" onPress={skip} style={styles.footerButton} />
          ) : (
            <Btn title="VERIFICAR" variant="success" disabled={selected === null} onPress={check} style={styles.footerButton} />
          )}
        </View>
      ) : (
        <FeedbackSheet feedback={feedback} combo={combo} onContinue={next} onRetry={() => setFeedback(null)} />
      )}

      {confirmExit ? (
        <Popup style={{ alignItems: 'center' }}>
          <Crab size={64} color="#E0431B" style={{ marginBottom: space.sm }} />
          <Txt weight="bold" style={styles.popupTitle}>Sair da rodada?</Txt>
          <Txt style={styles.popupLine}>As respostas que você já deu ficam salvas.</Txt>
          <View style={styles.popupActions}>
            <Btn title="Continuar jogando" onPress={() => setConfirmExit(false)} style={styles.popupButton} />
            <Btn
              title="Sair"
              variant="light"
              onPress={() => {
                speech.stopListening();
                onExit();
              }}
              style={styles.popupButton}
            />
          </View>
        </Popup>
      ) : null}
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  loadingText: { color: colors.white, marginTop: space.md, fontSize: 15 },
  focused: { outlineWidth: 3, outlineColor: colors.focus, outlineStyle: 'solid', outlineOffset: 2 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },

  // topo
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: {
    flex: 1,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
    marginHorizontal: space.sm,
  },
  trackFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.gold, borderRadius: 9 },
  trackShine: { position: 'absolute', left: 8, right: 8, top: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  combo: { flexDirection: 'row', alignItems: 'center', minWidth: 44, justifyContent: 'center' },
  comboText: { color: colors.white, fontSize: 16, marginLeft: 2 },

  // pergunta
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 140 },
  questionHead: { width: '100%', maxWidth: 480, alignItems: 'flex-start', marginBottom: space.sm },
  questionTitle: {
    color: colors.white,
    fontSize: 22,
    marginTop: space.sm,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  diffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  diffChipText: { fontSize: 12, color: colors.ink },
  says: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', maxWidth: 480, marginVertical: space.md },
  saysBubble: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderBottomWidth: 4,
    borderBottomColor: colors.whiteShadow,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginLeft: space.sm,
    marginBottom: space.md,
  },
  saysTail: {
    position: 'absolute',
    left: -7,
    bottom: 16,
    width: 16,
    height: 16,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
  speaker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orangeDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.sm,
  },
  saysText: { fontSize: 19, color: colors.ink, flexShrink: 1 },
  listenBubble: { justifyContent: 'center', paddingVertical: space.lg },
  listenBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orangeDark,
    borderBottomWidth: 5,
    borderBottomColor: colors.orangeShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenSlow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginLeft: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.orangeDark,
  },
  listenSlowText: { color: colors.orangeDark, marginLeft: 4, fontSize: 14 },

  // alternativas
  options: { width: '100%', maxWidth: 480 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.card,
    borderBottomWidth: 5,
    borderBottomColor: colors.cardShadow,
    paddingVertical: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    marginBottom: space.sm + 2,
  },
  optionHover: { backgroundColor: colors.white, borderColor: colors.white },
  optionPressed: { transform: [{ translateY: 2 }] },
  option_selected: { backgroundColor: '#FFF1E6', borderColor: colors.orangeDark, borderBottomColor: colors.orangeDark },
  option_right: { backgroundColor: '#D7F5DF', borderColor: colors.correctDark, borderBottomColor: colors.correctDark },
  option_wrong: { backgroundColor: '#FDE2E2', borderColor: colors.wrongDark, borderBottomColor: colors.wrongDark },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  letter_selected: { borderColor: colors.orangeDark },
  letter_right: { backgroundColor: colors.correctDark, borderColor: colors.correctDark },
  letter_wrong: { backgroundColor: colors.wrongDark, borderColor: colors.wrongDark },
  letterText: { color: colors.muted, fontSize: 14, marginTop: -1 },
  optionText: { fontSize: 17, flexShrink: 1 },
  optionText_selected: { color: colors.orangeDark },
  optionText_right: { color: colors.correctDark },
  optionText_wrong: { color: colors.wrongDark },

  // voz
  voiceArea: { alignItems: 'center', marginTop: space.xs },
  micWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  pulse: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: colors.white },
  mic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.orangeDark,
    borderWidth: 5,
    borderColor: colors.white,
    borderBottomWidth: 8,
    borderBottomColor: colors.whiteShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: colors.wrong },
  micPressed: { transform: [{ scale: 0.95 }] },
  hintPill: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm, maxWidth: 420 },
  hintText: { fontSize: 14, textAlign: 'center' },
  voiceError: {
    color: colors.white,
    marginTop: space.md,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    maxWidth: 420,
  },

  // rodapé e faixa de resultado
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.15)',
  },
  footerButton: { width: '100%', maxWidth: 480 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    zIndex: 30,
  },
  sheetRight: { backgroundColor: '#D7F5DF' },
  sheetWrong: { backgroundColor: '#FDE2E2' },
  sheetInner: { width: '100%', maxWidth: 480 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  sheetIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: space.md },
  sheetTitle: { fontSize: 22 },
  sheetAnswer: { fontSize: 17 },
  sheetLine: { fontSize: 14, marginBottom: 2 },
  sheetCombo: { flexDirection: 'row', alignItems: 'center' },
  sheetActions: { flexDirection: 'row', marginTop: space.md },
  sheetButton: { flex: 1, marginHorizontal: space.xs },

  // telas finais
  endFill: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, paddingBottom: 150 },
  endTitle: {
    color: colors.white,
    fontSize: 28,
    textAlign: 'center',
    marginTop: space.sm,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  endHint: { color: colors.white, fontSize: 13 },
  endText: { color: colors.white, fontSize: 15, textAlign: 'center', marginTop: space.sm, maxWidth: 380 },
  streakNumber: {
    color: colors.white,
    fontSize: 72,
    marginTop: -16,
    textShadowColor: colors.orangeShadow,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 0,
  },
  weekCard: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl },
  endFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', padding: space.lg },
  endButton: { width: '100%', maxWidth: 480 },
  stats: { flexDirection: 'row', justifyContent: 'center', width: '100%', maxWidth: 480, marginTop: space.xl },
  stat: { flex: 1, marginHorizontal: 5, borderWidth: 3, borderRadius: radius.md, backgroundColor: colors.white, overflow: 'hidden' },
  statLabel: { paddingVertical: 4, alignItems: 'center' },
  statLabelText: { color: colors.white, fontSize: 11, letterSpacing: 0.8 },
  statBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  statValue: { fontSize: 20, marginLeft: 4 },
  levelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFF4CC',
    borderColor: colors.gold,
    borderWidth: 3,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.lg,
  },
  levelUpTitle: { fontSize: 16, color: colors.orangeDark },
  levelUpText: { fontSize: 13, marginTop: 2 },
  levelCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.lg,
    alignItems: 'center',
  },
  levelTrack: { width: '100%', height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden', marginVertical: space.sm },
  levelFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.gold, borderRadius: 5 },
  levelHint: { fontSize: 12, color: colors.muted },

  // pop-ups
  popupTitle: { fontSize: 20, textAlign: 'center', marginBottom: space.sm },
  popupLine: { fontSize: 15, textAlign: 'center', marginBottom: space.xs },
  popupActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: space.md },
  popupButton: { marginHorizontal: space.xs, marginVertical: space.xs },
});
