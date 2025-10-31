# HCM Skills Matrix â€“ Backend

API REST responsÃ¡vel pelas regras de negÃ³cio e persistÃªncia do sistema de matriz de competÃªncias. Implementada em
Node.js/Express com Prisma ORM e banco SQLite por padrÃ£o.

## Requisitos
- Node.js >= 18.18 (utilize a versÃ£o definida em `.nvmrc` na raiz do monorepo)
- Yarn 1.22.x
- SQLite (embarcado em arquivo, nÃ£o requer serviÃ§o externo por padrÃ£o)

## ConfiguraÃ§Ã£o
1. Copie o arquivo de variÃ¡veis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Ajuste os valores conforme necessÃ¡rio. Principais variÃ¡veis:

| VariÃ¡vel             | ObrigatÃ³ria | DescriÃ§Ã£o                                                     | PadrÃ£o        |
| -------------------- | ----------- | ------------------------------------------------------------- | ------------- |
| `PORT`               | opcional    | Porta HTTP utilizada pelo servidor.                           | `3333`        |
| `NODE_ENV`           | opcional    | Ambiente de execuÃ§Ã£o (`development`, `production`, `test`).   | `development` |
| `JWT_SECRET`         | sim         | Segredo usado para assinar tokens JWT.                        | `super-secret-change-me` |
| `JWT_EXPIRES_IN`     | opcional    | Tempo de expiraÃ§Ã£o do token (qualquer valor aceito pelo JWT). | `1d`          |
| `DATABASE_URL`       | sim         | URL de conexÃ£o Prisma (SQLite por padrÃ£o).                    | `file:./dev.db` |
| `SEED_ADMIN_EMAIL`   | opcional    | E-mail padrÃ£o do usuÃ¡rio MASTER gerado pelo seed.             | `admin@hcm.local` |
| `SEED_ADMIN_PASSWORD`| opcional    | Senha padrÃ£o do usuÃ¡rio MASTER gerado pelo seed.              | `Admin123!`   |

3. Instale as dependÃªncias:
   ```bash
   yarn install
   ```

## Scripts principais
- `yarn dev`: sobe a API em modo desenvolvimento com `ts-node-dev`.
- `yarn build`: compila o cÃ³digo TypeScript para `dist/`.
- `yarn start`: executa a versÃ£o compilada de `dist/main.js`.
- `yarn prisma:migrate`: aplica as migrations pendentes no banco configurado.
- `yarn prisma:generate`: (re)gera o client Prisma.
- `yarn prisma:reset`: recria o banco, reaplica migrations e limpa dados (sem prompts).
- `yarn db:seed`: popula dados iniciais (usuÃ¡rio MASTER e mÃ³dulos exemplo).
- `yarn build:exe`: gera um binÃ¡rio Windows (`build/api.exe`) usando o recurso SEA (Single Executable Applications) do Node.js.

## Banco de dados e migrations
- O banco padrÃ£o Ã© um arquivo SQLite localizado em `prisma/dev.db`.
- Para aplicar migrations existentes, execute `yarn prisma:migrate`.
- Para criar uma nova migration apÃ³s alterar `prisma/schema.prisma`:
  ```bash
  yarn prisma migrate dev --name minha-migration
  ```
- Se precisar recomeÃ§ar do zero, use `yarn prisma:reset` e, em seguida, `yarn db:seed`.

## Seed
O seed cria/atualiza um usuÃ¡rio MASTER e mÃ³dulos exemplos. Ajuste as variÃ¡veis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` caso
necessite outros valores. Execute:
```bash
yarn db:seed
```

## DistribuiÃ§Ã£o
O comando `yarn build:exe` executa o build TypeScript e gera um executÃ¡vel Windows em `build/api.exe` utilizando o recurso
SEA do Node.js. O processo cria um blob com o conteúdo de `dist/`, injeta-o em uma cópia local do `node.exe`, copia automaticamente `prisma/schema.prisma`, o diretório `.prisma/client` e replica a pasta `dist/` para que o Prisma e a aplicação funcionem no bundle final.
automaticamente `prisma/schema.prisma` e o diretÃ³rio `.prisma/client` para que o Prisma funcione no bundle final. Ao rodar o
executÃ¡vel, os logs e erros sÃ£o gravados no arquivo `api.log`, no mesmo diretÃ³rio do binÃ¡rio.

## Estrutura de pastas
- `src/app.ts`: configuraÃ§Ã£o do Express (middlewares, rotas e tratamento de erros).
- `src/config`: carregamento e validaÃ§Ã£o de variÃ¡veis de ambiente.
- `src/lib`: instÃ¢ncias compartilhadas (ex.: cliente Prisma).
- `src/middlewares`: autenticaÃ§Ã£o JWT, autorizaÃ§Ã£o por papel, validaÃ§Ã£o com Zod e handler global de erros.
- `src/routes`: agrupamento das rotas por domÃ­nio (`auth`, `users`, `collaborators`, `modules`, `skills`, `assessments`,
  `reports`, `dashboard`).
- `src/utils`: funÃ§Ãµes auxiliares (geraÃ§Ã£o de senha temporÃ¡ria, cÃ¡lculo de gaps, acesso ao perfil do colaborador).
- `prisma/`: schema do banco, migrations e scripts de seed.

## Rotas disponÃ­veis
- `GET /healths`: verificaÃ§Ã£o simples de saÃºde.
- `POST /auth/login`: autenticaÃ§Ã£o e emissÃ£o de token JWT.
- `POST /auth/change-password`: troca de senha do usuÃ¡rio autenticado.
- `GET /users/me`: retorna informaÃ§Ãµes do usuÃ¡rio logado.
- `CRUD /collaborators`: gestÃ£o de colaboradores, vinculaÃ§Ã£o de usuÃ¡rios e reset de acesso.
- `CRUD /modules`: cadastro de rotinas/mÃ³dulos avaliados.
- `POST /skills/claim`: autoavaliaÃ§Ã£o do colaborador.
- `GET /skills/claim`: listagem de autoavaliaÃ§Ãµes (com filtros).
- `PUT /skills/claim/:id`: atualizaÃ§Ã£o da autoavaliaÃ§Ã£o do colaborador.
- `POST /assessments`: avaliaÃ§Ã£o do gestor para colaborador/mÃ³dulo.
- `GET /assessments`: lista avaliaÃ§Ãµes por colaborador.
- `POST /assessments/career-plans`: cria planos de carreira vinculados a mÃ³dulos.
- `PUT /assessments/career-plans/:id`: atualiza plano de carreira.
- `DELETE /assessments/career-plans/:id`: remove plano de carreira e mÃ³dulos associados.
- `GET /assessments/career-plans`: lista planos de carreira (respeitando papel do usuÃ¡rio).
- `GET /dashboard/kpis`: indicadores agregados (total de mÃ³dulos, gaps etc.).
- `GET /dashboard/trends`: anÃ¡lises de distribuiÃ§Ã£o e principais gaps.
- `GET /reports/coverage`: relatÃ³rio de cobertura de competÃªncias (JSON ou CSV).

Todas as rotas, exceto `POST /auth/login` e `GET /healths`, exigem token JWT e validaÃ§Ã£o de papÃ©is (`MASTER` ou
`COLABORADOR`), conforme definido nos middlewares `authenticate` e `authorizeRoles`.

## Fluxo de desenvolvimento recomendado
1. Inicie a API: `yarn dev`.
2. Aplique migrations/seed se necessÃ¡rio (`yarn prisma:migrate`, `yarn db:seed`).
3. Execute o frontend em paralelo (`yarn dev` no diretÃ³rio `frontend`).
4. Ao finalizar alteraÃ§Ãµes de schema, rode `yarn prisma:generate` para atualizar o client.

