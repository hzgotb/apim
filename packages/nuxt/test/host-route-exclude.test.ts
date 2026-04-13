import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('exclude', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/host-exclude', import.meta.url)),
  })

  it('drops the excluded collection handler and leaves the host route active', async () => {
    await expect($fetch('/api/profile')).resolves.toEqual({
      source: 'host-exclude',
    })
  })
})
