const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status}: ${body}`);
  }
  return response.json();
}

export function fetchProfiles() {
  return request('/api/v1/profiles');
}

export function login(profileId, pin) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, pin }),
  });
}

export function fetchContent(token, sinceVersion = 0) {
  return request(`/api/v1/content/sync?since_version=${sinceVersion}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function syncAttempts(token, studentId, attempts) {
  return request('/api/v1/sync/attempts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      student_id: studentId,
      offline_attempts: attempts.map(a => ({
        attempt_id: a.attempt_id,
        activity_id: a.activity_id,
        selected_answer: a.selected_answer,
        score: a.score,
        completed_at: a.completed_at,
      })),
    }),
  });
}
