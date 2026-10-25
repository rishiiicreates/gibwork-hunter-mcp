import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node22',
    outDir: 'dist',
  },
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    sourcemap: true,
    target: 'node22',
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
