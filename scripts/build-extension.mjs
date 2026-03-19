import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const buildOptions = {
  bundle: true,
  entryPoints: ['src/extension.ts'],
  external: ['vscode'],
  format: 'cjs',
  legalComments: 'none',
  loader: {
    '.html': 'text',
  },
  logLevel: 'info',
  mainFields: ['module', 'main'],
  outfile: 'dist/extension.js',
  platform: 'node',
  sourcemap: true,
  sourcesContent: false,
  target: 'node18',
};

if (watch) {
  const context = await esbuild.context(buildOptions);
  await context.watch();
  console.log('Watching extension bundle...');
} else {
  await esbuild.build(buildOptions);
}
