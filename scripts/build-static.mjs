// Genera dist/: el cliente + /shared como sitio estático que funciona sin
// servidor (modo local, progreso guardado en el dispositivo).
import { cp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'client'), dist, { recursive: true });
await cp(path.join(root, 'shared'), path.join(dist, 'shared'), { recursive: true });
console.log(`Sitio estático listo en ${path.relative(process.cwd(), dist) || dist}`);
