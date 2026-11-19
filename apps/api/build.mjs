// Bundles the API and the workspace packages (which ship TypeScript sources) into dist/.
// Third-party dependencies stay external and are installed in the image.
import { build } from 'esbuild';

await build({
  entryPoints: { server: 'src/server.ts', migrate: 'src/db/migrate-cli.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  plugins: [
    {
      name: 'externalize-deps',
      setup(b) {
        b.onResolve({ filter: /^[^./]/ }, (args) =>
          args.path.startsWith('@sonora/') ? undefined : { path: args.path, external: true },
        );
      },
    },
  ],
});
