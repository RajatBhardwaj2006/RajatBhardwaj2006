import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateLanguages, selectProjects, parseCalendar, parsePinned, request, paginate, collectProfile } from '../scripts/lib/github.mjs';
import { escapeXML, wrap, safeSocial, calendarSummary } from '../scripts/lib/render.mjs';

const repo = (name, overrides = {}) => ({ name, full_name: `dev/${name}`, language: 'Python', languages: { Python: 10 }, fork: false, private: false, archived: false, stargazers_count: 0, pushed_at: '2026-11-01T00:00:00Z', ...overrides });

test('project selection honours public pins, excludes forks, archives, and the profile, and fills remaining slots deterministically', () => {
  const repositories = [repo('dev'), repo('fork', { fork: true, stargazers_count: 999 }), repo('archived', { archived: true }), repo('secret', { private: true }), repo('pinned'), repo('popular', { stargazers_count: 7 }), repo('recent', { pushed_at: '2026-11-02T00:00:00Z' })];
  assert.deepEqual(selectProjects(repositories, ['dev/pinned', 'other/repo', 'dev/secret'], 'dev', 3).map(project => project.name), ['pinned', 'popular', 'recent']);
});

test('language shares count each original repository once and exclude forks and undetected languages', () => {
  const stats = aggregateLanguages([repo('one'), repo('two'), repo('three', { language: 'Java' }), repo('four'), repo('none', { language: null }), repo('fork', { fork: true, language: 'Rust' })]);
  assert.deepEqual(stats, [{ name: 'Python', repositories: 3, percent: 75 }, { name: 'Java', repositories: 1, percent: 25 }]);
});

function calendarHTML(missing = false) {
  return Array.from({ length: 365 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 10, 4 + index)).toISOString().slice(0, 10);
    return `<td data-date="${date}" id="day-${index}" class="ContributionCalendar-day" data-level="4"></td>${missing && index === 4 ? '' : `<tool-tip for="day-${index}">${index % 2 ? '1 contribution' : 'No contributions'} on a date.</tool-tip>`}`;
  }).join('');
}

test('calendar reads exact tooltip counts rather than approximating colour levels', () => {
  const calendar = parseCalendar(calendarHTML());
  assert.equal(calendar.days.length, 365);
  assert.equal(calendar.total, 182);
  assert.equal(calendar.days[0].count, 0);
});

test('calendar fails on missing daily counts and contradictory totals', () => {
  assert.throws(() => parseCalendar(calendarHTML(true)), /Missing exact/);
  assert.throws(() => parseCalendar(`<h2 id="js-contribution-activity-description">999 contributions</h2>${calendarHTML()}`), /does not match/);
  assert.throws(() => parseCalendar('GitHub is unavailable'), /complete public/);
});

test('pin fallback reads only actual repo anchors for the profile owner', () => {
  assert.deepEqual(parsePinned('<a href="/dev/one"><span class="repo">one</span></a><a href="/other/two"><span class="repo">two</span></a>', 'dev'), ['dev/one']);
});

test('API pagination follows every page and rejects external pagination URLs', async () => {
  const fetcher = async url => new Response(JSON.stringify(url.includes('page=2') ? [3] : [1, 2]), { headers: url.includes('page=2') ? {} : { link: '<https://api.github.com/list?page=2>; rel="next"' } });
  assert.deepEqual(await paginate('https://api.github.com/list', { fetcher }), [1, 2, 3]);
  await assert.rejects(() => paginate('https://api.github.com/list', { fetcher: async () => new Response('[]', { headers: { link: '<https://evil.example/list>; rel="next"' } }) }), /outside GitHub/);
});

test('tokens are only sent to the GitHub API and errors stop a sync', async () => {
  const seen = [];
  const fetcher = async (url, options) => { seen.push(options.headers); return new Response(url.includes('api.github') ? '{}' : '<html></html>'); };
  await request('https://api.github.com/users/dev', { token: 'test-token', fetcher });
  await request('https://github.com/dev', { token: 'test-token', json: false, fetcher });
  assert.equal(seen[0].Authorization, 'Bearer test-token');
  assert.equal(seen[1].Authorization, undefined);
  await assert.rejects(() => collectProfile({ username: 'dev' }, { fetcher: async () => new Response('rate limited', { status: 403 }) }), /403/);
});

test('API errors never become empty successful snapshots', async () => {
  await assert.rejects(() => paginate('https://api.github.com/list', { fetcher: async () => new Response('{}') }), /collection/);
  await assert.rejects(() => collectProfile({ username: '../bad' }), /Invalid GitHub username/);
});

test('public social links are validated and whitespace-damaged links are repaired', () => {
  assert.deepEqual(safeSocial({ social: [{ provider: 'linkedin', url: 'https://www.linkedin.com/in/ dev' }, { provider: 'custom', url: 'javascript:alert(1)' }, { provider: 'custom', url: 'https://leetcode.com/u/dev' }], user: { blog: '' } }), [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/dev' }, { label: 'LeetCode', url: 'https://leetcode.com/u/dev' }]);
});

test('text is escaped and long repository names cannot escape their text areas', () => {
  assert.equal(escapeXML('<script>"&'), '&lt;script&gt;&quot;&amp;');
  assert(wrap('a'.repeat(150), 32, 2).every(line => line.length <= 32));
});

test('calendar statistics measure the actual window without inventing a current streak', () => {
  assert.deepEqual(calendarSummary({ days: [0, 2, 1, 0, 5, 0].map((count, index) => ({ count, date: `2026-11-0${index + 1}` })) }), { active: 3, longest: 2, peak: 5 });
});

test('complete collection works with GraphQL and with its public HTML fallback', async t => {
  for (const fallback of [false, true]) {
    await t.test(fallback ? 'installation-token fallback' : 'GraphQL calendar and pins', async () => {
      const expected = parseCalendar(calendarHTML());
      const responses = new Map([
        ['https://api.github.com/users/dev', { login: 'dev', name: 'Dev', bio: 'Public biography', location: 'Earth', html_url: 'https://github.com/dev', blog: '', followers: 3, following: 2, public_repos: 1, created_at: '2025-01-01T00:00:00Z' }],
        ['https://api.github.com/users/dev/repos?per_page=100&type=owner&sort=full_name', [{ ...repo('pinned'), html_url: 'https://github.com/dev/pinned', owner: { login: 'dev' }, topics: [], forks_count: 0 }]],
        ['https://api.github.com/users/dev/social_accounts', []],
        ['https://api.github.com/graphql', fallback ? { errors: [{ message: 'Resource not accessible by integration' }] } : { data: { user: {
          pinnedItems: { nodes: [{ nameWithOwner: 'dev/pinned', isPrivate: false }, { nameWithOwner: 'dev/private-project', isPrivate: true }] },
          contributionsCollection: { contributionCalendar: { totalContributions: expected.total, weeks: [{ contributionDays: expected.days.map(day => ({ date: day.date, contributionCount: day.count })) }] } },
        } } }],
        ['https://github.com/dev', '<a href="/dev/pinned"><span class="repo">pinned</span></a>'],
        ['https://github.com/users/dev/contributions', calendarHTML()],
      ]);
      const fetcher = async (url, options) => {
        assert(responses.has(url), `Unexpected data request: ${url}`);
        const response = responses.get(url);
        if (url === 'https://api.github.com/graphql') assert.equal(JSON.parse(options.body).variables.login, 'dev');
        return new Response(typeof response === 'string' ? response : JSON.stringify(response));
      };
      const collected = await collectProfile({ username: 'dev' }, { token: 'test-only', fetcher, now: new Date('2026-11-03T09:00:00Z') });
      assert.equal(collected.repositories.length, 1);
      assert.equal(collected.calendar.total, 182);
      assert.equal(collected.calendar.days.length, 365);
      assert.deepEqual(collected.pinned, ['dev/pinned']);
      assert.equal(collected.fetchedAt, '2026-11-03T09:00:00.000Z');
      assert.equal(collected.sources.notices.length, fallback ? 1 : 0);
      assert(!JSON.stringify(collected).includes('private-project'));
      assert(!JSON.stringify(collected).includes('test-only'));
    });
  }
});
