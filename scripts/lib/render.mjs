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

function neuralEngine(mobile = false) {
  if (mobile) {
    const xCoords = [115, 205, 295, 395];
    const layers = [
      [270, 325, 380],
      [235, 280, 325, 370, 415],
      [235, 280, 325, 370, 415],
      [325]
    ];
    const inputNames = ['Consistency', 'Dedication', 'Hardwork'];
    const layerTitles = ['IN', 'H1', 'H2', 'OUT'];

    const lines = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const fromX = xCoords[l];
      const toX = xCoords[l + 1];
      for (const fromY of layers[l]) {
        for (const toY of layers[l + 1]) {
          lines.push(`<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="hsl(85 45% 24% / .5)" stroke-width="1"/>`);
        }
      }
    }

    const activePaths = [
      `M${xCoords[0]} ${layers[0][0]}L${xCoords[1]} ${layers[1][1]}L${xCoords[2]} ${layers[2][2]}L${xCoords[3]} ${layers[3][0]}`,
      `M${xCoords[0]} ${layers[0][1]}L${xCoords[1]} ${layers[1][2]}L${xCoords[2]} ${layers[2][1]}L${xCoords[3]} ${layers[3][0]}`,
      `M${xCoords[0]} ${layers[0][2]}L${xCoords[1]} ${layers[1][3]}L${xCoords[2]} ${layers[2][3]}L${xCoords[3]} ${layers[3][0]}`,
    ];

    const pulses = activePaths.map(d => `<path class="flow" d="${d}" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-dasharray="5 20"/>`).join('');

    const nodes = [];
    for (let l = 0; l < layers.length; l++) {
      const x = xCoords[l];
      const isInput = l === 0;
      const isOutput = l === layers.length - 1;
      for (let i = 0; i < layers[l].length; i++) {
        const y = layers[l][i];
        const r = isOutput ? 10 : (isInput ? 7.5 : 5.5);
        nodes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#111411" stroke="${isOutput || isInput ? C.accent : 'hsl(85 60% 45%)'}" stroke-width="1.8"/>
<circle cx="${x}" cy="${y}" r="${isOutput ? 5 : (isInput ? 3.5 : 2.5)}" fill="${C.accent}"/>`);
      }
    }

    const titles = layerTitles.map((title, l) => `<text x="${xCoords[l]}" y="215" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="9" letter-spacing="1" fill="${C.muted}">${title}</text>`).join('');
    const inputLabels = inputNames.map((name, i) => `<text x="${xCoords[0] - 12}" y="${layers[0][i] + 4}" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="10" font-weight="600" fill="${C.text}">${name}</text>`).join('');
    const outputLabel = `<text x="${xCoords[3] + 16}" y="${layers[3][0] + 4}" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="13" font-weight="700" fill="${C.accent}">Success</text>`;

    return `<g>
${titles}
${lines.join('')}
<g class="motion">${pulses}</g>
${nodes.join('')}
${inputLabels}
${outputLabel}
</g>`;
  }

  const xCoords = [885, 960, 1035, 1110];
  const layers = [
    [85, 150, 215],
    [50, 100, 150, 200, 250],
    [50, 100, 150, 200, 250],
    [150]
  ];
  const inputNames = ['Consistency', 'Dedication', 'Hardwork'];
  const layerTitles = ['INPUT', 'HIDDEN 1', 'HIDDEN 2', 'OUTPUT'];

  const lines = [];
  for (let l = 0; l < layers.length - 1; l++) {
    const fromX = xCoords[l];
    const toX = xCoords[l + 1];
    for (const fromY of layers[l]) {
      for (const toY of layers[l + 1]) {
        lines.push(`<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="hsl(85 45% 22% / .5)" stroke-width="1.1"/>`);
      }
    }
  }

  const activePaths = [
    `M${xCoords[0]} ${layers[0][0]}L${xCoords[1]} ${layers[1][1]}L${xCoords[2]} ${layers[2][2]}L${xCoords[3]} ${layers[3][0]}`,
    `M${xCoords[0]} ${layers[0][1]}L${xCoords[1]} ${layers[1][2]}L${xCoords[2]} ${layers[2][1]}L${xCoords[3]} ${layers[3][0]}`,
    `M${xCoords[0]} ${layers[0][2]}L${xCoords[1]} ${layers[1][3]}L${xCoords[2]} ${layers[2][3]}L${xCoords[3]} ${layers[3][0]}`,
    `M${xCoords[0]} ${layers[0][0]}L${xCoords[1]} ${layers[1][0]}L${xCoords[2]} ${layers[2][0]}L${xCoords[3]} ${layers[3][0]}`,
    `M${xCoords[0]} ${layers[0][2]}L${xCoords[1]} ${layers[1][4]}L${xCoords[2]} ${layers[2][4]}L${xCoords[3]} ${layers[3][0]}`
  ];

  const pulses = activePaths.map(d => `<path class="flow" d="${d}" fill="none" stroke="${C.accent}" stroke-width="1.8" stroke-dasharray="6 24"/>`).join('');

  const nodes = [];
  for (let l = 0; l < layers.length; l++) {
    const x = xCoords[l];
    const isInput = l === 0;
    const isOutput = l === layers.length - 1;
    for (let i = 0; i < layers[l].length; i++) {
      const y = layers[l][i];
      const r = isOutput ? 11 : (isInput ? 8 : 6);
      nodes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#111411" stroke="${isOutput || isInput ? C.accent : 'hsl(85 62% 48%)'}" stroke-width="${isOutput ? 2.4 : 1.8}"/>
<circle cx="${x}" cy="${y}" r="${isOutput ? 5 : (isInput ? 4 : 2.8)}" fill="${C.accent}"/>`);
    }
  }

  const titles = layerTitles.map((title, l) => `<text x="${xCoords[l]}" y="28" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="10" letter-spacing="1" fill="${C.muted}">${title}</text>`).join('');
  const inputLabels = inputNames.map((name, i) => `<text x="${xCoords[0] - 14}" y="${layers[0][i] + 4}" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="12" font-weight="600" fill="${C.text}">${name}</text>`).join('');
  const outputLabel = `<text x="${xCoords[3] + 16}" y="${layers[3][0] + 4}" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="14" font-weight="700" fill="${C.accent}">Success</text>
<text x="${xCoords[3] + 16}" y="${layers[3][0] + 18}" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="10" fill="${C.muted}">Output</text>`;

  return `<g>
${titles}
${lines.join('')}
<g class="motion">${pulses}</g>
${nodes.join('')}
${inputLabels}
${outputLabel}
</g>`;
}

function hero(snapshot, config, mobile = false) {
  const name = snapshot.user.name || config.username;
  const rawBio = snapshot.user.bio || 'Exploring AI, ML. Learning, experimenting, and turning ideas into reality.';
  const bio = clean(rawBio).replace(/^Rajat\s+Bhardwaj\s*[,-–—]?\s*/i, '').trim();
  const sub = snapshot.user.location ? `${snapshot.user.location} · Learning, in motion.` : 'Learning, in motion.';

  const body = mobile ? `${neuralEngine(true)}
${text(30, 52, name, 'font-size="34" font-weight="700" letter-spacing="-1" fill="#ffffff"')}
${lines(30, 94, bio, 28, 3, 18, '#ffffff', 28)}
${text(30, 185, sub, `font-size="13" fill="${C.muted}"`)}` :
    `${neuralEngine(false)}
${text(42, 70, name, 'font-size="44" font-weight="700" letter-spacing="-1" fill="#ffffff"')}
${lines(42, 122, bio, 42, 3, 21, '#ffffff', 32)}
${rule(42, 235, 750, 235)}
${text(42, 268, snapshot.user.location || 'India', `font-size="16" fill="${C.muted}"`)}
${text(750, 268, 'Learning, in motion.', `text-anchor="end" font-size="16" fill="${C.muted}"`)}`;
  return svg(`${name} GitHub profile hero`, `${name}. ${clean(bio)}. Neural network engine with inputs Consistency, Dedication, Hardwork driving forward to Success.`, mobile ? 560 : 1200, mobile ? 450 : 300, body, config.accent);
}

function metrics(snapshot, config, mobile = false) {
  const stats = [
    [snapshot.user.public_repos, 'public repositories'],
    [snapshot.calendar.total, 'contributions in the past year'],
    [snapshot.user.followers, 'followers'],
    [snapshot.repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0), 'stars earned across repositories'],
  ];
  const body = mobile ? stats.map(([val, label], i) => `
<rect x="30" y="${30 + i * 94}" width="500" height="78" rx="6" fill="${C.panel}"/>
${text(50, 78 + i * 94, format(val), `font-size="36" font-weight="700" letter-spacing="-1" fill="${C.text}"`)}
${text(210, 78 + i * 94, label, `font-size="17" fill="${C.muted}"`)}`).join('') :
    stats.map(([val, label], i) => `
<rect x="${42 + i * 285}" y="30" width="260" height="152" rx="6" fill="${C.panel}"/>
${text(66 + i * 285, 102, format(val), `font-size="44" font-weight="700" letter-spacing="-2" fill="${C.text}"`)}
${lines(66 + i * 285, 140, label, 20, 2, 16, C.muted, 22)}`).join('');
  return svg('Profile snapshot metrics', stats.map(([val, label]) => `${format(val)} ${label}`).join(', '), mobile ? 560 : 1200, mobile ? 420 : 212, body, config.accent);
}

function projectArt(index, repo) {
  const seeds = [
    '<circle cx="488" cy="180" r="110" fill="none" stroke="hsl(85 65% 58% / .45)" stroke-width="2"/><ellipse cx="488" cy="180" rx="110" ry="46" fill="none" stroke="hsl(85 65% 58% / .35)" stroke-width="1.5" transform="rotate(-24 488 180)"/><circle cx="488" cy="180" r="5" fill="#c5f277"/>',
    '<rect x="400" y="90" width="160" height="160" rx="12" fill="none" stroke="hsl(85 65% 58% / .45)" stroke-width="2"/><path d="M400 170H560M480 90V250" stroke="hsl(85 65% 58% / .3)"/><circle cx="480" cy="170" r="42" fill="none" stroke="#c5f277" stroke-width="2"/>',
    '<path d="M420 230L480 100L540 230Z" fill="none" stroke="hsl(85 65% 58% / .45)" stroke-width="2"/><path d="M450 165H510" stroke="#c5f277" stroke-width="2"/><circle cx="480" cy="100" r="5" fill="#c5f277"/>',
    '<path d="M410 180Q480 110 550 180T690 180" fill="none" stroke="hsl(85 65% 58% / .45)" stroke-width="2"/><path d="M410 180Q480 250 550 180" fill="none" stroke="#c5f277" stroke-width="2"/>',
    '<polygon points="480,95 550,135 550,215 480,255 410,215 410,135" fill="none" stroke="hsl(85 65% 58% / .45)" stroke-width="2"/><circle cx="480" cy="175" r="28" fill="none" stroke="#c5f277" stroke-width="1.8"/>',
    '<circle cx="480" cy="175" r="70" fill="none" stroke="hsl(85 65% 58% / .45)" stroke-width="1.8"/><path d="M440 175H520M480 135V215" stroke="#c5f277" stroke-width="2"/>'
  ];
  return seeds[index % seeds.length];
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

export function languagesPanel(snapshot, config, mobile = false) {
  const languages = aggregateLanguages(snapshot.repositories);
  const top = languages.slice(0, 5);
  const total = languages.reduce((sum, language) => sum + language.repositories, 0);
  const used = top.reduce((sum, language) => sum + language.percent, 0);
  const segments = used < 99.95 ? [...top, { name: 'Other', percent: 100 - used }] : top;
  const shades = [C.accent, '#95b85c', '#748e4a', '#526a38', '#394c2a', '#283522'];

  if (mobile) {
    const cx = 280, cy = 250, radius = 100, stroke = 26;
    let angle = -Math.PI / 2;
    const arcs = segments.map((language, i) => {
      const span = language.percent / 100 * Math.PI * 2;
      const end = angle + span;
      const gap = Math.min(.018, span * .15);
      const d = `M${n(cx + radius * Math.cos(angle + gap))} ${n(cy + radius * Math.sin(angle + gap))} A${radius} ${radius} 0 ${span - gap * 2 > Math.PI ? 1 : 0} 1 ${n(cx + radius * Math.cos(end - gap))} ${n(cy + radius * Math.sin(end - gap))}`;
      angle = end;
      return `<path d="${d}" fill="none" stroke="${shades[i] || '#30382f'}" stroke-width="${stroke}"><title>${escapeXML(language.name)} ${language.percent.toFixed(1)}%</title></path>`;
    }).join('');
    const body = `${text(30, 50, 'Across the codebase.', `font-size="28" font-weight="600" fill="${C.text}"`)}
${arcs}${text(cx, 245, languages.length, `text-anchor="middle" font-size="60" font-weight="600" fill="${C.text}"`)}
<text x="${cx}" y="${280}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="16" fill="${C.muted}">languages</text>
${segments.map((language, i) => `${text(60, 440 + i * 44, language.name, `font-size="20" fill="${C.text}"`)}${text(510, 440 + i * 44, `${language.percent.toFixed(1)}%`, `text-anchor="end" font-size="20" fill="${i === 0 ? C.accent : C.muted}"`)}<rect x="30" y="${425 + i * 44}" width="8" height="18" fill="${shades[i] || '#30382f'}"/>`).join('')}
${text(30, 744, `${total} repositories, one primary language per repo`, `font-size="16" fill="${C.muted}"`)}`;
    return svg('Languages across the codebase', `Primary language distribution by repository count. ${top.map(language => `${language.name} ${language.percent.toFixed(1)}%`).join(', ')}.`, 560, 780, body, config.accent);
  }

  // Desktop: 580 x 462
  const cx = 150, cy = 230, radius = 86, stroke = 22;
  let angle = -Math.PI / 2;
  const arcs = segments.map((language, i) => {
    const span = language.percent / 100 * Math.PI * 2;
    const end = angle + span;
    const gap = Math.min(.018, span * .15);
    const d = `M${n(cx + radius * Math.cos(angle + gap))} ${n(cy + radius * Math.sin(angle + gap))} A${radius} ${radius} 0 ${span - gap * 2 > Math.PI ? 1 : 0} 1 ${n(cx + radius * Math.cos(end - gap))} ${n(cy + radius * Math.sin(end - gap))}`;
    angle = end;
    return `<path d="${d}" fill="none" stroke="${shades[i] || '#30382f'}" stroke-width="${stroke}"><title>${escapeXML(language.name)} ${language.percent.toFixed(1)}%</title></path>`;
  }).join('');

  const body = `${text(36, 54, 'Across the codebase.', `font-size="26" font-weight="600" fill="${C.text}"`)}
${arcs}${text(cx, 224, languages.length, `text-anchor="middle" font-size="48" font-weight="700" letter-spacing="-2" fill="${C.text}"`)}
<text x="${cx}" y="${252}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="14" fill="${C.muted}">languages</text>
${segments.map((language, i) => `<rect x="300" y="${96 + i * 42}" width="7" height="16" rx="2" fill="${shades[i] || '#30382f'}"/><text x="320" y="${110 + i * 42}" font-size="18" fill="${C.text}">${escapeXML(language.name)}</text><text x="546" y="${110 + i * 42}" text-anchor="end" font-size="18" fill="${i === 0 ? C.accent : C.muted}">${language.percent.toFixed(1)}%</text>`).join('')}
${text(36, 422, `${format(total)} repositories, primary language per repo`, `font-size="14" fill="${C.muted}"`)}`;

  return svg('Languages across the codebase', `Primary language distribution by repository count, excluding forks and repositories with no detected language. ${top.map(language => `${language.name} ${language.percent.toFixed(1)}%`).join(', ')}.`, 580, 462, body, config.accent);
}

export function commitsPanel(snapshot, config, mobile = false) {
  const calendar = snapshot.calendar;
  const summary = calendarSummary(calendar);
  const total = calendar.total;
  const activeDays = summary.active;
  const consistency = ((activeDays / 365) * 100).toFixed(1);

  if (mobile) {
    const cx = 280, cy = 250, radius = 100, stroke = 24;
    const circ = n(2 * Math.PI * radius);
    const progress = n(circ * Math.min(1, activeDays / 365));
    const body = `${text(30, 50, 'Commit history & activity.', `font-size="28" font-weight="600" fill="${C.text}"`)}
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#232a21" stroke-width="${stroke}"/>
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${C.accent}" stroke-width="${stroke}" stroke-dasharray="${progress} ${circ}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
${text(cx, cy - 8, activeDays, `text-anchor="middle" font-size="56" font-weight="700" letter-spacing="-2" fill="${C.text}"`)}
<text x="${cx}" y="${cy + 24}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="16" fill="${C.muted}">days committed</text>
<text x="${cx}" y="${cy + 50}" text-anchor="middle" font-size="15" fill="${C.accent}">${consistency}% of year</text>

<rect x="30" y="415" width="500" height="66" rx="6" fill="${C.panel}"/>
<text x="50" y="442" font-size="14" fill="${C.muted}">Total contributions</text>
<text x="50" y="468" font-size="22" font-weight="700" fill="${C.accent}">${format(total)}</text>

<rect x="30" y="495" width="500" height="66" rx="6" fill="${C.panel}"/>
<text x="50" y="522" font-size="14" fill="${C.muted}">Active days committed</text>
<text x="50" y="548" font-size="22" font-weight="700" fill="${C.text}">${activeDays} <tspan font-size="15" font-weight="400" fill="${C.muted}">/ 365 days</tspan></text>

<rect x="30" y="575" width="500" height="66" rx="6" fill="${C.panel}"/>
<text x="50" y="602" font-size="14" fill="${C.muted}">Longest streak</text>
<text x="50" y="628" font-size="22" font-weight="700" fill="${C.text}">${summary.longest} <tspan font-size="15" font-weight="400" fill="${C.muted}">days</tspan></text>

<rect x="30" y="655" width="500" height="66" rx="6" fill="${C.panel}"/>
<text x="50" y="682" font-size="14" fill="${C.muted}">Busiest day</text>
<text x="50" y="708" font-size="22" font-weight="700" fill="${C.accent}">${summary.peak} <tspan font-size="15" font-weight="400" fill="${C.muted}">contributions</tspan></text>

${text(30, 755, '365-day tracking, GitHub contribution calendar', `font-size="15" fill="${C.muted}"`)}`;

    return svg('Total commits and active days committed', `${format(total)} contributions across ${activeDays} active days. Longest streak: ${summary.longest} days. Consistency: ${consistency}%.`, 560, 780, body, config.accent);
  }

  // Desktop: 580 x 462
  const cx = 150, cy = 230, radius = 86, stroke = 22;
  const circ = n(2 * Math.PI * radius);
  const progress = n(circ * Math.min(1, activeDays / 365));
  const body = `${text(36, 54, 'Commit history & activity.', `font-size="26" font-weight="600" fill="${C.text}"`)}
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#232a21" stroke-width="${stroke}"/>
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${C.accent}" stroke-width="${stroke}" stroke-dasharray="${progress} ${circ}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
${text(cx, cy - 6, activeDays, `text-anchor="middle" font-size="46" font-weight="700" letter-spacing="-2" fill="${C.text}"`)}
<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="14" fill="${C.muted}">days committed</text>
<text x="${cx}" y="${cy + 44}" text-anchor="middle" font-size="13" fill="${C.accent}">${consistency}% of year</text>

<rect x="300" y="92" width="245" height="64" rx="6" fill="${C.panel}"/>
<text x="320" y="117" font-size="13" fill="${C.muted}">Total contributions</text>
<text x="320" y="143" font-size="22" font-weight="700" fill="${C.accent}">${format(total)}</text>

<rect x="300" y="168" width="245" height="64" rx="6" fill="${C.panel}"/>
<text x="320" y="193" font-size="13" fill="${C.muted}">Active days committed</text>
<text x="320" y="219" font-size="22" font-weight="700" fill="${C.text}">${activeDays} <tspan font-size="15" font-weight="400" fill="${C.muted}">/ 365 days</tspan></text>

<rect x="300" y="244" width="245" height="64" rx="6" fill="${C.panel}"/>
<text x="320" y="269" font-size="13" fill="${C.muted}">Longest streak</text>
<text x="320" y="295" font-size="22" font-weight="700" fill="${C.text}">${summary.longest} <tspan font-size="15" font-weight="400" fill="${C.muted}">days</tspan></text>

<rect x="300" y="320" width="245" height="64" rx="6" fill="${C.panel}"/>
<text x="320" y="345" font-size="13" fill="${C.muted}">Busiest day</text>
<text x="320" y="371" font-size="22" font-weight="700" fill="${C.accent}">${summary.peak} <tspan font-size="15" font-weight="400" fill="${C.muted}">contributions</tspan></text>

${text(36, 422, '365-day tracking, GitHub contribution calendar', `font-size="14" fill="${C.muted}"`)}`;

  return svg('Total commits and active days committed', `${format(total)} contributions across ${activeDays} active days. Longest streak: ${summary.longest} days. Consistency: ${consistency}%.`, 580, 462, body, config.accent);
}

export function calendarSummary(calendar) {
  const days = [...calendar.days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, run = 0;
  for (const day of days) { run = day.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  return { active: days.filter(day => day.count > 0).length, longest, peak: Math.max(...days.map(day => day.count), 0) };
}

export function extendedCalendarStats(days) {
  let longest = 0, longestStart = '', longestEnd = '';
  let curRun = 0, curRunStart = '';
  let peak = 0, peakDate = '';
  for (const day of days) {
    if (day.count > peak) { peak = day.count; peakDate = day.date; }
    if (day.count > 0) {
      if (curRun === 0) curRunStart = day.date;
      curRun++;
      if (curRun > longest) {
        longest = curRun;
        longestStart = curRunStart;
        longestEnd = day.date;
      }
    } else {
      curRun = 0;
      curRunStart = '';
    }
  }
  let current = 0, currentStart = '', currentEnd = days[days.length - 1]?.date || '';
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      current++;
      currentStart = days[i].date;
    } else {
      if (i === days.length - 1) continue;
      break;
    }
  }
  return { peak, peakDate, longest, longestStart, longestEnd, current, currentStart, currentEnd };
}

function contributionScene(snapshot, config, mobile = false) {
  const calendar = snapshot.calendar;
  const summary = calendarSummary(calendar);
  const dates = calendar.days;
  const total = calendar.total;
  const stats = extendedCalendarStats(dates);
  const peak = summary.peak || 1;

  const start = new Date(`${dates[0].date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seenMonths = new Set();
  const monthLabels = [];

  const tiles = dates.map(day => {
    const dt = new Date(`${day.date}T00:00:00Z`);
    const offset = Math.round((dt - start) / 86_400_000);
    const col = Math.floor(offset / 7);
    const row = dt.getUTCDay();
    const mKey = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
    if (!seenMonths.has(mKey) && dt.getUTCDate() <= 7) {
      seenMonths.add(mKey);
      monthLabels.push({ col, month: monthNames[dt.getUTCMonth()] });
    }
    return { ...day, col, row };
  });

  tiles.sort((a, b) => (a.col + a.row) - (b.col + b.row) || a.col - b.col);

  const sx = 15.2, sy = 6.4;
  const tx = -10.5, ty = 5.2;
  const wx = 11.8, wy = 5.0;
  const dx = -8.2, dy = 4.0;
  const x0 = 175, y0 = 195;

  const formatRange = (d1, d2) => {
    if (!d1 || !d2) return '';
    const dt1 = new Date(`${d1}T00:00:00Z`);
    const dt2 = new Date(`${d2}T00:00:00Z`);
    return `${monthNames[dt1.getUTCMonth()]} ${dt1.getUTCDate()}, ${dt1.getUTCFullYear()} -> ${monthNames[dt2.getUTCMonth()]} ${dt2.getUTCDate()}, ${dt2.getUTCFullYear()}`;
  };
  const formatMonthDay = d => {
    if (!d) return '';
    const dt = new Date(`${d}T00:00:00Z`);
    return `${monthNames[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
  };
  const formatStreakRange = (d1, d2) => {
    if (!d1 || !d2) return '';
    const dt1 = new Date(`${d1}T00:00:00Z`);
    const dt2 = new Date(`${d2}T00:00:00Z`);
    return `${monthNames[dt1.getUTCMonth()]} ${dt1.getUTCDate()} -> ${monthNames[dt2.getUTCMonth()]} ${dt2.getUTCDate()}`;
  };

  const blocks = tiles.map(d => {
    const px = x0 + d.col * sx + d.row * tx;
    const py = y0 + d.col * sy + d.row * ty;
    const ratio = d.count / peak;
    const h = d.count > 0 ? 5 + Math.pow(ratio, 0.65) * 125 : 2;

    const t0 = [n(px), n(py - h)];
    const t1 = [n(px + wx), n(py + wy - h)];
    const t2 = [n(px + wx + dx), n(py + wy + dy - h)];
    const t3 = [n(px + dx), n(py + dy - h)];

    const b1 = [n(px + wx), n(py + wy)];
    const b2 = [n(px + wx + dx), n(py + wy + dy)];
    const b3 = [n(px + dx), n(py + dy)];

    let fillTop, fillLeft, fillRight;
    if (d.count === 0) {
      fillTop = '#1c221b';
      fillLeft = '#121612';
      fillRight = '#151a14';
    } else {
      const lTop = 38 + Math.round(Math.pow(ratio, 0.5) * 38);
      const lLeft = 20 + Math.round(Math.pow(ratio, 0.5) * 25);
      const lRight = 28 + Math.round(Math.pow(ratio, 0.5) * 30);
      fillTop = `hsl(95 78% ${lTop}%)`;
      fillLeft = `hsl(95 65% ${lLeft}%)`;
      fillRight = `hsl(95 70% ${lRight}%)`;
    }

    const topFace = `<path d="M${t0[0]} ${t0[1]}L${t1[0]} ${t1[1]}L${t2[0]} ${t2[1]}L${t3[0]} ${t3[1]}Z" fill="${fillTop}"/>`;
    const leftFace = `<path d="M${t3[0]} ${t3[1]}L${t2[0]} ${t2[1]}L${b2[0]} ${b2[1]}L${b3[0]} ${b3[1]}Z" fill="${fillLeft}"/>`;
    const rightFace = `<path d="M${t2[0]} ${t2[1]}L${t1[0]} ${t1[1]}L${b1[0]} ${b1[1]}L${b2[0]} ${b2[1]}Z" fill="${fillRight}"/>`;

    return `<g><title>${d.date}: ${d.count} contributions</title>${leftFace}${rightFace}${topFace}</g>`;
  }).join('');

  const labels = monthLabels.map(m => {
    const lx = n(x0 + m.col * sx + 6 * tx + dx / 2);
    const ly = n(y0 + m.col * sy + 6 * ty + dy + 18);
    return `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="12" fill="${C.muted}">${m.month}</text>`;
  }).join('');

  if (mobile) {
    const body = `${text(30, 48, '1 year total', `font-size="13" fill="${C.muted}"`)}
<text x="30" y="85" font-size="34" font-weight="700" fill="${C.accent}">${format(total)}<tspan dx="8" font-size="15" font-weight="400" fill="${C.text}">contributions</tspan></text>
${mono(30, 108, formatRange(dates[0].date, dates.at(-1).date), C.muted, 12)}

${text(340, 48, 'Busiest day', `font-size="13" fill="${C.muted}"`)}
<text x="340" y="85" font-size="30" font-weight="700" fill="${C.accent}">${stats.peak}<tspan dx="8" font-size="14" font-weight="400" fill="${C.text}">contributions</tspan></text>
${mono(340, 108, formatMonthDay(stats.peakDate), C.muted, 12)}

<g transform="translate(-10 20) scale(.46 .66)">${blocks}${labels}</g>

<rect x="30" y="525" width="240" height="88" rx="6" fill="${C.panel}"/>
${text(45, 552, 'Longest streak', `font-size="13" fill="${C.muted}"`)}
<text x="45" y="582" font-size="28" font-weight="700" fill="${C.accent}">${stats.longest}<tspan dx="8" font-size="15" font-weight="400" fill="${C.text}">days</tspan></text>
${mono(45, 602, formatStreakRange(stats.longestStart, stats.longestEnd), C.muted, 12)}

<rect x="290" y="525" width="240" height="88" rx="6" fill="${C.panel}"/>
${text(305, 552, 'Current streak', `font-size="13" fill="${C.muted}"`)}
<text x="305" y="582" font-size="28" font-weight="700" fill="${C.accent}">${stats.current}<tspan dx="8" font-size="15" font-weight="400" fill="${C.text}">days</tspan></text>
${mono(305, 602, formatStreakRange(stats.currentStart, stats.currentEnd), C.muted, 12)}

${mono(30, 646, '3D isometric skyline, GitHub contribution history', C.muted, 13)}`;

    return svg('A 3D skyline of GitHub contributions', `${format(total)} contributions across ${summary.active} active days. Longest streak: ${stats.longest} days. Highest daily count: ${stats.peak}.`, 560, 674, body, config.accent);
  }

  // Desktop 1200 x 640
  const body = `${text(830, 56, '1 year total', `font-size="14" fill="${C.muted}"`)}
<text x="830" y="96" font-size="44" font-weight="700" fill="${C.accent}">${format(total)}<tspan dx="10" font-size="16" font-weight="400" fill="${C.text}">contributions</tspan></text>
${mono(830, 120, formatRange(dates[0].date, dates.at(-1).date), C.muted, 13)}

${text(940, 162, 'Busiest day', `font-size="14" fill="${C.muted}"`)}
<text x="940" y="200" font-size="38" font-weight="700" fill="${C.accent}">${stats.peak}<tspan dx="10" font-size="16" font-weight="400" fill="${C.text}">contributions</tspan></text>
${mono(940, 224, formatMonthDay(stats.peakDate), C.muted, 13)}

${blocks}
${labels}

${text(45, 475, 'Longest streak', `font-size="14" fill="${C.muted}"`)}
<text x="45" y="512" font-size="38" font-weight="700" fill="${C.accent}">${stats.longest}<tspan dx="10" font-size="16" font-weight="400" fill="${C.text}">days</tspan></text>
${mono(45, 534, formatStreakRange(stats.longestStart, stats.longestEnd), C.muted, 13)}

${text(45, 572, 'Current streak', `font-size="14" fill="${C.muted}"`)}
<text x="45" y="605" font-size="32" font-weight="700" fill="${C.accent}">${stats.current}<tspan dx="10" font-size="15" font-weight="400" fill="${C.text}">days</tspan></text>
${mono(45, 626, formatStreakRange(stats.currentStart, stats.currentEnd), C.muted, 13)}`;

  return svg('A 3D skyline of GitHub contributions', `${format(total)} contributions across ${summary.active} active days. Longest streak: ${stats.longest} days. Highest daily count: ${stats.peak}.`, 1200, 640, body, config.accent);
}

function activityPanel(snapshot, config, mobile = false) {
  const recent = snapshot.repositories
    .filter(repo => !repo.fork && repo.name.toLowerCase() !== snapshot.user.login.toLowerCase() && !repo.name.toLowerCase().includes('old_readme') && !repo.name.toLowerCase().includes('old-readme'))
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, 3);
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
  const logos = {
    Instagram: 'instagram',
    LinkedIn: 'linkedin',
    LeetCode: 'leetcode',
    X: 'x',
    YouTube: 'youtube',
    Website: 'safari',
  };
  const logo = logos[link.label] || 'link';
  const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(link.label)}-c5f277?style=for-the-badge&logo=${logo}&logoColor=c5f277&labelColor=111411`;
  return `[![${escapeMD(link.label)}](${badgeUrl})](${link.url})`;
}

export function repositoriesSection() {
  const badge = (label, logo, url) => `[![${escapeMD(label)}](https://img.shields.io/badge/${encodeURIComponent(label.replace(/\s+/g, '_'))}-c5f277?style=for-the-badge&logo=${logo}&logoColor=c5f277&labelColor=111411)](${url})`;

  return `## Repositories & Tech Stack

> Click any badge below to explore the code.

### Artificial Intelligence & Machine Learning

${badge('AI & ML REPO', 'github', 'https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning')}
${badge('DEEP LEARNING', 'github', 'https://github.com/RajatBhardwaj2006/Deep-Learning')}
${badge('REINFORCEMENT LEARNING', 'github', 'https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning')}

### DSA & Problem Solving

${badge('DSA IN C++', 'c%2B%2B', 'https://github.com/RajatBhardwaj2006/Data-Structures')}
${badge('LEETCODE', 'leetcode', 'https://leetcode.com/u/cherry_2006')}

### Languages

${badge('PYTHON', 'python', 'https://github.com/RajatBhardwaj2006')}
${badge('JAVA', 'openjdk', 'https://github.com/RajatBhardwaj2006/Java')}
${badge('SQL', 'postgresql', 'https://github.com/RajatBhardwaj2006')}
${badge('C++', 'c%2B%2B', 'https://github.com/RajatBhardwaj2006/CPP')}

### AI Engineering & Development

${badge('FLASK', 'flask', 'https://github.com/RajatBhardwaj2006/Fraudulent-Online-Transaction-Detection-System')}
${badge('OPENAI', 'openai', 'https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning')}
${badge('AI AGENTS', 'probot', 'https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning')}

### Frontend

${badge('HTML', 'html5', 'https://github.com/RajatBhardwaj2006')}
${badge('CSS', 'css3', 'https://github.com/RajatBhardwaj2006')}

### Development Tools

${badge('GIT', 'git', 'https://github.com/RajatBhardwaj2006')}
${badge('GITHUB', 'github', 'https://github.com/RajatBhardwaj2006')}
${badge('JUPYTERLAB', 'jupyter', 'https://github.com/RajatBhardwaj2006')}

### Libraries

${badge('NUMPY', 'numpy', 'https://github.com/RajatBhardwaj2006')}
${badge('PANDAS', 'pandas', 'https://github.com/RajatBhardwaj2006')}
${badge('SEABORN', 'seaborn', 'https://github.com/RajatBhardwaj2006')}
${badge('MATPLOTLIB', 'matplotlib', 'https://github.com/RajatBhardwaj2006')}
${badge('SCIPY', 'scipy', 'https://github.com/RajatBhardwaj2006')}
${badge('SCIKIT-LEARN', 'scikit-learn', 'https://github.com/RajatBhardwaj2006')}
${badge('PYTORCH', 'pytorch', 'https://github.com/RajatBhardwaj2006/VisionInspect-Industrial-Defect-Detection-')}
${badge('BEAUTIFUL SOUP', 'beautifulsoup', 'https://github.com/RajatBhardwaj2006')}`;
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
    <img src="assets/generated/hero.svg" width="1200" alt="${escapeXML(snapshot.user.name)}. ${escapeXML(clean(snapshot.user.bio))}. Neural network engine mapping consistency, dedication, and hardwork to success.">
  </picture>
</a>

${socials.join(' &nbsp; ')}${socials.length ? ' &nbsp; ' : ''}[![All Repositories](https://img.shields.io/badge/All%20Repositories-c5f277?style=for-the-badge&logo=github&logoColor=c5f277&labelColor=111411)](${github}?tab=repositories)

${embedded('metrics', `${snapshot.user.public_repos} public repositories, ${format(snapshot.calendar.total)} contributions in the past year, ${snapshot.user.followers} followers, ${snapshot.repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0)} stars across public repositories.`)}

## Featured Projects

${snapshot.pinned.length ? 'Featured from my GitHub pins.' : 'A selection of my public work.'}

${Array.from({ length: Math.ceil(projects.length / 2) }, (_, row) => `<p>\n${projects.slice(row * 2, row * 2 + 2).map((repo, col) => `  <a href="${escapeXML(repo.html_url)}">${embedded(`project-${row * 2 + col + 1}`, `${repo.name}: ${repo.description || 'Explore the repository on GitHub.'}`, '49%')}</a>`).join('\n')}\n</p>`).join('\n\n')}

<details>
<summary>Project links and descriptions</summary>

${projects.map(repo => `- [${escapeMD(repo.name)}](${repo.html_url})${repo.description ? `: ${escapeMD(repo.description)}` : ''}`).join('\n')}

</details>

${repositoriesSection()}

## The code behind the work

<p>
  <picture>
    <source media="(max-width: 600px)" srcset="assets/generated/languages-mobile.svg">
    <img src="assets/generated/languages.svg" width="49%" alt="Primary language by public repository count, excluding forks: ${languages.slice(0, 5).map(language => `${language.name} ${language.percent.toFixed(1)}%`).join(', ')}. These describe repositories, not proficiency.">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="assets/generated/commits-mobile.svg">
    <img src="assets/generated/commits.svg" width="49%" alt="Total commits and active days committed: ${format(snapshot.calendar.total)} contributions across ${summary.active} active days.">
  </picture>
</p>

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

${snapshot.repositories.filter(repo => !repo.fork && repo.name.toLowerCase() !== snapshot.user.login.toLowerCase() && !repo.name.toLowerCase().includes('old_readme') && !repo.name.toLowerCase().includes('old-readme')).sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 3).map(repo => `- [${escapeMD(repo.name)}](${repo.html_url}) · pushed ${dateLabel(repo.pushed_at)}`).join('\n')}

Daily counts follow GitHub's contribution calendar visibility and counting rules. Private repository names and content are never requested or published.

</details>

${embedded('activity', 'Recently pushed public repositories. Text links and dates are available in the contribution details above.')}

<a href="${github}?tab=repositories">${embedded('footer', `Explore ${snapshot.user.name}'s repositories on GitHub.`)}</a>

<sub>GitHub snapshot · ${escapeXML(snapshot.fetchedAt.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'))} · refreshed every 6 hours by [GitHub Actions](https://github.com/${snapshot.user.login}/${snapshot.user.login}/actions/workflows/sync-profile.yml). [Data & maintenance](docs/MAINTAINING.md)</sub>
`;
}

export function resolveRepositoriesAndProjects(snapshot, config) {
  const priority = (config.featuredProjects || []).map(p => p.includes('/') ? p : `${config.username}/${p}`);
  const pinned = [...new Set([...priority, ...(snapshot.pinned || [])])];
  const customRepos = [
    {
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
    }
  ];
  let allRepos = snapshot.repositories.filter(r => !r.name.toLowerCase().includes('old_readme') && !r.name.toLowerCase().includes('old-readme'));
  for (const repo of customRepos) {
    const existingIndex = allRepos.findIndex(r => r.name.toLowerCase() === repo.name.toLowerCase());
    if (existingIndex >= 0) {
      allRepos[existingIndex] = { ...allRepos[existingIndex], ...repo };
    } else {
      allRepos.push(repo);
    }
  }
  const projects = selectProjects(allRepos, pinned, snapshot.user.login, config.featuredCount);
  return { allRepos, pinned, projects };
}

export async function renderProfile(snapshot, config, root) {
  if (!snapshot.calendar?.days?.length || !snapshot.repositories || !snapshot.user) throw new Error('A complete GitHub snapshot is required.');
  const { allRepos, projects } = resolveRepositoriesAndProjects(snapshot, config);
  const dir = new URL('assets/generated/', root);
  await mkdir(dir, { recursive: true });
  const snapshotWithRepos = { ...snapshot, repositories: allRepos };
  const files = new Map([
    ['hero.svg', hero(snapshotWithRepos, config)], ['hero-mobile.svg', hero(snapshotWithRepos, config, true)],
    ['metrics.svg', metrics(snapshotWithRepos, config)], ['metrics-mobile.svg', metrics(snapshotWithRepos, config, true)],
    ['languages.svg', languagesPanel(snapshotWithRepos, config)], ['languages-mobile.svg', languagesPanel(snapshotWithRepos, config, true)],
    ['commits.svg', commitsPanel(snapshotWithRepos, config)], ['commits-mobile.svg', commitsPanel(snapshotWithRepos, config, true)],
    ['contributions.svg', contributionScene(snapshotWithRepos, config)], ['contributions-mobile.svg', contributionScene(snapshotWithRepos, config, true)],
    ['activity.svg', activityPanel(snapshotWithRepos, config)], ['activity-mobile.svg', activityPanel(snapshotWithRepos, config, true)],
    ['footer.svg', footer(snapshotWithRepos, config)], ['footer-mobile.svg', footer(snapshotWithRepos, config, true)],
    ...projects.map((repo, index) => [`project-${index + 1}.svg`, projectCard(repo, index, config)]),
    ...projects.map((repo, index) => [`project-${index + 1}-mobile.svg`, projectCard(repo, index, config, true)]),
  ]);
  for (const [name, content] of files) await writeFile(new URL(name, dir), content);
  for (const file of await readdir(dir)) if (/^project-\d+(?:-mobile)?\.svg$/.test(file) && !files.has(file)) await unlink(new URL(file, dir));
  await writeFile(new URL('README.md', root), readme(snapshotWithRepos, config, projects));
}
