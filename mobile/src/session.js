// Autenticação, sincronização e estatísticas do aluno, com estratégia Offline-First:
// - login online quando possível; sem internet, valida a senha contra um hash local
//   guardado no último login online deste aparelho;
// - tentativas, avatar e conteúdo ficam locais e sincronizam quando a rede volta.

import * as Crypto from 'expo-crypto';

import { api } from './api';
import * as db from './db';
import { coinsFor, levelInfo, makeId } from './game';

const CURRENT_USER = 'current_user_id';

async function hashPassword(password, salt) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `crabjeu:${salt}:${password}`);
}

function newSalt() {
  return typeof Crypto.randomUUID === 'function' ? Crypto.randomUUID() : makeId();
}

async function rememberCredentials(userId, password) {
  const salt = newSalt();
  await db.setUserCredentials(userId, salt, await hashPassword(password, salt));
}

async function rememberSession({ user, token }, password) {
  if (user.role !== 'student') {
    throw new Error('Este aplicativo é para alunos. Educadores acompanham o progresso pelo painel.');
  }
  await db.upsertUser(user);
  await db.setUserToken(user.id, token);
  await db.addEarned(user.id, user.earned_activity_ids ?? []);
  await rememberCredentials(user.id, password);
  await db.setSetting(CURRENT_USER, user.id);
  await downloadContent(token).catch(() => {});
  return db.getUserById(user.id);
}

const cleanUsername = username => username.trim().toLowerCase();

export async function login(username, password) {
  const name = cleanUsername(username);
  try {
    return { user: await rememberSession(await api.login(name, password), password), offline: false };
  } catch (e) {
    if (!e.offline) throw e;

    // Sem internet: entra com os dados guardados neste aparelho.
    const local = await db.getUserByUsername(name);
    if (!local?.password_hash) {
      throw new Error('Sem internet. O primeiro acesso neste aparelho precisa de conexão.');
    }
    if ((await hashPassword(password, local.password_salt)) !== local.password_hash) {
      throw new Error('Usuário ou senha inválidos.');
    }
    await db.setSetting(CURRENT_USER, local.id);
    return { user: local, offline: true };
  }
}

export async function register(username, password, avatarKey) {
  try {
    return await rememberSession(await api.register(cleanUsername(username), password, avatarKey), password);
  } catch (e) {
    if (e.offline) throw new Error('Para criar uma conta é preciso estar conectado à internet.');
    throw e;
  }
}

export async function logout() {
  await db.setSetting(CURRENT_USER, null);
}

export async function currentUser() {
  const id = await db.getSetting(CURRENT_USER);
  return id ? db.getUserById(id) : null;
}

// ---------------------------------------------------------------- configurações

/** Avatar funciona offline: fica pendente e sobe na próxima sincronização. */
export async function changeAvatar(userId, avatarKey) {
  await db.setUserAvatar(userId, avatarKey, true);
  return db.getUserById(userId);
}

async function requireOnlineToken(userId) {
  const user = await db.getUserById(userId);
  if (!user?.token) throw new Error('Sua sessão expirou. Saia e entre de novo com internet.');
  return user.token;
}

function onlineOnly(e, what) {
  if (e.offline) return new Error(`Para alterar ${what} é preciso estar conectado à internet.`);
  return e;
}

export async function changeUsername(userId, username) {
  const token = await requireOnlineToken(userId);
  try {
    const me = await api.updateMe(token, { username: cleanUsername(username) });
    await db.upsertUser(me);
    return db.getUserById(userId);
  } catch (e) {
    throw onlineOnly(e, 'o nome');
  }
}

export async function changePassword(userId, currentPassword, newPassword) {
  const token = await requireOnlineToken(userId);
  try {
    await api.changePassword(token, currentPassword, newPassword);
  } catch (e) {
    throw onlineOnly(e, 'a senha');
  }
  await rememberCredentials(userId, newPassword);
}

// ---------------------------------------------------------------- sincronização

async function downloadContent(token) {
  const payload = await api.content(token, await db.getContentVersion());
  await db.cacheContent(payload);
}

let running = null;

/**
 * Envia avatar e tentativas pendentes, baixa conteúdo novo e atualiza o perfil.
 * Retorna { state: 'synced' | 'offline' | 'auth' | 'error', message? }.
 * Nunca lança erro: sem internet, os dados simplesmente continuam locais.
 */
export function syncNow(userId) {
  if (!running) {
    running = doSync(userId).finally(() => {
      running = null;
    });
  }
  return running;
}

async function doSync(userId) {
  const user = await db.getUserById(userId);
  if (!user) return { state: 'error', message: 'Usuário local não encontrado.' };
  if (!user.token) return { state: 'auth' };
  const { token } = user;

  try {
    if (user.pending_avatar) {
      const me = await api.updateMe(token, { avatar_key: user.avatar_key });
      await db.setUserAvatar(userId, me.avatar_key, false);
    }

    const pending = await db.getPendingAttempts(userId);
    if (pending.length) {
      const result = await api.syncAttempts(token, userId, pending);
      await db.markAttemptsSynced(pending.map(p => p.attempt_id));
      await db.addEarned(userId, result.earned_activity_ids);
    }

    await downloadContent(token);

    const me = await api.me(token);
    await db.upsertUser(me);
    await db.addEarned(userId, me.earned_activity_ids);
    return { state: 'synced', at: new Date() };
  } catch (e) {
    if (e.offline) return { state: 'offline' };
    if (e.status === 401) {
      await db.setUserToken(userId, null);
      return { state: 'auth' };
    }
    return { state: 'error', message: e.message };
  }
}

// ------------------------------------------------------------------ estatísticas

export async function loadStats(userId) {
  const [earned, activities, pending] = await Promise.all([
    db.getEarnedIds(userId),
    db.getActivities(),
    db.countPendingAttempts(userId),
  ]);
  const coins = coinsFor(earned, new Map(activities.map(a => [a.id, a])));
  return { coins, ...levelInfo(coins), pending, hasContent: activities.length > 0 };
}
