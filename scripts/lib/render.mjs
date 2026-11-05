import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { selectProjects, aggregateLanguages } from './github.mjs';

export const escapeXML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
export const escapeMD = value => String(value ?? '').replace(/[\\`*_[\]<>|]/g, char => `\\${char}`).replace(/[\r\n]+/g, ' ');
const clean = value => String(value ?? '').replace(/[—–]/g, ',').replace(/\s+/g, ' ').trim();
const n = value => Number(value.toFixed(2));
const format = value => new Intl.NumberFormat('en-US').format(value);
const dateLabel = value => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const C = { bg: '#111411', panel: '#161b16', line: '#30382f', muted: '#a4afa1', text: '#f3f6ef', accent: '#c5f277' };

export function wrap(value, maxChars, maxLines = Infinity) {
  const words = clean(value).split(' ').flatMap(word => {
    if (word.length <= maxChars) return [word];
    return word.match(new RegExp(`.{1,${maxChars}}`, 'gu')) || [];
  });
  const lines = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= maxChars) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  if (lines.length > maxLines) return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].slice(0, maxChars - 1).trimEnd()}…`];
  return lines;
}

const text = (x, y, content, attrs = '') => `<text x="${x}" y="${y}" ${attrs}>${escapeXML(content)}</text>`;
const lines = (x, y, content, width, max, size = 20, color = C.muted, lineHeight = 29) => wrap(content, width, max)
  .map((line, index) => text(x, y + index * lineHeight, line, `font-size="${size}" fill="${color}"`)).join('');
const mono = (x, y, content, color = C.muted, size = 14) => text(x, y, content, `font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="${size}" fill="${color}"`);
const rule = (x1, y1, x2, y2, color = C.line) => `<path d="M${x1} ${y1}H${x2}" stroke="${color}"/>`;

function svg(title, description, width, height, content, accent) {
  if (accent && !/^#[\da-f]{6}$/i.test(accent)) throw new Error('Accent must be a six-digit hex colour.');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXML(clean(title))}</title><desc id="desc">${escapeXML(clean(description))}</desc>
<style>
text{font-family:Arial,Helvetica,sans-serif;font-kerning:normal} .still{display:none}
@keyframes drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes sweep{from{stroke-dashoffset:0}to{stroke-dashoffset:-180}}
@keyframes breathe{0%,100%{opacity:.45}50%{opacity:1}}
.float{animation:drift 9s ease-in-out infinite}.flow{animation:sweep 14s linear infinite}.pulse{animation:breathe 6s ease-in-out infinite}
@media(prefers-reduced-motion:reduce){.motion{display:none}.still{display:inline}.float,.flow,.pulse{animation:none}}
</style>
<rect width="${width}" height="${height}" rx="4" fill="${C.bg}"/>
${content}
</svg>\n`.replaceAll(C.accent, accent || C.accent);
}

function project3D([x, y, z], phase = 0) {
  const a = -.48 + phase, b = .72;
  const xx = x * Math.cos(a) + z * Math.sin(a);
  const zz = -x * Math.sin(a) + z * Math.cos(a);
  const yy = y * Math.cos(b) - zz * Math.sin(b);
  const depth = y * Math.sin(b) + zz * Math.cos(b);
  const perspective = 4.8 / (4.8 - depth);
  return [n(xx * 123 * perspective + 920), n(yy * 123 * perspective + 245), depth];
}

function torus(u, v) {
  const r = 1.17 + .14 * Math.cos(u * 3);
  const t = .43;
  return [(r + t * Math.cos(v)) * Math.cos(u), (r + t * Math.cos(v)) * Math.sin(u), t * Math.sin(v) + .2 * Math.sin(u * 3)];
}
const pathFor = points => points.map((p, index) => `${index ? 'L' : 'M'}${p[0]},${p[1]}`).join('') + 'Z';

function manifold(animated = true) {
  const slices = 48, sides = 10;
  const faces = [];
  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < sides; j++) {
      const points = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([u, v]) => torus(u / slices * Math.PI * 2, v / sides * Math.PI * 2));
      const projected = points.map(point => project3D(point));
      const depth = projected.reduce((sum, point) => sum + point[2], 0) / 4;
      const light = Math.round(21 + (Math.cos(j / sides * Math.PI * 2 - 1.2) + 1) * 19 + (Math.sin(i / slices * Math.PI * 2) + 1) * 5);
      const fill = `hsl(85 51% ${light}%)`;
      const poses = [-.10, 0, .10, 0, -.10].map(phase => pathFor(points.map(point => project3D(point, phase))));
      faces.push({ depth, markup: `<path d="${animated ? poses[0] : pathFor(projected)}" fill="${fill}" stroke="#bded7a" stroke-opacity=".24" stroke-width=".65" stroke-linejoin="round">${animated ? `<animate attributeName="d" values="${poses.join(';')}" dur="16s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.25;.5;.75;1" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/>` : ''}</path>` });
    }
  }
  // The geometry is projected in 3D at build time. Slow vertical motion works in img embeds.
  return `<g class="${animated ? 'float' : ''}">${faces.sort((a, b) => a.depth - b.depth).map(face => face.markup).join('')}</g>`;
}

function hero(snapshot, config, mobile = false) {
  const { user } = snapshot;
  const parts = clean(user.name).split(' ');
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : user.name;
  const last = parts.length > 1 ? parts.at(-1) : '';
  const bio = clean(user.bio).replace(new RegExp(`^${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[,|:-]?\\s*`, 'i'), '');
  const nameSize = Math.min(100, Math.floor(570 / (Math.max(first.length, last.length + 1) * .59)));
  let body = `${mono(64, 62, `@${user.login}`, C.accent, 16)}
${text(59, 174, first, `font-size="${nameSize}" font-weight="700" letter-spacing="-6" fill="${C.text}"`)}
${text(59, 274, last ? `${last}.` : '', `font-size="${nameSize}" font-weight="700" letter-spacing="-6" fill="${C.text}"`)}
${lines(64, 336, bio, 48, 3, 22, C.muted, 31)}
${rule(64, 442, 640, 442)}${mono(64, 478, user.location || 'On GitHub', C.muted, 15)}
<defs><radialGradient id="halo"><stop stop-color="#c5f277" stop-opacity=".08"/><stop offset="1" stop-color="#c5f277" stop-opacity="0"/></radialGradient></defs>
<circle cx="920" cy="245" r="255" fill="url(#halo)"/>
<ellipse cx="920" cy="250" rx="241" ry="191" fill="none" stroke="${C.line}" transform="rotate(-24 920 250)"/>
<ellipse cx="920" cy="250" rx="250" ry="65" fill="none" stroke="${C.line}" transform="rotate(-24 920 250)"/>
<g class="motion">${manifold(true)}</g><g class="still">${manifold(false)}</g>
<path class="flow" d="M716 338C695 212 793 63 978 61" fill="none" stroke="${C.accent}" stroke-width="1.3" stroke-dasharray="12 168" opacity=".75"/>
${mono(831, 494, 'Learning, in motion.', C.muted, 15)}`;
  if (mobile) {
    body = `${mono(32, 48, `@${user.login}`, C.accent, 18)}
${text(29, 132, first, `font-size="${Math.min(nameSize, 74)}" font-weight="700" letter-spacing="-4" fill="${C.text}"`)}
${text(29, 210, last ? `${last}.` : '', `font-size="${Math.min(nameSize, 74)}" font-weight="700" letter-spacing="-4" fill="${C.text}"`)}
${lines(32, 258, bio, 39, 3, 20, C.muted, 29)}
<g transform="translate(-510 300) scale(.87)"><g class="motion">${manifold(true)}</g><g class="still">${manifold(false)}</g></g>
${mono(32, 790, user.location || 'On GitHub', C.muted, 17)}`;
  }
  return svg(user.name, `${user.name}. ${user.bio}. A sculptural three-dimensional manifold moves gently beside the profile.`, mobile ? 560 : 1200, mobile ? 826 : 520, body, config.accent);
}

function metrics(snapshot, config, mobile = false) {
  const metrics = [[snapshot.user.public_repos, 'Public repositories'], [snapshot.calendar.total, 'Contributions / past year'], [snapshot.user.followers, 'GitHub followers'], [snapshot.repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0), 'Stars across public repos']];
  const body = mobile ? metrics.map(([value, label], index) => {
    const x = 28 + index % 2 * 280, y = 68 + Math.floor(index / 2) * 138;
    return `${text(x, y, format(value), `font-size="48" font-weight="600" letter-spacing="-2" fill="${index === 1 ? C.accent : C.text}"`)}${text(x, y + 32, label, `font-size="15" fill="${C.muted}"`)}`;
  }).join('') :
    metrics.map(([value, label], index) => `${index ? `<path d="M${index * 300} 32V132" stroke="${C.line}"/>` : ''}${text(36 + index * 300, 89, format(value), `font-size="48" font-weight="600" letter-spacing="-2" fill="${index === 1 ? C.accent : C.text}"`)}${text(36 + index * 300, 126, label, `font-size="16" fill="${C.muted}"`)}`).join('');
  return svg('GitHub at a glance', metrics.map(([value, label]) => `${format(value)} ${label}`).join('. '), mobile ? 560 : 1200, mobile ? 280 : 164, body, config.accent);
}

function projectArt(index, repo) {
  const seed = [...repo.name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  if (index % 4 === 0) {
    return `<g transform="translate(384 76)" fill="none" stroke="${C.accent}" stroke-width=".9" opacity=".7">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="0" cy="0" rx="${16 + i * 8}" ry="${48 - i * 3}" transform="rotate(${i * 12 - 45})"/>`).join('')}</g>`;
  }
  if (index % 4 === 1) {
    return `<g transform="translate(315 18)" stroke="${C.accent}" stroke-width=".8" fill="none" opacity=".65">${Array.from({ length: 7 }, (_, i) => `<path d="M${i * 17} 24L${i * 17 + 45} 0L${i * 17 + 45} 92L${i * 17} 116Z"/>`).join('')}</g>`;
  }
  if (index % 4 === 2) {
    return `<g stroke="${C.accent}" fill="none" opacity=".65">${Array.from({ length: 10 }, (_, row) => {
      const pts = Array.from({ length: 28 }, (_, i) => `${n(301 + i * 6)},${n(38 + row * 7 + Math.sin(i * .48 + row * .32 + seed) * 14)}`).join(' ');
      return `<polyline points="${pts}" stroke-width=".8"/>`;
    }).join('')}</g>`;
  }
  return `<g transform="translate(382 72)" stroke="${C.accent}" stroke-width="1" fill="none" opacity=".65">${Array.from({ length: 7 }, (_, i) => `<rect x="${-42 + i * 3}" y="${-42 + i * 3}" width="${84 - i * 6}" height="${84 - i * 6}" transform="rotate(${i * 11})"/>`).join('')}</g>`;
}

function projectCard(repo, index, config, mobile = false) {
  const title = repo.name.replaceAll(/[-_]+/g, ' ').trim();
  const desc = repo.description || 'Explore the source, documentation, and latest changes on GitHub.';
  const topics = wrap(repo.topics.length ? repo.topics.slice(0, 3).join(' / ') : repo.language || 'Public source', 66, 1)[0];
  const art = `<g class="float" style="animation-duration:${8 + index * 2}s">${projectArt(index, repo)}</g>`;
  const body = mobile ? `<g transform="translate(20 3) scale(.65)">${art}</g>
${mono(20, 36, repo.language || 'Repository', C.accent, 13)}
${lines(20, 158, title, 21, 3, 27, C.text, 34)}
${rule(20, 278, 320, 278)}${mono(20, 312, `${repo.stargazers_count} stars`, C.muted, 15)}
${text(320, 312, 'Explore ↗', `text-anchor="end" font-size="16" fill="${C.accent}"`)}` :
    `${art}${mono(28, 40, repo.language || 'Repository', C.accent, 14)}
${lines(28, 161, title, 32, 2, 28, C.text, 34)}
${lines(28, 244, desc, 59, 2, 16, C.muted, 24)}
${mono(28, 304, topics, C.muted, 12)}${rule(28, 324, 552, 324)}
${mono(28, 351, `${repo.stargazers_count} stars   /   ${repo.forks_count} forks`, C.muted, 13)}
${text(552, 351, 'Explore ↗', `text-anchor="end" font-size="14" fill="${C.accent}"`)}`;
  return svg(repo.name, `${repo.description || repo.name}. ${repo.language || 'Source repository'}. ${repo.stargazers_count} stars. Last pushed ${dateLabel(repo.pushed_at)}.`, mobile ? 340 : 580, mobile ? 340 : 370, body, config.accent);
}

function languagesPanel(snapshot, config, mobile = false) {
  const languages = aggregateLanguages(snapshot.repositories);
  const top = languages.slice(0, 5);
  const total = languages.reduce((sum, language) => sum + language.repositories, 0);
  const used = top.reduce((sum, language) => sum + language.percent, 0);
  const segments = used < 99.95 ? [...top, { name: 'Other', percent: 100 - used }] : top;
  const shades = [C.accent, '#95b85c', '#748e4a', '#526a38', '#394c2a', '#283522'];
  let angle = -Math.PI / 2;
  const cx = 266, cy = 247, radius = 132, stroke = 32;
  const arcs = segments.map((language, i) => {
    const span = language.percent / 100 * Math.PI * 2;
    const end = angle + span;
    const gap = Math.min(.018, span * .15);
    const d = `M${n(cx + radius * Math.cos(angle + gap))} ${n(cy + radius * Math.sin(angle + gap))} A${radius} ${radius} 0 ${span - gap * 2 > Math.PI ? 1 : 0} 1 ${n(cx + radius * Math.cos(end - gap))} ${n(cy + radius * Math.sin(end - gap))}`;
    angle = end;
    return `<path d="${d}" fill="none" stroke="${shades[i]}" stroke-width="${stroke}"><title>${escapeXML(language.name)} ${language.percent.toFixed(1)}%</title></path>`;
  }).join('');
  const body = mobile ? `${text(30, 50, 'Across the codebase.', `font-size="29" font-weight="600" fill="${C.text}"`)}
${arcs}${text(cx, 241, languages.length, `text-anchor="middle" font-size="64" font-weight="600" fill="${C.text}"`)}${mono(cx - 55, 275, 'languages', C.muted, 17)}
${segments.map((language, i) => `${text(60, 447 + i * 44, language.name, `font-size="22" fill="${C.text}"`)}${text(514, 447 + i * 44, `${language.percent.toFixed(1)}%`, `text-anchor="end" font-size="22" fill="${i === 0 ? C.accent : C.muted}"`)}<rect x="30" y="${432 + i * 44}" width="8" height="18" fill="${shades[i]}"/>`).join('')}
${text(30, 744, `${total} repositories · one primary language per repo`, `font-size="16" fill="${C.muted}"`)}` :
    `${text(42, 59, 'Across the codebase.', `font-size="29" font-weight="600" fill="${C.text}"`)}
${arcs}${text(cx, 241, languages.length, `text-anchor="middle" font-size="64" font-weight="600" letter-spacing="-3" fill="${C.text}"`)}
${mono(cx - 55, 275, 'languages', C.muted, 17)}
${segments.map((language, i) => `${text(530, 135 + i * 45, language.name, `font-size="20" fill="${C.text}"`)}${text(1138, 135 + i * 45, `${language.percent.toFixed(1)}%`, `text-anchor="end" font-size="20" fill="${i === 0 ? C.accent : C.muted}"`)}<rect x="500" y="${122 + i * 45}" width="8" height="16" fill="${shades[i]}"/>`).join('')}
${mono(42, 427, `${format(total)} repositories · primary language per repo · forks excluded`, C.muted, 14)}`;
  return svg('Languages across the codebase', `Primary language distribution by repository count, excluding forks and repositories with no detected language. ${top.map(language => `${language.name} ${language.percent.toFixed(1)}%`).join(', ')}.`, mobile ? 560 : 1200, mobile ? 780 : 462, body, config.accent);
}

export function calendarSummary(calendar) {
  const days = [...calendar.days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, run = 0;
  for (const day of days) { run = day.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  return { active: days.filter(day => day.count > 0).length, longest, peak: Math.max(...days.map(day => day.count), 0) };
}

function contributionScene(snapshot, config, mobile = false) {
  const calendar = snapshot.calendar;
  const summary = calendarSummary(calendar);
  const dates = calendar.days;
  const start = new Date(`${dates[0].date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const cellX = 18.6, cellY = 8.7;
  const latestWeek = Math.floor((Date.parse(`${dates.at(-1).date}T00:00:00Z`) - start) / 86_400_000 / 7);
  const blocks = dates.map(day => {
    const dt = new Date(`${day.date}T00:00:00Z`);
    const offset = Math.round((dt - start) / 86_400_000);
    const col = Math.floor(offset / 7), row = dt.getUTCDay();
    const x = 98 + col * cellX + row * 14.4;
    const y = 255 + row * cellY - col * 1.55;
    const h = day.count > 0 ? 4 + Math.sqrt(day.count / (summary.peak || 1)) * 122 : 1.5;
    const w = 15.8, dx = 11.7, dy = 7;
    const lightness = day.count ? Math.round(30 + Math.sqrt(day.count / (summary.peak || 1)) * 39) : 15;
    const top = day.count ? `hsl(85 65% ${lightness}%)` : '#293027';
    return `<g${col === latestWeek ? ' class="pulse"' : ''}><title>${escapeXML(day.date)}: ${day.count} contributions</title>
<path d="M${n(x)} ${n(y - h)}l${w} -2.7l${dx} ${dy}l-${w} 2.7Z" fill="${top}"/>
<path d="M${n(x)} ${n(y - h)}l${dx} ${dy}v${n(h)}l-${dx} -${dy}Z" fill="${day.count ? '#42582c' : '#1b211a'}"/>
<path d="M${n(x + dx)} ${n(y + dy - h)}l${w} -2.7v${n(h)}l-${w} 2.7Z" fill="${day.count ? '#77994b' : '#222a20'}"/></g>`;
  }).join('');
  const stats = [[summary.active, 'active days'], [summary.longest, 'days · longest streak'], [summary.peak, 'contributions on best day']];
  let body = `${text(42, 59, 'A year, built one day at a time.', `font-size="29" font-weight="600" fill="${C.text}"`)}
${mono(42, 92, `${dateLabel(dates[0].date)} → ${dateLabel(dates.at(-1).date)}`, C.muted, 14)}
<g transform="translate(-13 70)">${blocks}</g>
${stats.map(([value, label], i) => `${text(56 + i * 394, 449, format(value), `font-size="36" font-weight="600" fill="${C.text}"`)}${text(56 + i * 394, 479, label, `font-size="17" fill="${C.muted}"`)}`).join('')}
${mono(42, 533, 'Each block is one GitHub contribution day. Height follows the daily count.', C.muted, 14)}`;
  if (mobile) {
    // Keep the same actual days, reprojected into a taller mobile silhouette.
    body = `${text(30, 48, 'A year, one day at a time.', `font-size="26" font-weight="600" fill="${C.text}"`)}
${mono(30, 80, `${dateLabel(dates[0].date)} → ${dateLabel(dates.at(-1).date)}`, C.muted, 13)}
<g transform="translate(15 80) scale(.43 .8)">${blocks}</g>
${stats.map(([value, label], i) => `${text(30, 410 + i * 60, `${format(value)} ${label}`, `font-size="22" fill="${C.text}"`)}`).join('')}
${lines(30, 596, 'One block per contribution day. Taller blocks mean more contributions.', 45, 2, 16, C.muted, 24)}`;
  }
  return svg('A year of GitHub contributions in three dimensions', `${calendar.total} contributions. ${summary.active} active days. Longest streak: ${summary.longest} days. Highest daily count: ${summary.peak}. Each block uses an exact GitHub daily count. The newest week is gently highlighted.`, mobile ? 560 : 1200, mobile ? 654 : 564, body, config.accent);
}

function activityPanel(snapshot, config, mobile = false) {
  const recent = snapshot.repositories.filter(repo => !repo.fork && repo.name.toLowerCase() !== snapshot.user.login.toLowerCase()).sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 3);
  const body = mobile ? `${text(30, 52, 'Still in the making.', `font-size="29" font-weight="600" fill="${C.text}"`)}
${recent.map((repo, i) => `${mono(30, 112 + i * 106, dateLabel(repo.pushed_at), C.accent, 15)}${lines(30, 143 + i * 106, repo.name.replaceAll(/[-_]+/g, ' ').trim(), 40, 2, 21, C.text, 27)}`).join('')}` :
    `${text(42, 58, 'Still in the making.', `font-size="29" font-weight="600" fill="${C.text}"`)}
${recent.map((repo, i) => `${mono(42, 121 + i * 59, dateLabel(repo.pushed_at), C.accent, 14)}${text(238, 121 + i * 59, wrap(repo.name.replaceAll(/[-_]+/g, ' ').trim(), 62, 1)[0], `font-size="20" fill="${C.text}"`)}${i < recent.length - 1 ? rule(238, 141 + i * 59, 1158, 141) : ''}`).join('')}`;
  return svg('Recently pushed repositories', recent.map(repo => `${repo.name}: ${dateLabel(repo.pushed_at)}`).join('. '), mobile ? 560 : 1200, mobile ? 430 : 284, body, config.accent);
}

function footer(snapshot, config, mobile = false) {
  return svg('Explore the work on GitHub', `Visit ${snapshot.user.html_url}`, mobile ? 560 : 1200, mobile ? 160 : 132,
    `${text(mobile ? 30 : 42, 66, 'Keep exploring.', `font-size="${mobile ? 32 : 29}" font-weight="600" fill="${C.text}"`)}${mono(mobile ? 30 : 42, 112, `github.com/${snapshot.user.login}`, C.accent, 16)}<path d="${mobile ? 'M468 91l40 -40m-40 0h40v40' : 'M1062 88l47 -47m-47 0h47v47'}" fill="none" stroke="${C.accent}" stroke-width="2"/>`, config.accent);
}

export function safeSocial(snapshot) {
  const candidates = [...snapshot.social];
  if (snapshot.user.blog) candidates.push({ provider: 'Website', url: snapshot.user.blog });
  const labels = { linkedin: 'LinkedIn', instagram: 'Instagram', twitter: 'X', youtube: 'YouTube', mastodon: 'Mastodon', twitch: 'Twitch' };
  const unique = new Map();
  for (const account of candidates) {
    try {
      // Whitespace in the original LinkedIn profile URL is normalised, not copied as a broken link.
      const url = new URL(account.url.replaceAll(/\s/g, ''));
      if (url.protocol !== 'https:') continue;
      const hostname = url.hostname.replace(/^www\./, '');
      const label = hostname === 'leetcode.com' ? 'LeetCode' : labels[account.provider] || labels[hostname.split('.')[0]] || hostname;
      unique.set(url.href, { label, url: url.href });
    } catch { /* Invalid public profile links are omitted. */ }
  }
  return [...unique.values()];
}

export function formatSocialBadge(link) {
  const configs = {
    Instagram: { color: 'E4405F', logo: 'instagram' },
    LinkedIn: { color: '0A66C2', logo: 'linkedin' },
    LeetCode: { color: 'FFA116', logo: 'leetcode' },
    X: { color: '000000', logo: 'x' },
    YouTube: { color: 'FF0000', logo: 'youtube' },
    Website: { color: '161b16', logo: 'safari', logoColor: 'c5f277' },
  };
  const cfg = configs[link.label] || { color: '161b16', logo: 'link' };
  const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(link.label)}-${cfg.color}?style=for-the-badge&logo=${cfg.logo}&logoColor=${cfg.logoColor || 'white'}`;
  return `[![${escapeMD(link.label)}](${badgeUrl})](${link.url})`;
}

export function repositoriesSection() {
  return `## 📁 Repositories

> Click any badge below to explore the code 👇

\`Artificial Intelligence & Machine Learning\`

[![AI & ML REPO](https://img.shields.io/badge/AI_%26_ML_REPO-7952DE?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning)
[![DEEP LEARNING](https://img.shields.io/badge/DEEP_LEARNING-F16B24?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RajatBhardwaj2006/Deep-Learning)
[![REINFORCEMENT LEARNING](https://img.shields.io/badge/REINFORCEMENT_LEARNING-00B48A?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning)

\`DSA & Problem Solving\`

[![DSA IN C++](https://img.shields.io/badge/DSA_IN_C++-007ACC?style=for-the-badge&logo=c%2B%2B&logoColor=white)](https://github.com/RajatBhardwaj2006/Data-Structures)
[![LEETCODE](https://img.shields.io/badge/LEETCODE-FFA116?style=for-the-badge&logo=leetcode&logoColor=white)](https://leetcode.com/u/cherry_2006)

\`Languages\`

[![PYTHON](https://img.shields.io/badge/PYTHON-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![JAVA](https://img.shields.io/badge/JAVA-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://github.com/RajatBhardwaj2006/Java)
[![SQL](https://img.shields.io/badge/SQL-003B57?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![C++](https://img.shields.io/badge/C++-00599E?style=for-the-badge&logo=c%2B%2B&logoColor=white)](https://github.com/RajatBhardwaj2006/CPP)

\`AI Engineering & Development\`

[![FLASK](https://img.shields.io/badge/FLASK-000000?style=for-the-badge&logo=flask&logoColor=white)](https://github.com/RajatBhardwaj2006/Fraudulent-Online-Transaction-Detection-System)
[![OPENAI](https://img.shields.io/badge/OPENAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning)
[![AI AGENTS](https://img.shields.io/badge/AI_AGENTS-E91E63?style=for-the-badge&logo=probot&logoColor=white)](https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning)

\`Frontend\`

[![HTML](https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://github.com/RajatBhardwaj2006)

\`Development Tools\`

[![GIT](https://img.shields.io/badge/GIT-F05032?style=for-the-badge&logo=git&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![GITHUB](https://img.shields.io/badge/GITHUB-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![JUPYTERLAB](https://img.shields.io/badge/JUPYTERLAB-F37626?style=for-the-badge&logo=jupyter&logoColor=white)](https://github.com/RajatBhardwaj2006)

\`Libraries\`

[![NUMPY](https://img.shields.io/badge/NUMPY-013243?style=for-the-badge&logo=numpy&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![PANDAS](https://img.shields.io/badge/PANDAS-150458?style=for-the-badge&logo=pandas&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![SEABORN](https://img.shields.io/badge/SEABORN-4C72B0?style=for-the-badge&logo=seaborn&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![MATPLOTLIB](https://img.shields.io/badge/MATPLOTLIB-C0392B?style=for-the-badge&logo=matplotlib&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![SCIPY](https://img.shields.io/badge/SCIPY-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![SCIKIT-LEARN](https://img.shields.io/badge/SCIKIT--LEARN-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://github.com/RajatBhardwaj2006)
[![PYTORCH](https://img.shields.io/badge/PYTORCH-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://github.com/RajatBhardwaj2006/VisionInspect-Industrial-Defect-Detection-)
[![BEAUTIFUL SOUP](https://img.shields.io/badge/BEAUTIFUL_SOUP-0B7D3B?style=for-the-badge&logo=beautifulsoup&logoColor=white)](https://github.com/RajatBhardwaj2006)`;
}

export function readme(snapshot, config, projects) {
  const summary = calendarSummary(snapshot.calendar);
  const languages = aggregateLanguages(snapshot.repositories);
  const socials = safeSocial(snapshot).map(link => formatSocialBadge(link));
  const github = snapshot.user.html_url;
  const embedded = (name, alt, width = '1200') => `<picture><source media="(max-width: 600px)" srcset="assets/generated/${name}-mobile.svg"><img src="assets/generated/${name}.svg" width="${width}" alt="${escapeXML(alt)}"></picture>`;
  return `<!-- Generated by scripts/lib/render.mjs from data/profile.json. See docs/MAINTAINING.md. -->

<a href="${escapeXML(github)}">
  <picture>
    <source media="(max-width: 600px)" srcset="assets/generated/hero-mobile.svg">
    <img src="assets/generated/hero.svg" width="1200" alt="${escapeXML(snapshot.user.name)}. ${escapeXML(clean(snapshot.user.bio))}. Animated sculptural 3D manifold.">
  </picture>
</a>

${socials.join(' &nbsp; ')}${socials.length ? ' &nbsp; ' : ''}[![All Repositories](https://img.shields.io/badge/All%20Repositories-161b16?style=for-the-badge&logo=github&logoColor=c5f277)](${github}?tab=repositories)

${embedded('metrics', `${snapshot.user.public_repos} public repositories, ${format(snapshot.calendar.total)} contributions in the past year, ${snapshot.user.followers} followers, ${snapshot.repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0)} stars across public repositories.`)}

## 🚀 Featured Projects

${snapshot.pinned.length ? 'Featured from my GitHub pins.' : 'A selection of my public work.'}

${Array.from({ length: Math.ceil(projects.length / 2) }, (_, row) => `<p>\n${projects.slice(row * 2, row * 2 + 2).map((repo, col) => `  <a href="${escapeXML(repo.html_url)}">${embedded(`project-${row * 2 + col + 1}`, `${repo.name}: ${repo.description || 'Explore the repository on GitHub.'}`, '49%')}</a>`).join('\n')}\n</p>`).join('\n\n')}

<details>
<summary>Project links and descriptions</summary>

${projects.map(repo => `- [${escapeMD(repo.name)}](${repo.html_url})${repo.description ? `: ${escapeMD(repo.description)}` : ''}`).join('\n')}

</details>

${repositoriesSection()}

## The code behind the work

${embedded('languages', `Primary language by public repository count, excluding forks: ${languages.slice(0, 5).map(language => `${language.name} ${language.percent.toFixed(1)}%`).join(', ')}. These describe repositories, not proficiency.`)}

<details>
<summary>Language data</summary>

Each owned public repository counts once, using its primary language reported by GitHub. Forks and repositories with no detected language are excluded. These proportions describe the repositories, not proficiency.

| Language | Repositories | Share |
| :--- | ---: | ---: |
${languages.map(language => `| ${escapeMD(language.name)} | ${format(language.repositories)} | ${language.percent.toFixed(1)}% |`).join('\n')}

</details>

## Showing up, day after day

<a href="${github}?tab=overview">
  <picture>
    <source media="(max-width: 600px)" srcset="assets/generated/contributions-mobile.svg">
    <img src="assets/generated/contributions.svg" width="1200" alt="${format(snapshot.calendar.total)} contributions, ${summary.active} active days, ${summary.longest}-day longest streak, and ${summary.peak} contributions on the busiest day. A 3D skyline built from GitHub's exact daily counts.">
  </picture>
</a>

<details>
<summary>Contribution data and recent repositories</summary>

${format(snapshot.calendar.total)} contributions across ${summary.active} active days between ${dateLabel(snapshot.calendar.days[0].date)} and ${dateLabel(snapshot.calendar.days.at(-1).date)}. Longest streak within this window: ${summary.longest} days. Best day: ${summary.peak} contributions.

${snapshot.repositories.filter(repo => !repo.fork && repo.name.toLowerCase() !== snapshot.user.login.toLowerCase()).sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 3).map(repo => `- [${escapeMD(repo.name)}](${repo.html_url}) · pushed ${dateLabel(repo.pushed_at)}`).join('\n')}

Daily counts follow GitHub's contribution calendar visibility and counting rules. Private repository names and content are never requested or published.

</details>

${embedded('activity', 'Recently pushed public repositories. Text links and dates are available in the contribution details above.')}

<a href="${github}?tab=repositories">${embedded('footer', `Explore ${snapshot.user.name}'s repositories on GitHub.`)}</a>

<sub>GitHub snapshot · ${escapeXML(snapshot.fetchedAt.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'))} · refreshed every 6 hours by [GitHub Actions](https://github.com/${snapshot.user.login}/${snapshot.user.login}/actions/workflows/sync-profile.yml). [Data & maintenance](docs/MAINTAINING.md)</sub>
`;
}

export async function renderProfile(snapshot, config, root) {
  if (!snapshot.calendar?.days?.length || !snapshot.repositories || !snapshot.user) throw new Error('A complete GitHub snapshot is required.');
  const projects = selectProjects(snapshot.repositories, snapshot.pinned, snapshot.user.login, config.featuredCount);
  const dir = new URL('assets/generated/', root);
  await mkdir(dir, { recursive: true });
  const files = new Map([
    ['hero.svg', hero(snapshot, config)], ['hero-mobile.svg', hero(snapshot, config, true)],
    ['metrics.svg', metrics(snapshot, config)], ['languages.svg', languagesPanel(snapshot, config)],
    ['metrics-mobile.svg', metrics(snapshot, config, true)], ['languages-mobile.svg', languagesPanel(snapshot, config, true)],
    ['contributions.svg', contributionScene(snapshot, config)], ['contributions-mobile.svg', contributionScene(snapshot, config, true)],
    ['activity.svg', activityPanel(snapshot, config)], ['footer.svg', footer(snapshot, config)],
    ['activity-mobile.svg', activityPanel(snapshot, config, true)], ['footer-mobile.svg', footer(snapshot, config, true)],
    ...projects.map((repo, index) => [`project-${index + 1}.svg`, projectCard(repo, index, config)]),
    ...projects.map((repo, index) => [`project-${index + 1}-mobile.svg`, projectCard(repo, index, config, true)]),
  ]);
  for (const [name, content] of files) await writeFile(new URL(name, dir), content);
  for (const file of await readdir(dir)) if (/^project-\d+(?:-mobile)?\.svg$/.test(file) && !files.has(file)) await unlink(new URL(file, dir));
  await writeFile(new URL('README.md', root), readme(snapshot, config, projects));
}
