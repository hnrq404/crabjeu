// Banco local do app nativo (SQLite). A versão web está em db.web.js e
// expõe exatamente as mesmas funções.

import * as SQLite from 'expo-sqlite';

const SCHEMA_VERSION = 2;

let db;

export async function initDb() {
  db = await SQLite.openDatabaseAsync('crabjeu.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const { user_version: version } = await db.getFirstAsync('PRAGMA user_version');
  if (version < SCHEMA_VERSION) {
    // v1 → v2: conteúdo e perfis mudaram de formato; são baixados de novo do servidor.
    // As tentativas (attempts) são preservadas.
    await db.execAsync(`
      DROP TABLE IF EXISTS profiles;
      DROP TABLE IF EXISTS activities;
      DELETE FROM settings WHERE key = 'content_version';
    `).catch(() => {});
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_key TEXT,
      password_salt TEXT,
      password_hash TEXT,
      token TEXT,
      pending_avatar INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL,
      version INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      prompt TEXT,
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      version INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attempts (
      attempt_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      selected_answer TEXT NOT NULL,
      score REAL NOT NULL,
      completed_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS earned (
      user_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      PRIMARY KEY (user_id, activity_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Coluna nova em attempts (tabela pode vir da v1).
  await db.execAsync('ALTER TABLE attempts ADD COLUMN is_correct INTEGER NOT NULL DEFAULT 0;').catch(() => {});
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  return db;
}

function conn() {
  if (!db) throw new Error('Banco local ainda não inicializado');
  return db;
}

// ------------------------------------------------------------------ settings

export async function getSetting(key) {
  const row = await conn().getFirstAsync('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  if (value === null || value === undefined) {
    await conn().runAsync('DELETE FROM settings WHERE key = ?', key);
  } else {
    await conn().runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, String(value));
  }
}

// --------------------------------------------------------------------- users

export async function upsertUser({ id, username, role, avatar_key }) {
  await conn().runAsync(
    `INSERT INTO users (id, username, role, avatar_key) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       role = excluded.role,
       avatar_key = CASE WHEN users.pending_avatar = 1 THEN users.avatar_key ELSE excluded.avatar_key END`,
    id, username, role, avatar_key ?? null
  );
}

export async function getUserById(id) {
  return conn().getFirstAsync('SELECT * FROM users WHERE id = ?', id);
}

export async function getUserByUsername(username) {
  return conn().getFirstAsync('SELECT * FROM users WHERE username = ?', username);
}

export async function setUserCredentials(id, salt, hash) {
  await conn().runAsync('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?', salt, hash, id);
}

export async function setUserToken(id, token) {
  await conn().runAsync('UPDATE users SET token = ? WHERE id = ?', token, id);
}

export async function setUserAvatar(id, avatarKey, pending) {
  await conn().runAsync(
    'UPDATE users SET avatar_key = ?, pending_avatar = ? WHERE id = ?',
    avatarKey, pending ? 1 : 0, id
  );
}

// ------------------------------------------------------------------- content

export async function cacheContent(payload) {
  const c = conn();
  for (const m of payload.modules ?? []) {
    await c.runAsync(
      `INSERT OR REPLACE INTO modules (id, title, description, order_index, version)
       VALUES (?, ?, ?, ?, ?)`,
      m.id, m.title, m.description ?? '', m.order_index, m.version
    );
  }
  for (const a of payload.activities ?? []) {
    await c.runAsync(
      `INSERT OR REPLACE INTO activities
       (id, module_id, kind, difficulty, order_index, question_text, prompt, options_json, correct_answer, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      a.id, a.module_id, a.kind, a.difficulty, a.order_index, a.question_text,
      a.prompt ?? null, JSON.stringify(a.options ?? []), a.correct_answer, a.version
    );
  }
  await setSetting('content_version', payload.content_version ?? 0);
}

export async function getContentVersion() {
  return Number((await getSetting('content_version')) ?? 0);
}

export async function getModules() {
  return conn().getAllAsync('SELECT * FROM modules ORDER BY order_index');
}

export async function getActivities() {
  const rows = await conn().getAllAsync('SELECT * FROM activities');
  return rows.map(r => ({ ...r, options: JSON.parse(r.options_json) }));
}

// ------------------------------------------------------------------ attempts

export async function saveAttempt({ attemptId, studentId, activityId, selectedAnswer, isCorrect, completedAt }) {
  await conn().runAsync(
    `INSERT INTO attempts
     (attempt_id, student_id, activity_id, selected_answer, is_correct, score, completed_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    attemptId, studentId, activityId, selectedAnswer, isCorrect ? 1 : 0, isCorrect ? 100 : 0, completedAt
  );
}

export async function getPendingAttempts(studentId) {
  return conn().getAllAsync(
    'SELECT * FROM attempts WHERE student_id = ? AND synced = 0 ORDER BY completed_at',
    studentId
  );
}

export async function countPendingAttempts(studentId) {
  const row = await conn().getFirstAsync(
    'SELECT COUNT(*) AS n FROM attempts WHERE student_id = ? AND synced = 0',
    studentId
  );
  return row?.n ?? 0;
}

export async function markAttemptsSynced(ids) {
  const c = conn();
  for (const id of ids) {
    await c.runAsync('UPDATE attempts SET synced = 1 WHERE attempt_id = ?', id);
  }
}

// -------------------------------------------------------------------- earned

/** Registra perguntas já acertadas segundo o servidor (ex.: vindas de outro aparelho). */
export async function addEarned(userId, activityIds) {
  const c = conn();
  for (const id of activityIds) {
    await c.runAsync('INSERT OR IGNORE INTO earned (user_id, activity_id) VALUES (?, ?)', userId, id);
  }
}

/** Perguntas já acertadas: confirmadas pelo servidor + acertos locais ainda não sincronizados. */
export async function getEarnedIds(userId) {
  const rows = await conn().getAllAsync(
    `SELECT activity_id FROM earned WHERE user_id = ?
     UNION
     SELECT activity_id FROM attempts WHERE student_id = ? AND is_correct = 1`,
    userId, userId
  );
  return new Set(rows.map(r => r.activity_id));
}
