import { Platform } from 'react-native';

// No PWA (web) a API é servida pelo mesmo nginx que entrega o app (/api -> FastAPI),
// então usamos a própria origem da página. No celular, usamos EXPO_PUBLIC_API_URL.
const DEFAULT_API_URL =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'http://127.0.0.1:8000';

const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const TIMEOUT_MS = 10000;

/** Erro de rede: servidor inalcançável (o app deve seguir offline). */
export class OfflineError extends Error {
  constructor() {
    super('Sem conexão com o servidor.');
    this.offline = true;
  }
}

/** Erro respondido pelo servidor (ex.: 401, 409). */
export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Erro ${status}`);
    this.status = status;
  }
}

async function request(path, { token, method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new OfflineError();
  } finally {
    clearTimeout(timer);
  }

  // Um proxy sem backend (ex.: nginx com a API fora do ar) também conta como offline.
  if ([502, 503, 504].includes(response.status)) throw new OfflineError();
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : null;
    throw new ApiError(response.status, detail);
  }
  return data;
}

export const api = {
  register: (username, password, avatarKey) =>
    request('/api/v1/auth/register', {
      method: 'POST',
      body: { username, password, avatar_key: avatarKey },
    }),
  login: (username, password) =>
    request('/api/v1/auth/login', { method: 'POST', body: { username, password } }),
  me: token => request('/api/v1/me', { token }),
  updateMe: (token, changes) => request('/api/v1/me', { token, method: 'PATCH', body: changes }),
  changePassword: (token, currentPassword, newPassword) =>
    request('/api/v1/me/password', {
      token,
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    }),
  content: (token, sinceVersion = 0) =>
    request(`/api/v1/content/sync?since_version=${sinceVersion}`, { token }),
  syncAttempts: (token, studentId, attempts) =>
    request('/api/v1/sync/attempts', {
      token,
      method: 'POST',
      body: {
        student_id: studentId,
        offline_attempts: attempts.map(a => ({
          attempt_id: a.attempt_id,
          activity_id: a.activity_id,
          selected_answer: a.selected_answer,
          score: a.score,
          completed_at: a.completed_at,
        })),
      },
    }),
};
