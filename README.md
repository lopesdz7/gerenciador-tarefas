# 📋 Gerenciador de Tarefas — API

API REST para gerenciar tarefas em times, com autenticação JWT e dois níveis de acesso
(**admin** e **member**). Cada mudança de status de uma tarefa fica registrada em um histórico.

Desafio da formação Full Stack da Rocketseat.

🔗 **Deploy:** _adicione aqui a URL do Render depois do deploy (ex.: `https://gerenciador-tarefas-api.onrender.com`)_

## 🛠️ Tecnologias

| Área           | Ferramentas                                  |
| -------------- | -------------------------------------------- |
| Backend        | Node.js, TypeScript, Express 5               |
| Banco de dados | PostgreSQL + Prisma ORM                      |
| Autenticação   | JWT (`jsonwebtoken`) + senhas com `bcryptjs` |
| Validação      | Zod                                          |
| Testes         | Jest + Supertest                             |
| Qualidade      | ESLint + Prettier                            |
| Infra          | Docker / docker-compose, deploy no Render    |

## ▶️ Como rodar localmente

Pré-requisitos: **Node.js 20+** e **Docker**.

```bash
# 1. Clonar e instalar
git clone https://github.com/lopesdz7/gerenciador-tarefas.git
cd gerenciador-tarefas
npm install

# 2. Variáveis de ambiente
cp .env.example .env

# 3. Subir o PostgreSQL
docker compose up -d

# 4. Criar as tabelas e o usuário admin
npx prisma migrate dev
npm run db:seed

# 5. Rodar a API em modo desenvolvimento
npm run dev
```

A API fica em `http://localhost:3333`. O seed cria o admin com os dados do `.env`
(`ADMIN_EMAIL` / `ADMIN_PASSWORD` — por padrão `admin@email.com` / `admin123`).

### Rodando tudo com Docker (API + banco)

```bash
docker compose --profile app up -d --build
```

O container da API aplica as migrações automaticamente antes de subir.

### Scripts

| Script               | O que faz                                              |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | API em modo desenvolvimento (reinicia ao salvar)       |
| `npm run build`      | Gera o Prisma Client e compila o TypeScript em `dist/` |
| `npm start`          | Roda a versão compilada                                |
| `npm run start:prod` | Aplica migrações pendentes e roda a versão compilada   |
| `npm test`           | Roda os testes                                         |
| `npm run lint`       | ESLint                                                 |
| `npm run format`     | Prettier                                               |
| `npm run db:migrate` | Cria/aplica migrações em desenvolvimento               |
| `npm run db:seed`    | Cria o usuário admin                                   |

## 🧪 Testes

Os testes usam **Jest + Supertest** e rodam contra um banco PostgreSQL de verdade, separado do
banco de desenvolvimento (`gerenciador_tarefas_test`, configurado em `.env.test`).

```bash
docker compose up -d   # o Postgres precisa estar rodando
npm test
```

São 47 testes cobrindo:

- **Autenticação:** cadastro, login, token ausente/inválido, permissões de admin;
- **Times:** CRUD, adicionar/remover membros, quem pode ver os membros;
- **Tarefas:** CRUD, filtros, permissões de admin e member, atribuição e histórico de status.

## 🔐 Permissões

| Ação                                   | Admin | Member                                |
| -------------------------------------- | :---: | ------------------------------------- |
| Listar usuários / alterar papel        |  ✅   | ❌                                    |
| Criar, listar, editar e excluir times  |  ✅   | ❌                                    |
| Adicionar e remover membros de times   |  ✅   | ❌                                    |
| Ver membros de um time                 |  ✅   | Só dos times em que participa         |
| Ver tarefas                            | Todas | Só as dos seus times                  |
| Criar tarefas                          |  ✅   | Nos seus times, atribuídas a si mesmo |
| Editar, mudar status e excluir tarefas | Todas | Só as atribuídas a ele                |
| Atribuir tarefa a um usuário           |  ✅   | ❌                                    |
| Ver histórico de uma tarefa            |  ✅   | Das tarefas dos seus times            |

O cadastro público (`POST /users`) sempre cria um **member**. Um admin pode promover outros
usuários com `PATCH /users/:id/role`.

## 📚 Documentação dos endpoints

Todas as rotas, exceto `POST /users`, `POST /sessions` e `GET /health`, exigem o header:

```
Authorization: Bearer <token>
```

### Autenticação e usuários

| Método  | Rota              | Acesso | Body                                      |
| ------- | ----------------- | ------ | ----------------------------------------- |
| `POST`  | `/users`          | Livre  | `{ name, email, password }`               |
| `POST`  | `/sessions`       | Livre  | `{ email, password }` → `{ token, user }` |
| `GET`   | `/users`          | Admin  | —                                         |
| `PATCH` | `/users/:id/role` | Admin  | `{ role: "admin" \| "member" }`           |

### Times

| Método   | Rota                         | Acesso                  | Body                      |
| -------- | ---------------------------- | ----------------------- | ------------------------- |
| `POST`   | `/teams`                     | Admin                   | `{ name, description? }`  |
| `GET`    | `/teams`                     | Admin                   | —                         |
| `PUT`    | `/teams/:id`                 | Admin                   | `{ name?, description? }` |
| `DELETE` | `/teams/:id`                 | Admin                   | —                         |
| `GET`    | `/teams/:id/members`         | Admin ou membro do time | —                         |
| `POST`   | `/teams/:id/members`         | Admin                   | `{ userId }`              |
| `DELETE` | `/teams/:id/members/:userId` | Admin                   | —                         |

### Tarefas

| Método   | Rota                 | Body / Query                                                       |
| -------- | -------------------- | ------------------------------------------------------------------ |
| `POST`   | `/tasks`             | `{ title, description?, status?, priority?, teamId, assignedTo? }` |
| `GET`    | `/tasks`             | Filtros: `?status=` `?priority=` `?teamId=` `?assignedTo=`         |
| `GET`    | `/tasks/:id`         | —                                                                  |
| `PUT`    | `/tasks/:id`         | `{ title?, description?, status?, priority? }`                     |
| `PATCH`  | `/tasks/:id/status`  | `{ status }`                                                       |
| `PATCH`  | `/tasks/:id/assign`  | `{ assignedTo }` (admin; `null` remove o responsável)              |
| `DELETE` | `/tasks/:id`         | —                                                                  |
| `GET`    | `/tasks/:id/history` | —                                                                  |

- **status:** `pending` (Pendente), `in_progress` (Em progresso), `completed` (Concluído)
- **priority:** `high` (Alta), `medium` (Média), `low` (Baixa)
- O responsável (`assignedTo`) precisa fazer parte do time da tarefa.
- Toda mudança de status (pelo `PUT` ou pelo `PATCH /status`) gera um registro em `tasks_history`.

### Exemplo de fluxo

```bash
# Login como admin
curl -X POST http://localhost:3333/sessions \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@email.com","password":"admin123"}'

# Criar um time
curl -X POST http://localhost:3333/teams \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Backend","description":"Time da API"}'

# Criar uma tarefa
curl -X POST http://localhost:3333/tasks \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Criar rota de login","priority":"high","teamId":1}'

# Filtrar tarefas pendentes de alta prioridade
curl "http://localhost:3333/tasks?status=pending&priority=high" \
  -H "Authorization: Bearer <token>"
```

### Respostas de erro

| Status | Quando                                                     |
| ------ | ---------------------------------------------------------- |
| `400`  | Dados inválidos (Zod) — a resposta traz `issues` por campo |
| `401`  | Token ausente/inválido ou login incorreto                  |
| `403`  | Usuário sem permissão para a ação                          |
| `404`  | Recurso não encontrado                                     |
| `409`  | E-mail já cadastrado ou membro já está no time             |

## 🗄️ Banco de dados

`users`, `teams`, `team_members`, `tasks` e `tasks_history`, com as chaves estrangeiras e enums
do enunciado. O schema está em [`prisma/schema.prisma`](prisma/schema.prisma).

- Excluir um time remove suas tarefas e vínculos de membros.
- Excluir uma tarefa remove o histórico dela.
- Excluir um usuário deixa as tarefas dele sem responsável (`assigned_to = null`).

## ☁️ Deploy no Render

O repositório tem um [`render.yaml`](render.yaml) que cria o banco e a API de uma vez:

1. No [Render](https://render.com), clique em **New + → Blueprint** e escolha este repositório;
2. Confirme. O Render cria o PostgreSQL, gera um `JWT_SECRET` e liga o `DATABASE_URL` à API;
3. Build: `npm ci && npm run build` · Start: `npm run start:prod` (aplica as migrações e sobe a API);
4. Para criar o admin em produção, abra o **Shell** do serviço no Render e rode:
   `ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=uma-senha-forte npm run db:seed`;
5. Teste em `https://<sua-url>.onrender.com/health` e coloque a URL no topo deste README.

> No plano gratuito, a API "dorme" após um tempo sem uso. A primeira requisição pode levar
> uns 50 segundos.

## 📁 Estrutura

```
src/
├── @types/          # tipagem do req.user
├── configs/         # configuração do JWT
├── controllers/     # recebem a requisição e validam com Zod
├── services/        # regras de negócio e permissões
├── routes/          # definição das rotas
├── middlewares/     # autenticação, autorização e tratamento de erros
├── database/        # Prisma Client
├── utils/           # AppError e schemas compartilhados
├── env.ts           # validação das variáveis de ambiente com Zod
├── app.ts
└── server.ts
prisma/              # schema, migrações e seed
tests/               # testes com Jest + Supertest
```
