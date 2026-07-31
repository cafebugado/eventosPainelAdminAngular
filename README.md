# EventosPainelAdmin

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.15.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

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

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
