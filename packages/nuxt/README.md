# @hzgotb/apim-nuxt

Nuxt 4 module for file-based API modules, typed `apim(...)` requests, and
`ApiModuleMeta`-driven request and response inference.

## Install

```bash
pnpm add @hzgotb/apim-nuxt
```

## Configure

```ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/demo-api'],
  },
})
```

Create API modules with `defineApiModule(...)`, then place Nitro-compatible
handlers under their configured handler directories.

See the [Nuxt package documentation](https://hzgotb.github.io/apim/packages/nuxt)
for setup, concepts, and API reference.
