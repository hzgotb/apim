import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: [
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
        cli: '../cli/src/apim.mjs',
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
  ],
})
