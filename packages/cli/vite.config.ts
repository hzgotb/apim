import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: {
      index: './src/index.mjs',
      apim: './src/apim.mjs',
    },
    format: 'esm',
    dts: false,
    clean: true,
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
})
