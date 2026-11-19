# Eventos Painel Admin

Painel administrativo do **Café Bugado**, usado para gerenciar o site público de eventos de tecnologia [eventos.cafebugado.com.br](https://eventos.cafebugado.com.br). É uma SPA em Angular que consome a API do [eventosBackend](https://github.com/cafebugado/eventosBackend) e cobre todo o ciclo de vida de um evento: criação, revisão/moderação, publicação, métricas e tudo que dá suporte a isso (tags, comunidades parceiras, contribuintes do projeto, galeria de fotos, usuários e auditoria).

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Perfis e permissões](#perfis-e-permiss%C3%B5es)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pr%C3%A9-requisitos)
- [Configuração](#configura%C3%A7%C3%A3o)
- [Rodando localmente](#rodando-localmente)
- [Scripts disponíveis](#scripts-dispon%C3%ADveis)
- [Testes e qualidade](#testes-e-qualidade)
- [Build](#build)
- [Observabilidade](#observabilidade)
- [Fluxo de branches / CI-CD](#fluxo-de-branches--cicd)
- [Repositórios relacionados](#reposit%C3%B3rios-relacionados)

## Sobre o projeto

O painel é usado pela equipe do Café Bugado (e por comunidades parceiras) para manter a agenda de eventos de tecnologia sempre atualizada. O fluxo típico é: alguém cria um evento (próprio ou como participante), um moderador/admin revisa e aprova ou recusa, e o evento aprovado passa a aparecer no site público. Além disso, o painel concentra métricas de uso, gestão de tags, comunidades, contribuintes do projeto open source, uma galeria de fotos dos eventos e um log de auditoria de tudo que é alterado no sistema.

Tudo é servido como uma única SPA (Angular standalone components, sem NgModules, com *zoneless change detection*), com localização `pt-BR` — os campos de domínio (nome, descrição, data_evento etc.) também são em português.

## Stack

- **Angular 21** (standalone components, signals para estado, sem NgRx) + **Angular CDK/Material**
- **TypeScript 5.9**
- **RxJS** para streams assíncronos (HTTP, formulários reativos)
- **Chart.js** + **ng2-charts** para os gráficos da tela de Métricas
- **Vitest** (via `@angular/build:unit-test`) para testes unitários, ambiente `jsdom`
- **ESLint** (`angular-eslint` + `typescript-eslint`) para lint
- **Sentry** para rastreamento de erros; **Umami** para analytics de uso (sem cookies)
- **npm** como gerenciador de pacotes (`npm@11.6.0`)

Não há backend neste repositório — a API é o projeto [eventosBackend](https://github.com/cafebugado/eventosBackend), consumida via `HttpClient` com autenticação JWT (Bearer token, anexado por um interceptor a toda chamada para `environment.apiUrl`).

## Funcionalidades

Todas as telas do painel ficam sob `admin/dashboard/*` (rotas lazy-loaded, protegidas por `authGuard` e, quando aplicável, por `permissionGuard`):

| Rota | Tela | Descrição |
|---|---|---|
| `painel` | Painel | Visão geral: contagem de eventos (hoje/semana/mês/ano), comunidades, contribuintes, fotos e usuários; próximos eventos; eventos pendentes de revisão; atividade recente |
| `metricas` | Métricas | Gráficos de eventos por dia da semana, período do dia, modalidade, cidade, status, tags mais usadas e evolução mensal — com cores adaptadas ao tema claro/escuro |
| `eventos` | Eventos | Listagem paginada/filtrável (status, período, busca, "somente meus") |
| `eventos/novo`, `eventos/:slug/editar` | Formulário de evento | Criação/edição: descrição em rich text, upload de imagem com redimensionamento no cliente, seletor de local (com busca de cidades via API do IBGE), tags |
| `eventos/:slug/revisar` | Revisão de evento | Aprovar ou recusar eventos enviados para moderação (recusa exige motivo) |
| `tags` | Tags | CRUD de tags de evento (nome + cor) |
| `contribuintes` | Contribuintes | CRUD de contribuintes do projeto (vinculados ao usuário do GitHub, avatar, LinkedIn, portfólio) |
| `repositorio` | Stats do GitHub | Estatísticas (stars, forks, issues, PRs, commits) dos repositórios [eventos](https://github.com/cafebugado/eventos) (frontend público) e [eventosBackend](https://github.com/cafebugado/eventosBackend) |
| `usuarios` | Usuários | Atribuição/remoção de papéis (admin, moderador, participante) |
| `comunidades` | Comunidades | CRUD de comunidades parceiras |
| `galeria` | Galeria | Álbuns de fotos vinculados a eventos ou comunidades (upload por arquivo ou URL, legendas) |
| `auditoria` | Auditoria | Log de INSERT/UPDATE/DELETE por entidade, filtrável, com diff antes/depois |
| `configuracoes` | Configurações | Edição do próprio perfil e troca de senha |

Fora do dashboard: **login** (email/senha ou OAuth GitHub/Google), **criar conta**, **recuperar senha** e o **callback de OAuth**.

## Perfis e permissões

Papéis (`Role`): `super_admin`, `admin`, `moderador`, `participante`. Cada papel mapeia para um conjunto de permissões (`canCreateEvents`, `canReviewEvents`, `canManageTags`, `canManageUsers` etc. — ver `src/app/core/models/user.model.ts`). O menu lateral e as rotas se ajustam automaticamente conforme as permissões do usuário logado:

- **super_admin / admin** — acesso completo.
- **moderador** — quase tudo, exceto gestão de usuários e algumas áreas administrativas.
- **participante** — só o necessário para criar/acompanhar os próprios eventos.

## Estrutura do projeto

```
src/app/
├── core/                  # infraestrutura: guards, interceptors, models, services, monitoring
│   ├── guards/            # authGuard, permissionGuard
│   ├── http/              # helper de retry, contexto para pular notificação de erro
│   ├── interceptors/      # auth (Bearer token), error (401/5xx, toast, Sentry)
│   ├── models/            # entidades de domínio (evento, user, auth, tag, community, gallery...)
│   ├── monitoring/        # inicialização do Sentry
│   └── services/          # um service por recurso da API (event, tag, community, role, audit...)
├── features/
│   ├── login/, register/, forgot-password/, auth-callback/
│   └── dashboard/         # shell (sidenav + toolbar) e uma pasta por tela (eventos, metricas, tags...)
└── shared/                # componentes, pipes, services, estilos e utils reutilizáveis
    ├── components/        # confirm-dialog, location-selector, pagination, rich-text-editor...
    ├── services/           # busca de cidades (IBGE), wrapper de snackbar
    └── utils/              # slug, validação de imagem/URL, redimensionamento de imagem...
```

## Pré-requisitos

- **Node.js** compatível com Angular 21 (recomendado: Node 22 LTS — é a versão usada no CI)
- **npm 11+** (o projeto já fixa a versão via `packageManager` no `package.json`)

## Configuração

Não há arquivo `.env` — a configuração é compilada direto no build do Angular, em dois arquivos:

- `src/environments/environment.development.ts` — usado por `ng serve` / build de desenvolvimento
- `src/environments/environment.ts` — usado no build de produção

Ambos expõem:

```ts
{
  production: boolean,
  apiUrl: string,          // URL base da API (eventosBackend)
  publicEventsUrl: string, // URL do site público de eventos
  sentryDsn: string,       // DSN do Sentry (ver seção Observabilidade)
}
```

O Umami (analytics) não usa variável de ambiente — é uma tag `<script>` fixa em `src/index.html` com o `data-website-id` do projeto.

## Rodando localmente

```bash
npm install
npm start        # ng serve
```

Acesse `http://localhost:4200/`. A aplicação recarrega automaticamente a cada alteração nos arquivos-fonte.

## Scripts disponíveis

| Script | Comando | O que faz |
|---|---|---|
| `npm start` | `ng serve` | Sobe o servidor de desenvolvimento |
| `npm run build` | `ng build` | Build de produção em `dist/` |
| `npm run watch` | `ng build --watch --configuration development` | Build de desenvolvimento em modo watch |
| `npm test` | `ng test` | Roda os testes unitários (Vitest) |
| `npm run lint` | `ng lint` | Roda o ESLint sobre `.ts` e `.html` |

## Testes e qualidade

- **Testes unitários**: `npm test` (Vitest, ambiente `jsdom`, configurado via `angular.json`, sem arquivo `vitest.config.ts` separado). Cobertura hoje é mínima — vale contribuir com specs ao mexer em services/componentes.
- **Lint**: `npm run lint` (ESLint + `angular-eslint`, regras para `.ts` e templates `.html`).
- **E2E**: não configurado — o Angular CLI não vem com um framework de e2e por padrão.
- Todo PR roda build + test + lint automaticamente via CI (veja a seção de CI/CD abaixo).

## Build

```bash
npm run build
```

Gera os artefatos otimizados em `dist/eventos-painel-admin/`.

## Observabilidade

O painel admin tem 2 ferramentas open source de observabilidade:

- **Sentry** — rastreamento de erros do navegador e falhas HTTP 5xx.
- **Umami** — analytics de uso (pageviews, visitantes), sem cookies.

Veja o passo a passo completo (como configurar, onde fica o código, como verificar
que cada ferramenta está funcionando) em
[docs/OBSERVABILIDADE.md](docs/OBSERVABILIDADE.md).

## Fluxo de branches / CI-CD

O repositório tem duas branches de longa duração:

- **`production`** — branch padrão do repositório (para quem clona/visita o repo), reflete o que está em produção. Só recebe merge vindo de `development`.
- **`development`** — onde o trabalho do dia a dia acontece.

**Importante:** como `production` é a branch padrão, `git clone` e o botão "New branch" do GitHub partem dela por padrão. Toda branch nova deve ser criada a partir de `development`, não de `production`:

```bash
git checkout development
git pull
git checkout -b minha-branch
```

PRs para `production` que não vierem de `development` são bloqueados automaticamente (workflow `guard-production-source`). Tanto PRs para `development` quanto para `production` exigem checks de CI (build/test/lint) verdes e pelo menos 1 aprovação.

Dependências (npm e GitHub Actions) são atualizadas automaticamente via Dependabot, sempre com PR para `development`.

## Repositórios relacionados

- [`cafebugado/eventos`](https://github.com/cafebugado/eventos) — site público de eventos (frontend que consome os dados publicados aqui)
- [`cafebugado/eventosBackend`](https://github.com/cafebugado/eventosBackend) — API consumida por este painel

---

Para mais detalhes sobre comandos do Angular CLI, veja a [documentação oficial](https://angular.dev/tools/cli).
