// Genera dist/: la microapp para el celular, sin servidor.
// index.html lleva todo el juego dentro (CSS y JS en línea); al lado van el
// manifiesto, los iconos y el service worker para instalarla y jugar sin conexión.
// El progreso se guarda en el dispositivo (modo local del cliente).

import { build, transform } from 'esbuild';
import { readFile, writeFile, rm, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = path.join(root, 'client');
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const js = await build({
  entryPoints: [path.join(client, 'app.js')],
  bundle: true,
  format: 'iife',
  target: ['es2022', 'safari15'],
  minify: true,
  write: false,
  legalComments: 'none',
  define: { __AFUEGO_STATIC__: 'true' },
  // En el servidor /shared se sirve junto al cliente; aquí se resuelve a la carpeta real.
  plugins: [{
    name: 'shared',
    setup(b) {
      b.onResolve({ filter: /^\.\/shared\// }, (args) => ({ path: path.join(root, args.path) }));
    }
  }]
});
const css = await transform(await readFile(path.join(client, 'styles.css'), 'utf8'), { loader: 'css', minify: true });

let html = await readFile(path.join(client, 'index.html'), 'utf8');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`No se encontró en index.html: ${from}`);
  html = html.replace(from, () => to);
};
swap('<link rel="stylesheet" href="styles.css">', `<style>${css.code.trim()}</style>`);
swap('  <script type="module" src="app.js"></script>\n', '');
// El script va al final del body para que #app ya exista.
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
swap('</body>', `<script>${code}</script>\n</body>`);
await writeFile(path.join(dist, 'index.html'), html);

for (const f of ['manifest.webmanifest', 'sw.js', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png']) {
  await copyFile(path.join(client, f), path.join(dist, f));
}
// GitHub Pages: servir los archivos tal cual.
await writeFile(path.join(dist, '.nojekyll'), '');

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`Microapp lista en dist/ (index.html: ${kb} KB)`);
