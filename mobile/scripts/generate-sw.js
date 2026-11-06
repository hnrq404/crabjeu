// Gera dist/sw.js depois do `expo export --platform web`.
// O service worker pré-carrega TODOS os arquivos do build no primeiro acesso,
// para que o jogo abra e funcione mesmo sem internet.
//
// Uso: node scripts/generate-sw.js [pasta-do-build]

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(process.argv[2] || 'dist');

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

const files = listFiles(distDir)
  .map(f => '/' + path.relative(distDir, f).split(path.sep).join('/'))
  .filter(f => f !== '/sw.js' && !f.endsWith('.map'))
  .sort();

// A versão do cache muda sempre que algum arquivo do build muda.
const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(distDir, f)));
const version = hash.digest('hex').slice(0, 12);

const sw = `// Gerado automaticamente por scripts/generate-sw.js — não edite.
const CACHE = 'crabjeu-${version}';
const PRECACHE = ${JSON.stringify(['/', ...files], null, 2)};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('crabjeu-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // A API nunca vem do cache: sincronização e login precisam do servidor real.
  // Sem internet, o fetch falha e o app mantém os dados no armazenamento local.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/') || url.pathname === '/health') {
    return;
  }

  // Navegação (abrir/recarregar a página): entrega o app do cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => cached || fetch(request))
    );
    return;
  }

  // Arquivos estáticos: cache primeiro, rede como reserva.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
`;

fs.writeFileSync(path.join(distDir, 'sw.js'), sw);
console.log(`sw.js gerado: ${files.length} arquivos, cache crabjeu-${version}`);
