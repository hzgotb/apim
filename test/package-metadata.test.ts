import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

const expectedRepositoryBase = {
  type: 'git',
  url: 'https://github.com/hzgotb/callajs',
}

async function readPackageJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8'))
}

describe('published package metadata', () => {
  it('declares explicit provenance-friendly repository metadata for published packages', async () => {
    const cliPackage = await readPackageJson('packages/cli/package.json')
    const nuxtPackage = await readPackageJson('packages/nuxt/package.json')

    expect(cliPackage.repository).toEqual({
      ...expectedRepositoryBase,
      directory: 'packages/cli',
    })

    expect(nuxtPackage.repository).toEqual({
      ...expectedRepositoryBase,
      directory: 'packages/nuxt',
    })
  })
})
