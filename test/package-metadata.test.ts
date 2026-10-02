import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vite-plus/test'
import nuxtConfig from '../packages/nuxt/vite.config'

const expectedRepositoryBase = {
  type: 'git',
  url: 'https://github.com/hzgotb/apim',
}

async function readPackageJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8'))
}

describe('published package metadata', () => {
  it('keeps Nuxt runtime and CLI build outputs distinct', () => {
    const configs = (nuxtConfig as { pack: { entry: Record<string, string> }[] }).pack
    const outputNames = configs.flatMap(config => Object.keys(config.entry))

    expect(new Set(outputNames).size).toBe(outputNames.length)
    expect(configs[0].entry.apim).toBe('./src/runtime/apim.ts')
  })

  it('uses the public apim package names', async () => {
    const cliPackage = await readPackageJson('packages/cli/package.json')
    const nuxtPackage = await readPackageJson('packages/nuxt/package.json')

    expect(cliPackage.name).toBe('@hzgotb/apim-cli')
    expect(nuxtPackage.name).toBe('@hzgotb/apim-nuxt')
    expect(nuxtPackage.dependencies).toHaveProperty('@hzgotb/apim-cli', 'workspace:*')
  })

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
