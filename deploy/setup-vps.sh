#!/usr/bin/env bash
# Instala e sobe o Crabjeu numa VPS Ubuntu/Debian nova, em um comando:
#
#   curl -fsSL https://raw.githubusercontent.com/hnrq404/crabjeu/main/deploy/setup-vps.sh | sudo bash
#
# Sem domínio próprio, usa um endereço grátis do sslip.io baseado no IP (ex.: 129-1-2-3.sslip.io),
# com HTTPS de verdade (Let's Encrypt). Para usar seu domínio: ... | sudo DOMAIN=meu.dominio bash
# Rodar de novo atualiza para a versão mais nova (mantém banco e senhas).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/hnrq404/crabjeu.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/crabjeu}"

[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }
log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

log "Instalando pacotes básicos"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl openssl ca-certificates >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  log "Instalando Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# VPS pequena (1 GB) precisa de swap para compilar o PWA.
if [ "$(swapon --show | wc -l)" -eq 0 ] && [ ! -f /swapfile ]; then
  log "Criando 2 GB de swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# As imagens Ubuntu da Oracle Cloud bloqueiam 80/443 no iptables por padrão.
if iptables -S INPUT 2>/dev/null | grep -q 'REJECT'; then
  log "Liberando portas 80 e 443 no iptables"
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null \
      || iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
  done
  iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT
  command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null 2>&1 || true
fi
command -v ufw >/dev/null && ufw status | grep -q active && { ufw allow 80/tcp; ufw allow 443; } || true

log "Baixando o código ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch -q origin "$BRANCH"
  git -C "$APP_DIR" checkout -q "$BRANCH"
  git -C "$APP_DIR" reset -q --hard "origin/$BRANCH"
else
  git clone -q -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

ENV_FILE="$APP_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  log "Gerando .env.production com segredos novos"
  if [ -z "${DOMAIN:-}" ]; then
    IP="$(curl -fsS4 https://api.ipify.org)"
    DOMAIN="${IP//./-}.sslip.io"
  fi
  cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
EDUCATOR_USERNAME=educador
EDUCATOR_PASSWORD=$(openssl rand -hex 6)
JWT_EXPIRE_HOURS=720
EOF
  chmod 600 "$ENV_FILE"
fi
# shellcheck disable=SC1090
. "$ENV_FILE"

log "Construindo e subindo os containers (pode levar alguns minutos)"
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

log "Esperando o HTTPS ficar pronto"
for _ in $(seq 60); do
  curl -fsS "https://$DOMAIN/health" >/dev/null 2>&1 && break
  sleep 5
done

if curl -fsS "https://$DOMAIN/health" >/dev/null 2>&1; then
  cat <<EOF

✅ Crabjeu no ar!

   Jogo (PWA):        https://$DOMAIN
   Login educador:    $EDUCATOR_USERNAME / $EDUCATOR_PASSWORD
   (guardado em $ENV_FILE — não troque o JWT_SECRET depois que os alunos começarem a usar)

   Para o APK Android, use https://$DOMAIN em mobile/eas.json.
   Para atualizar no futuro, rode este mesmo comando de novo.
EOF
else
  cat <<EOF

⚠️  Os containers subiram, mas https://$DOMAIN ainda não respondeu.
   Quase sempre é a porta 80/443 fechada no painel do provedor
   (Oracle: VCN → Security List → Ingress Rules → TCP 80 e 443 de 0.0.0.0/0).
   Depois de liberar, aguarde 1 minuto e confira:  curl https://$DOMAIN/health
   Logs:  cd $APP_DIR && docker compose -f docker-compose.prod.yml logs caddy api
EOF
fi
