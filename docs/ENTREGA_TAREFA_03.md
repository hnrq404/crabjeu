# Entrega — Tarefa 03/06 | Crabjeu

## Maior risco computacional identificado

O maior risco do Crabjeu é a dependência de conectividade em uma comunidade com acesso intermitente à internet. O núcleo técnico validado nesta entrega é, portanto, o fluxo **Offline-First**, garantindo persistência local, sincronização posterior e recuperação do progresso pelo educador.

## Fluxo implementado

1. O aluno entra no aplicativo e baixa o conteúdo do servidor.
2. O conteúdo fica armazenado no SQLite local.
3. Sem conexão, o aluno responde à atividade normalmente.
4. A tentativa é persistida no SQLite com estado pendente de sincronização.
5. O aplicativo pode ser fechado e reaberto sem perder o registro.
6. Quando a conexão retorna, o aplicativo envia a tentativa ao FastAPI.
7. O backend valida a atividade, recalcula a pontuação e evita duplicação pelo `attempt_id`.
8. A tentativa é persistida no PostgreSQL.
9. O servidor atualiza o progresso consolidado do aluno.
10. O educador recupera o progresso por um endpoint protegido.

## Evidências técnicas incluídas

- React Native + Expo para o cliente.
- SQLite para persistência local.
- FastAPI para API REST.
- PostgreSQL para persistência central.
- JWT para autenticação.
- PIN com hash PBKDF2.
- Sincronização idempotente por `attempt_id`.
- Teste automatizado do fluxo ponta a ponta.
- Docker Compose para subir o PostgreSQL.
- README com instruções de execução.
- Roteiro do screencast de 3 a 5 minutos.

## Teste automatizado

O teste `backend/tests/test_critical_flow.py` valida:

- recuperação do perfil a partir do banco;
- autenticação do aluno;
- recuperação de conteúdo real pelo backend;
- sincronização de tentativa;
- deduplicação de tentativa repetida;
- autenticação do educador;
- recuperação do progresso persistido.

Resultado validado durante a preparação da entrega:

```text
1 passed
```

## O que precisa ser feito manualmente antes do envio

1. Subir o repositório para o GitHub/GitLab da equipe.
2. Cada integrante deve fazer ao menos commits próprios, se o professor avaliar autoria individual.
3. Executar o PostgreSQL e o FastAPI no computador da apresentação.
4. Executar o aplicativo em emulador ou celular.
5. Gravar o screencast de 3 a 5 minutos seguindo `ROTEIRO_VIDEO.md`.
6. Conferir se o link do repositório está acessível ao professor.
