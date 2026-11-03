// Only public GitHub data is persisted. No token is ever written to disk.
export const API = 'https://api.github.com';

export async function request(url, { token, json = true, body, fetcher = fetch } = {}) {
  const target = new URL(url);
  if (!['https://api.github.com', 'https://github.com'].includes(target.origin)) {
    throw new Error('Refusing a request outside GitHub.');
  }
  const headers = { 'User-Agent': 'github-profile-observatory', Accept: json ? 'application/vnd.github+json' : 'text/html' };
  if (target.origin === API) {
    headers['X-GitHub-Api-Version'] = '2022-11-28';
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (body) headers['Content-Type'] = 'application/json';
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetcher(url, {
      headers, method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000), redirect: 'error',
    });
    if (response.status >= 500 && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
      continue;
    }
    if (!response.ok) {
      const reset = response.headers.get('x-ratelimit-reset');
      throw new Error(`GitHub returned ${response.status} for ${target.pathname}${reset ? `; rate-limit reset ${new Date(Number(reset) * 1000).toISOString()}` : ''}`);
    }
    return { data: json ? await response.json() : await response.text(), link: response.headers.get('link') };
  }
}

export async function paginate(url, options = {}) {
  const all = [];
  const seen = new Set();
  let next = url;
  while (next) {
    if (seen.has(next)) throw new Error('GitHub returned a circular pagination link.');
    seen.add(next);
    const { data, link } = await request(next, options);
    if (!Array.isArray(data)) throw new Error('Expected a GitHub collection.');
    all.push(...data);
    next = link?.match(/<([^>]+)>; rel="next"/)?.[1];
  }
  return all;
}

export function decodeHTML(value) {
  return value.replace(/&#x([0-9a-f]+);|&#(\d+);|&(amp|quot|apos|lt|gt);/gi, (match, hex, dec, name) => {
    if (hex || dec) return String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10));
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[name.toLowerCase()] || match;
  });
}

export function parsePinned(html, username) {
  const pins = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*<span class="repo">/g)]
    .map(match => decodeHTML(match[1]).replace(/^\//, ''))
    .filter(name => name.toLowerCase().startsWith(`${username.toLowerCase()}/`));
  return [...new Set(pins)];
}

// Public HTML is a fallback when GraphQL is unavailable with an installation token.
// Counts come from GitHub's exact day tooltips, never inferred from colour levels.
export function parseCalendar(html) {
  const tips = new Map([...html.matchAll(/<tool-tip\b[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g)]
    .map(([, id, label]) => [id, decodeHTML(label.replace(/<[^>]*>/g, '').trim())]));
  const days = [];
  for (const match of html.matchAll(/<td\b[^>]*class="[^"]*ContributionCalendar-day[^\"]*"[^>]*>/g)) {
    const tag = match[0];
    const date = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    if (!date || !id) continue;
    const label = tips.get(id);
    const count = label?.match(/^(No|[\d,]+) contributions? on /i)?.[1];
    if (!count) throw new Error(`Missing exact contribution count for ${date}.`);
    days.push({ date, count: count.toLowerCase() === 'no' ? 0 : Number(count.replaceAll(',', '')) });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 350 || new Set(days.map(day => day.date)).size !== days.length) {
    throw new Error('GitHub did not return a complete public contribution calendar.');
  }
  const total = html.match(/id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s+contributions/);
  const sum = days.reduce((value, day) => value + day.count, 0);
  if (total && Number(total[1].replaceAll(',', '')) !== sum) throw new Error('Contribution total does not match daily counts.');
  return { total: sum, days, source: 'GitHub public contribution calendar' };
}

export function selectProjects(repositories, pinned, username, count) {
  const eligible = repositories.filter(repo => !repo.private && !repo.fork && !repo.archived && repo.name.toLowerCase() !== username.toLowerCase());
  const byName = new Map(eligible.map(repo => [repo.full_name.toLowerCase(), repo]));
  const chosen = pinned.map(name => byName.get(name.toLowerCase())).filter(Boolean);
  const ranked = [...eligible].sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at) || a.name.localeCompare(b.name));
  return [...new Map([...chosen, ...ranked].map(repo => [repo.full_name, repo])).values()].slice(0, count);
}

export function aggregateLanguages(repositories) {
  const totals = new Map();
  for (const repo of repositories.filter(repo => !repo.fork && repo.language)) {
    totals.set(repo.language, (totals.get(repo.language) || 0) + 1);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, repositories]) => ({ name, repositories, percent: total ? repositories / total * 100 : 0 }));
}

export async function collectProfile(config, { token, fetcher = fetch, now = new Date() } = {}) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(config.username)) throw new Error('Invalid GitHub username.');
  const username = config.username;
  const options = { token, fetcher };
  const [userResponse, rawRepositories, socialResponse] = await Promise.all([
    request(`${API}/users/${username}`, options),
    paginate(`${API}/users/${username}/repos?per_page=100&type=owner&sort=full_name`, options),
    request(`${API}/users/${username}/social_accounts`, options),
  ]);
  const user = userResponse.data;
  const repositories = rawRepositories.filter(repo => !repo.private && repo.owner.login.toLowerCase() === username.toLowerCase()).map(repo => {
    return {
      name: repo.name, full_name: repo.full_name, html_url: repo.html_url,
      description: repo.description, language: repo.language,
      topics: repo.topics || [], stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count, pushed_at: repo.pushed_at,
      archived: repo.archived, fork: repo.fork, private: false,
    };
  });
  let pinned = [], calendar = null;
  const notices = [];
  if (token) {
    try {
      const { data } = await request(`${API}/graphql`, { ...options, body: {
        query: `query($login:String!) { user(login:$login) { pinnedItems(first:6, types:REPOSITORY) { nodes { ... on Repository { nameWithOwner isPrivate } } } contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`,
        variables: { login: username },
      } });
      if (data.errors || !data.data?.user) throw new Error('GraphQL profile fields unavailable.');
      pinned = data.data.user.pinnedItems.nodes.filter(repo => !repo.isPrivate).map(repo => repo.nameWithOwner);
      const source = data.data.user.contributionsCollection.contributionCalendar;
      calendar = { total: source.totalContributions, days: source.weeks.flatMap(week => week.contributionDays.map(day => ({ date: day.date, count: day.contributionCount }))), source: 'GitHub GraphQL contribution calendar' };
    } catch {
      notices.push('GraphQL unavailable; used public GitHub HTML for pins and contributions.');
    }
  }
  if (!pinned.length) {
    try { pinned = parsePinned((await request(`https://github.com/${username}`, { fetcher, json: false })).data, username); }
    catch { notices.push('Pins unavailable; projects ranked by stars, then latest push.'); }
  }
  if (!calendar) {
    calendar = parseCalendar((await request(`https://github.com/users/${username}/contributions`, { fetcher, json: false })).data);
  }
  // A complete snapshot is mandatory: network failures never produce fake zeros.
  return {
    schemaVersion: 1, fetchedAt: now.toISOString(),
    sources: { profile: `${API}/users/${username}`, repositories: `${API}/users/${username}/repos`, languages: 'GitHub REST primary repository language, one repository per observation', calendar: calendar.source, notices },
    user: { login: user.login, name: user.name || user.login, bio: user.bio || '', location: user.location || '', html_url: user.html_url, blog: user.blog || '', followers: user.followers, following: user.following, public_repos: user.public_repos, created_at: user.created_at },
    social: socialResponse.data.map(({ provider, url }) => ({ provider, url })),
    repositories, pinned, calendar,
  };
}
