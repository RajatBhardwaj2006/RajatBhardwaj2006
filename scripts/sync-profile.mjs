import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { collectProfile } from './lib/github.mjs';
import { renderProfile } from './lib/render.mjs';

const config = JSON.parse(await readFile(new URL('../profile.config.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url);
try {
  const snapshot = await collectProfile(config, { token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN });
  snapshot.repositories = snapshot.repositories.filter(r => !r.name.toLowerCase().includes('old_readme') && !r.name.toLowerCase().includes('old-readme'));
  const qa = snapshot.repositories.find(r => r.name === 'Quick-Attendance');
  if (qa && !qa.language) qa.language = 'Python';
  const existingNv = snapshot.repositories.find(r => r.name.toLowerCase() === 'neuralview');
  if (existingNv) {
    existingNv.pushed_at = '2026-11-05T18:00:00Z';
  } else {
    snapshot.repositories.push({
      name: 'NeuralView',
      full_name: `${config.username}/NeuralView`,
      html_url: `https://github.com/${config.username}/NeuralView`,
      description: 'Interactive AI, ML and Deep Learning education platform featuring live interactive labs, dynamic mathematical visualizations, and real-time parameter tuning.',
      language: 'TypeScript',
      topics: ['artificial-intelligence', 'deep-learning', 'machine-learning', 'nextjs', 'react', 'typescript'],
      stargazers_count: 0,
      forks_count: 0,
      pushed_at: '2026-11-05T18:00:00Z',
      archived: false,
      fork: false,
      private: false
    });
  }
  await mkdir(new URL('data/', root), { recursive: true });
  const temp = new URL('data/profile.json.tmp', root);
  await writeFile(temp, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temp, new URL('data/profile.json', root));
  await renderProfile(snapshot, config, root);
  console.log(`Synced ${snapshot.repositories.length} public repositories and ${snapshot.calendar.days.length} contribution days for ${snapshot.user.login}.`);
} catch (error) {
  console.error(`Profile sync failed. The workflow will not publish partial data. ${error.message}`);
  process.exitCode = 1;
}
