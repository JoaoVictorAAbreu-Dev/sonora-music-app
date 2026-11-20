// Writes src/features/about/oss-licenses.json from the app's runtime dependencies.
// Run after adding or upgrading a dependency: pnpm --filter @sonora/mobile licenses
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const entries = Object.keys(pkg.dependencies ?? {})
  .filter((name) => !name.startsWith('@sonora/'))
  .sort()
  .map((name) => {
    const meta = require(`${name}/package.json`);
    const license =
      typeof meta.license === 'string' ? meta.license : (meta.license?.type ?? 'UNKNOWN');
    return { name, version: meta.version, license };
  });

writeFileSync(
  join(root, 'src/features/about/oss-licenses.json'),
  `${JSON.stringify(entries, null, 2)}\n`,
);
console.log(`${entries.length} packages`);
