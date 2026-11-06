// Versão web do banco local (usada automaticamente pelo Metro no build web).
// Mesma API de db.js, mas persistindo no armazenamento do navegador em vez do
// SQLite nativo. Assim o PWA continua Offline-First: tentativas ficam salvas
// localmente com synced = 0 até a sincronização.

const STORAGE_KEY = 'crabjeu:local-db:v1';

let db;

function emptyDb() {
  return { profiles: {}, activities: {}, attempts: {}, settings: {} };
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyDb(), ...JSON.parse(raw) } : emptyDb();
  } catch {
    return emptyDb();
  }
}

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export async function initDb() {
  db = load();
  // Pede ao navegador para não apagar os dados locais sob pressão de espaço.
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Opcional: nem todo navegador suporta.
  }
  return db;
}

export function getDb() {
  if (!db) throw new Error('Banco local ainda não inicializado');
  return db;
}

export async function cacheProfiles(profiles) {
  const conn = getDb();
  for (const p of profiles) {
    conn.profiles[p.id] = { id: p.id, name: p.name, avatar_key: p.avatar_key ?? null };
  }
  persist();
}

export async function getProfiles() {
  return Object.values(getDb().profiles).sort((a, b) => a.name.localeCompare(b.name));
}

export async function cacheContent(payload) {
  const conn = getDb();
  for (const a of payload.activities ?? []) {
    conn.activities[a.id] = {
      id: a.id,
      module_id: a.module_id,
      question_text: a.question_text,
      options_json: JSON.stringify(a.options),
      correct_answer: a.correct_answer,
      version: a.version,
    };
  }
  conn.settings.content_version = String(payload.content_version ?? 0);
  persist();
}

export async function getContentVersion() {
  const value = getDb().settings.content_version;
  return value ? Number(value) : 0;
}

export async function getFirstActivity() {
  const [row] = Object.values(getDb().activities).sort((a, b) => b.version - a.version);
  if (!row) return null;
  return { ...row, options: JSON.parse(row.options_json) };
}

export async function saveAttempt({ attemptId, studentId, activityId, selectedAnswer, score, completedAt }) {
  const conn = getDb();
  if (conn.attempts[attemptId]) {
    throw new Error(`Tentativa duplicada: ${attemptId}`);
  }
  conn.attempts[attemptId] = {
    attempt_id: attemptId,
    student_id: studentId,
    activity_id: activityId,
    selected_answer: selectedAnswer,
    score,
    completed_at: completedAt,
    synced: 0,
  };
  persist();
}

export async function getPendingAttempts(studentId) {
  return Object.values(getDb().attempts)
    .filter(a => a.student_id === studentId && a.synced === 0)
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
}

export async function markAttemptsSynced(ids) {
  const conn = getDb();
  for (const id of ids) {
    if (conn.attempts[id]) conn.attempts[id].synced = 1;
  }
  persist();
}

export async function getAttemptCounts(studentId) {
  const mine = Object.values(getDb().attempts).filter(a => a.student_id === studentId);
  return { total: mine.length, pending: mine.filter(a => a.synced === 0).length };
}
