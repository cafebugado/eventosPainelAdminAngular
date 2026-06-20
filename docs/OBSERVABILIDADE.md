# Observabilidade

Este documento explica a stack de observabilidade do painel admin: o que cada
ferramenta faz, onde o código de integração fica, como configurar do zero e como
verificar que cada peça está funcionando.

> Nenhum DSN, token ou ID real aparece neste documento. Use placeholders e gere as
> suas próprias credenciais nos passos descritos abaixo.

## Visão geral

| Necessidade | Ferramenta | O que resolve |
|---|---|---|
| Erros no navegador do usuário | **Sentry** | Captura erros não tratados do Angular e falhas HTTP 5xx, com stack trace e contexto |
| Analytics de uso | **Umami** | Pageviews, visitantes, páginas mais acessadas — sem cookies, sem coletar dados pessoais |

Diferente do backend, o frontend não tem variáveis de ambiente em runtime: tudo é
compilado direto no build (Angular `environment.ts`) ou é uma tag `<script>` estática
no `index.html`. Não existe `.env` neste projeto.

## Sentry (rastreamento de erros do navegador)

**O que é:** captura automaticamente erros não tratados do Angular (exceções em
componentes, serviços, etc.) e também erros HTTP 5xx vindos do backend, com stack
trace, URL/método da requisição e o ambiente (`production`/`development`).

**Onde fica o código:**
- Inicialização: [src/app/core/monitoring/sentry.ts](../src/app/core/monitoring/sentry.ts)
  — função `initSentry()`, chamada em [src/main.ts](../src/main.ts) antes do
  `bootstrapApplication`.
- Captura de erros não tratados: [src/app/app.config.ts](../src/app/app.config.ts) —
  o `ErrorHandler` padrão do Angular é substituído por `Sentry.createErrorHandler()`.
- Captura de erros HTTP: [src/app/core/interceptors/error.interceptor.ts](../src/app/core/interceptors/error.interceptor.ts)
  — qualquer resposta HTTP com status `>= 500` é enviada ao Sentry via
  `Sentry.captureException(...)`, com a URL, método e status como contexto extra.

**Como configurar:**
1. Crie uma conta gratuita em [sentry.io](https://sentry.io).
2. Crie um projeto novo escolhendo a plataforma **Angular**.
3. Copie o DSN gerado (formato `https://<chave>@<org>.ingest.<regiao>.sentry.io/<id>`).
4. Cole esse valor no campo `sentryDsn` de
   [src/environments/environment.ts](../src/environments/environment.ts) (build de
   produção) **e** de
   [src/environments/environment.development.ts](../src/environments/environment.development.ts)
   (build de desenvolvimento). Recomenda-se usar projetos Sentry separados para
   frontend e backend, para não misturar os erros dos dois lados na mesma lista.
5. Se `sentryDsn` ficar vazio, `initSentry()` simplesmente não inicializa nada —
   nenhum erro, nenhuma mudança de comportamento.

**Como verificar que está funcionando:**
1. Rode `npm start` e abra `http://localhost:4200`.
2. Abra o DevTools do navegador (F12) → aba Console → digite
   `throw new Error("teste sentry")` e pressione Enter.
3. No painel do Sentry, abra o projeto do frontend → menu **"Issues"** — o erro deve
   aparecer em poucos segundos.

## Umami (analytics de uso)

**O que é:** alternativa open source ao Google Analytics. Mostra pageviews,
visitantes únicos, páginas mais acessadas e origem do tráfego, sem usar cookies e sem
coletar dados pessoais identificáveis — adequado para conformidade com LGPD sem
precisar de banner de consentimento de cookies.

**Onde fica o código:** uma única tag `<script>` em
[src/index.html](../src/index.html), apontando para `cloud.umami.is/script.js` com o
atributo `data-website-id`.

**Como configurar:**
1. Crie uma conta gratuita em [cloud.umami.is](https://cloud.umami.is) (ou hospede sua
   própria instância via Docker, se preferir self-host).
2. Em **Websites → Add website**, cadastre o domínio de produção do painel admin.
3. Copie o `data-website-id` gerado.
4. Substitua o valor do atributo `data-website-id` na tag `<script>` de
   [src/index.html](../src/index.html).

**Como ver as métricas:** painel do Umami → selecione o site cadastrado → dashboard
com pageviews, visitantes, páginas mais vistas e duração média de sessão.

> Nota: o Umami valida o domínio de origem da requisição. Em `localhost` durante o
> desenvolvimento, pageviews podem não ser registrados — isso é esperado e não indica
> problema de configuração; funciona normalmente no domínio real de produção.

## Variáveis/config — referência rápida

| Onde | O quê | Arquivo |
|---|---|---|
| Build de produção | DSN do Sentry | [src/environments/environment.ts](../src/environments/environment.ts) |
| Build de desenvolvimento | DSN do Sentry | [src/environments/environment.development.ts](../src/environments/environment.development.ts) |
| HTML estático | Website ID do Umami | [src/index.html](../src/index.html) |

Não há `.env` neste projeto — qualquer valor de configuração do frontend fica
compilado dentro do bundle JavaScript final, então nunca coloque segredos
verdadeiramente sensíveis aqui (o DSN do Sentry é seguro de expor publicamente por
design; ele só permite *enviar* eventos, não ler dados).

## Checklist de verificação local

1. Preencha `sentryDsn` nos dois arquivos de `environments/`.
2. Rode `npm start`.
3. Force um erro no console do navegador e confirme que aparece em Issues no Sentry.
4. Navegue por algumas telas do painel e confira no dashboard do Umami se os
   pageviews aparecem (lembre-se da ressalva sobre `localhost` acima).
