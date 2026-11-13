import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Crab } from '../components/art';
import { GameBackground } from '../components/backgrounds';
import { BackButton, Btn, Popup, Title, Txt } from '../components/ui';
import * as db from '../db';
import { bestTranscript, isCorrect, makeId, PASS_RATIO, phasePassed, pickPhase, REWARDS, shuffle } from '../game';
import * as speech from '../speech';
import { COIN, colors, DIFFICULTY_STYLES } from '../theme';

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

// ------------------------------------------------------------------ cabeçalho

function QuestionHeader({ number, total }) {
  return (
    <View style={styles.header}>
      <Crab size={64} color="#E0431B" style={styles.headerCrab} />
      <View style={styles.headerCard}>
        <Txt weight="bold" style={styles.headerText}>
          Pergunta {number}/{total}
        </Txt>
      </View>
    </View>
  );
}

/** Pílula branca com o enunciado e, à direita, a frase em destaque (laranja). */
function PromptPill({ label, prompt, onListen }) {
  return (
    <View style={styles.promptPill}>
      <Txt weight="bold" style={styles.promptLabel}>
        {label}
      </Txt>
      {prompt ? (
        <View style={styles.promptChip}>
          <Txt weight="semibold" style={styles.promptChipText}>
            {prompt}
          </Txt>
        </View>
      ) : null}
      {onListen ? (
        <Pressable onPress={onListen} hitSlop={8} accessibilityLabel="Ouvir a frase" style={styles.listen}>
          <Txt style={{ fontSize: 20 }}>🔊</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------ múltipla escolha

function ChoiceQuestion({ question, options, picked, onPick }) {
  const answered = picked !== null;
  return (
    <>
      <PromptPill label={question.question_text} prompt={question.prompt} />
      <View style={styles.options}>
        {options.map((option, i) => {
          const isRight = option === question.correct_answer;
          const isPicked = option === picked;
          let state = null;
          if (answered && isRight) state = styles.optionRight;
          else if (answered && isPicked) state = styles.optionWrong;
          return (
            <Pressable
              key={option}
              disabled={answered}
              onPress={() => onPick(option)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.option, state, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Txt weight="semibold" style={[styles.optionText, state && { color: colors.white }]}>
                {LETTERS[i]}) {option}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------- voz

function VoiceQuestion({ question, onResult, onSkip, disabled }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const availability = useMemo(() => speech.recognitionAvailable(), [question.id]);

  useEffect(() => () => speech.stopListening(), []);

  async function record() {
    setError('');
    setListening(true);
    try {
      const alternatives = await speech.listen();
      if (!alternatives.length) {
        setError('Não ouvi nada. Tente de novo, falando perto do microfone.');
      } else {
        onResult(alternatives);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setListening(false);
    }
  }

  return (
    <>
      <PromptPill label={question.question_text} prompt={question.prompt} onListen={() => speech.speak(question.prompt)} />

      {availability.ok ? (
        <View style={styles.voiceArea}>
          <Pressable
            onPress={record}
            disabled={listening || disabled}
            accessibilityLabel="Gravar resposta"
            style={({ pressed }) => [styles.mic, listening && styles.micActive, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            {listening ? <ActivityIndicator color={colors.white} size="large" /> : <Txt style={styles.micIcon}>🎤</Txt>}
          </Pressable>
          <View style={styles.hintPill}>
            <Txt weight="semibold" style={styles.hintText}>
              {listening ? 'Ouvindo... fale agora!' : 'Aperte quando estiver pronto para falar!'}
            </Txt>
          </View>
        </View>
      ) : (
        <View style={styles.voiceArea}>
          <View style={styles.hintPill}>
            <Txt weight="semibold" style={styles.hintText}>
              {availability.reason}
            </Txt>
          </View>
          <Txt style={styles.voiceTip}>Toque em 🔊 para ouvir e repita em voz alta para treinar.</Txt>
        </View>
      )}

      {error ? <Txt weight="semibold" style={styles.voiceError}>{error}</Txt> : null}

      <Btn title="Pular pergunta (sem pontos)" variant="light" small onPress={onSkip} style={{ marginTop: 10 }} />
    </>
  );
}

// ------------------------------------------------------------------- pop-ups

function FeedbackPopup({ feedback, isLast, onNext, onRetry }) {
  const { correct, reward, alreadyEarned, said, kind, correctAnswer } = feedback;
  return (
    <Popup>
      <Txt weight="bold" style={styles.feedbackTitle}>
        {correct ? (kind === 'voice' ? 'Parabéns! Você acertou!' : 'Muito bem! Você acertou!') : 'Que pena! Você errou :('}
      </Txt>
      {said !== undefined ? <Txt style={styles.feedbackLine}>Você disse: “{said}”</Txt> : null}
      {!correct ? <Txt style={styles.feedbackLine}>Resposta certa: {correctAnswer}</Txt> : null}
      <Txt style={styles.feedbackLine}>
        Recompensa: {reward} {COIN}
        {correct && alreadyEarned ? '  (você já ganhou esta)' : ''}
      </Txt>
      <View style={styles.feedbackActions}>
        {!correct && kind === 'voice' ? (
          <Btn title="Tentar de novo" variant="light" small onPress={onRetry} style={{ marginRight: 8 }} />
        ) : null}
        <Pressable onPress={onNext} hitSlop={8}>
          <Txt weight="semibold" style={styles.nextLink}>
            {isLast ? 'Ver resultado ›' : 'Próxima questão ›'}
          </Txt>
        </Pressable>
      </View>
    </Popup>
  );
}

function SummaryPopup({ summary, onReplay, onExit }) {
  const { correct, answered, coins, passed, newlyPassed, hasNext } = summary;
  let headline = 'Continue praticando!';
  if (answered > 0 && correct === answered) headline = 'Perfeito!';
  else if (passed) headline = 'Muito bem!';

  return (
    <Popup style={{ alignItems: 'center' }}>
      <Title style={{ marginBottom: 10 }}>Fase finalizada!</Title>
      <Txt style={styles.summaryLine}>
        <Txt weight="bold">{headline}</Txt> Você acertou {correct}/{answered} pergunta{answered === 1 ? '' : 's'}.
      </Txt>
      <Txt style={styles.summaryLine}>
        Recompensa total: <Txt weight="bold">{coins} {COIN}</Txt>
      </Txt>
      {newlyPassed && hasNext ? (
        <Txt weight="bold" style={[styles.summaryLine, { color: '#1E8E3E' }]}>🎉 Próxima fase desbloqueada!</Txt>
      ) : null}
      {!passed ? (
        <Txt style={[styles.summaryLine, { color: colors.muted, fontSize: 13 }]}>
          Acerte pelo menos {summary.needed} perguntas da fase para avançar.
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', marginTop: 14 }}>
        <Btn title="Jogar de novo" variant="light" onPress={onReplay} style={{ marginRight: 10 }} />
        <Btn title="Menu" onPress={onExit} />
      </View>
    </Popup>
  );
}

// ---------------------------------------------------------------------- tela

export default function GameScreen({ user, difficulty, onExit }) {
  const [phase, setPhase] = useState(undefined); // undefined = carregando, null = sem conteúdo
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [round, setRound] = useState(0);

  const earned = useRef(new Set()); // perguntas já acertadas (servidor + local)
  const results = useRef([]); // { correct, reward, skipped }
  const passedBefore = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [modules, activities, earnedIds] = await Promise.all([
        db.getModules(),
        db.getActivities(),
        db.getEarnedIds(user.id),
      ]);
      if (!alive) return;
      const chosen = pickPhase(modules, activities, earnedIds, difficulty);
      earned.current = earnedIds;
      results.current = [];
      if (chosen) {
        passedBefore.current = phasePassed(chosen.earned, chosen.questions.length);
        chosen.hasNext = modules.some(m => m.order_index > chosen.module.order_index);
        chosen.questions = chosen.questions.map(q => ({ ...q, shuffled: shuffle(q.options) }));
      }
      setPhase(chosen);
      setIndex(0);
      setPicked(null);
      setFeedback(null);
      setSummary(null);
    })();
    return () => {
      alive = false;
    };
  }, [user.id, difficulty, round]);

  if (phase === undefined) {
    return (
      <GameBackground>
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      </GameBackground>
    );
  }

  if (phase === null) {
    return (
      <GameBackground>
        <BackButton onPress={onExit} color={colors.white} />
        <View style={styles.centerFill}>
          <Popup>
            <Txt weight="bold" style={styles.feedbackTitle}>Ainda não há fases neste aparelho.</Txt>
            <Txt style={styles.feedbackLine}>Conecte-se à internet uma vez para baixar o conteúdo.</Txt>
            <Btn title="Voltar" onPress={onExit} style={{ marginTop: 12 }} />
          </Popup>
        </View>
      </GameBackground>
    );
  }

  const questions = phase.questions;
  const question = questions[index];
  const isLast = index === questions.length - 1;

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

    // Numa nova tentativa de voz, vale o melhor resultado da pergunta.
    const prev = results.current[index];
    if (!prev || prev.skipped || (!prev.correct && correct)) {
      results.current[index] = { correct, reward: (prev?.reward ?? 0) + reward, skipped: false };
    }
    setFeedback({ correct, reward, alreadyEarned, kind: question.kind, correctAnswer: question.correct_answer, ...extra });
  }

  function pickOption(option) {
    setPicked(option);
    registerAnswer(option);
  }

  function voiceResult(alternatives) {
    const said = bestTranscript(alternatives, question.correct_answer);
    registerAnswer(said, { said });
  }

  function skip() {
    speech.stopListening();
    if (!results.current[index]) results.current[index] = { correct: false, reward: 0, skipped: true };
    advance();
  }

  function advance() {
    setFeedback(null);
    setPicked(null);
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    const done = results.current.filter(r => r && !r.skipped);
    const phaseEarned = questions.filter(q => earned.current.has(q.id)).length;
    const passed = phasePassed(phaseEarned, questions.length);
    setSummary({
      correct: done.filter(r => r.correct).length,
      answered: done.length,
      coins: results.current.reduce((sum, r) => sum + (r?.reward ?? 0), 0),
      passed,
      newlyPassed: passed && !passedBefore.current,
      hasNext: phase.hasNext,
      needed: Math.ceil(questions.length * PASS_RATIO),
    });
  }

  const diff = DIFFICULTY_STYLES[difficulty];

  return (
    <GameBackground>
      <BackButton onPress={() => setConfirmExit(true)} color={colors.white} />
      <View style={[styles.phaseTag, { backgroundColor: diff.color, borderColor: diff.border }]}>
        <Txt weight="bold" style={{ fontSize: 12 }}>
          Fase {phase.number} · {phase.module.title} · {diff.label}
        </Txt>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <QuestionHeader number={index + 1} total={questions.length} />
        {question.kind === 'voice' ? (
          <VoiceQuestion
            key={`${question.id}-${index}`}
            question={question}
            onResult={voiceResult}
            onSkip={skip}
            disabled={!!feedback}
          />
        ) : (
          <ChoiceQuestion question={question} options={question.shuffled} picked={picked} onPick={pickOption} />
        )}
      </ScrollView>

      {feedback ? (
        <FeedbackPopup feedback={feedback} isLast={isLast} onNext={advance} onRetry={() => setFeedback(null)} />
      ) : null}

      {summary ? <SummaryPopup summary={summary} onReplay={() => setRound(r => r + 1)} onExit={onExit} /> : null}

      {confirmExit ? (
        <Popup style={{ alignItems: 'center' }}>
          <Txt weight="bold" style={styles.feedbackTitle}>Sair da fase?</Txt>
          <Txt style={styles.feedbackLine}>As respostas que você já deu ficam salvas.</Txt>
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <Btn title="Continuar" variant="light" onPress={() => setConfirmExit(false)} style={{ marginRight: 10 }} />
            <Btn
              title="Sair"
              onPress={() => {
                speech.stopListening();
                onExit();
              }}
            />
          </View>
        </Popup>
      ) : null}
    </GameBackground>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 24 },
  phaseTag: {
    position: 'absolute',
    top: 14,
    right: 12,
    zIndex: 5,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  header: { alignItems: 'center', marginBottom: 14 },
  headerCrab: { marginBottom: -10, zIndex: 2 },
  headerCard: { backgroundColor: colors.card, paddingHorizontal: 30, paddingVertical: 8, minWidth: 200, alignItems: 'center' },
  headerText: { fontSize: 22 },
  promptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 16,
    paddingRight: 5,
    borderWidth: 2,
    borderColor: colors.white,
    maxWidth: 640,
    marginBottom: 14,
  },
  promptLabel: { fontSize: 14, marginRight: 10, paddingVertical: 6 },
  promptChip: { backgroundColor: colors.orangeDark, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 7, flexShrink: 1 },
  promptChipText: { color: colors.white, fontSize: 17 },
  listen: { marginLeft: 6, padding: 4 },
  options: { width: '100%', maxWidth: 300, alignItems: 'stretch' },
  option: { backgroundColor: colors.card, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, marginBottom: 8 },
  optionRight: { backgroundColor: colors.correct },
  optionWrong: { backgroundColor: colors.wrong },
  optionText: { fontSize: 14 },
  voiceArea: { alignItems: 'center', marginTop: 4 },
  mic: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.orangeDark,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  micActive: { backgroundColor: colors.wrong },
  micIcon: { fontSize: 38 },
  hintPill: { backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, maxWidth: 420 },
  hintText: { fontSize: 13, textAlign: 'center' },
  voiceTip: { color: colors.white, fontSize: 12, marginTop: 8, textAlign: 'center' },
  voiceError: { color: colors.white, marginTop: 10, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 8 },
  feedbackTitle: { fontSize: 18, textAlign: 'center', marginBottom: 8 },
  feedbackLine: { fontSize: 15, textAlign: 'center', marginBottom: 4 },
  feedbackActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 },
  nextLink: { fontSize: 14, color: colors.ink },
  summaryLine: { fontSize: 15, textAlign: 'center', marginBottom: 6 },
});
