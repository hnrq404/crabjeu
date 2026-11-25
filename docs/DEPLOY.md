# 🚀 Deploy do Crabjeu

Duas opções, ambas grátis e com HTTPS (obrigatório para o PWA funcionar offline):

- **A) Render + Neon** — sem servidor para administrar, sem cartão. ⬇️ logo abaixo.
- **B) VPS com Docker** — mais controle e sem "hibernação". Veja a partir de "Caminho rápido".

## A) Render (app) + Neon (banco)

Um único serviço (`Dockerfile` da raiz) entrega a API **e** o PWA no mesmo endereço.

1. **Banco (Neon):** crie conta em neon.tech (entrar com GitHub) → *New project* (região São Paulo, se houver) →
   copie a *connection string* (`postgresql://...neon.tech/neondb?sslmode=require`).
2. **App (Render):** crie conta em render.com (entrar com GitHub) → **New → Web Service** → aba
   **Public Git Repository** → `https://github.com/hnrq404/crabjeu` → **Connect**. Preencha:
   - **Language:** Docker · **Branch:** `main` · **Region:** Virginia (US East) · **Instance Type:** Free
   - **Advanced → Dockerfile Path:** `./Dockerfile` · **Health Check Path:** `/health`
   - **Environment Variables:** `DATABASE_URL` (Neon), `JWT_SECRET` (botão *Generate* ou texto aleatório longo),
     `EDUCATOR_PASSWORD`, `EDUCATOR_USERNAME=educador`, `SEED_DEMO_USERS=false`, `JWT_EXPIRE_HOURS=720`

   Clique em **Deploy Web Service** e espere o build (~5 min).

   > Com acesso de admin ao repositório no GitHub, dá para usar **New → Blueprint**: ele lê o `render.yaml`,
   > gera o `JWT_SECRET` sozinho e passa a publicar automaticamente a cada push.
3. Abra `https://crabjeu-xxxx.onrender.com` (aparece no painel) e teste `…/health`.
4. **UptimeRobot (para não dormir):** em uptimerobot.com → **New monitor** → HTTP(s) →
   `https://crabjeu-xxxx.onrender.com/health` → intervalo de 5 minutos.

Para atualizar (repositório público): **Manual Deploy → Deploy latest commit** no Render.
O painel do educador fica em `https://crabjeu-xxxx.onrender.com/educador` (ou pelo link "Sou educador" no login).

**Como fica o offline nesse plano grátis:** o serviço "dorme" após 15 min sem uso e leva ~1 min para acordar.
Isso não atrapalha o aluno: o app abre do cache, as respostas ficam no aparelho e a sincronização
automática (a cada minuto) tenta de novo até o servidor responder. Abrir a página com internet já acorda o servidor.
Não mude o `JWT_SECRET` gerado depois que os alunos começarem a usar.

---

# B) VPS com Docker

Arquitetura em produção:

```text
Internet ──443──▶ Caddy (HTTPS automático) ──▶ web (nginx: PWA + /api) ──▶ api (FastAPI) ──▶ db (PostgreSQL)
```

Só o Caddy fica exposto. O **PWA** e o **app Android** usam o mesmo endereço `https://SEU_DOMINIO`.

## Por que HTTPS é obrigatório

O funcionamento offline da versão web depende do *service worker* (`sw.js`), que os navegadores
só ativam em `https://` (ou `localhost`). Sem HTTPS o jogo abre, mas **não funciona sem internet**.
O Caddy emite e renova o certificado Let's Encrypt sozinho.

## ⚡ Caminho rápido (VPS grátis + um comando)

1. Crie uma VPS grátis com **Ubuntu** (ex.: Oracle Cloud *Always Free*) e libere as portas **80** e **443** no painel.
2. Entre por SSH e rode:

```bash
curl -fsSL https://raw.githubusercontent.com/hnrq404/crabjeu/main/deploy/setup-vps.sh | sudo bash
```

O script `deploy/setup-vps.sh` instala o Docker, cria swap, abre o firewall, gera as senhas,
usa um endereço grátis `IP.sslip.io` com HTTPS (ou o seu, com `sudo DOMAIN=meu.dominio bash`)
e sobe tudo. No final mostra o link do jogo e o login do educador. Rodar de novo = atualizar.

O resto deste guia explica o passo a passo manual.

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
