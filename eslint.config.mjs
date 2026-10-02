// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Oxfmt owns formatting; retain Nuxt's semantic lint rules.
    stylistic: false,
  },
  dirs: {
    src: ['./packages', './test'],
  },
})
  .append({
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  })
  .append(eslintConfigPrettier)
  .append({
    files: ['packages/nuxt/src/apim.ts', 'packages/nuxt/src/runtime/apim.ts'],
    rules: {
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/unified-signatures': 'off',
    },
  })
