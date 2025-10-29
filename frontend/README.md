# HCM Skills Matrix – Frontend

Aplicação web responsável pela interface do sistema de matriz de competências. Construída com React, Vite e Material UI e
empacotada com Electron para distribuição desktop.

## Requisitos
- Node.js >= 18.18 (use a versão definida em `.nvmrc` para evitar incompatibilidades)
- Yarn 1.22.x

## Configuração
1. Copie as variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Ajuste `VITE_API_URL` apontando para a URL da API. Em desenvolvimento, use `http://localhost:3333`.
3. Instale as dependências:
   ```bash
   yarn install
   ```

## Scripts úteis
- `yarn dev`: inicia o app em modo desenvolvimento (porta padrão 5173) com hot reload.
- `yarn preview`: executa o build e serve a versão empacotada para teste local.
- `yarn build`: gera a versão web de produção em `dist/`.
- `yarn build:desktop`: cria o build web e empacota um instalador Windows em `dist-desktop/` usando Electron Builder.
- `yarn lint`: roda ESLint nos arquivos `.ts`/`.tsx`.
- `yarn test` / `yarn test:watch`: executa os testes unitários com Vitest.

## Integração com a API
A aplicação consome o backend via Axios. O `src/api/client.ts` injeta o token JWT armazenado pelo `zustand` no header
`Authorization`. Garanta que:
- O backend esteja rodando (`yarn dev` no diretório `backend`).
- O CORS esteja liberado (já configurado na API).
- O arquivo `.env` aponte para a URL correta da API.

## Estrutura principal
- `src/api`: clientes HTTP organizados por domínio (auth, colaboradores, módulos, relatórios etc.).
- `src/components`: componentes reutilizáveis, incluindo layouts, formulários e widgets de dashboard.
- `src/hooks`: hooks customizados; por exemplo, `useAuthBootstrap` sincroniza o usuário logado.
- `src/pages`: telas agrupadas por contexto (dashboard, colaboradores, autoavaliação, relatórios...).
- `src/providers`: provedores globais (React Query, tema MUI, Snackbar).
- `src/router`: rotas protegidas e mapeamento de páginas.
- `src/store`: estado global com Zustand (armazenamento do token e dados do usuário).
- `src/theme.ts`: paleta e overrides do Material UI.
- `electron/`: script principal do Electron usado no build desktop.

## Build desktop
O comando `yarn build:desktop` gera um instalador Windows (`.exe`). Para distribuição, combine-o com o executável da API gerado
em `backend` (`yarn build:exe`). Em ambiente local, é recomendado validar o pacote executando:
```bash
yarn build:desktop
open dist-desktop
```

## Dicas de desenvolvimento
- Ajuste o arquivo `src/theme.ts` para personalizações de UI.
- Use os serviços de `src/api` com React Query para garantir cache e revalidação automática.
- Antes de abrir PRs, execute `yarn lint && yarn test` para evitar falhas na pipeline.
