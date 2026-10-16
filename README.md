# Crabjeu — Tarefa 03/06

**Francês Acessível para Todos** — MVP técnico para validação do fluxo crítico Offline-First.

## Objetivo da entrega

Mitigar o maior risco computacional do Crabjeu: garantir que um aluno consiga realizar uma atividade sem internet, manter o dado persistido no dispositivo e sincronizá-lo posteriormente com o servidor sem perda ou duplicação. O educador deve conseguir recuperar o progresso a partir do banco central.

## Fluxo crítico validado

```text
Aluno responde atividade
        ↓
SQLite no dispositivo
        ↓
Tentativa pendente permanece após fechar/reabrir o app
        ↓
Conexão retorna
        ↓
POST /api/v1/sync/attempts
        ↓
FastAPI valida e deduplica por attempt_id
        ↓
PostgreSQL salva activity_attempts
        ↓
Servidor consolida student_progress
        ↓
GET /api/v1/educator/students
        ↓
Educador recupera progresso real
```

## Stack

- **Mobile:** React Native + Expo + SQLite
- **Backend:** FastAPI + SQLAlchemy
- **Banco central:** PostgreSQL 16
- **Autenticação:** PIN armazenado com PBKDF2 + token JWT
- **Infra local:** Docker Compose

## Estrutura

```text
crabjeu_tarefa03/
├── backend/
│   ├── app/
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── security.py
│   ├── .env.example
│   └── requirements.txt
├── mobile/
│   ├── App.js
│   ├── api.js
│   ├── db.js
│   ├── app.json
│   └── package.json
├── docs/
│   ├── CHECKLIST_ENTREGA.md
│   └── ROTEIRO_VIDEO.md
├── docker-compose.yml
└── README.md
```

## 1. Subir o PostgreSQL

Pré-requisito: Docker Desktop.

```bash
docker compose up -d
```

O banco fica disponível em `localhost:5432` com:

```text
Database: crabjeu
User: crabjeu
Password: crabjeu
```

As credenciais acima são apenas para desenvolvimento local.

## 2. Executar o backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate       # macOS/Linux
# .venv\Scripts\activate        # Windows
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg2://crabjeu:crabjeu@localhost:5432/crabjeu'
export JWT_SECRET='uma-chave-local-para-demo'
uvicorn app.main:app --reload
```

Documentação interativa:

```text
http://localhost:8000/docs
```

Na primeira inicialização, o backend cria as tabelas e insere dados mínimos de demonstração no PostgreSQL.

### Perfis demo

Aluno:

```text
João Pedro
PIN: 1234
```

Educador:

```text
Educador Crabjeu
PIN: 4321
```

Os PINs **não são armazenados em texto puro**; o seed grava apenas o hash PBKDF2.

## 3. Executar o app React Native

Pré-requisitos: Node.js + Expo.

```bash
cd mobile
npm install
```

No macOS com simulador iOS, por exemplo:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 npm start
```

Para celular físico, substitua `127.0.0.1` pelo IP do computador na mesma rede Wi‑Fi:

```bash
EXPO_PUBLIC_API_URL=http://192.168.X.X:8000 npm start
```

## 4. Demonstração do fluxo crítico

### Etapa A — preparar cache local

1. Com internet/backend disponível, abra o app.
2. Baixe o perfil do aluno.
3. Entre com PIN `1234`.
4. O app baixa a atividade do backend e a grava no SQLite.

A questão não está embutida na tela: ela é recuperada do servidor e cacheada localmente.

### Etapa B — executar offline

1. Desligue a rede do dispositivo ou pare temporariamente o backend.
2. Responda à atividade.
3. O app registra a tentativa no SQLite com `synced = 0`.
4. Feche e reabra o app.
5. O contador de tentativas pendentes permanece, provando persistência local.

### Etapa C — sincronizar

1. Restabeleça a conexão/backend.
2. Toque em **Sincronizar agora**.
3. O app envia as tentativas pendentes para `POST /api/v1/sync/attempts`.
4. Cada tentativa possui `attempt_id` único. Se o mesmo registro for reenviado, o servidor o classifica como duplicado e não o salva novamente.
5. Depois do sucesso, o SQLite local marca a tentativa como `synced = 1`.

### Etapa D — recuperar pelo educador

Use o Swagger (`/docs`):

1. Liste `GET /api/v1/profiles` e copie o ID do educador diretamente do banco ou use o ID seed `22222222-2222-2222-2222-222222222222`.
2. Faça `POST /api/v1/auth/login`:

```json
{
  "profile_id": "22222222-2222-2222-2222-222222222222",
  "pin": "4321"
}
```

3. Copie o `token`.
4. Chame `GET /api/v1/educator/students` com:

```text
Authorization: Bearer SEU_TOKEN
```

O resultado é calculado a partir das tabelas reais `activity_attempts` e `student_progress`.

## 5. Verificar diretamente no PostgreSQL

```bash
docker compose exec db psql -U crabjeu -d crabjeu
```

Depois:

```sql
SELECT id, student_id, activity_id, selected_answer, score, completed_at
FROM activity_attempts;

SELECT student_id, activity_id, best_score, attempts_count, last_attempt_at
FROM student_progress;
```

Isso é uma evidência simples de que o backend não está devolvendo dados hardcoded.

## Por que esse é o maior risco computacional?

O Crabjeu foi concebido para uma realidade de acesso intermitente à internet. Se o aplicativo depender de conexão contínua, ele deixa de atender justamente o contexto para o qual foi projetado. Por isso, a persistência local e a sincronização posterior são o núcleo técnico prioritário deste MVP.

## Decisões para reduzir risco

- O conteúdo é cacheado no dispositivo para permanecer acessível offline.
- Tentativas são registradas primeiro no SQLite.
- Cada tentativa recebe um identificador único para sincronização idempotente.
- O servidor não confia na pontuação enviada pelo cliente: ele recalcula a correção usando a resposta oficial da atividade.
- O PostgreSQL mantém o histórico bruto de tentativas e um progresso consolidado separado.
- A consulta do educador lê dados persistidos no banco central.

## Evidência em vídeo

Veja `docs/ROTEIRO_VIDEO.md` para um roteiro de 3 a 5 minutos alinhado aos critérios da tarefa.
