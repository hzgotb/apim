import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      module: './src/module.ts',
      apim: './src/runtime/apim.ts',
    },
    format: 'esm',
    dts: false,
    clean: true,
    platform: 'node',
    target: 'node18',
    outDir: 'dist',
    outExtensions() {
      return {
        js: '.mjs',
      }
    },
  },
  {
    entry: {
      apim: '../cli/src/apim.mjs',
    },
    format: 'esm',
    dts: false,
    clean: false,
    platform: 'node',
    target: 'node18',
    outDir: 'dist',
    sourcemap: false,
    outExtensions() {
      return {
        js: '.mjs',
      }
    },
  },
])
