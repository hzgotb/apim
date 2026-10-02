import apimModule, { defineApiModule, type ApiCollection } from '@hzgotb/apim-nuxt'
import { apim, type ApimRes } from '@hzgotb/apim-nuxt/apim'
import { defineNuxtConfig } from 'nuxt/config'

export const config = defineNuxtConfig({
  modules: [apimModule],
  apim: { collections: ['modules/demo-api'] },
})

export const collection = defineApiModule({
  name: 'consumer',
  handlers: [{ dir: 'runtime/server', clientPrefix: '/api' }],
} satisfies ApiCollection)

declare module '@hzgotb/apim-nuxt/apim' {
  interface InternalApiPayload {
    '/consumer': {
      get: { query: { id: string }; res: { ok: boolean } }
    }
  }
}

export const response: ApimRes<'/consumer'> = { ok: true }
export const request = () => apim('/consumer', { query: { id: 'test' } })

// @ts-expect-error Consumer response types must retain the declared boolean field.
export const invalidResponse: ApimRes<'/consumer'> = { ok: 'yes' }
// @ts-expect-error Consumer query types must retain the declared string field.
export const invalidRequest = () => apim('/consumer', { query: { id: 123 } })
