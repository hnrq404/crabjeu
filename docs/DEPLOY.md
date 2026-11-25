# 🚀 Deploy do Crabjeu (VPS + Docker + HTTPS)

Arquitetura em produção:

```text
Internet ──443──▶ Caddy (HTTPS automático) ──▶ web (nginx: PWA + /api) ──▶ api (FastAPI) ──▶ db (PostgreSQL)
```

Só o Caddy fica exposto. O **PWA** e o **app Android** usam o mesmo endereço `https://SEU_DOMINIO`.

## Por que HTTPS é obrigatório

O funcionamento offline da versão web depende do *service worker* (`sw.js`), que os navegadores
só ativam em `https://` (ou `localhost`). Sem HTTPS o jogo abre, mas **não funciona sem internet**.
O Caddy emite e renova o certificado Let's Encrypt sozinho.

## 1. Pré-requisitos

- Uma VPS Linux (1 vCPU / 1 GB RAM basta; ex.: Oracle Cloud Free, Hetzner, DigitalOcean).
- Um domínio (ou subdomínio) com **registro A** apontando para o IP da VPS.
- Portas **80** e **443** liberadas no firewall da VPS/provedor.
- Docker + Docker Compose instalados:

```bash
curl -fsSL https://get.docker.com | sh
```

## 2. Primeira subida

```bash
git clone https://github.com/hnrq404/crabjeu.git
```

```bash
cd crabjeu && cp .env.production.example .env.production
```

Edite `.env.production` (`DOMAIN`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `EDUCATOR_PASSWORD`). Para gerar segredos:

```bash
openssl rand -hex 32
```

Suba tudo:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Confira:

```bash
curl https://SEU_DOMINIO/health
```

> Em produção **não** são criadas as contas de demonstração (`joao/1234`, `educador/4321`).
> O educador é criado com `EDUCATOR_USERNAME`/`EDUCATOR_PASSWORD` na primeira subida; os alunos
> se cadastram pelo app (o cadastro precisa de internet).

## 3. Atualizar para uma nova versão

```bash
git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O que acontece com quem está offline:

- **PWA:** o `sw.js` muda de versão a cada build; o navegador baixa a versão nova na próxima vez
  que o aluno abrir o app com internet. Até lá, segue usando a versão em cache.
- **Conteúdo (perguntas):** aumente `CONTENT_VERSION` em `backend/app/seed_content.py`; os aparelhos
  baixam na próxima sincronização.
- **Respostas pendentes:** ficam guardadas no aparelho (`synced = 0`) e sobem quando a internet volta.
  O `attempt_id` evita duplicação se o envio for repetido.

⚠️ **Não troque o `JWT_SECRET` depois que os alunos já estiverem usando**: todos os tokens salvos
nos aparelhos deixam de valer e quem estiver offline não conseguirá sincronizar até logar de novo online.
Pelo mesmo motivo, `JWT_EXPIRE_HOURS` (padrão 720 h = 30 dias) define por quanto tempo o aluno
pode ficar sem internet e ainda sincronizar sem novo login.

## 4. Backup do banco

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_dump -U crabjeu crabjeu | gzip > backup-$(date +%F).sql.gz
```

Restaurar:

```bash
gunzip -c backup-AAAA-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U crabjeu crabjeu
```

Sugestão: agendar o backup diário no `crontab` da VPS e copiar o arquivo para fora dela.

## 5. App Android (APK) com EAS Build

O app nativo usa SQLite e funciona offline; ele só precisa saber o endereço da API.

1. Em `mobile/eas.json`, troque `https://crabjeu.example.com` pelo seu domínio (perfis `preview` e `production`).
2. Se quiser, ajuste o identificador `android.package` em `mobile/app.json` (`br.org.crabjeu`) — ele não pode mudar depois de publicar na Play Store.
3. Gere o APK (precisa de uma conta gratuita em expo.dev):

```bash
cd mobile && npx eas-cli login
```

```bash
npx eas-cli build --platform android --profile preview
```

O EAS devolve um link para baixar o `.apk`, que pode ser instalado direto nos celulares
(ou distribuído por QR code). Para a Play Store, use `--profile production` (gera `.aab`).

> A cada nova versão do APK, aumente `android.versionCode` em `mobile/app.json`.

## Checklist rápido

- [ ] DNS do domínio apontando para a VPS
- [ ] Portas 80/443 abertas
- [ ] `.env.production` preenchido (e fora do Git)
- [ ] `https://SEU_DOMINIO/health` responde
- [ ] Abrir o PWA, logar, ativar modo avião, recarregar: o jogo abre
- [ ] Jogar offline, voltar a internet: selo "Progresso salvo no servidor"
- [ ] `eas.json` com o domínio certo antes de gerar o APK
- [ ] Backup diário agendado
