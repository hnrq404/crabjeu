
# 🦀 Crabjeu

O **Crabjeu** é um projeto social e educacional desenvolvido para ampliar o acesso ao aprendizado de francês entre jovens e crianças da comunidade **Caranguejo Tabaiares**, em Recife/PE.

A proposta parte de uma limitação concreta do contexto de uso: o acesso à internet pode ser intermitente. Por isso, o projeto adota uma arquitetura **Offline-First**, permitindo que o aluno continue utilizando o aplicativo, realizando atividades e registrando seu progresso mesmo sem conexão ativa. Quando a internet volta a estar disponível, os dados pendentes são sincronizados com o servidor.

O sistema também prevê um ambiente para educadores acompanharem o desenvolvimento dos alunos a partir dos dados consolidados no servidor.

---

## 🎯 Objetivo do projeto

O objetivo principal do Crabjeu é oferecer uma ferramenta simples, acessível e adequada à realidade da comunidade, permitindo que alunos estudem conteúdos básicos de francês sem depender de conexão constante com a internet.

O projeto busca:

- ampliar o acesso ao aprendizado de francês;
- reduzir a dependência de internet durante o uso do aplicativo;
- disponibilizar atividades interativas e conteúdos educacionais;
- registrar o progresso do aluno localmente;
- sincronizar o progresso automaticamente quando houver conexão;
- permitir que educadores acompanhem o desenvolvimento dos estudantes;
- criar uma base tecnológica que possa futuramente ser expandida para outros conteúdos e comunidades.

---

## 👥 Público e atores envolvidos

O Crabjeu foi pensado para funcionar em conjunto com diferentes atores:

- **Jovens e crianças da comunidade:** usuários principais do aplicativo;
- **ONG Biblioteca Caranguejo Tabaiares:** apoio na aplicação, organização e acompanhamento do projeto;
- **Educadores e voluntários:** apoio pedagógico e acompanhamento dos alunos;
- **Equipe de desenvolvimento:** responsável pela implementação, manutenção e evolução da plataforma;
- **Instituições parceiras e agentes de fomento:** possíveis apoiadores da continuidade e expansão do projeto.

---

# 🏗️ Arquitetura do sistema

A arquitetura do Crabjeu foi planejada para separar claramente as responsabilidades entre o dispositivo do aluno, o servidor e o ambiente utilizado pelo educador.

O princípio central é **Offline-First**: as funcionalidades essenciais do aluno devem continuar disponíveis mesmo quando não houver conexão com a internet.

```text
┌─────────────────────────────────────────────────────┐
│              DISPOSITIVO DO ALUNO                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │          Aplicativo React Native             │  │
│  │                                               │  │
│  │  • Login simplificado                        │  │
│  │  • Módulos de francês                        │  │
│  │  • Atividades interativas                    │  │
│  │  • Feedback ao aluno                         │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │                           │
│                         ▼                           │
│  ┌───────────────────────────────────────────────┐  │
│  │                  SQLite                       │  │
│  │                                               │  │
│  │  • Conteúdo disponível offline               │  │
│  │  • Tentativas das atividades                 │  │
│  │  • Progresso local                           │  │
│  │  • Fila de sincronização                     │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │
                  Internet disponível
                          │ HTTPS / JSON
                          ▼
┌─────────────────────────────────────────────────────┐
│                 SERVIDOR / NUVEM                    │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                  FastAPI                      │  │
│  │                                               │  │
│  │  • Autenticação                              │  │
│  │  • Regras de negócio                         │  │
│  │  • Sincronização                             │  │
│  │  • Validação das respostas                   │  │
│  │  • API REST                                  │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │                           │
│                         ▼                           │
│  ┌───────────────────────────────────────────────┐  │
│  │                PostgreSQL                     │  │
│  │                                               │  │
│  │  • Usuários                                  │  │
│  │  • Módulos                                   │  │
│  │  • Atividades                                │  │
│  │  • Tentativas                                │  │
│  │  • Progresso consolidado                     │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │
                          ▼
             ┌────────────────────────┐
             │ Dashboard do Educador  │
             │                        │
             │ • progresso            │
             │ • desempenho           │
             │ • última sincronização │
             └────────────────────────┘
```

---

## 🔄 Fluxo principal de dados

O principal fluxo do sistema ocorre da seguinte forma:

```text
Aluno realiza uma atividade
            ↓
Resposta é registrada no SQLite
            ↓
Tentativa fica disponível mesmo sem internet
            ↓
Conexão com a internet é restabelecida
            ↓
Aplicativo identifica registros pendentes
            ↓
Tentativas são enviadas para a API
            ↓
FastAPI valida os dados
            ↓
PostgreSQL armazena a tentativa
            ↓
Servidor atualiza o progresso consolidado
            ↓
Educador consulta o progresso
```

Esse fluxo permite que o aplicativo continue útil em ambientes com conexão instável e evita que o aprendizado dependa da disponibilidade permanente da rede.

---

# 📡 Estratégia Offline-First

O funcionamento offline é uma das principais características do Crabjeu.

## Conteúdo educacional

Quando o dispositivo possui conexão, o aplicativo pode baixar módulos e atividades do servidor e armazená-los no SQLite.

Depois disso, esse conteúdo permanece disponível no dispositivo mesmo sem internet.

```text
Servidor
   ↓
Módulos e atividades
   ↓
SQLite
   ↓
Uso offline
```

## Tentativas

Cada vez que um aluno responde uma atividade, uma tentativa é salva primeiramente no banco local.

```text
Atividade concluída
       ↓
SQLite
       ↓
synced = false
```

Quando a conexão retorna:

```text
Fila local
    ↓
API de sincronização
    ↓
PostgreSQL
    ↓
synced = true
```

Cada tentativa possui um identificador único, permitindo que o servidor detecte reenvios e evite duplicações.

---

# 🧰 Tecnologias utilizadas

## Aplicativo

- **React Native**
- **Expo**
- **JavaScript**
- **SQLite**

O aplicativo é responsável pela experiência do aluno, armazenamento local e sincronização com o servidor.

## Backend

- **Python**
- **FastAPI**
- **SQLAlchemy**
- **JWT** para autenticação

O backend concentra regras de negócio, autenticação, validação dos dados, sincronização e acesso ao banco central.

## Banco central

- **PostgreSQL**

Responsável pelo armazenamento centralizado das informações utilizadas pelo sistema e pelo acompanhamento dos educadores.

## Infraestrutura de desenvolvimento

- **Docker**
- **Docker Compose**
- **Git / GitHub**

---

# 🌐 Versão web offline (PWA) com Docker

Além do app nativo (Expo Go), o Crabjeu pode ser usado no navegador como **PWA**, que pode ser instalado na tela inicial e funciona sem internet depois do primeiro acesso.

## Como subir tudo

```bash
docker compose up --build
```

| Serviço | Endereço | Função |
|---------|----------|--------|
| `web`   | http://localhost:8080 | PWA do jogo (nginx) + proxy de `/api` para o backend |
| `api`   | http://localhost:8000 | FastAPI (também usada pelo app nativo) |
| `db`    | localhost:5432 | PostgreSQL |

Perfil de demonstração: **João Pedro**, PIN **1234**.

## Como o offline funciona na web

```text
1º acesso (online)
   ↓
Service worker (sw.js) guarda o app inteiro no cache do navegador
   ↓
Login baixa perfis e atividades → armazenamento local do navegador
   ↓
Sem internet: o app abre do cache e as respostas ficam salvas com synced = 0
   ↓
Internet de volta: "Sincronizar agora" envia as tentativas à API
```

- `mobile/db.web.js` é a versão web de `mobile/db.js` (mesmas funções). O Metro escolhe esse arquivo automaticamente no build web; o app nativo continua usando SQLite.
- `mobile/scripts/generate-sw.js` gera o `sw.js` depois do `expo export`, pré-carregando todos os arquivos do build.
- Chamadas para `/api/` nunca vêm do cache: login e sincronização sempre usam o servidor real.

## Como testar o modo offline

1. Abra http://localhost:8080, escolha o perfil e faça login.
2. No DevTools do navegador (F12) → **Application → Service Workers**, marque **Offline** (ou pare os containers com `docker compose stop`).
3. Recarregue a página: o jogo continua abrindo. Responda a atividade e veja "Pendentes" aumentar.
4. Volte a ficar online, faça login de novo se tiver recarregado a página, e toque em **Sincronizar agora**.

## Limitações conhecidas

- **HTTPS é obrigatório fora do `localhost`.** Navegadores só ativam service worker em `https://` ou `http://localhost`. Para os alunos acessarem pelo celular, o container `web` precisa ser publicado com HTTPS (ex.: hospedagem com certificado, ou um proxy reverso com Let's Encrypt).
- O token de login fica só em memória: após recarregar a página, é preciso logar online de novo para sincronizar (mesmo comportamento do app nativo). As tentativas salvas não se perdem.
- O armazenamento local da web usa `localStorage` (≈5 MB), suficiente para o conteúdo atual; se o conteúdo crescer muito, migrar para IndexedDB.

## Build web sem Docker

```bash
cd mobile
npm install
npm run build:web   # gera mobile/dist
```
