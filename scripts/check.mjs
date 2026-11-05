import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { readme, resolveRepositoriesAndProjects } from './lib/render.mjs';
import { aggregateLanguages } from './lib/github.mjs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('data/profile.json', root), 'utf8'));
const config = JSON.parse(await readFile(new URL('profile.config.json', root), 'utf8'));
assert.equal(data.schemaVersion, 1);
assert.equal(data.user.login.toLowerCase(), config.username.toLowerCase());
assert(Number.isFinite(Date.parse(data.fetchedAt)), 'Snapshot timestamp is required.');
assert(data.calendar.days.length >= 350, 'A complete contribution calendar is required.');
assert.equal(new Set(data.calendar.days.map(day => day.date)).size, data.calendar.days.length);
assert.equal(data.calendar.total, data.calendar.days.reduce((sum, day) => sum + day.count, 0), 'Contribution totals must match daily counts.');
for (const [index, day] of data.calendar.days.entries()) {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(day.date));
  assert(Number.isInteger(day.count) && day.count >= 0);
  if (index) assert.equal(Date.parse(day.date) - Date.parse(data.calendar.days[index - 1].date), 86_400_000, 'Calendar dates must be continuous.');
}
for (const repo of data.repositories) {
  assert(!repo.private, 'Only public repositories may be published.');
  assert(repo.full_name.toLowerCase().startsWith(`${config.username.toLowerCase()}/`));
  assert.equal(repo.html_url, `https://github.com/${repo.full_name}`);
  assert(repo.language === null || typeof repo.language === 'string');
}
const { allRepos, projects } = resolveRepositoriesAndProjects(data, config);
const snapshotWithRepos = { ...data, repositories: allRepos };
const markdown = (await readFile(new URL('README.md', root), 'utf8')).replace(/\r\n/g, '\n');
assert.equal(markdown, readme(snapshotWithRepos, config, projects).replace(/\r\n/g, '\n'), 'README must match the current snapshot and generator.');
const names = await readdir(new URL('assets/generated/', root));
for (const name of names) {
  assert(name.endsWith('.svg'));
  const source = await readFile(new URL(`assets/generated/${name}`, root), 'utf8');
  assert(source.includes('<title') && source.includes('<desc'), `${name} needs an accessible description.`);
  assert(!/<script|foreignObject|(?:href|src)\s*=|on(?:load|error|click)\s*=/i.test(source), `${name} must be a self-contained SVG image.`);
  assert(!/NaN|Infinity|undefined/.test(source), `${name} contains an invalid value.`);
  assert(Buffer.byteLength(source) < 1_000_000, `${name} is too large.`);
  assert(!source.includes('—'), `${name} contains an unexpected em dash.`);
}
for (const match of markdown.matchAll(/(?:src|srcset)="(assets\/generated\/[^"]+)"/g)) await readFile(new URL(match[1], root));
assert(aggregateLanguages(snapshotWithRepos.repositories).every(language => language.percent >= 0 && language.percent <= 100));
console.log(`Verified ${names.length} standalone SVGs, ${projects.length} project links, ${snapshotWithRepos.repositories.length} repositories, and ${data.calendar.days.length} exact contribution days.`);
