// Voz no app nativo (Expo Go).
// - Ouvir a frase: expo-speech (usa a voz do aparelho, funciona offline).
// - Reconhecer a fala: não disponível no Expo Go. Para ativar, usar um
//   development build com expo-speech-recognition (reconhecimento on-device).

import * as Speech from 'expo-speech';

export function speak(text) {
  Speech.stop();
  Speech.speak(text, { language: 'fr-FR', rate: 0.85 });
}

export function recognitionAvailable() {
  return { ok: false, reason: 'O reconhecimento de voz ainda não está disponível no aplicativo.' };
}

export async function listen() {
  throw new Error('Reconhecimento de voz indisponível.');
}

export function stopListening() {}
