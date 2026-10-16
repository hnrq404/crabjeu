# Roteiro do screencast (3 a 5 minutos)

## 0:00–0:30 — Contexto e risco computacional
Explique: “O maior risco computacional do Crabjeu é garantir que o aluno consiga estudar sem internet e que o progresso seja persistido localmente e sincronizado depois, sem perda nem duplicação de dados.”

Mostre rapidamente a estrutura do repositório e o README.

## 0:30–1:00 — Infraestrutura real
Mostre o PostgreSQL subindo com `docker compose up -d` e o FastAPI com `uvicorn app.main:app --reload`.
Abra `http://localhost:8000/docs` apenas para evidenciar os endpoints.

## 1:00–2:00 — Uso offline
1. Faça login uma vez enquanto online (PIN do aluno demo: `1234`) para baixar o conteúdo.
2. Desligue a internet do dispositivo/emulador ou interrompa temporariamente o backend.
3. Responda à atividade “Como se diz Bom dia em francês?”.
4. Mostre “Tentativas locais: 1” e “Pendentes: 1”.
5. Feche e reabra o app e mostre que os contadores continuam iguais.

## 2:00–3:15 — Sincronização
1. Restabeleça a conexão/backend.
2. Toque em “Sincronizar agora”.
3. Mostre a mensagem de sucesso e “Pendentes: 0”.
4. Toque novamente em sincronizar ou reenvie o mesmo ID via API para destacar que o backend trata duplicidade por `attempt_id`.

## 3:15–4:15 — Recuperação pelo educador
1. Faça login do educador via Swagger/Postman com o perfil demo e PIN `4321`.
2. Chame `GET /api/v1/educator/students` com o token Bearer.
3. Mostre que João Pedro aparece com atividade concluída e `last_sync` preenchido.

## 4:15–5:00 — Evidência do banco e Git
Mostre no PostgreSQL as tabelas `activity_attempts` e `student_progress`, evidenciando que os dados estão persistidos de verdade.
Finalize mostrando commits coerentes do Git.
