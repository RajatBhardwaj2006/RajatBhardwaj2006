import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const page = await readFile(new URL('../docs/preview.html', import.meta.url));
function previewMarkup(markdown) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<details>[\s\S]*?<\/details>/g, block => `<details>${block.match(/<summary>[\s\S]*?<\/summary>/)?.[0] || '<summary>Data details</summary>'}<p>Open README.md for the complete accessible text and source data.</p></details>`)
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^(\[[^\n]+)$/gm, '<p class="links">$1</p>')
    .replace(/^(Featured from my GitHub pins\.|A selection of my public work\.)$/gm, '<p class="intro">$1</p>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (requested === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const markdown = await readFile(new URL('../README.md', import.meta.url), 'utf8');
      return res.end(page.toString().replace('<!-- PROFILE -->', previewMarkup(markdown)));
    }
    const file = resolve(root, `.${requested}`);
    if (!file.startsWith(`${root}${sep}`) || !requested.startsWith('/assets/generated/') || extname(file) !== '.svg') {
      res.writeHead(404); return res.end('Not found');
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Profile preview: http://127.0.0.1:${port}`));
