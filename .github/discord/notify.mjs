// Integração GitHub → Discord da equipe "Eventos Painel Admin".
//
//   node .github/discord/notify.mjs          → trata o evento do workflow (GITHUB_EVENT_NAME)
//   node .github/discord/notify.mjs health   → verifica se o painel de produção está no ar
//   node .github/discord/notify.mjs weekly   → resumo semanal
//
// Variáveis: DISCORD_CONFIG (vars), DISCORD_WEBHOOKS e DISCORD_BOT_TOKEN (secrets), GITHUB_TOKEN.
// Documentação: .github/discord/README.md
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import {
  loadConfig,
  loadWebhooks,
  discord,
  webhook,
  webhookEdit,
  github,
  who,
  mentionIds,
  excerpt,
  firstLine,
  fitField,
  threadName,
  COLORS,
  issueTagNames,
  prStatus,
  prTagNames,
  tagIds,
  tagNamesFromIds,
  findThread,
  updateThread,
  releaseInfo,
} from './lib.mjs';

const cfg = loadConfig();
const hooks = loadWebhooks();
const REPO = process.env.GITHUB_REPOSITORY;
const AVATAR = 'https://github.githubassets.com/favicons/favicon.png';
const BRANCHES = ['development', 'production'];

const roleMention = (...keys) => keys.map((k) => `<@&${cfg.roles[k]}>`).join(' ');
// NO_PINGS=1: mostra as menções sem notificar ninguém (testes e importações)
const pings = ({ users = [], roles = [] } = {}) => ({
  allowed_mentions: process.env.NO_PINGS
    ? { parse: [] }
    : { parse: [], users, roles: roles.map((k) => cfg.roles[k]) },
});

// ======================= ISSUES → #painel-tarefas =======================

function issueEmbed(issue) {
  const labels = issue.labels.map((l) => l.name);
  const prio = labels.find((l) => /^P\d$/.test(l));
  const color = issue.state === 'closed'
    ? COLORS.gray
    : { P0: COLORS.red, P1: COLORS.orange, P2: COLORS.yellow, P3: COLORS.gray }[prio] ?? COLORS.blurple;
  return {
    title: `#${issue.number} ${issue.title}`.slice(0, 256),
    url: issue.html_url,
    color,
    description: excerpt(issue.body),
    fields: [
      { name: '🏷️ Labels', value: labels.length ? labels.map((l) => `\`${l}\``).join(' ') : '—', inline: true },
      { name: '👤 Responsável', value: issue.assignees.map((a) => who(a.login, cfg)).join(', ') || '_ninguém ainda_', inline: true },
    ],
    footer: { text: `Aberta por ${issue.user.login}${issue.state === 'closed' ? ' • fechada' : ''}` },
    timestamp: issue.created_at,
  };
}

async function onIssues(p) {
  const { issue, action } = p;
  if (issue.pull_request) return;
  const forum = cfg.forums.tarefas;
  const tags = tagIds(issueTagNames(issue), forum);
  const thread = await findThread(forum, issue.number, cfg);

  if (!thread) {
    if (action === 'closed' || action === 'deleted') return;
    await webhook(hooks.tarefas, {
      thread_name: threadName(issue.number, issue.title),
      applied_tags: tags,
      username: 'GitHub · Issues',
      avatar_url: AVATAR,
      embeds: [issueEmbed(issue)],
    });
    return;
  }

  await updateThread(thread.id, { archived: false, name: threadName(issue.number, issue.title), applied_tags: tags });

  const sender = who(p.sender.login, cfg);
  const msg = {
    assigned: `👤 ${who(p.assignee?.login, cfg)} assumiu esta issue.`,
    unassigned: `👤 ${who(p.assignee?.login, cfg)} saiu desta issue.`,
    closed: `✅ Issue fechada por ${sender}${issue.state_reason === 'not_planned' ? ' _(não planejada)_' : ''}.`,
    reopened: `🔄 Issue reaberta por ${sender}.`,
  }[action];
  if (msg) await webhook(hooks.tarefas, { content: msg, username: 'GitHub · Issues', avatar_url: AVATAR }, { threadId: thread.id });

  await webhookEdit(hooks.tarefas, thread.id, { embeds: [issueEmbed(issue)] }, { threadId: thread.id }).catch(() => {});
  if (issue.state === 'closed') await updateThread(thread.id, { archived: true });
}

// ======================= PULL REQUESTS → #painel-prs =======================

const STATUS_COLOR = {
  'Aguardando review': COLORS.yellow,
  Aprovado: COLORS.green,
  'Mudanças pedidas': COLORS.orange,
  Rascunho: COLORS.gray,
  Merged: COLORS.purple,
  Fechado: COLORS.gray,
};

function prEmbed(pr, status) {
  const reviewers = (pr.requested_reviewers ?? []).map((u) => who(u.login, cfg));
  return {
    title: `#${pr.number} ${pr.title}`.slice(0, 256),
    url: pr.html_url,
    color: STATUS_COLOR[status] ?? COLORS.blurple,
    description: excerpt(pr.body, 500),
    fields: [
      { name: '👤 Autor', value: who(pr.user.login, cfg), inline: true },
      { name: '🌿 Branch', value: `\`${pr.head.ref}\` → \`${pr.base.ref}\``, inline: true },
      { name: '📊 Status', value: status, inline: true },
      ...(pr.additions !== undefined
        ? [{ name: '📝 Mudanças', value: `+${pr.additions} −${pr.deletions} em ${pr.changed_files} arquivo(s)`, inline: true }]
        : []),
      { name: '👀 Reviewers', value: reviewers.join(', ') || '—', inline: true },
    ],
    footer: { text: 'GitHub · Pull Request' },
    timestamp: pr.created_at,
  };
}

async function prContext(number) {
  const [pr, reviews] = await Promise.all([
    github(`/repos/${REPO}/pulls/${number}`),
    github(`/repos/${REPO}/pulls/${number}/reviews?per_page=100`),
  ]);
  const forum = cfg.forums.prs;
  const thread = await findThread(forum, number, cfg);
  const ci = thread ? tagNamesFromIds(thread.applied_tags ?? [], forum).find((n) => n.startsWith('CI ')) ?? null : null;
  return { pr, reviews, status: prStatus(pr, reviews), forum, thread, ci };
}

const prPost = (content, threadId, extra = {}) =>
  webhook(hooks.prs, { content, username: 'GitHub · PRs', avatar_url: AVATAR, ...extra }, { threadId });

/** Garante que o post do PR existe e está com nome/tags/embed atualizados. */
async function syncPr(ctx, { ci = ctx.ci } = {}) {
  const { pr, status, forum } = ctx;
  const tags = tagIds(prTagNames(pr, status, ci), forum);
  if (!ctx.thread) {
    const msg = await webhook(hooks.prs, {
      thread_name: threadName(pr.number, pr.title),
      applied_tags: tags,
      username: 'GitHub · PRs',
      avatar_url: AVATAR,
      embeds: [prEmbed(pr, status)],
    });
    ctx.thread = { id: msg.channel_id };
    ctx.created = true;
  } else {
    await updateThread(ctx.thread.id, { archived: false, name: threadName(pr.number, pr.title), applied_tags: tags });
    await webhookEdit(hooks.prs, ctx.thread.id, { embeds: [prEmbed(pr, status)] }, { threadId: ctx.thread.id }).catch(() => {});
  }
  return ctx.thread.id;
}

async function closeIfDone(ctx) {
  if (ctx.pr.state === 'closed') await updateThread(ctx.thread.id, { archived: true });
}

async function onPullRequest(p) {
  const { action } = p;
  const ctx = await prContext(p.pull_request.number);
  if (!ctx.thread && action === 'closed') return;
  const ci = action === 'synchronize' ? null : ctx.ci; // novos commits: CI vai rodar de novo
  const threadId = await syncPr(ctx, { ci });
  const { pr } = ctx;
  const sender = who(p.sender.login, cfg);
  const reviewerIds = mentionIds((pr.requested_reviewers ?? []).map((u) => u.login), cfg);

  if (ctx.created && action !== 'closed') {
    if (!pr.draft && pr.requested_reviewers?.length) {
      await prPost(`👀 Review pedido: ${pr.requested_reviewers.map((u) => who(u.login, cfg)).join(', ')}`, threadId, pings({ users: reviewerIds }));
    }
    return;
  }

  switch (action) {
    case 'reopened':
      await prPost(`🔄 PR reaberto por ${sender}.`, threadId);
      break;
    case 'ready_for_review':
      await prPost(
        `👀 Pronto para review!${pr.requested_reviewers?.length ? ' ' + pr.requested_reviewers.map((u) => who(u.login, cfg)).join(', ') : ''}`,
        threadId,
        pings({ users: reviewerIds }),
      );
      break;
    case 'converted_to_draft':
      await prPost(`📝 Voltou para rascunho.`, threadId);
      break;
    case 'review_requested': {
      // PR recém-aberto: o aviso de "opened" já marcou os reviewers (CODEOWNERS)
      if (pr.draft || Date.now() - Date.parse(pr.created_at) < 120_000) break;
      const login = p.requested_reviewer?.login;
      const target = login ? who(login, cfg) : `time **${p.requested_team?.name}**`;
      await prPost(`👀 ${target}, seu review foi pedido por ${sender}.`, threadId, pings({ users: mentionIds([login], cfg) }));
      break;
    }
    case 'synchronize':
      await prPost(`⬆️ Novos commits enviados por ${sender}. [Ver alterações](${pr.html_url}/files)`, threadId);
      break;
    case 'closed':
      await prPost(
        pr.merged
          ? `🟣 **Merged** em \`${pr.base.ref}\` por ${who(pr.merged_by?.login, cfg)}. 🎉`
          : `⛔ PR fechado sem merge por ${sender}.`,
        threadId,
      );
      break;
  }
  await closeIfDone(ctx);
}

async function onReview(p) {
  if (p.action !== 'submitted') return;
  const { review } = p;
  const state = review.state.toLowerCase();
  if (review.user.type === 'Bot') return; // ex.: comentários automáticos do CodeQL
  if (state === 'commented' && !review.body) return; // comentários de linha já aparecem no GitHub
  const ctx = await prContext(p.pull_request.number);
  const threadId = await syncPr(ctx);
  const reviewer = who(review.user.login, cfg);
  const author = who(ctx.pr.user.login, cfg);
  const authorIds = mentionIds([ctx.pr.user.login], cfg);
  const body = review.body ? `\n> ${excerpt(review.body, 300).replace(/\n/g, '\n> ')}` : '';
  const link = ` [Ver review](${review.html_url})`;
  if (state === 'approved') await prPost(`✅ ${reviewer} **aprovou** o PR. ${author}${link}${body}`, threadId, pings({ users: authorIds }));
  else if (state === 'changes_requested') await prPost(`🔁 ${reviewer} **pediu mudanças**. ${author}${link}${body}`, threadId, pings({ users: authorIds }));
  else await prPost(`💬 ${reviewer} comentou no review.${link}${body}`, threadId);
}

// ======================= COMENTÁRIOS =======================

async function onIssueComment(p) {
  if (p.action !== 'created' || p.comment.user.type === 'Bot') return;
  const isPr = Boolean(p.issue.pull_request);
  const forum = isPr ? cfg.forums.prs : cfg.forums.tarefas;
  const thread = await findThread(forum, p.issue.number, cfg);
  if (!thread || thread.thread_metadata?.archived) return;
  await webhook(
    isPr ? hooks.prs : hooks.tarefas,
    {
      content: `💬 ${who(p.comment.user.login, cfg)} comentou: [ver no GitHub](${p.comment.html_url})\n> ${excerpt(p.comment.body, 400).replace(/\n/g, '\n> ')}`,
      username: isPr ? 'GitHub · PRs' : 'GitHub · Issues',
      avatar_url: AVATAR,
    },
    { threadId: thread.id },
  );
}

// ======================= CI (workflow_run) =======================

async function failedJobs(runId) {
  const { jobs } = await github(`/repos/${REPO}/actions/runs/${runId}/jobs?per_page=50`);
  return jobs.filter((j) => ['failure', 'timed_out'].includes(j.conclusion)).map((j) => j.name);
}

async function onWorkflowRun(p) {
  const run = p.workflow_run;
  if (p.action !== 'completed' || !['success', 'failure', 'timed_out', 'startup_failure'].includes(run.conclusion)) return;
  const failed = run.conclusion !== 'success';
  const isCI = run.name === 'CI';

  // CI de Pull Request → post do PR
  if (run.event === 'pull_request' || run.event === 'pull_request_target') {
    let numbers = (run.pull_requests ?? []).map((pr) => pr.number);
    if (!numbers.length) numbers = (await github(`/repos/${REPO}/commits/${run.head_sha}/pulls`)).map((pr) => pr.number);
    for (const n of numbers) {
      const ctx = await prContext(n);
      if (ctx.pr.head.sha !== run.head_sha) continue; // resultado antigo
      const before = ctx.ci;
      const threadId = await syncPr(ctx, { ci: isCI ? (failed ? 'CI falhou' : 'CI passou') : ctx.ci });
      if (failed) {
        const jobs = await failedJobs(run.id);
        await prPost(
          `❌ **${run.name}** falhou${jobs.length ? ` em \`${jobs.join('`, `')}\`` : ''}. ${who(ctx.pr.user.login, cfg)} [Ver execução](${run.html_url})`,
          threadId,
          pings({ users: mentionIds([ctx.pr.user.login], cfg) }),
        );
      } else if (isCI && before === 'CI falhou') {
        await prPost(`🟢 **CI** voltou a passar.`, threadId);
      }
    }
    return;
  }

  // Branches principais → #painel-alertas
  if (!BRANCHES.includes(run.head_branch)) return;
  if (failed) {
    const jobs = await failedJobs(run.id);
    await webhook(hooks.alertas, {
      content: `${roleMention('lead', 'dev')} ❌ **${run.name}** falhou em \`${run.head_branch}\``,
      username: 'GitHub · Alertas',
      avatar_url: AVATAR,
      embeds: [{
        title: `${run.name} falhou em ${run.head_branch}`,
        url: run.html_url,
        color: COLORS.red,
        fields: [
          { name: 'Jobs com falha', value: jobs.map((j) => `\`${j}\``).join(' ') || '—', inline: true },
          { name: 'Commit', value: `[\`${run.head_sha.slice(0, 7)}\`](https://github.com/${REPO}/commit/${run.head_sha}) ${firstLine(run.head_commit?.message).slice(0, 100)}` },
          { name: 'Autor', value: who(run.actor?.login, cfg), inline: true },
        ],
        timestamp: run.updated_at,
      }],
      ...pings({ roles: ['lead', 'dev'] }),
    });
  } else {
    // voltou a passar depois de uma falha?
    const { workflow_runs: prev } = await github(
      `/repos/${REPO}/actions/workflows/${run.workflow_id}/runs?branch=${run.head_branch}&event=${run.event}&status=completed&per_page=2`,
    );
    const previous = prev.find((r) => r.id !== run.id);
    if (previous && ['failure', 'timed_out'].includes(previous.conclusion)) {
      await webhook(hooks.alertas, {
        content: `🟢 **${run.name}** voltou a passar em \`${run.head_branch}\`. [Ver execução](${run.html_url})`,
        username: 'GitHub · Alertas',
        avatar_url: AVATAR,
      });
    }
  }
}

// ======================= DEPLOYS (Vercel) =======================

async function onDeploymentStatus(p) {
  const { deployment: dep, deployment_status: ds } = p;
  const isProd = /^production$/i.test(dep.environment);
  const state = ds.state;
  const done = ['success', 'failure', 'error'].includes(state);
  if (!done && !(isProd && state === 'in_progress')) return;

  const commit = await github(`/repos/${REPO}/commits/${dep.sha}`).catch(() => null);
  const branches = isProd
    ? ['production']
    : (await github(`/repos/${REPO}/commits/${dep.sha}/branches-where-head`).catch(() => [])).map((b) => b.name);
  const branch = branches.includes('development') ? 'development' : branches[0] ?? null;
  const url = ds.environment_url || ds.target_url;
  const failed = state === 'failure' || state === 'error';
  const label = { in_progress: '⏳ em andamento', success: '✅ no ar', failure: '❌ falhou', error: '❌ erro' }[state];
  const envName = isProd ? '🟢 Produção' : branch === 'development' ? '🟡 Desenvolvimento' : '🔍 Preview';

  const embed = {
    title: `${envName} · ${label}`,
    url: ds.log_url || ds.target_url || undefined,
    color: failed ? COLORS.red : state === 'success' ? COLORS.green : COLORS.yellow,
    fields: [
      ...(commit ? [{ name: 'Commit', value: `[\`${dep.sha.slice(0, 7)}\`](${commit.html_url}) ${firstLine(commit.commit.message).slice(0, 100)}` }] : []),
      ...(branch ? [{ name: 'Branch', value: `\`${branch}\``, inline: true }] : []),
      ...(commit?.author?.login ? [{ name: 'Autor', value: who(commit.author.login, cfg), inline: true }] : []),
      ...(url && state === 'success' ? [{ name: 'URL', value: url }] : []),
    ],
    timestamp: ds.created_at,
  };
  await webhook(hooks.deploys, { username: 'Vercel', avatar_url: 'https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico', embeds: [embed] });

  if (failed && isProd) {
    await webhook(hooks.alertas, {
      content: `${roleMention('lead', 'dev')} 🚨 **Deploy de PRODUÇÃO falhou!**`,
      username: 'GitHub · Alertas',
      avatar_url: AVATAR,
      embeds: [embed],
      ...pings({ roles: ['lead', 'dev'] }),
    });
  } else if (failed && branch === 'development') {
    await webhook(hooks.alertas, { content: `🟡 Deploy de **desenvolvimento** falhou.`, username: 'GitHub · Alertas', avatar_url: AVATAR, embeds: [embed] });
  }

  // preview pronto → avisa no post do PR
  if (!isProd && state === 'success' && url) {
    const prs = await github(`/repos/${REPO}/commits/${dep.sha}/pulls`).catch(() => []);
    for (const pr of prs.filter((x) => x.state === 'open')) {
      const thread = await findThread(cfg.forums.prs, pr.number, cfg);
      if (thread && !thread.thread_metadata?.archived) await prPost(`🔍 **Preview pronto:** ${url}`, thread.id);
    }
  }
}

// ======================= COMMITS E RELEASES → #painel-github =======================

async function onPush(p) {
  const branch = p.ref.replace('refs/heads/', '');
  if (!BRANCHES.includes(branch) || !p.commits?.length) return;
  const lines = p.commits.slice(-10).map(
    (c) => `[\`${c.id.slice(0, 7)}\`](${c.url}) ${firstLine(c.message).slice(0, 80)} — ${c.author?.username ?? c.author?.name}`,
  );
  if (p.commits.length > 10) lines.unshift(`_…e mais ${p.commits.length - 10} commit(s)_`);
  await webhook(hooks.github, {
    username: 'GitHub',
    avatar_url: AVATAR,
    embeds: [{
      title: `📦 ${p.commits.length} commit(s) em ${branch}`,
      url: p.compare,
      color: branch === 'production' ? COLORS.green : COLORS.yellow,
      description: lines.join('\n'),
      footer: { text: `push por ${p.pusher?.name ?? p.sender.login}` },
      timestamp: p.head_commit?.timestamp,
    }],
  });
}

async function onRelease(p) {
  if (p.action !== 'published') return;
  const r = p.release;
  const info = releaseInfo(r);
  await webhook(hooks.github, {
    ...(info.mentionRoles.length ? { content: `${roleMention(...info.mentionRoles)} nova versão publicada em produção.` } : {}),
    username: 'GitHub',
    avatar_url: AVATAR,
    embeds: [{
      title: info.title,
      url: r.html_url,
      color: info.color,
      description: excerpt(r.body, 1500),
      footer: { text: `por ${r.author.login}` },
      timestamp: r.published_at,
    }],
    ...pings({ roles: info.mentionRoles }),
  });
}

// ======================= HEALTH (agendado) =======================

const STATE_FILE = '.health-state.json';

async function probe(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'cafebugado-healthcheck' } });
      if (res.ok) return { up: true, detail: `HTTP ${res.status}` };
      if (attempt === 1) return { up: false, detail: `HTTP ${res.status}` };
    } catch (e) {
      if (attempt === 1) return { up: false, detail: e.name === 'TimeoutError' ? 'timeout (10s)' : e.message };
    }
    await new Promise((r) => setTimeout(r, 20_000)); // confirma antes de alertar
  }
}

function minutesSince(iso) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

async function health() {
  const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
  let changed = false;
  for (const [env, url] of Object.entries(cfg.health)) {
    const now = new Date().toISOString();
    const res = await probe(url);
    const prev = state[env] ?? { up: true, since: now };
    console.log(`${env}: ${res.up ? 'UP' : 'DOWN'} (${res.detail})`);
    if (prev.up === res.up) continue;
    changed = true;
    state[env] = { up: res.up, since: now };
    const isProd = env === 'production';
    const name = isProd ? '🟢 PRODUÇÃO' : '🟡 DESENVOLVIMENTO';
    const content = res.up
      ? `✅ Painel de **${isProd ? 'produção' : 'desenvolvimento'}** voltou ao ar (ficou fora por ${minutesSince(prev.since)}).`
      : `${isProd ? roleMention('lead', 'dev') + ' ' : ''}🚨 Painel de **${isProd ? 'PRODUÇÃO' : 'desenvolvimento'}** fora do ar!`;
    await webhook(hooks.alertas, {
      content,
      username: 'Monitor · Health',
      avatar_url: AVATAR,
      embeds: res.up ? [] : [{
        title: `${name} · não responde`,
        url,
        color: isProd ? COLORS.red : COLORS.yellow,
        fields: [{ name: 'Resposta', value: res.detail, inline: true }, { name: 'URL', value: url }],
        timestamp: now,
      }],
      ...(isProd && !res.up ? pings({ roles: ['lead', 'dev'] }) : {}),
    });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}

// ======================= RESUMO SEMANAL =======================

async function weekly() {
  const since = new Date(Date.now() - 7 * 86400_000);
  const day = since.toISOString().slice(0, 10);
  const search = (q) => github(`/search/issues?q=${encodeURIComponent(`repo:${REPO} ${q}`)}&per_page=100`);
  const [merged, closed, opened, openPrs, deps] = await Promise.all([
    search(`is:pr is:merged merged:>=${day}`),
    search(`is:issue is:closed closed:>=${day}`),
    search(`is:issue created:>=${day}`),
    github(`/repos/${REPO}/pulls?state=open&per_page=100`),
    github(`/repos/${REPO}/deployments?environment=Production&per_page=100`),
  ]);
  const prodDeploys = deps.filter((d) => Date.parse(d.created_at) >= since.getTime()).length;
  const byAuthor = {};
  for (const pr of merged.items) if (pr.user.type !== 'Bot') byAuthor[pr.user.login] = (byAuthor[pr.user.login] ?? 0) + 1;
  const ranking = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).map(([l, n], i) => `${['🥇', '🥈', '🥉'][i] ?? '•'} ${who(l, cfg)} — ${n} PR(s)`);
  const waiting = openPrs.filter((pr) => !pr.draft && pr.requested_reviewers?.length);
  const list = (items) => fitField(items.map((i) => `[#${i.number}](${i.html_url}) ${i.title.slice(0, 60)}`));

  await webhook(hooks.geral, {
    username: 'GitHub · Resumo',
    avatar_url: AVATAR,
    embeds: [{
      title: '📊 Resumo semanal · Eventos Painel Admin',
      url: `https://github.com/${REPO}/pulse`,
      color: COLORS.blurple,
      description: `🟣 **${merged.total_count}** PR(s) com merge · ✅ **${closed.total_count}** issue(s) fechada(s) · 🆕 **${opened.total_count}** issue(s) nova(s) · 🚀 **${prodDeploys}** deploy(s) em produção`,
      fields: [
        { name: '🟣 Merges da semana', value: list(merged.items) },
        { name: '🏆 Quem mais contribuiu', value: fitField(ranking) },
        { name: `👀 Aguardando review (${waiting.length})`, value: list(waiting) },
      ],
      footer: { text: 'Últimos 7 dias' },
      timestamp: new Date().toISOString(),
    }],
  });
}

// ======================= DESPACHO =======================

const HANDLERS = {
  issues: onIssues,
  issue_comment: onIssueComment,
  pull_request_target: onPullRequest,
  pull_request: onPullRequest,
  pull_request_review: onReview,
  workflow_run: onWorkflowRun,
  deployment_status: onDeploymentStatus,
  push: onPush,
  release: onRelease,
};

try {
  const mode = process.argv[2];
  if (mode === 'health') await health();
  else if (mode === 'weekly') await weekly();
  else {
    const event = process.env.GITHUB_EVENT_NAME;
    const handler = HANDLERS[event];
    if (!handler) console.log(`Evento ${event} ignorado`);
    else await handler(JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')));
  }
} catch (e) {
  // Notificação nunca deve quebrar o fluxo do repositório: só registra um aviso.
  console.log(`::warning title=Discord::${e.message.replace(/\n/g, ' ')}`);
  console.error(e);
}
