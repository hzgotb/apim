import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveCollectionRefs } from '../src/collection/resolve'

const playgroundRoot = fileURLToPath(new URL('../playground', import.meta.url))
const demoCollectionPath = fileURLToPath(
  new URL('../playground/modules/demo-api/collection.ts', import.meta.url),
)
const explicitCollectionPath = fileURLToPath(
  new URL(
    '../playground/modules/demo-explicit/demo-module.ts',
    import.meta.url,
  ),
)

function normalizePath(value: string) {
  return value.replaceAll('\\', '/')
}

const normalizedDemoCollectionPath = normalizePath(demoCollectionPath)
const normalizedExplicitCollectionPath = normalizePath(explicitCollectionPath)

describe('collection ref resolution', () => {
  it('resolves directory-like project-relative paths to collection.ts', async () => {
    await expect(
      resolveCollectionRefs(['modules/demo-api'], playgroundRoot),
    ).resolves.toEqual([normalizedDemoCollectionPath])
  })

  it('keeps explicit TypeScript file paths', async () => {
    await expect(
      resolveCollectionRefs(
        ['modules/demo-explicit/demo-module.ts'],
        playgroundRoot,
      ),
    ).resolves.toEqual([normalizedExplicitCollectionPath])
  })

  it('expands directory-like glob patterns to collection.ts', async () => {
    await expect(
      resolveCollectionRefs(['modules/*'], playgroundRoot),
    ).resolves.toEqual([normalizedDemoCollectionPath])
  })

  it('expands explicit collection file globs from rootDir', async () => {
    await expect(
      resolveCollectionRefs(['modules/*/collection.ts'], playgroundRoot),
    ).resolves.toEqual([normalizedDemoCollectionPath])
  })

  it('dedupes files matched by multiple refs', async () => {
    await expect(
      resolveCollectionRefs(['modules/demo-api', 'modules/*'], playgroundRoot),
    ).resolves.toEqual([normalizedDemoCollectionPath])
  })

  it('throws when a collection glob matches nothing', async () => {
    await expect(
      resolveCollectionRefs(['modules/*/missing'], playgroundRoot),
    ).rejects.toThrow(/matched no files/)
  })
})
