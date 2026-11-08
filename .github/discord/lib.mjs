// Utilitários compartilhados da integração GitHub → Discord.
// Sem dependências: roda com o Node do runner (fetch nativo).

export const DISCORD_API = 'https://discord.com/api/v10';

/** Configuração não secreta (IDs de canais, tags, cargos, mapa de usuários). */
export function loadConfig(env = process.env) {
  if (!env.DISCORD_CONFIG) throw new Error('Variável DISCORD_CONFIG ausente');
  return JSON.parse(env.DISCORD_CONFIG);
}

export function loadWebhooks(env = process.env) {
  if (!env.DISCORD_WEBHOOKS) throw new Error('Segredo DISCORD_WEBHOOKS ausente');
  return JSON.parse(env.DISCORD_WEBHOOKS);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(url, init, label) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      await sleep(Math.ceil((data.retry_after ?? 1) * 1000) + 100);
      continue;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {}
    if (!res.ok) throw new Error(`${label} ${res.status}: ${text.slice(0, 500)}`);
    return data;
  }
  throw new Error(`${label}: rate limit`);
}

/** Chamada à API do Discord com o token do bot "Café Bugado · GitHub". */
export function discord(method, path, body, env = process.env) {
  return request(
    DISCORD_API + path,
    {
      method,
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (cafebugado-github, 1.0)',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    `Discord ${method} ${path}`,
  );
}

/** Envia por webhook. Com threadId, posta dentro do post do fórum. */
export function webhook(url, body, { threadId, wait = true } = {}) {
  const u = new URL(url);
  if (wait) u.searchParams.set('wait', 'true');
  if (threadId) u.searchParams.set('thread_id', threadId);
  return request(
    u,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed_mentions: { parse: [] }, ...body }),
    },
    'Webhook POST',
  );
}

/** Edita a mensagem inicial de um post (no fórum, o ID dela = ID do post). */
export function webhookEdit(url, messageId, body, { threadId } = {}) {
  const u = new URL(`${url}/messages/${messageId}`);
  if (threadId) u.searchParams.set('thread_id', threadId);
  return request(
    u,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    'Webhook PATCH',
  );
}

/** Chamada à API do GitHub com o GITHUB_TOKEN do workflow. */
export function github(path, env = process.env) {
  const base = path.startsWith('http') ? '' : 'https://api.github.com';
  return request(
    base + path,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'cafebugado-discord-notify',
      },
    },
    `GitHub ${path}`,
  );
}

// ---------- Formatação ----------

/** Menciona no Discord se o login estiver no mapa; senão, mostra o login. */
export function who(login, cfg) {
  if (!login) return 'alguém';
  const id = cfg.users?.[login];
  return id ? `<@${id}>` : `**${login}**`;
}

export function mentionIds(logins, cfg) {
  return logins.map((l) => cfg.users?.[l]).filter(Boolean);
}

/**
 * Remove comentários HTML (instruções dos templates de issue/PR).
 * Repete até não sobrar nenhum "<!--", inclusive os formados pela remoção.
 * Comentário sem fechamento: descarta o resto, como o GitHub faz ao renderizar.
 */
export function stripHtmlComments(text) {
  let s = text;
  for (;;) {
    const start = s.indexOf('<!--');
    if (start === -1) return s;
    const end = s.indexOf('-->', start + 4);
    s = end === -1 ? s.slice(0, start) : s.slice(0, start) + s.slice(end + 3);
  }
}

export function excerpt(body, max = 700) {
  const clean = stripHtmlComments(body ?? '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!clean) return '_Sem descrição._';
  return clean.length > max ? clean.slice(0, max).replace(/\s+\S*$/, '') + ' …' : clean;
}

/** Junta linhas sem passar do limite de 1024 caracteres de um campo de embed. */
export function fitField(lines, max = 1024) {
  const out = [];
  let size = 0;
  for (let i = 0; i < lines.length; i++) {
    const rest = lines.length - i;
    const more = `_…e mais ${rest}_`;
    if (size + lines[i].length + 1 + (rest > 1 ? more.length + 1 : 0) > max) {
      out.push(more);
      break;
    }
    out.push(lines[i]);
    size += lines[i].length + 1;
  }
  return out.join('\n') || '—';
}

export const firstLine =(s) => (s ?? '').split('\n')[0];
export const threadName = (number, title) => `#${number} · ${title}`.slice(0, 100);

export const COLORS = {
  green: 0x2ecc71,
  red: 0xe74c3c,
  orange: 0xe67e22,
  yellow: 0xf1c40f,
  gray: 0x95a5a6,
  purple: 0x8e44ad,
  blue: 0x3498db,
  blurple: 0x5865f2,
};

/**
 * Como anunciar uma release no #api-github: pré-release (development) sai em
 * amarelo e sem ping; release estável (production) sai em roxo e marca o @Lead.
 */
export function releaseInfo(release) {
  const name = release.name || release.tag_name;
  return release.prerelease
    ? { title: `🧪 Pré-release ${name}`, color: COLORS.yellow, mentionRoles: [] }
    : { title: `🏷️ Release ${name}`, color: COLORS.purple, mentionRoles: ['lead'] };
}

// ---------- Tags ----------

const ISSUE_LABEL_TAG = {
  bug: 'bug',
  enhancement: 'melhoria',
  security: 'segurança',
  performance: 'performance',
  infra: 'infra',
  ci: 'CI',
  tests: 'testes',
  documentation: 'docs',
  dependencies: 'dependências',
  'needs-decision': 'precisa decidir',
  'good first issue': 'bom p/ iniciantes',
  tracking: 'acompanhamento',
  'help wanted': 'precisa de ajuda',
  question: 'dúvida',
  github_actions: 'CI',
};

/** Nomes das tags do fórum #api-tarefas para uma issue (máx. 5). */
export function issueTagNames(issue) {
  const labels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
  const out = [];
  if (issue.state === 'closed') out.push('Fechada');
  else if (issue.assignees?.length) out.push('Em andamento');
  for (const p of ['P0', 'P1', 'P2', 'P3']) if (labels.includes(p)) out.push(p);
  for (const l of labels) if (ISSUE_LABEL_TAG[l]) out.push(ISSUE_LABEL_TAG[l]);
  return [...new Set(out)].slice(0, 5);
}

/** Status de um PR a partir dos reviews (último review de cada pessoa vale). */
export function prStatus(pr, reviews = []) {
  if (pr.merged || pr.merged_at) return 'Merged';
  if (pr.state === 'closed') return 'Fechado';
  if (pr.draft) return 'Rascunho';
  const latest = new Map();
  for (const r of reviews) {
    if (!r.user || r.state === 'COMMENTED' || r.state === 'PENDING') continue;
    latest.set(r.user.login, r.state);
  }
  const states = [...latest.values()];
  if (states.includes('CHANGES_REQUESTED')) return 'Mudanças pedidas';
  if (states.includes('APPROVED')) return 'Aprovado';
  return 'Aguardando review';
}

/** Nomes das tags do fórum #api-prs. `ci` = 'CI passou' | 'CI falhou' | null. */
export function prTagNames(pr, status, ci = null) {
  const out = [status];
  if (ci) out.push(ci);
  if (pr.base?.ref === 'production') out.push('→ production');
  else if (pr.base?.ref === 'development') out.push('→ development');
  if (pr.head?.ref?.startsWith('hotfix/')) out.push('hotfix');
  if (pr.user?.login === 'dependabot[bot]') out.push('dependabot');
  return out.slice(0, 5);
}

export function tagIds(names, forum) {
  return names.map((n) => forum.tags[n]).filter(Boolean);
}

export function tagNamesFromIds(ids, forum) {
  const byId = Object.fromEntries(Object.entries(forum.tags).map(([n, id]) => [id, n]));
  return ids.map((id) => byId[id]).filter(Boolean);
}

// ---------- Posts de fórum ----------

/** Procura o post "#N · ..." no fórum (ativos e arquivados). */
export async function findThread(forum, number, cfg, env = process.env) {
  const prefix = `#${number} ·`;
  const active = await discord('GET', `/guilds/${cfg.guild}/threads/active`, undefined, env);
  const hit = active.threads.find((t) => t.parent_id === forum.id && t.name.startsWith(prefix));
  if (hit) return hit;
  let before;
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ limit: '100' });
    if (before) q.set('before', before);
    const res = await discord('GET', `/channels/${forum.id}/threads/archived/public?${q}`, undefined, env);
    const found = res.threads.find((t) => t.name.startsWith(prefix));
    if (found) return found;
    if (!res.has_more || !res.threads.length) return null;
    before = res.threads.at(-1).thread_metadata.archive_timestamp;
  }
  return null;
}

/** Atualiza nome/tags/arquivamento de um post. */
export function updateThread(threadId, patch, env = process.env) {
  return discord('PATCH', `/channels/${threadId}`, patch, env);
}
