// Voz no PWA (navegador).
// - Ouvir a frase: speechSynthesis (vozes do sistema, normalmente funciona offline).
// - Reconhecer a fala: Web Speech API. No Chrome/Android ela depende de internet,
//   então sem conexão o jogo oferece "pular" a pergunta sem perder pontos.

let current = null;

export function speak(text) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.85;
  const voice = synth.getVoices().find(v => v.lang?.toLowerCase().startsWith('fr'));
  if (voice) utterance.voice = voice;
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

/** Escuta uma frase em francês e devolve as transcrições alternativas. */
export function listen() {
  return new Promise((resolve, reject) => {
    const SR = Recognition();
    if (!SR) {
      reject(new Error('Reconhecimento de voz indisponível.'));
      return;
    }
    const rec = new SR();
    current = rec;
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 5;

    let done = false;
    rec.onresult = event => {
      done = true;
      const result = event.results[0];
      resolve(Array.from(result, alt => alt.transcript));
    };
    rec.onerror = event => {
      done = true;
      const messages = {
        'not-allowed': 'Permita o uso do microfone para responder falando.',
        network: 'Sem internet, o reconhecimento de voz fica indisponível.',
        'no-speech': 'Não ouvi nada. Tente de novo, falando perto do microfone.',
        'audio-capture': 'Nenhum microfone encontrado.',
      };
      const error = new Error(messages[event.error] || 'Não foi possível reconhecer a fala.');
      error.code = event.error;
      reject(error);
    };
    rec.onend = () => {
      current = null;
      if (!done) resolve([]);
    };
    rec.start();
  });
}

export function stopListening() {
  current?.abort();
  current = null;
}
