# HCM Skills Matrix — tasks.md

[[PROJECT]]
name=HCM Skills Matrix
goal=Matriz de habilidades para HCM (Senior/Dev), com autoavaliação do colaborador e validação/planejamento pelo Gestor (Master).
actors=Gestor,Colaborador,Admin
stack=frontend: React+Vite; api: Node (Express ou NestJS); db: SQLite (com Prisma)
auth=Login com usuário/senha; RBAC (roles: MASTER, COLABORADOR)
seed_from_excel=/mnt/data/Matriz_Skills_HCM.xlsx (Catálogo de Skills: 10 linhas; 10 categorias)
[/PROJECT]

[[DEFINITION_OF_DONE]]
- Fluxo principal (login → autoavaliação → validação gestor → relatório → dashboard) navegável
- Export do relatório em CSV/PDF
- Scripts de seed rodando com SQLite local
[/DEFINITION_OF_DONE]

## Arquitetura (resumo)
- **Frontend (React + Vite)**: Router, AuthGuard, State (Zustand ou Redux), React Query, Charting (Recharts), UI (shadcn ou Material UI), i18n (pt-BR).
- **API (Node)**: NestJS **ou** Express (com estrutura em camadas), Auth (JWT + bcrypt), RBAC por rota, validação (zod/joi), documentação (OpenAPI).
- **DB (SQLite)**: Prisma ORM. Ambientes: `dev`, `test`. Scripts para **seed** e **reset**.

### Modelo de dados (proposta)
```text
User (id, email, password_hash, role[MASTER|COLABORADOR], createdAt)
CollaboratorProfile (id, userId, nomeCompleto, dataAdmissao, atividades[], observacoes)
ModuleRoutine (id, codigo, descricao, observacao)
SkillClaim (id, collaboratorId, moduleId, nivelAtual[NAO_ATENDE|ATENDE|IMPLANTA_SOZINHO|ESPECIALISTA], evidencias?)
ManagerAssessment (id, collaboratorId, moduleId, nivelAlvo, comentario?)
CareerPlan (id, collaboratorId, objetivos, prazo?, observacoes?)
AuditLog (id, userId, action, entity, entityId, payload, createdAt)
```

> Observação: Níveis propostos mapeados a enum interno (ordenação crescente):  
> `0=NAO_ATENDE, 1=ATENDE, 2=IMPLANTA_SOZINHO, 3=ESPECIALISTA`.

### Endpoints (amostra)
```http
POST   /auth/login            # body: {{ email, password }}
GET    /users/me              # perfil logado

# Colaboradores (MASTER)
POST   /collaborators         # criar perfil (nomeCompleto, dataAdmissao, atividades[], observacoes)
GET    /collaborators         # listar (filtros: nome, atividade)
GET    /collaborators/:id
PUT    /collaborators/:id
DELETE /collaborators/:id

# Catálogo de Módulos/Rotinas (MASTER)
POST   /modules               # {{codigo, descricao, observacao}}
GET    /modules               # filtros: codigo, descricao
PUT    /modules/:id
DELETE /modules/:id

# Autoavaliação (COLABORADOR)
POST   /skills/claim          # {{moduleId, nivelAtual, evidencias?}}
GET    /skills/claim?me=true
PUT    /skills/claim/:id

# Avaliação do Gestor & Plano de Carreira (MASTER)
POST   /assessments           # {{collaboratorId, moduleId, nivelAlvo, comentario?}}
GET    /assessments?collaboratorId=
POST   /career-plans          # {{collaboratorId, objetivos, prazo?, observacoes?}}

# Relatórios & Dashboard
GET    /reports/coverage?collaboratorId=
GET    /dashboard/kpis
GET    /dashboard/trends
```

---

## Telas (wireframes mentais)
- **Login** (usuário/senha).
- **Gestor (Master)**
  - Cadastrar **Colaborador** (nome, admissão, atividades, observações).
  - Cadastrar **Módulos/Rotinas** (código, descrição, observação).
  - **Revisar Autoavaliações** por colaborador (lista de módulos → ajustar nível-alvo, comentários).
  - **Plano de Carreira** (definir objetivos, prazos, trilhas).
  - **Relatórios** (o que atende / onde melhorar; export CSV/PDF).
  - **Dashboard** (gráficos: distribuição de níveis, gaps por categoria, evolução).
- **Colaborador**
  - Perfil (somente leitura dos dados administrativos).
  - **Autoavaliação**: selecionar módulo/rotina e marcar nível: *Não atende / Atende / Implanta sozinho / Especialista*; incluir evidências/links.
  - Visualizar retorno do Gestor (nível-alvo, plano).

---

## Importação do Excel (seed)
- Fonte: **Catálogo de Skills** (10 linhas, 10 categorias) no arquivo `Matriz_Skills_HCM.xlsx`.
- Estratégia: gerar `codigo` a partir de *slug(category + skill)* (ex.: `FOLHA-PAGAMENTO_CALCULOS-AUDITORIA`).
- Mapear para `ModuleRoutine(codigo, descricao=Skill/Competência, observacao=categoria)`.
- Script: `yarn seed:excel` → lê o XLSX e popula `ModuleRoutine`.


# Backlog por épico

[[EPIC id=E1 name="Autenticação & RBAC"]]
desc=Login com usuário/senha, JWT, RBAC (MASTER, COLABORADOR)
[[TASK id=T1 priority=P0 owner=backend]]
title=API de login (JWT) e criação de usuário (seed Admin)
acceptance=POST /auth/login retorna token válido; rota GET /users/me exige Bearer token.
[/TASK]
[[TASK id=T2 priority=P1 owner=backend]]
title=RBAC middleware/guard
acceptance=Rotas /modules e /collaborators exigem MASTER; /skills/claim exige COLABORADOR.
[/TASK]
[[TASK id=T3 priority=P1 owner=frontend]]
title=Fluxo de login + guard no router
acceptance=Sem token → redireciona para /login; com token → navega para dashboard.
[/TASK]
[/EPIC]

[[EPIC id=E2 name="Modelo de Dados & Prisma"]]
desc=Definição de entidades e migrações (SQLite)
[[TASK id=T4 priority=P0 owner=backend]]
title=Definir schema.prisma e gerar migrações
acceptance=Prisma migrate ok; tabelas criadas conforme modelo acima.
[/TASK]
[[TASK id=T5 priority=P1 owner=backend]]
title=Seed inicial (admin, exemplos de módulos)
acceptance=Rodar `yarn prisma db seed` cria usuário admin e N módulos.
[/TASK]
[/EPIC]

[[EPIC id=E3 name="Gestão de Colaboradores (Master)"]]
desc=CRUD dos colaboradores
[[TASK id=T6 priority=P1 owner=backend]]
title=Endpoints CRUD de CollaboratorProfile
acceptance=CRUD completo; validações de campos obrigatórios.
[/TASK]
[[TASK id=T7 priority=P1 owner=frontend]]
title=Telas: lista, criar/editar, detalhar colaborador
acceptance=Form com Nome, Admissão, Atividades (multi-select), Observações.
[/TASK]
[/EPIC]

[[EPIC id=E4 name="Catálogo de Módulos/Rotinas (Master)"]]
desc=CRUD de módulos/rotinas
[[TASK id=T8 priority=P1 owner=backend]]
title=Endpoints CRUD de ModuleRoutine
acceptance=Filtros por código e descrição; paginação.
[/TASK]
[[TASK id=T9 priority=P1 owner=frontend]]
title=Telas: lista, criar/editar módulos
acceptance=Form com Código, Descrição, Observação.
[/TASK]
[/EPIC]

[[EPIC id=E5 name="Autoavaliação (Colaborador)"]]
desc=Registro do nível atual por módulo/rotina
[[TASK id=T10 priority=P1 owner=backend]]
title=Endpoints SkillClaim (create/list/update)
acceptance=COLABORADOR só pode manipular os próprios claims.
[/TASK]
[[TASK id=T11 priority=P1 owner=frontend]]
title=Tela de Autoavaliação
acceptance=Selecionar módulo/rotina e marcar nível; anexar evidências/links.
[/TASK]
[/EPIC]

[[EPIC id=E6 name="Avaliação do Gestor & Plano de Carreira"]]
desc=Gestor define nível-alvo e objetivos
[[TASK id=T12 priority=P1 owner=backend]]
title=Endpoints ManagerAssessment & CareerPlan
acceptance=MASTER ajusta nível-alvo por módulo; cria plano com objetivos.
[/TASK]
[[TASK id=T13 priority=P1 owner=frontend]]
title=Tela de Revisão do Gestor
acceptance=Lista claims do colaborador; edita alvo/comentário; salva plano.
[/TASK]
[/EPIC]

[[EPIC id=E7 name="Relatórios"]]
desc=Listar o que atende e pontos de melhoria; export
[[TASK id=T14 priority=P2 owner=backend]]
title=Endpoint /reports/coverage
acceptance=Retorna por colaborador: módulos, nível atual, nível-alvo, gap; export CSV.
[/TASK]
[[TASK id=T15 priority=P2 owner=frontend]]
title=UI de relatório com filtros e botão Exportar
acceptance=Filtro por colaborador, atividade, categoria; export CSV/PDF.
[/TASK]
[/EPIC]

[[EPIC id=E8 name="Dashboard & Analytics"]]
desc=KPIs e gráficos
[[TASK id=T16 priority=P2 owner=backend]]
title=Endpoints /dashboard/kpis, /dashboard/trends
acceptance=Retorna KPIs (totais, % por nível, top gaps).
[/TASK]
[[TASK id=T17 priority=P2 owner=frontend]]
title=Cards e gráficos (Recharts)
acceptance=Cards de totais e gráficos de barras/linhas para gaps por categoria.
[/TASK]
[/EPIC]

[[EPIC id=E9 name="Importação XLSX (Seed)"]]
desc=Ler planilha e popular catálogo
[[TASK id=T18 priority=P1 owner=backend]]
title=Script de import (xlsx → ModuleRoutine)
acceptance=Lê 10 linhas da aba Catálogo de Skills; cria códigos únicos por slug.
[/TASK]
[/EPIC]

[[EPIC id=E10 name="Qualidade, Testes & CI"]]
desc=Testes (API/Front), lint, format, pipeline
[[TASK id=T19 priority=P1 owner=backend]]
title=Testes unitários (services/repos) e e2e básicos (auth)
acceptance=Jest rodando no CI; cobertura ≥70%.
[/TASK]
[[TASK id=T20 priority=P1 owner=frontend]]
title=Testes de tela críticos (login, autoavaliação, revisão gestor)
acceptance=Testing Library; smoke tests + validações.
[/TASK]
[[TASK id=T21 priority=P1 owner=devops]]
title=Pipeline (GitHub Actions) com cache de deps e lint/format
acceptance=Jobs: install, build, test, lint, prisma migrate (check).
[/TASK]
[/EPIC]

[[EPIC id=E11 name="Segurança & Auditoria"]]
desc=Práticas mínimas de segurança
[[TASK id=T22 priority=P2 owner=backend]]
title=Hash de senha (bcrypt), JWT expirável, rate-limit no /auth
acceptance=Senhas não reversíveis; bloqueio básico contra brute-force.
[/TASK]
[[TASK id=T23 priority=P2 owner=backend]]
title=AuditLog (criação/edição/exclusão)
acceptance=Registra userId, ação, entidade, {{before,after}}.
[/TASK]
[/EPIC]

---

## Critérios funcionais por papel
- **Colaborador**
  - Consegue autenticar e preencher autoavaliação por módulo/rotina.
  - Visualiza avaliação do gestor e plano de carreira.
- **Gestor (Master)**
  - CRUD de colaboradores e catálogo de módulos/rotinas.
  - Revisa autoavaliações e define nível-alvo e plano.
  - Gera relatório e consulta dashboard.

## Padrões de nível (UI)
- `Não atende` | `Atende` | `Implanta sozinho` | `Especialista`
- Exibir legenda e usar cores consistentes (ex.: escala progressiva).

## Roadmap sugerido
1) E1, E2 → base de auth e dados
2) E4, E5 → fluxo colaborador ↔ gestor
3) E7 → relatório
4) E8 → dashboard
5) E9, E10, E11 → import, qualidade e segurança

[[NOTES]]
- A planilha inclui níveis SFIA/e-CF — pode-se evoluir para avaliar em escala 1‑7 futuramente.
- Iniciar simples (enum 0..3) e manter a ponte para níveis avançados.
- Se optar por NestJS: módulos `auth`, `users`, `collaborators`, `modules`, `skills`, `assessments`, `reports`.
[/NOTES]
