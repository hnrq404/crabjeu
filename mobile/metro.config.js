// Configuração necessária para o expo-sqlite funcionar na versão web
// (carrega o wa-sqlite.wasm e habilita SharedArrayBuffer via COOP/COEP).
const http = require('http');
const { getDefaultConfig } = require('expo/metro-config');

// Opcional: repassa /api e /health para o backend, para acessar tudo por uma
// única porta (ex.: pré-visualização remota). Use com EXPO_PUBLIC_API_URL=.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET;

function proxyToApi(req, res) {
  const target = new URL(req.url, API_PROXY_TARGET);
  const upstream = http.request(
    target,
    { method: req.method, headers: { ...req.headers, host: target.host } },
    (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502);
    res.end('Backend indisponível');
  });
  req.pipe(upstream);
}

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (API_PROXY_TARGET && /^\/(api|health)(\/|\?|$)/.test(req.url)) {
    return proxyToApi(req, res);
  }
  return middleware(req, res, next);
};

module.exports = config;
