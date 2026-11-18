// Voz no PWA (navegador).
// - Ouvir a frase: speechSynthesis (vozes do sistema, normalmente funciona offline).
// - Reconhecer a fala: Web Speech API. No Chrome/Android ela depende de internet,
//   então sem conexão o jogo oferece "pular" a pergunta sem perder pontos.

let current = null;

// No Chrome a lista de vozes chega depois do carregamento da página.
let frenchVoice = null;
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const fr = voices.filter(v => v.lang?.toLowerCase().startsWith('fr'));
  frenchVoice = fr.find(v => v.lang.toLowerCase() === 'fr-fr' && v.localService) || fr.find(v => v.lang.toLowerCase() === 'fr-fr') || fr[0] || null;
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

/** Fala a frase em francês. `slow` = mais devagar (botão da tartaruga). */
export function speak(text, { slow = false } = {}) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  if (!frenchVoice) pickVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = slow ? 0.55 : 0.85;
  if (frenchVoice) utterance.voice = frenchVoice;
  synth.speak(utterance);
}

function Recognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export function recognitionAvailable() {
  if (!Recognition()) {
    return { ok: false, reason: 'Este navegador não reconhece voz. Tente no Chrome.' };
  }
  if (!navigator.onLine) {
    return { ok: false, reason: 'Sem internet, o reconhecimento de voz fica indisponível.' };
  }
  return { ok: true };
}

/** O navegador consegue falar em voz alta (para as perguntas "ouça e escolha"). */
export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

const LISTEN_TIMEOUT_MS = 8000;

/**
 * Escuta uma frase em francês e devolve as transcrições possíveis.
 * - Junta as alternativas de todos os trechos reconhecidos, inclusive os
 *   parciais: em alguns aparelhos o reconhecimento termina sem um resultado
 *   "final", e antes isso virava "não ouvi nada".
 * - Para a voz do próprio aparelho antes de ouvir (senão o microfone a capta).
 * - Desiste sozinho depois de alguns segundos, devolvendo o que já ouviu.
 */
export function listen() {
  return new Promise((resolve, reject) => {
    const SR = Recognition();
    if (!SR) {
      reject(new Error('Reconhecimento de voz indisponível.'));
      return;
    }
    stopListening();
    window.speechSynthesis?.cancel();

    const rec = new SR();
    current = rec;
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 5;

    const finals = [];
    let interim = [];
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (current === rec) current = null;
      const heard = [...new Set([...finals, ...interim].map(t => t.trim()).filter(Boolean))];
      if (error && !heard.length) reject(error);
      else resolve(heard);
    };
    const timer = setTimeout(() => {
      try {
        rec.stop();
      } catch {
        finish();
      }
    }, LISTEN_TIMEOUT_MS);

    rec.onresult = event => {
      interim = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternatives = Array.from(result, alt => alt.transcript);
        if (result.isFinal) finals.push(...alternatives);
        else interim.push(...alternatives);
      }
      // Frase completa reconhecida: não precisa esperar o fim da gravação.
      if (finals.length) {
        try {
          rec.stop();
        } catch {
          finish();
        }
      }
    };
    rec.onerror = event => {
      if (event.error === 'aborted') {
        finish();
        return;
      }
      const messages = {
        'not-allowed': 'Permita o uso do microfone para responder falando.',
        'service-not-allowed': 'Permita o uso do microfone para responder falando.',
        network: 'O reconhecimento de voz precisa de internet. Tente de novo quando estiver conectado.',
        'no-speech': 'Não ouvi nada. Tente de novo, falando perto do microfone.',
        'audio-capture': 'Nenhum microfone encontrado.',
        'language-not-supported': 'Este navegador não reconhece francês. Tente no Chrome.',
      };
      const error = new Error(messages[event.error] || 'Não foi possível reconhecer a fala. Tente de novo.');
      error.code = event.error;
      finish(error);
    };
    rec.onend = () => finish();
    try {
      rec.start();
    } catch {
      finish(new Error('O microfone já está em uso. Tente de novo.'));
    }
  });
}

export function stopListening() {
  const rec = current;
  current = null;
  try {
    rec?.abort();
  } catch {
    // já parado
  }
}
