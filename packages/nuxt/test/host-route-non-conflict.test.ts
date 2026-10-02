import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('non-conflicting host and collection routes', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/host-no-conflict-post', import.meta.url)),
  })

  it('keeps host GET and collection POST on the same route', async () => {
    await expect($fetch('/api/profile')).resolves.toEqual({ source: 'host-get' })
    await expect(
      $fetch('/api/profile', {
        method: 'POST',
        body: { message: 'hi' },
      }),
    ).resolves.toEqual({ source: 'collection-post' })
  })
})
