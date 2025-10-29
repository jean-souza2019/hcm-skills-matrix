# HCM Skills Matrix – Backend

API REST responsável pelas regras de negócio e persistência do sistema de matriz de competências. Implementada em
Node.js/Express com Prisma ORM e banco SQLite por padrão.

## Requisitos
- Node.js >= 18.18 (utilize a versão definida em `.nvmrc` na raiz do monorepo)
- Yarn 1.22.x
- SQLite (embarcado em arquivo, não requer serviço externo por padrão)

## Configuração
1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Ajuste os valores conforme necessário. Principais variáveis:

| Variável             | Obrigatória | Descrição                                                     | Padrão        |
| -------------------- | ----------- | ------------------------------------------------------------- | ------------- |
| `PORT`               | opcional    | Porta HTTP utilizada pelo servidor.                           | `3333`        |
| `NODE_ENV`           | opcional    | Ambiente de execução (`development`, `production`, `test`).   | `development` |
| `JWT_SECRET`         | sim         | Segredo usado para assinar tokens JWT.                        | `super-secret-change-me` |
| `JWT_EXPIRES_IN`     | opcional    | Tempo de expiração do token (qualquer valor aceito pelo JWT). | `1d`          |
| `DATABASE_URL`       | sim         | URL de conexão Prisma (SQLite por padrão).                    | `file:./dev.db` |
| `SEED_ADMIN_EMAIL`   | opcional    | E-mail padrão do usuário MASTER gerado pelo seed.             | `admin@hcm.local` |
| `SEED_ADMIN_PASSWORD`| opcional    | Senha padrão do usuário MASTER gerado pelo seed.              | `Admin123!`   |

3. Instale as dependências:
   ```bash
   yarn install
   ```

## Scripts principais
- `yarn dev`: sobe a API em modo desenvolvimento com `ts-node-dev`.
- `yarn build`: compila o código TypeScript para `dist/`.
- `yarn start`: executa a versão compilada de `dist/main.js`.
- `yarn prisma:migrate`: aplica as migrations pendentes no banco configurado.
- `yarn prisma:generate`: (re)gera o client Prisma.
- `yarn prisma:reset`: recria o banco, reaplica migrations e limpa dados (sem prompts).
- `yarn db:seed`: popula dados iniciais (usuário MASTER e módulos exemplo).
- `yarn build:exe`: gera um binário Windows (`build/api.exe`) usando `pkg`.

## Banco de dados e migrations
- O banco padrão é um arquivo SQLite localizado em `prisma/dev.db`.
- Para aplicar migrations existentes, execute `yarn prisma:migrate`.
- Para criar uma nova migration após alterar `prisma/schema.prisma`:
  ```bash
  yarn prisma migrate dev --name minha-migration
  ```
- Se precisar recomeçar do zero, use `yarn prisma:reset` e, em seguida, `yarn db:seed`.

## Seed
O seed cria/atualiza um usuário MASTER e módulos exemplos. Ajuste as variáveis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` caso
necessite outros valores. Execute:
```bash
yarn db:seed
```

## Distribuição
O comando `yarn build:exe` executa o build TypeScript e empacota a API em um executável Windows (`node18-win-x64`) dentro de
`build/api.exe`. Certifique-se de que o arquivo `prisma/schema.prisma` e o diretório `.prisma/client` estejam presentes (o
script já inclui esses assets no pacote).

## Estrutura de pastas
- `src/app.ts`: configuração do Express (middlewares, rotas e tratamento de erros).
- `src/config`: carregamento e validação de variáveis de ambiente.
- `src/lib`: instâncias compartilhadas (ex.: cliente Prisma).
- `src/middlewares`: autenticação JWT, autorização por papel, validação com Zod e handler global de erros.
- `src/routes`: agrupamento das rotas por domínio (`auth`, `users`, `collaborators`, `modules`, `skills`, `assessments`,
  `reports`, `dashboard`).
- `src/utils`: funções auxiliares (geração de senha temporária, cálculo de gaps, acesso ao perfil do colaborador).
- `prisma/`: schema do banco, migrations e scripts de seed.

## Rotas disponíveis
- `GET /healths`: verificação simples de saúde.
- `POST /auth/login`: autenticação e emissão de token JWT.
- `POST /auth/change-password`: troca de senha do usuário autenticado.
- `GET /users/me`: retorna informações do usuário logado.
- `CRUD /collaborators`: gestão de colaboradores, vinculação de usuários e reset de acesso.
- `CRUD /modules`: cadastro de rotinas/módulos avaliados.
- `POST /skills/claim`: autoavaliação do colaborador.
- `GET /skills/claim`: listagem de autoavaliações (com filtros).
- `PUT /skills/claim/:id`: atualização da autoavaliação do colaborador.
- `POST /assessments`: avaliação do gestor para colaborador/módulo.
- `GET /assessments`: lista avaliações por colaborador.
- `POST /assessments/career-plans`: cria planos de carreira vinculados a módulos.
- `PUT /assessments/career-plans/:id`: atualiza plano de carreira.
- `DELETE /assessments/career-plans/:id`: remove plano de carreira e módulos associados.
- `GET /assessments/career-plans`: lista planos de carreira (respeitando papel do usuário).
- `GET /dashboard/kpis`: indicadores agregados (total de módulos, gaps etc.).
- `GET /dashboard/trends`: análises de distribuição e principais gaps.
- `GET /reports/coverage`: relatório de cobertura de competências (JSON ou CSV).

Todas as rotas, exceto `POST /auth/login` e `GET /healths`, exigem token JWT e validação de papéis (`MASTER` ou
`COLABORADOR`), conforme definido nos middlewares `authenticate` e `authorizeRoles`.

## Fluxo de desenvolvimento recomendado
1. Inicie a API: `yarn dev`.
2. Aplique migrations/seed se necessário (`yarn prisma:migrate`, `yarn db:seed`).
3. Execute o frontend em paralelo (`yarn dev` no diretório `frontend`).
4. Ao finalizar alterações de schema, rode `yarn prisma:generate` para atualizar o client.
