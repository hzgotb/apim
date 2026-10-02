import { fileURLToPath } from 'node:url'
import { buildNuxt, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vite-plus/test'

function fixture(name: string) {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
}

async function expectFixtureBuildToFail(name: string, pattern: RegExp) {
  await expect(
    (async () => {
      const nuxt = await loadNuxt({
        cwd: fixture(name),
        dev: false,
      })

      try {
        await buildNuxt(nuxt)
      } finally {
        await nuxt.close()
      }
    })(),
  ).rejects.toThrow(pattern)
}

describe('host route conflicts', () => {
  it('rejects host server/api GET vs collection GET conflicts', async () => {
    await expectFixtureBuildToFail('host-conflict-api-get', /host server\/api[\s\S]*demo-api/)
  }, 30000)

  it('rejects host server/api methodless vs collection GET conflicts', async () => {
    await expectFixtureBuildToFail(
      'host-conflict-api-any',
      /\* \/api\/profile:[\s\S]*host server\/api[\s\S]*demo-api/,
    )
  }, 30000)

  it('rejects host server/routes GET vs collection GET conflicts', async () => {
    await expectFixtureBuildToFail(
      'host-conflict-routes-get',
      /host server\/routes[\s\S]*demo-root/,
    )
  }, 30000)
})
