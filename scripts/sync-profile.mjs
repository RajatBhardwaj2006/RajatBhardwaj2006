import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { collectProfile } from './lib/github.mjs';
import { renderProfile } from './lib/render.mjs';

const config = JSON.parse(await readFile(new URL('../profile.config.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url);
try {
  const snapshot = await collectProfile(config, { token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN });
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
