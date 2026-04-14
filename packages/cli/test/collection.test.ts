import { describe, expect, it } from 'vitest'
import { buildCollectionFiles } from '../src/collection.mjs'

describe('buildCollectionFiles', () => {
  it('writes the default ignore rules into generated collections', () => {
    const files = buildCollectionFiles({
      name: 'demo-api',
      clientPrefix: '/demo-api',
      template: 'minimal',
    })
    const collectionFile = files.find(file => file.relativePath === 'collection.ts')

    expect(collectionFile?.contents).toContain(
      `ignore: ['**/types/**', '**/*.types.*']`,
    )
    expect(collectionFile?.contents).toContain(
      `import { defineCallaCollection } from '@callajs/nuxt'`,
    )
    expect(collectionFile?.contents).toContain('export default defineCallaCollection({')
  })
})
