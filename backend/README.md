# HCM Skills Matrix – Backend

Backend REST API for the skills matrix product. Implemented with Node.js, Express and a manual SQLite data layer (no ORM).

## Requirements

- Node.js >= 18.18 (see `.nvmrc` in the monorepo root)
- Yarn 1.22.x
- SQLite is embedded (no external service required).

## Environment

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Adjust values as needed. Key variables:

   | Variable             | Required | Description                                               | Default              |
   | -------------------- | -------- | --------------------------------------------------------- | -------------------- |
   | `PORT`               | no       | HTTP port.                                                | `3333`               |
   | `NODE_ENV`           | no       | Runtime environment (`development`, `production`, `test`) | `development`        |
   | `JWT_SECRET`         | yes      | Secret used to sign JWT tokens.                           | `super-secret-change-me` |
   | `JWT_EXPIRES_IN`     | no       | JWT expiration (any value supported by `jsonwebtoken`).   | `1d`                 |
   | `DATABASE_URL`       | yes      | Path for the SQLite database file.                        | `file:./data/app.db` |
  | `SEED_ADMIN_EMAIL`   | no       | Default MASTER user e-mail created by the seed.           | `admin@teste.com`    |
  | `SEED_ADMIN_PASSWORD`| no       | Default MASTER password created by the seed.              | `1234567890`         |

3. Install dependencies:

   ```bash
   yarn install
   ```

## Scripts

- `yarn dev`: runs the API in development mode with `ts-node-dev`.
- `yarn build`: compiles TypeScript to `dist/`.
- `yarn start`: runs the compiled bundle from `dist/main.js`.
- `yarn build:exe`: builds and packages the API into a Windows executable with `pkg`.
- `yarn db:seed`: populates the database with default admin and example modules.
- `yarn test`: placeholder (no automated tests yet).

## Database

- The application now manages SQLite files directly. On startup it creates the database schema if the file does not exist.
- When the API starts and the database file is brand new, the default seed (admin + demo modules) runs automatically.
- The default file path is resolved from `DATABASE_URL`. For `file:./data/app.db` the file will be created inside `backend/data/`.
- Existing Prisma migrations are no longer used. If you have legacy data in `prisma/dev.db`, copy it to the new location before starting the API.
- When running the packaged executable, the sqlite native library is extracted next to the binary; keep the generated `sqlite3` folder alongside the `.exe`.
- After bootstrapping the database file you can run `yarn db:seed` to add the default admin user and demo modules.

## Project structure

- `src/app.ts`: Express app setup (middlewares, routes, error handler).
- `src/config`: environment loading and validation.
- `src/domain`: enums and entity definitions shared across repositories.
- `src/lib`: cross-cutting helpers (database bootstrap, logger, etc.).
- `src/middlewares`: authentication, authorization, validation, and error handling.
- `src/repositories`: manual data access layer (SQLite queries per aggregate).
- `src/routes`: domain routes (`auth`, `users`, `collaborators`, `modules`, `skills`, `assessments`, `reports`, `dashboard`).
- `src/utils`: helpers for password generation, collaborator profile lookup, skill level math, logging.

## API overview

- `GET /healths`: health check.
- `POST /auth/login`: authenticate and receive a JWT token.
- `POST /auth/change-password`: change password for the authenticated user.
- `GET /users/me`: current user profile.
- `CRUD /collaborators`: manage collaborators, link/unlink user access, reset access.
- `CRUD /modules`: register assessed modules/routines.
- `POST /skills/claim`: collaborator self-assessment for a module.
- `GET /skills/claim`: list self-assessments (with filters).
- `PUT /skills/claim/:id`: update self-assessment.
- `POST /assessments`: manager assessment for a collaborator/module.
- `GET /assessments`: list assessments by collaborator.
- `POST /assessments/career-plans`: create career plans and attach modules.
- `PUT /assessments/career-plans/:id`: update career plan data/modules.
- `DELETE /assessments/career-plans/:id`: delete plan and links.
- `GET /assessments/career-plans`: list plans (permissions applied).
- `GET /dashboard/kpis`: aggregated indicators (totals, average skill gap).
- `GET /dashboard/trends`: distribution of skill levels and main gaps.
- `GET /reports/coverage`: coverage report per collaborator (JSON or CSV).

All routes except `POST /auth/login` and `GET /healths` require a valid JWT token and role-based permissions (`MASTER` or `COLABORADOR`) enforced by `authenticate` and `authorizeRoles` middlewares.

## Development flow

1. Start the API with `yarn dev`. The database schema will be bootstrapped automatically.
2. Run the frontend (if applicable) from the monorepo root.
3. Before shipping, run `yarn build` to ensure TypeScript output is clean.
