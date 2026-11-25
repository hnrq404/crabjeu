
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

Conta de demonstração: usuário **joao**, senha **1234** (ou crie uma conta em "Cadastrar-se").

> **Atualizando de uma versão anterior?** O esquema do banco mudou (login por usuário/senha e banco de perguntas por tema). Recrie o banco de desenvolvimento com `docker compose down -v && docker compose up --build`.

## 🎮 Fluxo e regras do jogo

Interface baseada no protótipo do Figma (`interface/interface_figma.png`):

```text
Login / Cadastro → Home (Iniciar · Configurações · Sair)
                     ↓
   Rodada com 6 perguntas montada pelo nível do aluno
        (múltipla escolha + fala, da mais fácil à mais difícil)
                     ↓
   Pop-up de acerto/erro com recompensa → "Rodada finalizada!" / "Nível N!"
```

O aluno **não escolhe a dificuldade**: a trilha é uma sequência fixa de **fases** (tema × dificuldade) e a dificuldade sobe conforme ele avança. Os temas vêm em **unidades de 4**: primeiro as fases fáceis da unidade, depois as médias, depois as difíceis; então começa a próxima unidade, com vocabulário novo. São 16 temas, 4 unidades e 48 fases.

| Regra | Valor |
|-------|-------|
| Liberação de fases | uma fase só abre quando a anterior é **concluída** (todas as perguntas dela respondidas) |
| Sem repetição | cada pergunta aparece **uma única vez** para o aluno: respondidas (certas ou erradas, em qualquer aparelho, via `answered_activity_ids`) e puladas não voltam |
| Ordem das perguntas | sequência lógica do conteúdo, sem sorteio: palavra → falar a palavra; depois "como se diz" → ouvir; depois frases → ouvir → falar; por fim, completar frases |
| Rodada | até 6 perguntas seguidas da fase atual |
| Moedas por acerto | Fácil 1 · Médio 2 · Difícil 3 |
| Nível | curva crescente: do nível L para o L+1 são `10 + 5×L` moedas (10, 15, 20, 25…); cada faixa de nível tem um título (Caranguejinho, Explorador do mangue, Aventureiro, Navegador, Capitão, Mestre do francês) |
| Pergunta de voz | similaridade ≥ 75% com a frase esperada, comparando a escrita **e** a pronúncia aproximada; números ditos como dígitos ("5") viram palavras ("cinq"); falar a frase com algo a mais ("euh… cinq") também vale |
| Ouça e escolha | o aparelho fala a frase em francês (normal ou devagar) e o aluno escolhe a tradução |
| Aparelho sem recursos de voz | perguntas de voz (sem reconhecimento) e de escuta (sem síntese de voz) ficam fora das fases |
| Ofensiva (foguinho) | dias seguidos com pelo menos uma resposta; o dia segue o horário de Recife (UTC-3) no app e no servidor |

Na tela inicial o aluno vê a **trilha de fases** separada por unidades (cada nó mostra o progresso da fase e as estrelas da dificuldade), a barra do topo com **foguinho da ofensiva**, moedas e nível, e a barra de nível embaixo. Cada pergunta segue o fluxo *escolher → VERIFICAR → faixa verde/vermelha → CONTINUAR*. No fim da rodada aparecem a comemoração da ofensiva (na primeira rodada do dia) e o resumo com moedas, precisão e ofensiva. A ofensiva funciona offline (conta as respostas salvas no aparelho) e soma o histórico do servidor (`active_days` em `/api/v1/me`); o painel do educador também mostra `streak` e `best_streak`.

- As regras ficam em `backend/app/game_rules.py` (servidor, fonte da verdade) e `mobile/src/game.js` (cliente, para funcionar offline). `npm run check:rules` (em `mobile/`) confere se os dois dão o mesmo resultado nos casos de `backend/tests/answer_cases.json`, `level_cases.json` e `streak_cases.json`.
- O banco de perguntas fica em `backend/app/seed_content.py`: 16 temas (saudações, números e cores, família, animais, comida, corpo, roupas, escola, casa, lugares da cidade, natureza, dias e horas, ações, esportes, sentimentos e profissões), com 1.240 perguntas no total. A maior parte é gerada a partir de listas de vocabulário e frases de cada tema; para publicar conteúdo novo, adicione itens e aumente `CONTENT_VERSION`: os aparelhos baixam na próxima sincronização.
- **O que funciona offline:** login (depois do primeiro acesso online no aparelho), jogar, ganhar moedas/nível e trocar o avatar. **Precisa de internet:** cadastro, troca de nome/senha e o reconhecimento de voz (no navegador). Sem reconhecimento de voz, o aluno pode ouvir a frase e pular a pergunta sem perder pontos.
- A sincronização é automática: ao entrar, ao terminar uma rodada, quando a internet volta e a cada minuto.

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
Internet de volta: a sincronização automática envia as tentativas à API
```

- `mobile/db.web.js` é a versão web de `mobile/db.js` (mesmas funções). O Metro escolhe esse arquivo automaticamente no build web; o app nativo continua usando SQLite.
- `mobile/scripts/generate-sw.js` gera o `sw.js` depois do `expo export`, pré-carregando todos os arquivos do build.
- Chamadas para `/api/` nunca vêm do cache: login e sincronização sempre usam o servidor real.

## Como testar o modo offline

1. Abra http://localhost:8080, escolha o perfil e faça login.
2. No DevTools do navegador (F12) → **Application → Service Workers**, marque **Offline** (ou pare os containers com `docker compose stop`).
3. Recarregue a página: o jogo continua abrindo. Jogue uma rodada e veja o aviso "respostas aguardando internet".
4. Volte a ficar online: as respostas sobem sozinhas e o selo mostra "Progresso salvo no servidor".

## Limitações conhecidas

- **HTTPS é obrigatório fora do `localhost`.** Navegadores só ativam service worker em `https://` ou `http://localhost`. Para os alunos acessarem pelo celular, o container `web` precisa ser publicado com HTTPS (ex.: hospedagem com certificado, ou um proxy reverso com Let's Encrypt).
- O reconhecimento de voz no navegador (Web Speech API) depende de internet e funciona melhor no Chrome. No app nativo (Expo Go) ele ainda não está disponível; o caminho é um *development build* com `expo-speech-recognition`.
- O armazenamento local da web usa `localStorage` (≈5 MB), suficiente para o conteúdo atual; se o conteúdo crescer muito, migrar para IndexedDB.

## Deploy em produção

O deploy em VPS com HTTPS automático (Caddy), backup do banco e geração do APK Android estão descritos em [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Build web sem Docker

```bash
cd mobile
npm install
npm run build:web   # gera mobile/dist
```
