/**
 * Serve the existing production build on an isolated loopback origin for QA.
 * Run after `npm run build`: node scripts/validation-preview.mjs
 * A visible, read-only panel records browser timing without changing app state.
 * Files are served without caching so reloads repeat the local transfer; these
 * timings describe this computer and loopback, not a public deployment.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.VALIDATION_PORT || 4317);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const instrumentation = `<script>
(() => {
  const samples = [];
  let startup;
  let panel;
  const paint = () => {
    if (!panel) return;
    panel.textContent = 'LOCAL QA ONLY | first usable lesson: ' + (startup ?? 'pending') + ' ms | ' +
      innerWidth + '×' + innerHeight + ' | nav click → two animation frames: ' + JSON.stringify(samples);
  };
  const afterPaint = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const observer = new MutationObserver(() => {
    if (startup !== undefined || !document.querySelector('[role="tabpanel"] button')) return;
    startup = 'measuring';
    afterPaint(() => { startup = Math.round(performance.now() * 10) / 10; paint(); });
    observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('DOMContentLoaded', () => {
    panel = document.createElement('output');
    panel.id = 'validation-metrics';
    panel.setAttribute('aria-label', 'Local validation timings');
    panel.style.cssText = 'position:fixed;bottom:0;right:0;max-width:75%;z-index:9999;background:#fff;color:#111;font:11px monospace;padding:4px;pointer-events:none';
    document.body.append(panel);
    paint();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('nav button');
    if (!button) return;
    const label = button.textContent.trim().replace(/\\s+/g, ' ');
    if (!label.startsWith('Practice') && !label.includes('Problem')) return;
    const started = performance.now();
    afterPaint(() => {
      samples.push({ target: label, ms: Math.round((performance.now() - started) * 10) / 10 });
      paint();
    });
  }, true);
})();
</script>`;

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(dist, pathname === '/' ? 'index.html' : '.' + pathname);
    if (!path.startsWith(resolve(dist) + sep)) {
      response.writeHead(403).end();
      return;
    }
    let body = await readFile(path);
    if (extname(path) === '.html') body = Buffer.from(body.toString().replace('<head>', '<head>' + instrumentation));
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => console.log('Validation preview: http://127.0.0.1:' + port));
