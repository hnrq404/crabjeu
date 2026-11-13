// Regras do jogo — espelho de backend/app/game_rules.py.
// O cliente usa estas regras para funcionar offline; o servidor recalcula
// tudo na sincronização. Mantenha os dois arquivos iguais
// (scripts/check-game-rules.js verifica os casos compartilhados).

export const DIFFICULTIES = ['facil', 'medio', 'dificil'];

// Moedas ganhas no PRIMEIRO acerto de cada pergunta, por dificuldade.
export const REWARDS = { facil: 1, medio: 2, dificil: 3 };

export const COINS_PER_LEVEL = 20;

// Fração mínima de acertos para a fase contar como concluída (4 de 6).
export const PASS_RATIO = 2 / 3;

export const VOICE_THRESHOLD = 0.75;

export function normalize(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  const longest = Math.max(na.length, nb.length, 1);
  return 1 - levenshtein(na, nb) / longest;
}

export function isCorrect(kind, answer, correctAnswer) {
  if (kind === 'voice') return similarity(answer, correctAnswer) >= VOICE_THRESHOLD;
  return answer === correctAnswer;
}

// Entre as transcrições alternativas do reconhecimento de voz, escolhe a mais próxima.
export function bestTranscript(alternatives, expected) {
  return [...alternatives].sort((x, y) => similarity(y, expected) - similarity(x, expected))[0] ?? '';
}

export function coinsFor(earnedIds, activitiesById) {
  let coins = 0;
  for (const id of earnedIds) {
    const activity = activitiesById.get(id);
    if (activity) coins += REWARDS[activity.difficulty] ?? 0;
  }
  return coins;
}

export function levelInfo(coins) {
  const level = Math.floor(coins / COINS_PER_LEVEL);
  const into = coins % COINS_PER_LEVEL;
  return { level, into, needed: COINS_PER_LEVEL, remaining: COINS_PER_LEVEL - into };
}

export function phasePassed(correctCount, total) {
  return total > 0 && correctCount >= Math.ceil(total * PASS_RATIO);
}

/**
 * Escolhe a fase a jogar numa dificuldade: a primeira ainda não concluída
 * (fases desbloqueiam em ordem). Se todas estiverem concluídas, a primeira
 * que ainda tenha perguntas sem acerto; se não houver, recomeça da primeira.
 */
export function pickPhase(modules, activities, earnedSet, difficulty) {
  const ordered = [...modules].sort((a, b) => a.order_index - b.order_index);
  const phases = ordered
    .map((module, index) => {
      const questions = activities
        .filter(a => a.module_id === module.id && a.difficulty === difficulty)
        .sort((a, b) => a.order_index - b.order_index);
      const earned = questions.filter(q => earnedSet.has(q.id)).length;
      return { module, number: index + 1, questions, earned };
    })
    .filter(p => p.questions.length > 0);

  if (!phases.length) return null;
  return (
    phases.find(p => !phasePassed(p.earned, p.questions.length)) ||
    phases.find(p => p.earned < p.questions.length) ||
    phases[0]
  );
}

export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${hex()}-${hex()}-${hex()}`;
}
