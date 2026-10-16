
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
