import * as SQLite from 'expo-sqlite';

let db;

export async function initDb() {
  db = await SQLite.openDatabaseAsync('crabjeu.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_key TEXT
    );
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Banco local ainda não inicializado');
  return db;
}

export async function cacheProfiles(profiles) {
  const conn = getDb();
  for (const p of profiles) {
    await conn.runAsync(
      'INSERT OR REPLACE INTO profiles (id, name, avatar_key) VALUES (?, ?, ?)',
      p.id, p.name, p.avatar_key ?? null
    );
  }
}

export async function getProfiles() {
  return getDb().getAllAsync('SELECT * FROM profiles ORDER BY name');
}

export async function cacheContent(payload) {
  const conn = getDb();
  for (const a of payload.activities ?? []) {
    await conn.runAsync(
      `INSERT OR REPLACE INTO activities
       (id, module_id, question_text, options_json, correct_answer, version)
       VALUES (?, ?, ?, ?, ?, ?)`,
      a.id, a.module_id, a.question_text, JSON.stringify(a.options), a.correct_answer, a.version
    );
  }
  await conn.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    'content_version', String(payload.content_version ?? 0)
  );
}

export async function getContentVersion() {
  const row = await getDb().getFirstAsync("SELECT value FROM settings WHERE key='content_version'");
  return row ? Number(row.value) : 0;
}

export async function getFirstActivity() {
  const row = await getDb().getFirstAsync('SELECT * FROM activities ORDER BY version DESC LIMIT 1');
  if (!row) return null;
  return { ...row, options: JSON.parse(row.options_json) };
}

export async function saveAttempt({ attemptId, studentId, activityId, selectedAnswer, score, completedAt }) {
  await getDb().runAsync(
    `INSERT INTO attempts
     (attempt_id, student_id, activity_id, selected_answer, score, completed_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    attemptId, studentId, activityId, selectedAnswer, score, completedAt
  );
}

export async function getPendingAttempts(studentId) {
  return getDb().getAllAsync(
    'SELECT * FROM attempts WHERE student_id = ? AND synced = 0 ORDER BY completed_at',
    studentId
  );
}

export async function markAttemptsSynced(ids) {
  const conn = getDb();
  for (const id of ids) {
    await conn.runAsync('UPDATE attempts SET synced = 1 WHERE attempt_id = ?', id);
  }
}

export async function getAttemptCounts(studentId) {
  const row = await getDb().getFirstAsync(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) AS pending
     FROM attempts WHERE student_id = ?`,
    studentId
  );
  return { total: row?.total ?? 0, pending: row?.pending ?? 0 };
}
