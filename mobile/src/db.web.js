// Versão web do banco local (usada automaticamente pelo Metro no build web).
// Mesma API de db.js, mas persistindo no armazenamento do navegador em vez do
// SQLite nativo. Assim o PWA continua Offline-First: tentativas ficam salvas
// localmente com synced = 0 até a sincronização.

const STORAGE_KEY = 'crabjeu:local-db:v2';
const LEGACY_KEY = 'crabjeu:local-db:v1';

let db;

function emptyDb() {
  return { users: {}, modules: {}, activities: {}, attempts: {}, earned: {}, settings: {} };
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyDb(), ...JSON.parse(raw) };

    // v1 → v2: preserva tentativas; conteúdo e perfis são baixados de novo.
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) || 'null');
    const fresh = emptyDb();
    for (const [id, a] of Object.entries(legacy?.attempts ?? {})) {
      fresh.attempts[id] = { ...a, is_correct: a.score >= 100 ? 1 : 0 };
    }
    return fresh;
  } catch {
    return emptyDb();
  }
}

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export async function initDb() {
  db = load();
  persist();
  // Pede ao navegador para não apagar os dados locais sob pressão de espaço.
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Opcional: nem todo navegador suporta.
  }
  return db;
}

function conn() {
  if (!db) throw new Error('Banco local ainda não inicializado');
  return db;
}

// ------------------------------------------------------------------ settings

export async function getSetting(key) {
  return conn().settings[key] ?? null;
}

export async function setSetting(key, value) {
  if (value === null || value === undefined) delete conn().settings[key];
  else conn().settings[key] = String(value);
  persist();
}

// --------------------------------------------------------------------- users

export async function upsertUser({ id, username, role, avatar_key }) {
  const users = conn().users;
  const current = users[id];
  users[id] = {
    password_salt: null,
    password_hash: null,
    token: null,
    pending_avatar: 0,
    ...current,
    id,
    username,
    role,
    avatar_key: current?.pending_avatar ? current.avatar_key : avatar_key ?? null,
  };
  persist();
}

export async function getUserById(id) {
  return conn().users[id] ?? null;
}

export async function getUserByUsername(username) {
  return Object.values(conn().users).find(u => u.username === username) ?? null;
}

function patchUser(id, changes) {
  const user = conn().users[id];
  if (!user) return;
  Object.assign(user, changes);
  persist();
}

export async function setUserCredentials(id, salt, hash) {
  patchUser(id, { password_salt: salt, password_hash: hash });
}

export async function setUserToken(id, token) {
  patchUser(id, { token });
}

export async function setUserAvatar(id, avatarKey, pending) {
  patchUser(id, { avatar_key: avatarKey, pending_avatar: pending ? 1 : 0 });
}

// ------------------------------------------------------------------- content

export async function cacheContent(payload) {
  const c = conn();
  for (const m of payload.modules ?? []) {
    c.modules[m.id] = {
      id: m.id,
      title: m.title,
      description: m.description ?? '',
      order_index: m.order_index,
      version: m.version,
    };
  }
  for (const a of payload.activities ?? []) {
    c.activities[a.id] = {
      id: a.id,
      module_id: a.module_id,
      kind: a.kind,
      difficulty: a.difficulty,
      order_index: a.order_index,
      question_text: a.question_text,
      prompt: a.prompt ?? null,
      options_json: JSON.stringify(a.options ?? []),
      correct_answer: a.correct_answer,
      version: a.version,
    };
  }
  c.settings.content_version = String(payload.content_version ?? 0);
  persist();
}

export async function getContentVersion() {
  return Number(conn().settings.content_version ?? 0);
}

export async function getModules() {
  return Object.values(conn().modules).sort((a, b) => a.order_index - b.order_index);
}

export async function getActivities() {
  return Object.values(conn().activities).map(r => ({ ...r, options: JSON.parse(r.options_json) }));
}

// ------------------------------------------------------------------ attempts

export async function saveAttempt({ attemptId, studentId, activityId, selectedAnswer, isCorrect, completedAt }) {
  const c = conn();
  if (c.attempts[attemptId]) throw new Error(`Tentativa duplicada: ${attemptId}`);
  c.attempts[attemptId] = {
    attempt_id: attemptId,
    student_id: studentId,
    activity_id: activityId,
    selected_answer: selectedAnswer,
    is_correct: isCorrect ? 1 : 0,
    score: isCorrect ? 100 : 0,
    completed_at: completedAt,
    synced: 0,
  };
  persist();
}

export async function getPendingAttempts(studentId) {
  return Object.values(conn().attempts)
    .filter(a => a.student_id === studentId && a.synced === 0)
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
}

export async function countPendingAttempts(studentId) {
  return (await getPendingAttempts(studentId)).length;
}

export async function markAttemptsSynced(ids) {
  const c = conn();
  for (const id of ids) {
    if (c.attempts[id]) c.attempts[id].synced = 1;
  }
  persist();
}

// -------------------------------------------------------------------- earned

export async function addEarned(userId, activityIds) {
  const c = conn();
  const set = new Set(c.earned[userId] ?? []);
  for (const id of activityIds) set.add(id);
  c.earned[userId] = [...set];
  persist();
}

export async function getEarnedIds(userId) {
  const c = conn();
  const set = new Set(c.earned[userId] ?? []);
  for (const a of Object.values(c.attempts)) {
    if (a.student_id === userId && a.is_correct === 1) set.add(a.activity_id);
  }
  return set;
}
