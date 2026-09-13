import { spawn } from 'node:child_process';
import { normalizeBasePath } from '../src/core/paths.ts';

// Líneas de salida de next build que se aceptan aunque contengan "warn". Añadir solo con justificación.
const ALLOWED_WARNINGS = [];
// Pasos post-build en orden. Tareas posteriores añaden entradas: { name, cmd, args }.
const POST_BUILD_STEPS = [
  { name: 'Service worker', cmd: 'node', args: ['scripts/build-sw.mjs'] },
  { name: 'Precompresión', cmd: 'node', args: ['scripts/compress.mjs'] },
];

// Normalizado una sola vez aquí y propagado a todos los hijos: build-sw.mjs y serve-out.mjs
// también saben normalizar por su cuenta (misma implementación) para poder ejecutarse sueltos.
const NORMALIZED_BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const childEnv = { ...process.env, NEXT_PUBLIC_BASE_PATH: NORMALIZED_BASE_PATH };

function run(cmd, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'], env: childEnv });
    let output = '';
    if (capture) {
      child.stdout.on('data', (d) => { output += d; process.stdout.write(d); });
      child.stderr.on('data', (d) => { output += d; process.stderr.write(d); });
    }
    child.on('close', (code) => (code === 0 ? resolve(output) : reject(new Error(`${cmd} ${args.join(' ')} terminó con código ${code}`))));
  });
}

const output = await run('pnpm', ['exec', 'next', 'build', '--webpack'], { capture: true });

const warnings = output
  .split('\n')
  .filter((line) => /⚠|\bwarn(ing)?\b|dynamic server usage/i.test(line))
  .filter((line) => !ALLOWED_WARNINGS.some((allowed) => line.includes(allowed)));

if (warnings.length > 0) {
  process.stderr.write(`\nEl build ha emitido ${warnings.length} advertencia(s); se considera fallido:\n${warnings.join('\n')}\n`);
  process.exit(1);
}

for (const step of POST_BUILD_STEPS) {
  process.stdout.write(`\n▸ ${step.name}\n`);
  await run(step.cmd, step.args);
}
