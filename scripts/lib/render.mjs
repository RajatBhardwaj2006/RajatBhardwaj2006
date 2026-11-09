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
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes spin-rev{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
@keyframes tumble{0%{transform:rotate(0deg) scale(1,1)}25%{transform:rotate(90deg) scale(0.32,1)}50%{transform:rotate(180deg) scale(-1,0.5)}75%{transform:rotate(270deg) scale(0.32,-1)}100%{transform:rotate(360deg) scale(1,1)}}
@keyframes scan-vert{0%,100%{transform:translateY(-42px);opacity:.35}50%{transform:translateY(42px);opacity:1}}
@keyframes radar{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.float{animation:drift 9s ease-in-out infinite}.flow{animation:sweep 14s linear infinite}.pulse{animation:breathe 6s ease-in-out infinite}
.spin{transform-origin:480px 175px;animation:spin 18s linear infinite}
.spin-rev{transform-origin:480px 175px;animation:spin-rev 14s linear infinite}
.tumble{transform-origin:480px 175px;animation:tumble 8s ease-in-out infinite}
.scan{transform-origin:480px 175px;animation:scan-vert 3.2s ease-in-out infinite}
.radar{transform-origin:480px 175px;animation:radar 4s linear infinite}
@media(prefers-reduced-motion:reduce){.motion{display:none}.still{display:inline}.float,.flow,.pulse,.spin,.spin-rev,.tumble,.scan,.radar{animation:none}}
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
    const pulses = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const fromX = xCoords[l];
      const toX = xCoords[l + 1];
      const isToOutput = l === layers.length - 2;
      for (let i = 0; i < layers[l].length; i++) {
        const fromY = layers[l][i];
        for (let j = 0; j < layers[l + 1].length; j++) {
          const toY = layers[l + 1][j];
          lines.push(`<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="hsl(85 45% 20% / .4)" stroke-width="1"/>`);

          const seed = (l * 47 + i * 19 + j * 31) % 100;
          const delay = ((seed * 13) % 120) / 10;
          const duration = [9, 11, 13, 15, 17][seed % 5];
          const dashPatterns = ['5 25', '4 16', '6 24'];
          const dash = isToOutput ? '7 23' : dashPatterns[seed % dashPatterns.length];
          const strokeWidth = isToOutput ? 1.7 : Number((1.1 + (seed % 3) * 0.15).toFixed(2));
          const opacity = isToOutput ? 0.95 : Number((0.45 + (seed % 5) * 0.1).toFixed(2));

          pulses.push(`<line class="flow" x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" fill="none" stroke="${C.accent}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" style="animation-delay:-${delay.toFixed(1)}s;animation-duration:${duration}s;opacity:${opacity}"/>`);
        }
      }
    }

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
<g class="motion">${pulses.join('')}</g>
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
  const pulses = [];
  for (let l = 0; l < layers.length - 1; l++) {
    const fromX = xCoords[l];
    const toX = xCoords[l + 1];
    const isToOutput = l === layers.length - 2;
    for (let i = 0; i < layers[l].length; i++) {
      const fromY = layers[l][i];
      for (let j = 0; j < layers[l + 1].length; j++) {
        const toY = layers[l + 1][j];
        lines.push(`<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="hsl(85 45% 20% / .4)" stroke-width="1.1"/>`);

        const seed = (l * 47 + i * 19 + j * 31) % 100;
        const delay = ((seed * 13) % 120) / 10;
        const duration = [9, 11, 13, 15, 17][seed % 5];
        const dashPatterns = ['6 24', '5 15', '6 30', '4 26'];
        const dash = isToOutput ? '8 22' : dashPatterns[seed % dashPatterns.length];
        const strokeWidth = isToOutput ? 1.9 : Number((1.2 + (seed % 4) * 0.15).toFixed(2));
        const opacity = isToOutput ? 0.95 : Number((0.45 + (seed % 5) * 0.1).toFixed(2));

        pulses.push(`<line class="flow" x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" fill="none" stroke="${C.accent}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" style="animation-delay:-${delay.toFixed(1)}s;animation-duration:${duration}s;opacity:${opacity}"/>`);
      }
    }
  }

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
<g class="motion">${pulses.join('')}</g>
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
  if (index === 0) {
    return `<g>
      <circle cx="480" cy="175" r="65" fill="hsl(85 65% 58% / .04)" stroke="hsl(85 65% 58% / .2)" stroke-width="1" stroke-dasharray="3 5"/>
      <g class="spin-rev">
        <ellipse cx="480" cy="175" rx="64" ry="26" transform="rotate(-25 480 175)" fill="none" stroke="${C.accent}" stroke-width="1.6"/>
        <circle cx="422" cy="150" r="3.5" fill="#c5f277"/>
        <circle cx="538" cy="200" r="2.8" fill="#c5f277"/>
      </g>
      <g class="spin">
        <ellipse cx="480" cy="175" rx="26" ry="64" transform="rotate(35 480 175)" fill="none" stroke="hsl(85 65% 58% / .7)" stroke-width="1.3" stroke-dasharray="6 4"/>
        <circle cx="468" cy="115" r="3" fill="#c5f277"/>
        <circle cx="492" cy="235" r="3" fill="#c5f277"/>
      </g>
      <circle cx="480" cy="175" r="14" fill="none" stroke="${C.accent}" stroke-width="1.2" stroke-dasharray="2 3"/>
      <circle class="pulse" cx="480" cy="175" r="8" fill="#111411" stroke="${C.accent}" stroke-width="2"/>
      <circle class="pulse" cx="480" cy="175" r="4" fill="#c5f277"/>
    </g>`;
  }

  if (index === 1) {
    return `<g>
      <circle cx="480" cy="175" r="64" fill="hsl(85 65% 58% / .04)" stroke="hsl(85 65% 58% / .2)" stroke-width="1" stroke-dasharray="3 5"/>
      <g class="pulse">
        <path d="M424 125H432M428 121V129M528 225H536M532 221V229M530 125H538M534 121V129M424 225H432M428 221V229" stroke="${C.accent}" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <g class="tumble">
        <rect x="436" y="153" width="88" height="44" rx="22" fill="hsl(85 65% 58% / .09)" stroke="${C.accent}" stroke-width="2.2"/>
        <line x1="480" y1="153" x2="480" y2="197" stroke="${C.accent}" stroke-width="1.8"/>
        <line x1="458" y1="168" x2="458" y2="182" stroke="${C.accent}" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="451" y1="175" x2="465" y2="175" stroke="${C.accent}" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="496" cy="170" r="2.8" fill="#c5f277"/>
        <circle cx="504" cy="177" r="2.4" fill="#c5f277"/>
        <circle cx="494" cy="182" r="2.2" fill="#c5f277"/>
      </g>
    </g>`;
  }

  if (index === 2) {
    return `<g>
      <path d="M398 120H388V130M562 120H572V130M388 220V230H398M572 220V230H562" stroke="${C.accent}" stroke-width="1.8" fill="none"/>
      <rect x="415" y="125" width="130" height="100" rx="8" fill="hsl(85 65% 58% / .04)" stroke="${C.accent}" stroke-width="1.8"/>
      <rect x="428" y="138" width="104" height="74" rx="4" fill="none" stroke="hsl(85 65% 58% / .35)" stroke-width="1" stroke-dasharray="4 3"/>
      <rect x="488" y="152" width="30" height="26" rx="2" fill="hsl(85 65% 58% / .18)" stroke="${C.accent}" stroke-width="1.6"/>
      <circle cx="503" cy="165" r="3.5" fill="#c5f277"/>
      <text x="490" y="146" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="7" font-weight="700" fill="${C.accent}">DEFECT</text>
      <g class="scan">
        <line x1="400" y1="175" x2="560" y2="175" stroke="${C.accent}" stroke-width="2"/>
        <line x1="410" y1="175" x2="550" y2="175" stroke="${C.accent}" stroke-width="5" opacity=".35"/>
        <circle cx="480" cy="175" r="3" fill="#ffffff"/>
      </g>
    </g>`;
  }

  if (index === 3) {
    return `<g>
      <path d="M410 175 Q480 116 550 175 Q480 234 410 175Z" fill="hsl(85 65% 58% / .04)" stroke="${C.accent}" stroke-width="1.8"/>
      <circle cx="480" cy="175" r="42" fill="none" stroke="hsl(85 65% 58% / .3)" stroke-width="1" stroke-dasharray="3 4"/>
      <circle cx="480" cy="175" r="24" fill="none" stroke="hsl(85 65% 58% / .5)" stroke-width="1.2"/>
      <g class="radar">
        <line x1="480" y1="175" x2="546" y2="175" stroke="${C.accent}" stroke-width="2"/>
        <path d="M480 175 L544 156 A42 42 0 0 1 546 175 Z" fill="${C.accent}" opacity=".25"/>
      </g>
      <circle cx="480" cy="175" r="9" fill="#111411" stroke="${C.accent}" stroke-width="1.8"/>
      <circle class="pulse" cx="480" cy="175" r="4" fill="#c5f277"/>
      <line x1="395" y1="175" x2="420" y2="175" stroke="${C.accent}" stroke-width="1.2" opacity=".7"/>
      <line x1="540" y1="175" x2="565" y2="175" stroke="${C.accent}" stroke-width="1.2" opacity=".7"/>
      <line x1="480" y1="120" x2="480" y2="135" stroke="${C.accent}" stroke-width="1.2" opacity=".7"/>
      <line x1="480" y1="215" x2="480" y2="230" stroke="${C.accent}" stroke-width="1.2" opacity=".7"/>
    </g>`;
  }

  if (index === 4) {
    return `<g>
      <polygon points="480,110 536,142.5 536,207.5 480,240 424,207.5 424,142.5" fill="hsl(85 65% 58% / .04)" stroke="hsl(85 65% 58% / .7)" stroke-width="1.8"/>
      <g class="spin">
        <circle cx="480" cy="175" r="52" fill="none" stroke="${C.accent}" stroke-width="1.1" stroke-dasharray="5 7"/>
      </g>
      <path d="M455 152H447V160M505 152H513V160M447 188V196H455M513 188V196H505" stroke="${C.accent}" stroke-width="1.8" fill="none"/>
      <circle cx="467" cy="168" r="2.5" fill="#c5f277"/>
      <circle cx="493" cy="168" r="2.5" fill="#c5f277"/>
      <circle cx="480" cy="177" r="1.8" fill="#c5f277"/>
      <path d="M473 186 Q480 190 487 186" stroke="${C.accent}" stroke-width="1.5" fill="none"/>
      <g class="scan">
        <line x1="438" y1="175" x2="522" y2="175" stroke="${C.accent}" stroke-width="1.8"/>
      </g>
      <circle cx="480" cy="110" r="2.5" fill="#c5f277"/>
      <circle cx="536" cy="142.5" r="2.5" fill="#c5f277"/>
      <circle cx="536" cy="207.5" r="2.5" fill="#c5f277"/>
      <circle cx="480" cy="240" r="2.5" fill="#c5f277"/>
      <circle cx="424" cy="207.5" r="2.5" fill="#c5f277"/>
      <circle cx="424" cy="142.5" r="2.5" fill="#c5f277"/>
    </g>`;
  }

  if (index === 5) {
    const inY = [145, 175, 205];
    const hidY = [135, 175, 215];
    const lines = [];
    const pulses = [];
    for (let i = 0; i < inY.length; i++) {
      for (let j = 0; j < hidY.length; j++) {
        lines.push(`<line x1="435" y1="${inY[i]}" x2="480" y2="${hidY[j]}" stroke="hsl(85 45% 20% / .4)" stroke-width="1"/>`);
        const delay = ((i * 7 + j * 13) % 40) / 10;
        pulses.push(`<line class="flow" x1="435" y1="${inY[i]}" x2="480" y2="${hidY[j]}" fill="none" stroke="${C.accent}" stroke-width="1.4" stroke-dasharray="5 15" style="animation-delay:-${delay}s;animation-duration:11s;opacity:.8"/>`);
      }
    }
    for (let j = 0; j < hidY.length; j++) {
      lines.push(`<line x1="480" y1="${hidY[j]}" x2="525" y2="175" stroke="hsl(85 45% 20% / .4)" stroke-width="1.1"/>`);
      const delay = ((j * 17) % 30) / 10;
      pulses.push(`<line class="flow" x1="480" y1="${hidY[j]}" x2="525" y2="175" fill="none" stroke="${C.accent}" stroke-width="1.8" stroke-dasharray="6 24" style="animation-delay:-${delay}s;animation-duration:10s;opacity:.95"/>`);
    }
    const nodes = [
      ...inY.map(y => `<circle cx="435" cy="${y}" r="5.5" fill="#111411" stroke="${C.accent}" stroke-width="1.6"/><circle class="pulse" cx="435" cy="${y}" r="2.8" fill="#c5f277"/>`),
      ...hidY.map(y => `<circle cx="480" cy="${y}" r="5" fill="#111411" stroke="hsl(85 62% 48%)" stroke-width="1.5"/><circle class="pulse" cx="480" cy="${y}" r="2.5" fill="#c5f277"/>`),
      `<circle cx="525" cy="175" r="7.5" fill="#111411" stroke="${C.accent}" stroke-width="2"/><circle class="pulse" cx="525" cy="175" r="3.8" fill="#c5f277"/>`
    ];
    return `<g>
      <g class="spin">
        <circle cx="480" cy="175" r="65" fill="hsl(85 65% 58% / .04)" stroke="hsl(85 65% 58% / .25)" stroke-width="1" stroke-dasharray="4 6"/>
      </g>
      ${lines.join('')}
      <g class="motion">${pulses.join('')}</g>
      ${nodes.join('')}
    </g>`;
  }

  if (index === 6) {
    return `<g>
      <rect x="440" y="115" width="80" height="116" rx="6" fill="hsl(85 65% 58% / .05)" stroke="${C.accent}" stroke-width="1.8"/>
      <path d="M440 138 H520" stroke="hsl(85 65% 58% / .3)" stroke-width="1"/>
      <rect x="450" y="125" width="28" height="5" rx="2" fill="${C.accent}"/>
      <rect x="492" y="123" width="22" height="9" rx="4" fill="hsl(85 65% 58% / .2)" stroke="${C.accent}" stroke-width="1"/>
      <text x="503" y="130" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="6.5" font-weight="700" fill="${C.accent}">98%</text>
      <line x1="450" y1="148" x2="510" y2="148" stroke="hsl(85 65% 58% / .45)" stroke-width="2" stroke-linecap="round"/>
      <line x1="450" y1="158" x2="495" y2="158" stroke="hsl(85 65% 58% / .3)" stroke-width="2" stroke-linecap="round"/>
      <line x1="450" y1="168" x2="505" y2="168" stroke="hsl(85 65% 58% / .3)" stroke-width="2" stroke-linecap="round"/>
      <line x1="450" y1="178" x2="480" y2="178" stroke="hsl(85 65% 58% / .3)" stroke-width="2" stroke-linecap="round"/>
      <rect x="450" y="188" width="18" height="6" rx="2" fill="hsl(85 65% 58% / .2)" stroke="${C.accent}" stroke-width="0.8"/>
      <rect x="472" y="188" width="18" height="6" rx="2" fill="hsl(85 65% 58% / .2)" stroke="${C.accent}" stroke-width="0.8"/>
      <rect x="494" y="188" width="16" height="6" rx="2" fill="hsl(85 65% 58% / .2)" stroke="${C.accent}" stroke-width="0.8"/>
      <line x1="450" y1="204" x2="510" y2="204" stroke="hsl(85 65% 58% / .3)" stroke-width="2" stroke-linecap="round"/>
      <line x1="450" y1="214" x2="490" y2="214" stroke="hsl(85 65% 58% / .3)" stroke-width="2" stroke-linecap="round"/>
      <path d="M428 115 H420 V123 M532 115 H540 V123 M420 223 V231 H428 M540 223 V231 H532" stroke="${C.accent}" stroke-width="1.6" fill="none"/>
      <text x="480" y="247" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="8" font-weight="700" letter-spacing="1.5" fill="${C.accent}">ATS · MATCH 98%</text>
      <g class="scan">
        <line x1="422" y1="175" x2="538" y2="175" stroke="${C.accent}" stroke-width="2"/>
        <line x1="432" y1="175" x2="528" y2="175" stroke="${C.accent}" stroke-width="6" opacity=".35"/>
        <circle cx="480" cy="175" r="3" fill="#ffffff"/>
      </g>
    </g>`;
  }

  if (index === 7) {
    return `<g>
      <rect x="432" y="127" width="96" height="96" rx="12" transform="rotate(45 480 175)" fill="hsl(85 65% 58% / .04)" stroke="hsl(85 65% 58% / .35)" stroke-width="1.4" stroke-dasharray="4 4"/>
      <g class="spin">
        <circle cx="480" cy="175" r="58" fill="none" stroke="${C.accent}" stroke-width="1.4" stroke-dasharray="14 10 4 10"/>
        <circle cx="430" cy="145" r="3.5" fill="#c5f277"/>
        <circle cx="530" cy="205" r="3" fill="#c5f277"/>
      </g>
      <g class="spin-rev">
        <ellipse cx="480" cy="175" rx="48" ry="24" transform="rotate(30 480 175)" fill="none" stroke="${C.accent}" stroke-width="1.6"/>
        <ellipse cx="480" cy="175" rx="24" ry="48" transform="rotate(30 480 175)" fill="none" stroke="hsl(85 65% 58% / .6)" stroke-width="1.2" stroke-dasharray="5 5"/>
        <circle cx="480" cy="127" r="3" fill="#c5f277"/>
        <circle cx="480" cy="223" r="3" fill="#c5f277"/>
      </g>
      <circle cx="480" cy="175" r="16" fill="#111411" stroke="${C.accent}" stroke-width="2"/>
      <circle class="pulse" cx="480" cy="175" r="8" fill="hsl(85 65% 58% / .25)" stroke="${C.accent}" stroke-width="1.4"/>
      <circle class="pulse" cx="480" cy="175" r="3.5" fill="#c5f277"/>
      <circle cx="415" cy="175" r="2.5" fill="#c5f277"/>
      <circle cx="545" cy="175" r="2.5" fill="#c5f277"/>
      <circle cx="480" cy="110" r="2.5" fill="#c5f277"/>
      <circle cx="480" cy="240" r="2.5" fill="#c5f277"/>
      <text x="480" y="254" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="8" font-weight="700" letter-spacing="1.5" fill="${C.accent}">STYLE × CONTENT</text>
    </g>`;
  }

  if (index === 8) {
    return `<g>
      <circle cx="480" cy="175" r="66" fill="hsl(85 65% 58% / .03)" stroke="hsl(85 65% 58% / .2)" stroke-width="1" stroke-dasharray="4 6"/>
      <path d="M418 175 A62 62 0 0 1 542 175" fill="none" stroke="${C.accent}" stroke-width="1.4" stroke-dasharray="8 6"/>
      <circle cx="480" cy="120" r="10" fill="hsl(85 65% 58% / .12)" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="480" y1="130" x2="480" y2="175" stroke="${C.accent}" stroke-width="2.2"/>
      <line x1="456" y1="140" x2="504" y2="140" stroke="${C.accent}" stroke-width="2"/>
      <line x1="456" y1="140" x2="442" y2="162" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="442" y1="162" x2="452" y2="182" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="504" y1="140" x2="518" y2="160" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="518" y1="160" x2="512" y2="182" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="466" y1="175" x2="494" y2="175" stroke="${C.accent}" stroke-width="2"/>
      <line x1="466" y1="175" x2="456" y2="204" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="456" y1="204" x2="450" y2="232" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="494" y1="175" x2="504" y2="204" stroke="${C.accent}" stroke-width="1.8"/>
      <line x1="504" y1="204" x2="510" y2="232" stroke="${C.accent}" stroke-width="1.8"/>
      <circle class="pulse" cx="456" cy="140" r="3.2" fill="#c5f277"/>
      <circle class="pulse" cx="504" cy="140" r="3.2" fill="#c5f277"/>
      <circle class="pulse" cx="442" cy="162" r="3.5" fill="#c5f277"/>
      <circle class="pulse" cx="518" cy="160" r="3.5" fill="#c5f277"/>
      <circle class="pulse" cx="452" cy="182" r="2.8" fill="#c5f277"/>
      <circle class="pulse" cx="512" cy="182" r="2.8" fill="#c5f277"/>
      <circle class="pulse" cx="466" cy="175" r="3" fill="#c5f277"/>
      <circle class="pulse" cx="494" cy="175" r="3" fill="#c5f277"/>
      <circle class="pulse" cx="456" cy="204" r="3.5" fill="#c5f277"/>
      <circle class="pulse" cx="504" cy="204" r="3.5" fill="#c5f277"/>
      <circle class="pulse" cx="450" cy="232" r="2.8" fill="#c5f277"/>
      <circle class="pulse" cx="510" cy="232" r="2.8" fill="#c5f277"/>
      <path d="M440 156 A8 8 0 0 1 448 168" fill="none" stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="2 2"/>
      <text x="424" y="164" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="7" font-weight="700" fill="${C.accent}">92°</text>
      <rect x="444" y="240" width="72" height="15" rx="3" fill="hsl(85 65% 58% / .12)" stroke="${C.accent}" stroke-width="1"/>
      <circle class="pulse" cx="453" cy="247.5" r="2.5" fill="#c5f277"/>
      <text x="461" y="251" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="7.5" font-weight="700" fill="${C.accent}">POSE TRACKED</text>
    </g>`;
  }

  return `<g>
    <circle cx="480" cy="175" r="54" fill="hsl(85 65% 58% / .04)" stroke="${C.accent}" stroke-width="1.6" stroke-dasharray="4 6"/>
    <circle cx="480" cy="175" r="24" fill="none" stroke="${C.accent}" stroke-width="1.2"/>
    <circle class="pulse" cx="480" cy="175" r="6" fill="#c5f277"/>
  </g>`;
}

function projectCard(repo, index, config, mobile = false, fullWidth = false) {
  const title = repo.name.replaceAll(/[-_]+/g, ' ').trim();
  const desc = repo.description || 'Explore the source, documentation, and latest changes on GitHub.';
  const topics = wrap(repo.topics.length ? repo.topics.slice(0, fullWidth ? 5 : 3).join(' / ') : repo.language || 'Public source', fullWidth ? 90 : 66, 1)[0];
  const art = `<g class="float" style="animation-duration:${8 + index * 2}s">${projectArt(index, repo)}</g>`;

  if (mobile) {
    const body = `<g transform="translate(20 3) scale(.65)">${art}</g>
${mono(20, 36, repo.language || 'Repository', C.accent, 13)}
${lines(20, 158, title, 21, 3, 27, C.text, 34)}
${rule(20, 278, 320, 278)}${mono(20, 312, `${repo.stargazers_count} stars`, C.muted, 15)}
${text(320, 312, 'Explore ↗', `text-anchor="end" font-size="16" fill="${C.accent}"`)}`;
    return svg(repo.name, `${repo.description || repo.name}. ${repo.language || 'Source repository'}. ${repo.stargazers_count} stars. Last pushed ${dateLabel(repo.pushed_at)}.`, 340, 340, body, config.accent);
  }

  if (fullWidth) {
    const body = `<g transform="translate(480 0)">${art}</g>
${mono(42, 44, repo.language || 'Repository', C.accent, 14)}
${lines(42, 130, title, 40, 2, 32, C.text, 38)}
${lines(42, 215, desc, 74, 3, 17, C.muted, 25)}
${mono(42, 298, topics, C.muted, 13)}${rule(42, 324, 1158, 324)}
${mono(42, 351, `${repo.stargazers_count} stars   /   ${repo.forks_count} forks`, C.muted, 13)}
${text(1158, 351, 'Explore ↗', `text-anchor="end" font-size="14" fill="${C.accent}"`)}`;
    return svg(repo.name, `${repo.description || repo.name}. ${repo.language || 'Source repository'}. ${repo.stargazers_count} stars. Last pushed ${dateLabel(repo.pushed_at)}.`, 1200, 370, body, config.accent);
  }

  const body = `${art}${mono(28, 40, repo.language || 'Repository', C.accent, 14)}
${lines(28, 161, title, 32, 2, 28, C.text, 34)}
${lines(28, 244, desc, 59, 2, 16, C.muted, 24)}
${mono(28, 304, topics, C.muted, 12)}${rule(28, 324, 552, 324)}
${mono(28, 351, `${repo.stargazers_count} stars   /   ${repo.forks_count} forks`, C.muted, 13)}
${text(552, 351, 'Explore ↗', `text-anchor="end" font-size="14" fill="${C.accent}"`)}`;
  return svg(repo.name, `${repo.description || repo.name}. ${repo.language || 'Source repository'}. ${repo.stargazers_count} stars. Last pushed ${dateLabel(repo.pushed_at)}.`, 580, 370, body, config.accent);
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
  const totalDays = Math.min(365, calendar.days.length);
  const consistency = ((activeDays / totalDays) * 100).toFixed(1);

  if (mobile) {
    const cx = 280, cy = 250, radius = 100, stroke = 24;
    const circ = n(2 * Math.PI * radius);
    const progress = n(circ * Math.min(1, activeDays / totalDays));
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
<text x="50" y="548" font-size="22" font-weight="700" fill="${C.text}">${activeDays} <tspan font-size="15" font-weight="400" fill="${C.muted}">/ ${totalDays} days</tspan></text>

<rect x="30" y="575" width="500" height="66" rx="6" fill="${C.panel}"/>
<text x="50" y="602" font-size="14" fill="${C.muted}">Longest streak</text>
<text x="50" y="628" font-size="22" font-weight="700" fill="${C.text}">${summary.longest} <tspan font-size="15" font-weight="400" fill="${C.muted}">days</tspan></text>

<rect x="30" y="655" width="500" height="66" rx="6" fill="${C.panel}"/>
<text x="50" y="682" font-size="14" fill="${C.muted}">Busiest day</text>
<text x="50" y="708" font-size="22" font-weight="700" fill="${C.accent}">${summary.peak} <tspan font-size="15" font-weight="400" fill="${C.muted}">contributions</tspan></text>

${text(30, 755, `${totalDays}-day tracking, GitHub contribution calendar`, `font-size="15" fill="${C.muted}"`)}`;

    return svg('Total commits and active days committed', `${format(total)} contributions across ${activeDays} active days. Longest streak: ${summary.longest} days. Consistency: ${consistency}%.`, 560, 780, body, config.accent);
  }

  // Desktop: 580 x 462
  const cx = 150, cy = 230, radius = 86, stroke = 22;
  const circ = n(2 * Math.PI * radius);
  const progress = n(circ * Math.min(1, activeDays / totalDays));
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
<text x="320" y="219" font-size="22" font-weight="700" fill="${C.text}">${activeDays} <tspan font-size="15" font-weight="400" fill="${C.muted}">/ ${totalDays} days</tspan></text>

<rect x="300" y="244" width="245" height="64" rx="6" fill="${C.panel}"/>
<text x="320" y="269" font-size="13" fill="${C.muted}">Longest streak</text>
<text x="320" y="295" font-size="22" font-weight="700" fill="${C.text}">${summary.longest} <tspan font-size="15" font-weight="400" fill="${C.muted}">days</tspan></text>

<rect x="300" y="320" width="245" height="64" rx="6" fill="${C.panel}"/>
<text x="320" y="345" font-size="13" fill="${C.muted}">Busiest day</text>
<text x="320" y="371" font-size="22" font-weight="700" fill="${C.accent}">${summary.peak} <tspan font-size="15" font-weight="400" fill="${C.muted}">contributions</tspan></text>

${text(36, 422, `${totalDays}-day tracking, GitHub contribution calendar`, `font-size="14" fill="${C.muted}"`)}`;

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
  const totalDays = Math.min(365, dates.length);
  const windowDays = dates.slice(-totalDays);
  const startDate = windowDays[0].date;
  const endDate = windowDays.at(-1).date;
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

  const sx = 18.7, sy = 7.865;
  const tx = -12.925, ty = 6.38;
  const wx = 14.52, wy = 6.16;
  const dx = -10.12, dy = 4.95;
  const x0 = 124, y0 = 154;

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
    const h = d.count > 0 ? 5 + Math.pow(ratio, 0.65) * 146 : 2;

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
    const body = `${text(30, 48, `1 year total (${totalDays} days)`, `font-size="13" fill="${C.muted}"`)}
<text x="30" y="85" font-size="34" font-weight="700" fill="${C.accent}">${format(total)}<tspan dx="8" font-size="15" font-weight="400" fill="${C.text}">contributions</tspan></text>
${mono(30, 108, formatRange(startDate, endDate), C.muted, 12)}

${text(340, 48, 'Busiest day', `font-size="13" fill="${C.muted}"`)}
<text x="340" y="85" font-size="30" font-weight="700" fill="${C.accent}">${stats.peak}<tspan dx="8" font-size="14" font-weight="400" fill="${C.text}">contributions</tspan></text>
${mono(340, 108, formatMonthDay(stats.peakDate), C.muted, 12)}

<g transform="translate(5 30) scale(.45 .63)">${blocks}${labels}</g>

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
  const body = `${text(1160, 48, `1 year total (${totalDays} days)`, `text-anchor="end" font-size="14" fill="${C.muted}"`)}
<text x="1160" y="88" text-anchor="end" font-size="44" font-weight="700" fill="${C.accent}">${format(total)}<tspan dx="10" font-size="16" font-weight="400" fill="${C.text}">contributions</tspan></text>
<text x="1160" y="112" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="13" fill="${C.muted}">${escapeXML(formatRange(startDate, endDate))}</text>

${text(1160, 156, 'Busiest day', `text-anchor="end" font-size="14" fill="${C.muted}"`)}
<text x="1160" y="194" text-anchor="end" font-size="38" font-weight="700" fill="${C.accent}">${stats.peak}<tspan dx="10" font-size="16" font-weight="400" fill="${C.text}">contributions</tspan></text>
<text x="1160" y="218" text-anchor="end" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="13" fill="${C.muted}">${escapeXML(formatMonthDay(stats.peakDate))}</text>

${blocks}
${labels}

${text(38, 478, 'Longest streak', `font-size="14" fill="${C.muted}"`)}
<text x="38" y="515" font-size="38" font-weight="700" fill="${C.accent}">${stats.longest}<tspan dx="10" font-size="16" font-weight="400" fill="${C.text}">days</tspan></text>
${mono(38, 537, formatStreakRange(stats.longestStart, stats.longestEnd), C.muted, 13)}

${text(38, 575, 'Current streak', `font-size="14" fill="${C.muted}"`)}
<text x="38" y="608" font-size="32" font-weight="700" fill="${C.accent}">${stats.current}<tspan dx="10" font-size="15" font-weight="400" fill="${C.text}">days</tspan></text>
${mono(38, 628, formatStreakRange(stats.currentStart, stats.currentEnd), C.muted, 13)}`;

  return svg('A 3D skyline of GitHub contributions', `${format(total)} contributions across ${summary.active} active days. Longest streak: ${stats.longest} days. Highest daily count: ${stats.peak}.`, 1200, 640, body, config.accent);
}

function activityPanel(snapshot, config, mobile = false) {
  const recent = snapshot.repositories
    .filter(repo => !repo.fork && !repo.private && !repo.featuredOnly && repo.name.toLowerCase() !== snapshot.user.login.toLowerCase() && !repo.name.toLowerCase().includes('old_readme') && !repo.name.toLowerCase().includes('old-readme'))
    .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, 3);
  if (mobile) {
    const body = `${text(30, 48, 'Still in the making.', `font-size="28" font-weight="600" fill="${C.text}"`)}
<text x="30" y="74" font-size="13" fill="${C.muted}">Latest public updates and commit activity.</text>
${recent.map((repo, i) => {
  const y = 118 + i * 96;
  const name = wrap(repo.name.replaceAll(/[-_]+/g, ' ').trim(), 36, 1)[0];
  const msg = wrap(repo.last_commit_message || repo.description || 'Repository update', 46, 1)[0];
  return `${mono(30, y, dateLabel(repo.pushed_at), C.accent, 13)}
${text(30, y + 24, name, `font-size="18" font-weight="600" fill="${C.text}"`)}
<text x="30" y="${y + 46}" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="12" fill="${C.muted}"><tspan fill="${C.accent}">commit: </tspan>&quot;${escapeXML(msg)}&quot;</text>
${i < recent.length - 1 ? `<path d="M30 ${y + 66}H530" stroke="#232a21" stroke-width="1"/>` : ''}`;
}).join('')}`;
    return svg('Recently pushed public repositories', recent.map(repo => `${repo.name}: ${dateLabel(repo.pushed_at)} - ${repo.last_commit_message || 'update'}`).join('. '), 560, 420, body, config.accent);
  }

  // Desktop 1200 x 330
  const body = `${text(42, 54, 'Still in the making.', `font-size="29" font-weight="600" fill="${C.text}"`)}
<text x="42" y="80" font-size="14" fill="${C.muted}">Latest commits pushed across public repositories.</text>
${recent.map((repo, i) => {
  const y = 126 + i * 68;
  const name = wrap(repo.name.replaceAll(/[-_]+/g, ' ').trim(), 64, 1)[0];
  const msg = wrap(repo.last_commit_message || repo.description || 'Repository update', 85, 1)[0];
  return `${mono(42, y, dateLabel(repo.pushed_at), C.accent, 14)}
${text(190, y, name, `font-size="19" font-weight="600" fill="${C.text}"`)}
<text x="190" y="${y + 23}" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="13" fill="${C.muted}"><tspan fill="${C.accent}">commit: </tspan>&quot;${escapeXML(msg)}&quot;</text>
${i < recent.length - 1 ? `<path d="M190 ${y + 38}H1158" stroke="#232a21" stroke-width="1"/>` : ''}`;
}).join('')}`;

  return svg('Recently pushed public repositories', recent.map(repo => `${repo.name}: ${dateLabel(repo.pushed_at)} - ${repo.last_commit_message || 'update'}`).join('. '), 1200, 330, body, config.accent);
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
    LinkedIn: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2M1ZjI3NyIgZD0iTTIwLjQ0NyAyMC40NTJoLTMuNTU0di01LjU2OWMwLTEuMzI4LS4wMjctMy4wMzctMS44NTItMy4wMzctMS44NTMgMC0yLjEzNiAxLjQ0NS0yLjEzNiAyLjkzOXY1LjY2N0g5LjM1MVY5aDMuNDE0djEuNTYxaC4wNDZjLjQ3Ny0uOSAxLjYzNy0xLjg1IDMuMzctMS44NSAzLjYwMSAwIDQuMjY3IDIuMzcgNC4yNjcgNS40NTV2Ni4yODZ6TTUuMzM3IDcuNDMzYy0xLjE0NCAwLTIuMDYzLS45MjYtMi4wNjMtMi4wNjUgMC0xLjEzOC45Mi0yLjA2MyAyLjA2My0yLjA2MyAxLjE0IDAgMi4wNjQuOTI1IDIuMDY0IDIuMDYzIDAgMS4xMzktLjkyNSAyLjA2NS0yLjA2NCAyLjA2NXptMS43ODIgMTMuMDE5SDMuNTU1VjloMy41NjR2MTEuNDUyek0yMi4yMjUgMEgxLjc3MUMuNzkyIDAgMCAuNzc0IDAgMS43Mjl2MjAuNTQyQzAgMjMuMjI3Ljc5MiAyNCAxLjc3MSAyNGgyMC40NTFDMjMuMiAyNCAyNCAyMy4yMjcgMjQgMjIuMjcxVjEuNzI5QzI0IC43NzQgMjMuMiAwIDIyLjIyMiAwaC4wMDN6Ii8+PC9zdmc+',
    LeetCode: 'leetcode',
    X: 'x',
    YouTube: 'youtube',
    Website: 'safari',
  };
  const logo = logos[link.label] || 'link';
  const logoParam = logo.startsWith('data:') ? encodeURIComponent(logo) : logo;
  const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(link.label)}-c5f277?style=for-the-badge&logo=${logoParam}&logoColor=c5f277&labelColor=111411`;
  return `<a href="${escapeXML(link.url)}"><img src="${badgeUrl}" alt="${escapeXML(link.label)}" /></a>`;
}

export function repositoriesSection() {
  const openaiSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#c5f277" d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494z"/></svg>';
  const matplotlibSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#c5f277" d="M3 3v18h18v-2H5V3H3zm4 14h2v-4H7v4zm4 0h2V7h-2v10zm4 0h2v-7h-2v7zm4 0h2v-9h-2v9z"/></svg>';
  const seabornSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#c5f277" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
  const beautifulsoupSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#c5f277" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a3.5 3.5 0 0 1-7 0V15a3.5 3.5 0 0 1 7 0zm6-4a3.5 3.5 0 0 1-7 0V11a3.5 3.5 0 0 1 7 0z"/></svg>';
  const dataUri = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const aiml = 'https://github.com/RajatBhardwaj2006/Artificial-Intelligence-and-Machine-Learning';

  const items = [
    { name: 'AI & ML REPO', logo: 'github', url: aiml, desc: 'Core machine learning systems, statistical models and neural networks.' },
    { name: 'DEEP LEARNING', logo: 'pytorch', url: 'https://github.com/RajatBhardwaj2006/Deep-Learning', desc: 'Deep neural networks, CNN architectures and computer vision pipelines.' },
    { name: 'REINFORCEMENT LEARNING', logo: dataUri(openaiSvg), url: `${aiml}/tree/main/Reinforcement_Learning`, desc: 'Q-learning, policy optimization and autonomous agent simulations.' },
    { name: 'DSA IN C++', logo: 'c%2B%2B', url: 'https://github.com/RajatBhardwaj2006/Data-Structures', desc: 'Data structures, algorithmic paradigms and high-performance solutions.' },
    { name: 'LEETCODE', logo: 'leetcode', url: 'https://github.com/RajatBhardwaj2006/LeetCode', desc: 'Competitive programming, algorithmic problem solving and DSA patterns.' },
    { name: 'ALGORITHMS', logo: 'c%2B%2B', url: 'https://github.com/RajatBhardwaj2006/Data-Structures', desc: 'Graph theory, dynamic programming, sorting and computational optimization.' },
    { name: 'PYTHON', logo: 'python', url: `${aiml}/tree/main/Python`, desc: 'Core language for AI models, deep learning, automation and backend APIs.' },
    { name: 'JAVA', logo: 'openjdk', url: 'https://github.com/RajatBhardwaj2006/Java', desc: 'Object-oriented programming, enterprise software and backend architecture.' },
    { name: 'SQL', logo: 'postgresql', url: `${aiml}/tree/main/SQL`, desc: 'Relational database schema design, complex queries and optimization.' },
    { name: 'C++', logo: 'c%2B%2B', url: 'https://github.com/RajatBhardwaj2006/CPP', desc: 'Low-level systems programming, memory control and fast computation.' },
    { name: 'JAVASCRIPT', logo: 'javascript', url: null, desc: 'Interactive web logic, asynchronous workflows and modern UI scripting.' },
    { name: 'FLASK', logo: 'flask', url: `${aiml}/tree/main/Flask`, desc: 'Lightweight RESTful API endpoints and machine learning inference services.' },
    { name: 'OPENAI', logo: dataUri(openaiSvg), url: `${aiml}/tree/main/OpenAI`, desc: 'LLM integrations, prompt engineering and intelligent cognitive systems.' },
    { name: 'AI AGENTS', logo: 'probot', url: `${aiml}/tree/main/AIAgent`, desc: 'Autonomous multi-agent architectures, reasoning and task automation.' },
    { name: 'HTML5', logo: 'html5', url: `${aiml}/tree/main/HTML`, desc: 'Semantic page structure, modern accessibility standards and web components.' },
    { name: 'CSS3', logo: 'css', url: `${aiml}/tree/main/CSS`, desc: 'Modern responsive styling, Flexbox, CSS Grid layouts and animations.' },
    { name: 'GIT', logo: 'git', url: `${aiml}/tree/main/Github`, desc: 'Distributed version control, branch management and collaboration workflows.' },
    { name: 'GITHUB', logo: 'github', url: `${aiml}/tree/main/Github`, desc: 'Repository hosting, GitHub Actions CI/CD automation and open-source code.' },
    { name: 'JUPYTERLAB', logo: 'jupyter', url: null, desc: 'Interactive computational notebooks, EDA and machine learning experiments.' },
    { name: 'NUMPY', logo: 'numpy', url: `${aiml}/tree/main/Numpy`, desc: 'Vectorized computing, multi-dimensional array operations and linear algebra.' },
    { name: 'PANDAS', logo: 'pandas', url: `${aiml}/tree/main/Pandas`, desc: 'Data manipulation, tabular cleaning, aggregation and exploratory analysis.' },
    { name: 'SEABORN', logo: dataUri(seabornSvg), url: `${aiml}/tree/main/Seaborn`, desc: 'Statistical data visualization, distribution plots and correlation heatmaps.' },
    { name: 'MATPLOTLIB', logo: dataUri(matplotlibSvg), url: `${aiml}/tree/main/Matplotlib`, desc: 'Customizable plotting, figure layouts, graphs and visual analytics.' },
    { name: 'SCIPY', logo: 'scipy', url: null, desc: 'Advanced scientific algorithms, optimization, integration and statistics.' },
    { name: 'SCIKIT-LEARN', logo: 'scikit-learn', url: null, desc: 'Predictive models, classification, regression, clustering and pipelines.' },
    { name: 'PYTORCH', logo: 'pytorch', url: 'https://github.com/RajatBhardwaj2006/Deep-Learning', desc: 'Deep learning frameworks, neural architectures and GPU-accelerated tensors.' },
    { name: 'BEAUTIFUL SOUP', logo: dataUri(beautifulsoupSvg), url: `${aiml}/tree/main/Data_Collection`, desc: 'Web scraping, HTML/XML DOM parsing and structured data extraction.' }
  ];

  const rows = [];
  for (let i = 0; i < items.length; i += 3) {
    const chunk = items.slice(i, i + 3);
    const cells = chunk.map(item => {
      const logoParam = item.logo.startsWith('data:') ? encodeURIComponent(item.logo) : item.logo;
      const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(item.name.replace(/\s+/g, '_'))}-c5f277?style=for-the-badge&logo=${logoParam}&logoColor=c5f277&labelColor=111411`;
      const badgeImg = `<img src="${badgeUrl}" alt="${escapeXML(item.name)}" />`;
      const badgeHtml = item.url ? `<a href="${item.url}">\n        ${badgeImg}\n      </a>` : badgeImg;
      return `    <td width="33%" valign="top">
      ${badgeHtml}
      <br/>
      <sub>${escapeXML(item.desc)}</sub>
    </td>`;
    });
    rows.push(`  <tr>\n${cells.join('\n')}\n  </tr>`);
  }

  return `## Repositories & Tech Stack

> Click any box below to explore the repository or skill.

<table width="100%">
${rows.join('\n')}
</table>`;
}

export function readme(snapshot, config, projects) {
  const summary = calendarSummary(snapshot.calendar);
  const totalDays = Math.min(365, snapshot.calendar.days.length);
  const windowDays = snapshot.calendar.days.slice(-totalDays);
  const startDate = windowDays[0].date;
  const endDate = windowDays.at(-1).date;
  const languages = aggregateLanguages(snapshot.repositories);
  const socials = safeSocial(snapshot).map(link => formatSocialBadge(link));

  const phoneSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#c5f277" d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.4-1.1-.6-2.3-.6-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/></svg>';
  const phoneDataUri = `data:image/svg+xml;base64,${Buffer.from(phoneSvg).toString('base64')}`;

  const contact = config.contact || {
    whatsapp: '8580412977',
    phone: '8219253008'
  };

  const whatsappNum = contact.whatsapp || contact.phones?.[0] || '8580412977';
  const cleanWa = String(whatsappNum).replace(/\D/g, '');
  const intlWa = cleanWa.length === 10 ? `91${cleanWa}` : cleanWa;
  const waBadge = whatsappNum ?
    `<a href="https://wa.me/${intlWa}"><img src="https://img.shields.io/badge/${encodeURIComponent(whatsappNum)}-c5f277?style=for-the-badge&logo=whatsapp&logoColor=c5f277&labelColor=111411" alt="WhatsApp: ${escapeXML(whatsappNum)}" /></a>` : '';

  const phoneNum = contact.phone || contact.phones?.[1] || '8219253008';
  const cleanPhone = String(phoneNum).replace(/\D/g, '');
  const intlPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
  const callBadge = phoneNum ?
    `<a href="tel:${intlPhone}"><img src="https://img.shields.io/badge/${encodeURIComponent(phoneNum)}-c5f277?style=for-the-badge&logo=${encodeURIComponent(phoneDataUri)}&logoColor=c5f277&labelColor=111411" alt="Phone: ${escapeXML(phoneNum)}" /></a>` : '';

  const github = snapshot.user.html_url;
  const allBadges = [
    ...socials,
    ...(waBadge ? [waBadge] : []),
    ...(callBadge ? [callBadge] : []),
    `<a href="${escapeXML(github)}?tab=repositories"><img src="https://img.shields.io/badge/All%20Repositories-c5f277?style=for-the-badge&logo=github&logoColor=c5f277&labelColor=111411" alt="All Repositories" /></a>`
  ];

  const v = Date.parse(snapshot.fetchedAt);
  const embedded = (name, alt, width = '1200') => `<picture><source media="(max-width: 600px)" srcset="assets/generated/${name}-mobile.svg?v=${v}"><img src="assets/generated/${name}.svg?v=${v}" width="${width}" alt="${escapeXML(alt)}"></picture>`;
  return `<!-- Generated by scripts/lib/render.mjs from data/profile.json. See docs/MAINTAINING.md. -->

<a href="${escapeXML(github)}">
  <picture>
    <source media="(max-width: 600px)" srcset="assets/generated/hero-mobile.svg?v=${v}">
    <img src="assets/generated/hero.svg?v=${v}" width="1200" alt="${escapeXML(snapshot.user.name)}. ${escapeXML(clean(snapshot.user.bio))}. Neural network engine mapping consistency, dedication, and hardwork to success.">
  </picture>
</a>

<table width="100%">
  <tr>
${allBadges.map(badge => `    <td align="center" width="16.66%">${badge}</td>`).join('\n')}
  </tr>
</table>

${embedded('metrics', `${snapshot.user.public_repos} public repositories, ${format(snapshot.calendar.total)} contributions in the past year, ${snapshot.user.followers} followers, ${snapshot.repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0)} stars across public repositories.`)}

## Featured Projects

${snapshot.pinned.length ? 'Featured from my GitHub pins.' : 'A selection of my public work.'}

${Array.from({ length: Math.ceil(projects.length / 2) }, (_, row) => {
  const rowProjects = projects.slice(row * 2, row * 2 + 2);
  const isSolo = rowProjects.length === 1;
  return `<p>\n${rowProjects.map((repo, col) => {
    const projIndex = row * 2 + col + 1;
    const width = isSolo ? '100%' : '49%';
    return `  <a href="${escapeXML(repo.html_url)}">${embedded(`project-${projIndex}`, `${repo.name}: ${repo.description || 'Explore the repository on GitHub.'}`, width)}</a>`;
  }).join('\n')}\n</p>`;
}).join('\n\n')}

<details>
<summary>Project links and descriptions</summary>

${projects.map(repo => `- [${escapeMD(repo.name)}](${repo.html_url})${repo.description ? `: ${escapeMD(repo.description)}` : ''}`).join('\n')}

</details>

${repositoriesSection()}

## The code behind the work

<p>
  <picture>
    <source media="(max-width: 600px)" srcset="assets/generated/languages-mobile.svg?v=${v}">
    <img src="assets/generated/languages.svg?v=${v}" width="49%" alt="Primary language by public repository count, excluding forks: ${languages.slice(0, 5).map(language => `${language.name} ${language.percent.toFixed(1)}%`).join(', ')}. These describe repositories, not proficiency.">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="assets/generated/commits-mobile.svg?v=${v}">
    <img src="assets/generated/commits.svg?v=${v}" width="49%" alt="Total commits and active days committed: ${format(snapshot.calendar.total)} contributions across ${summary.active} active days.">
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
    <source media="(max-width: 600px)" srcset="assets/generated/contributions-mobile.svg?v=${v}">
    <img src="assets/generated/contributions.svg?v=${v}" width="1200" alt="${format(snapshot.calendar.total)} contributions, ${summary.active} active days, ${summary.longest}-day longest streak, and ${summary.peak} contributions on the busiest day. A 3D skyline built from GitHub's exact daily counts.">
  </picture>
</a>

<details>
<summary>Contribution data and recent repositories</summary>

${format(snapshot.calendar.total)} contributions across ${summary.active} active days in the ${totalDays}-day calendar window (${dateLabel(startDate)} to ${dateLabel(endDate)}). Longest streak within this window: ${summary.longest} days. Best day: ${summary.peak} contributions.

${snapshot.repositories.filter(repo => !repo.fork && !repo.private && !repo.featuredOnly && repo.name.toLowerCase() !== snapshot.user.login.toLowerCase() && !repo.name.toLowerCase().includes('old_readme') && !repo.name.toLowerCase().includes('old-readme')).sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 3).map(repo => {
  const commit = repo.last_commit_message ? ` - *"${escapeMD(repo.last_commit_message)}"*` : '';
  return `- [${escapeMD(repo.name)}](${repo.html_url}) · pushed ${dateLabel(repo.pushed_at)}${commit}`;
}).join('\n')}

Daily counts follow GitHub's contribution calendar visibility and counting rules. Private repository names and content are never requested or published.

</details>

${embedded('activity', 'Recently pushed public repositories. Text links and dates are available in the contribution details above.')}

<a href="${github}?tab=repositories">${embedded('footer', `Explore ${snapshot.user.name}'s repositories on GitHub.`)}</a>

<sub>GitHub snapshot · ${escapeXML(snapshot.fetchedAt.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'))} · refreshed automatically by [GitHub Actions](https://github.com/${snapshot.user.login}/${snapshot.user.login}/actions/workflows/sync-profile.yml). [Data & maintenance](docs/MAINTAINING.md)</sub>
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
      private: false,
      featuredOnly: true
    },
    {
      name: 'AI-Resume-ATS',
      description: 'AI-powered Resume and ATS evaluator to score applicant resumes, match skills against job requirements, and optimize ATS keyword ranking.',
      language: 'Python',
      topics: ['artificial-intelligence', 'nlp', 'resume-parser', 'ats-evaluator']
    },
    {
      name: 'Neural-Style-Transfer--NST-',
      description: 'Deep learning pipeline implementing Neural Style Transfer with Convolutional Neural Networks to blend artistic styles with content images.',
      language: 'Python',
      topics: ['deep-learning', 'computer-vision', 'neural-style-transfer', 'pytorch']
    },
    {
      name: 'AI-GYM-Trainer',
      description: 'Real-time computer vision fitness assistant that tracks workout repetitions, analyzes body pose landmarks, and provides instant posture feedback.',
      language: 'Python',
      topics: ['computer-vision', 'pose-estimation', 'fitness-tracker', 'opencv']
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
    ...projects.map((repo, index) => {
      const isSolo = (projects.length % 2 === 1 && index === projects.length - 1);
      return [`project-${index + 1}.svg`, projectCard(repo, index, config, false, isSolo)];
    }),
    ...projects.map((repo, index) => [`project-${index + 1}-mobile.svg`, projectCard(repo, index, config, true)]),
  ]);
  for (const [name, content] of files) await writeFile(new URL(name, dir), content);
  for (const file of await readdir(dir)) if (/^project-\d+(?:-mobile)?\.svg$/.test(file) && !files.has(file)) await unlink(new URL(file, dir));
  await writeFile(new URL('README.md', root), readme(snapshotWithRepos, config, projects));
}
