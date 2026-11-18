// Voz no app nativo (Expo Go).
// - Ouvir a frase: expo-speech (usa a voz do aparelho, funciona offline).
// - Reconhecer a fala: não disponível no Expo Go. Para ativar, usar um
//   development build com expo-speech-recognition (reconhecimento on-device).

import * as Speech from 'expo-speech';

/** Fala a frase em francês. `slow` = mais devagar (botão da tartaruga). */
export function speak(text, { slow = false } = {}) {
  Speech.stop();
  Speech.speak(text, { language: 'fr-FR', rate: slow ? 0.55 : 0.85 });
}

/** expo-speech fala usando a voz do aparelho (funciona offline). */
export function canSpeak() {
  return true;
}

export function recognitionAvailable() {
  return { ok: false, reason: 'O reconhecimento de voz ainda não está disponível no aplicativo.' };
}

export async function listen() {
  throw new Error('Reconhecimento de voz indisponível.');
}

export function stopListening() {}
