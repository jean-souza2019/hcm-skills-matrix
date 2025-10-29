# Visão Geral – HCM Skills Matrix

Documentação conceitual do sistema de matriz de competências, cobrindo arquitetura, fluxos principais e organização das
pastas no repositório.

## Arquitetura em alto nível
```
[Frontend React/Vite] <--> [API Express/Prisma] --> [Banco SQLite|DATABASE_URL]
                                       \
                                        -> [Seed/Admin & Módulos padrão]
```
- Frontend: SPA React hospedada pelo Vite, com estado global via Zustand e React Query para dados.
- Backend: API Express escrita em TypeScript, usando Prisma como ORM e SQLite como banco padrão.
- Distribuição desktop: o frontend é empacotado com Electron; o backend pode ser convertido em executável via `pkg`.

## Perfis e fluxos principais
- Autenticação: usuários (`MASTER` ou `COLABORADOR`) acessam `POST /auth/login`, recebem token JWT e continuam com rotas
  protegidas. O frontend persiste token/usuário em `zustand`.
- Autoavaliação (`COLABORADOR`): registra o nível atual por módulo em `POST /skills/claim`.
- Avaliação de gestor (`MASTER`): define nível alvo por módulo e cria planos de carreira (`/assessments` e
  `/assessments/career-plans`).
- Indicadores: dashboards (`/dashboard/kpis` e `/dashboard/trends`) consolidam gaps e distribuição de níveis.
- Relatórios: `/reports/coverage` produz JSON ou CSV com comparação entre níveis atuais e metas.

## Organização do repositório
- `frontend/`: aplicação React + Electron (ver README específico).
- `backend/`: API Express + Prisma (ver README específico).
- `package.json` (raiz): comandos agregados (`yarn build:api`, `yarn build:desktop`, `yarn build:win`).
- `Matriz_Skills_HCM.xlsx`: referência original do mapeamento de competências.
- `tasks.md`: backlog e anotações de desenvolvimento.
- `.nvmrc`: versão recomendada do Node para todo o projeto.

### Estrutura do frontend
- `src/api`: clientes Axios por domínio (auth, módulos, colaboradores etc.), centralizados com interceptors (`client.ts`).
- `src/components`: componentes reutilizáveis, layouts (`AppLayout`), toolbars, dialogs e widgets.
- `src/hooks`: hooks customizados; `useAuthBootstrap` sincroniza o usuário ao carregar a aplicação.
- `src/pages`: telas agrupadas por contexto (dashboard, colaboradores, autoavaliação, gestor, relatórios).
- `src/router`: configuração de rotas e guardas (`ProtectedRoute`).
- `src/store`: estado global com Zustand para token, usuário e indicadores de loading.
- `src/providers`: composição de provedores (React Query, tema MUI, Snackbar).
- `src/theme.ts`: definições de tema personalizado do Material UI.
- `src/types`: contratos utilizados na UI (domínio e respostas da API).
- `src/utils`: helpers (formatação, mapeamento de níveis etc.).
- `electron/`: script principal usado para a versão desktop.
- `public/`, `assets/`: recursos estáticos e ícones.

### Estrutura do backend
- `src/app.ts`: montagem do servidor Express (middlewares, rotas e handler 404).
- `src/config/env.ts`: carga das variáveis de ambiente com Zod.
- `src/lib/prisma.ts`: singleton do Prisma Client com logs condicionais ao ambiente.
- `src/middlewares`: autenticação JWT, autorização por papel, validação de payloads com Zod e tratador de erro padrão.
- `src/routes`: módulos REST segmentados:
  - `auth`: login e troca de senha.
  - `users`: consulta do usuário atual.
  - `collaborators`: cadastro de colaboradores, vínculo de usuários, reset de acesso.
  - `modules`: CRUD de rotinas/módulos avaliados.
  - `skills`: autoavaliações (skill claims).
  - `assessments`: avaliações de gestores e planos de carreira.
  - `reports`: geração de relatórios e exportação CSV.
  - `dashboard`: indicadores agregados e tendências.
- `src/utils`: geração de senha temporária, conversões de nível e helpers para obter perfil do colaborador.
- `prisma/`: schema, migrations, seeds (`seed.ts` cria usuário MASTER e módulos padrão).
- `build/`, `dist/`: saídas de build (`pkg` e TypeScript, respectivamente).

## Modelagem de dados (Prisma)
- `User`: credenciais e papel (`MASTER` ou `COLABORADOR`). Pode estar vinculado a um perfil de colaborador.
- `CollaboratorProfile`: dados pessoais, atividades, notas e relacionamento com autoavaliações/planos.
- `ModuleRoutine`: áreas/módulos avaliados (código, descrição, observação).
- `SkillClaim`: autoavaliações dos colaboradores com nível atual e evidências.
- `ManagerAssessment`: avaliações dos gestores com nível desejado e comentários.
- `CareerPlan` e `CareerPlanModule`: definição das metas de desenvolvimento e módulos associados.
- `AuditLog`: trilha de auditoria para ações relevantes (estrutura pronta para futuras integrações).

## Interação frontend ↔ backend
1. Login no frontend → `POST /auth/login` → token armazenado no store (`useAuthStore`).
2. Cada requisição subsequente injeta o token via interceptor do Axios.
3. O hook `useAuthBootstrap` chama `GET /users/me` para repopular o estado quando a aplicação carrega.
4. Operações CRUD usam React Query para cache e invalidação automática, mantendo a UI sincronizada com a API.

## Processos de build e distribuição
- Desenvolvimento: `yarn dev` em `backend/` + `yarn dev` em `frontend/`.
- Produção web: `yarn build` em ambos os diretórios gera `dist/` com artefatos prontos.
- Desktop: `frontend` usa `electron-builder` para gerar instalador Windows; `backend` usa `pkg` para produzir
  `api.exe`. A distribuição completa inclui ambos os binários.
