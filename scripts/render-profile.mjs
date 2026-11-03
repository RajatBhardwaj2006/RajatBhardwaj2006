import { readFile } from 'node:fs/promises';
import { renderProfile } from './lib/render.mjs';

const root = new URL('../', import.meta.url);
const snapshot = JSON.parse(await readFile(new URL('data/profile.json', root), 'utf8'));
const config = JSON.parse(await readFile(new URL('profile.config.json', root), 'utf8'));
await renderProfile(snapshot, config, root);
console.log(`Rendered profile from the GitHub snapshot fetched ${snapshot.fetchedAt}.`);
