// Regras do jogo — espelho de backend/app/game_rules.py.
// O cliente usa estas regras para funcionar offline; o servidor recalcula
// tudo na sincronização. Mantenha os dois arquivos iguais
// (scripts/check-game-rules.js verifica os casos compartilhados).

export const DIFFICULTIES = ['facil', 'medio', 'dificil'];

// Moedas ganhas no PRIMEIRO acerto de cada pergunta, por dificuldade.
export const REWARDS = { facil: 1, medio: 2, dificil: 3 };

// Curva de níveis: do nível L para o L+1 são LEVEL_BASE + LEVEL_STEP * L moedas.
export const LEVEL_BASE = 10;
export const LEVEL_STEP = 5;

// Títulos por faixa de nível (aparecem na barra de nível).
export const TIERS = [
  { minLevel: 0, title: 'Caranguejinho' },
  { minLevel: 2, title: 'Explorador do mangue' },
  { minLevel: 4, title: 'Aventureiro' },
  { minLevel: 6, title: 'Navegador' },
  { minLevel: 8, title: 'Capitão' },
  { minLevel: 11, title: 'Mestre do francês' },
];

// Perguntas por rodada (a fase é jogada em rodadas, na ordem do conteúdo).
export const ROUND_SIZE = 6;

export const VOICE_THRESHOLD = 0.75;

// ------------------------------------------------------------ correção da fala
// O reconhecimento de voz às vezes devolve números como dígitos ("5" em vez de
// "cinq"); por isso os números viram palavras em francês antes de comparar.

const UNITS = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' };

export function numberToFrench(n) {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix ${UNITS[n - 10]}`;
  if (n < 70) {
    const unit = n % 10;
    const tens = TENS[n - unit];
    if (unit === 0) return tens;
    return unit === 1 ? `${tens} et un` : `${tens} ${UNITS[unit]}`;
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante ${numberToFrench(n - 60)}`;
  if (n === 80) return 'quatre vingts';
  if (n < 100) return `quatre vingt ${numberToFrench(n - 80)}`;
  if (n === 100) return 'cent';
  return String(n);
}

export function normalize(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\d+/g, m => ` ${numberToFrench(Number(m))} `)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Aproxima a pronúncia: letras mudas e grafias que soam igual viram uma só. */
function phoneticWord(input) {
  let word = input;
  for (const [a, b] of [['eaux', 'o'], ['eau', 'o'], ['aux', 'o'], ['au', 'o'], ['ph', 'f'], ['qu', 'k'],
    ['ch', 'x'], ['ai', 'e'], ['ei', 'e'], ['y', 'i'], ['h', '']]) {
    word = word.split(a).join(b);
  }
  word = word.replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/q/g, 'k');
  word = word.replace(/(er|ez|et)$/, 'e');
  word = word.replace(/(.)\1+/g, '$1');
  // Letras finais mudas: um "e" e depois uma consoante (s, t, x, d).
  if (word.length > 2 && word.endsWith('e')) word = word.slice(0, -1);
  if (word.length > 2 && 'stxd'.includes(word[word.length - 1])) word = word.slice(0, -1);
  return word;
}

export function phonetic(text) {
  return normalize(text).split(' ').filter(Boolean).map(phoneticWord).join(' ');
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

const ratio = (a, b) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

function containsInOrder(answer, expected) {
  let i = 0;
  for (const word of answer) if (word === expected[i]) i += 1;
  return expected.length > 0 && i === expected.length;
}

/** O maior valor entre a comparação da escrita e a da pronúncia aproximada. */
export function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  // Falou a frase inteira com algo a mais ("euh... cinq"): conta como certo.
  if (containsInOrder(na.split(' '), nb.split(' '))) return 1;
  return Math.max(ratio(na, nb), ratio(phonetic(a), phonetic(b)));
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

export function coinsToNext(level) {
  return LEVEL_BASE + LEVEL_STEP * level;
}

export function levelInfo(coins) {
  let level = 0;
  let into = Math.max(coins, 0);
  while (into >= coinsToNext(level)) {
    into -= coinsToNext(level);
    level += 1;
  }
  const needed = coinsToNext(level);
  return { level, into, needed, remaining: needed - into, tier: tierFor(level), nextTier: nextTier(level) };
}

export function tierFor(level) {
  return TIERS.filter(t => level >= t.minLevel).pop();
}

export function nextTier(level) {
  return TIERS.find(t => t.minLevel > level) ?? null;
}

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${hex()}-${hex()}-${hex()}`;
}

// ------------------------------------------------------------------- fases
// A trilha é uma sequência fixa de fases. Cada fase é um tema numa dificuldade.
// Os temas vêm em unidades de UNIT_SIZE: primeiro as fases fáceis da unidade,
// depois as médias e por fim as difíceis; então começa a próxima unidade, com
// vocabulário novo. Uma fase só abre quando a anterior é concluída, e uma fase
// é concluída quando todas as perguntas dela foram respondidas (cada pergunta
// aparece uma única vez para o aluno).

export const UNIT_SIZE = 4;

/**
 * Monta as fases a partir do conteúdo. Perguntas que o aparelho não consegue
 * fazer (voz sem reconhecimento, "ouça e escolha" sem síntese de voz) ficam fora.
 */
export function buildPhases(modules, activities, { allowVoice = true, allowListen = true } = {}) {
  const ordered = [...modules].sort((a, b) => a.order_index - b.order_index);
  const usable = activities.filter(a => (allowVoice || a.kind !== 'voice') && (allowListen || a.kind !== 'listen'));
  const phases = [];
  for (let start = 0; start < ordered.length; start += UNIT_SIZE) {
    const unitModules = ordered.slice(start, start + UNIT_SIZE);
    const unit = start / UNIT_SIZE + 1;
    for (const difficulty of DIFFICULTIES) {
      for (const module of unitModules) {
        const questions = usable
          .filter(a => a.module_id === module.id && a.difficulty === difficulty)
          .sort((a, b) => a.order_index - b.order_index);
        if (!questions.length) continue;
        phases.push({ id: `${module.id}:${difficulty}`, unit, unitTitles: unitModules.map(m => m.title), module, difficulty, questions });
      }
    }
  }
  phases.forEach((p, i) => {
    p.number = i + 1;
  });
  return phases;
}

/** Progresso e estado de cada fase: concluída, atual (a primeira não concluída) ou bloqueada. */
export function phaseProgress(phases, seenSet) {
  let currentFound = false;
  return phases.map(phase => {
    const done = phase.questions.filter(q => seenSet.has(q.id)).length;
    const total = phase.questions.length;
    let state = 'locked';
    if (done >= total) state = 'done';
    else if (!currentFound) {
      state = 'current';
      currentFound = true;
    }
    if (state === 'done' && currentFound) state = 'done'; // concluída depois da atual: continua concluída
    return { ...phase, done, total, pct: total ? done / total : 1, state };
  });
}

/**
 * Próximas perguntas da fase, na ordem do conteúdo, sem repetir nenhuma que o
 * aluno já viu. Devolve [] quando a fase já foi toda respondida.
 */
export function nextQuestions(phase, seenSet, size = ROUND_SIZE) {
  return phase.questions.filter(q => !seenSet.has(q.id)).slice(0, size);
}

// --------------------------------------------------------------- ofensiva
// Dias seguidos em que o aluno respondeu pelo menos uma pergunta. O dia segue
// o horário de Recife (UTC-3), igual ao servidor (game_rules.py).
export const STREAK_UTC_OFFSET_HOURS = -3;

export function dayKey(moment = new Date()) {
  const d = new Date(new Date(moment).getTime() + STREAK_UTC_OFFSET_HOURS * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function shiftDay(key, delta) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function streakInfo(days, today = dayKey()) {
  const set = days instanceof Set ? days : new Set(days);
  const activeToday = set.has(today);
  let current = 0;
  let cursor = activeToday ? today : shiftDay(today, -1);
  while (set.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }
  let best = 0;
  let run = 0;
  let last = null;
  for (const key of [...set].sort()) {
    run = last !== null && shiftDay(key, -1) === last ? run + 1 : 1;
    best = Math.max(best, run);
    last = key;
  }
  return { current, best, activeToday };
}

const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Os últimos 7 dias (terminando hoje), para o calendário da ofensiva. */
export function lastWeek(days, today = dayKey()) {
  const set = days instanceof Set ? days : new Set(days);
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftDay(today, i - 6);
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
    return { key, label: WEEK_LABELS[weekday], active: set.has(key), isToday: key === today };
  });
}
