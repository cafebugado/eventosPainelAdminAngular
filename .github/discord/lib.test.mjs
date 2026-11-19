// Testes das regras puras da integração. Rodar: node --test .github/discord/lib.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueTagNames, prStatus, prTagNames, who, excerpt, threadName, tagIds, tagNamesFromIds } from './lib.mjs';

const cfg = { users: { darioreisjr: '1' } };

test('tags de issue: status, prioridade e tipo (máx. 5)', () => {
  const issue = { state: 'open', assignees: [{ login: 'x' }], labels: [{ name: 'enhancement' }, { name: 'P1' }, { name: 'security' }, { name: 'needs-decision' }, { name: 'ci' }] };
  assert.deepEqual(issueTagNames(issue), ['Em andamento', 'P1', 'melhoria', 'segurança', 'precisa decidir']);
  assert.deepEqual(issueTagNames({ state: 'closed', assignees: [{}], labels: ['bug'] }), ['Fechada', 'bug']);
  assert.deepEqual(issueTagNames({ state: 'open', assignees: [], labels: [] }), []);
});

test('status do PR considera o último review de cada pessoa', () => {
  const pr = { state: 'open', draft: false };
  assert.equal(prStatus(pr, []), 'Aguardando review');
  assert.equal(prStatus(pr, [{ user: { login: 'a' }, state: 'CHANGES_REQUESTED' }, { user: { login: 'a' }, state: 'APPROVED' }]), 'Aprovado');
  assert.equal(prStatus(pr, [{ user: { login: 'a' }, state: 'APPROVED' }, { user: { login: 'b' }, state: 'CHANGES_REQUESTED' }]), 'Mudanças pedidas');
  assert.equal(prStatus(pr, [{ user: { login: 'a' }, state: 'APPROVED' }, { user: { login: 'a' }, state: 'COMMENTED' }]), 'Aprovado');
  assert.equal(prStatus({ ...pr, draft: true }), 'Rascunho');
  assert.equal(prStatus({ state: 'closed', merged_at: '2026-01-01' }), 'Merged');
  assert.equal(prStatus({ state: 'closed', merged_at: null }), 'Fechado');
});

test('tags do PR: base, hotfix e dependabot', () => {
  const pr = { base: { ref: 'production' }, head: { ref: 'hotfix/x' }, user: { login: 'dependabot[bot]' } };
  assert.deepEqual(prTagNames(pr, 'Aprovado', 'CI passou'), ['Aprovado', 'CI passou', '→ production', 'hotfix', 'dependabot']);
  assert.deepEqual(prTagNames({ base: { ref: 'development' }, head: { ref: 'feat/a' }, user: { login: 'x' } }, 'Rascunho'), ['Rascunho', '→ development']);
});

test('menção só para quem está no mapa', () => {
  assert.equal(who('darioreisjr', cfg), '<@1>');
  assert.equal(who('jorgekazuo', cfg), '**jorgekazuo**');
});

test('formatação', () => {
  assert.equal(excerpt('<!-- oculto -->\n\nOlá\n\n\n\nmundo'), 'Olá\n\nmundo');
  assert.equal(excerpt(''), '_Sem descrição._');
  assert.ok(excerpt('palavra '.repeat(200), 50).endsWith(' …'));
  assert.equal(threadName(31, 'x'.repeat(200)).length, 100);
  const forum = { tags: { Aprovado: '10', 'CI falhou': '11' } };
  assert.deepEqual(tagIds(['Aprovado', 'inexistente'], forum), ['10']);
  assert.deepEqual(tagNamesFromIds(['11'], forum), ['CI falhou']);
});

test('campo de embed nunca passa de 1024 caracteres', async () => {
  const { fitField } = await import('./lib.mjs');
  const lines = Array.from({ length: 30 }, (_, i) => `[#${i}](https://github.com/cafebugado/backendeventos-public-api/pull/${i}) ${'x'.repeat(60)}`);
  const out = fitField(lines);
  assert.ok(out.length <= 1024, `tamanho ${out.length}`);
  assert.match(out, /…e mais \d+/);
  assert.equal(fitField([]), '—');
  assert.equal(fitField(['a', 'b']), 'a\nb');
});

test('remove comentários HTML, inclusive aninhados e sem fechamento', async () => {
  const { stripHtmlComments } = await import('./lib.mjs');
  assert.equal(stripHtmlComments('a<!-- x -->b'), 'ab');
  assert.equal(stripHtmlComments('<!<!-- x -->-- y -->z'), 'z');
  assert.equal(stripHtmlComments('a<!-- sem fim'), 'a');
  assert.ok(!stripHtmlComments('<!<!--<!-- -->-->--').includes('<!--'));
  assert.equal(stripHtmlComments('Array<string> e x --> y'), 'Array<string> e x --> y');
});

test('release: pré-release sem ping, estável marca o Lead', async () => {
  const { releaseInfo, COLORS } = await import('./lib.mjs');
  assert.deepEqual(releaseInfo({ tag_name: 'v0.1.0-dev.1', name: 'v0.1.0-dev.1', prerelease: true }), {
    title: '🧪 Pré-release v0.1.0-dev.1',
    color: COLORS.yellow,
    mentionRoles: [],
  });
  assert.deepEqual(releaseInfo({ tag_name: 'v0.1.0', name: '', prerelease: false }), {
    title: '🏷️ Release v0.1.0',
    color: COLORS.purple,
    mentionRoles: ['lead'],
  });
});

test('labels do painel viram tags', () => {
  const issue = { state: 'open', assignees: [], labels: [{ name: 'help wanted' }, { name: 'question' }, { name: 'documentation' }] };
  assert.deepEqual(issueTagNames(issue), ['precisa de ajuda', 'dúvida', 'docs']);
});
