import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'pathe'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { scanServerRoutes } from '../src/route/scan'

type ResolveRouteGroupIgnore = (
  collectionIgnore?: string[],
  routeGroupIgnore?: string[],
) => string[]

const tempRoots: string[] = []

async function loadResolveRouteGroupIgnore() {
  const mod = await import('../src/route/ignore')
  return mod.resolveRouteGroupIgnore as ResolveRouteGroupIgnore | undefined
}

async function createFixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'apim-nuxt-ignore-'))
  tempRoots.push(root)

  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const filePath = join(root, relativePath)
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, contents)
    }),
  )

  return root
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('resolveRouteGroupIgnore', () => {
  it('inherits collection ignore when routeGroup ignore is omitted', async () => {
    const resolveRouteGroupIgnore = await loadResolveRouteGroupIgnore()

    expect(resolveRouteGroupIgnore).toBeTypeOf('function')
    expect(resolveRouteGroupIgnore?.(['**/types/**'], undefined)).toEqual(['**/types/**'])
  })

  it('treats an empty routeGroup ignore array as inheriting collection ignore', async () => {
    const resolveRouteGroupIgnore = await loadResolveRouteGroupIgnore()

    expect(resolveRouteGroupIgnore).toBeTypeOf('function')
    expect(resolveRouteGroupIgnore?.(['**/types/**'], [])).toEqual(['**/types/**'])
  })

  it('appends routeGroup ignore patterns after collection ignore by default', async () => {
    const resolveRouteGroupIgnore = await loadResolveRouteGroupIgnore()

    expect(resolveRouteGroupIgnore).toBeTypeOf('function')
    expect(
      resolveRouteGroupIgnore?.(['**/types/**'], ['**/*.draft.*', '!**/*.keep.draft.*']),
    ).toEqual(['**/types/**', '**/*.draft.*', '!**/*.keep.draft.*'])
  })

  it('drops collection inheritance when routeGroup ignore starts with !...', async () => {
    const resolveRouteGroupIgnore = await loadResolveRouteGroupIgnore()

    expect(resolveRouteGroupIgnore).toBeTypeOf('function')
    expect(resolveRouteGroupIgnore?.(['**/types/**'], ['!...'])).toEqual([])
    expect(resolveRouteGroupIgnore?.(['**/types/**'], ['!...', '**/*.draft.*'])).toEqual([
      '**/*.draft.*',
    ])
  })

  it('rejects !... inside collection ignore or outside the first routeGroup position', async () => {
    const resolveRouteGroupIgnore = await loadResolveRouteGroupIgnore()

    expect(resolveRouteGroupIgnore).toBeTypeOf('function')
    expect(() => resolveRouteGroupIgnore?.(['!...'], undefined)).toThrow(/!.../)
    expect(() => resolveRouteGroupIgnore?.(['**/types/**'], ['**/*.draft.*', '!...'])).toThrow(
      /!.../,
    )
  })

  it('lets later negated patterns re-include files ignored earlier', async () => {
    const resolveRouteGroupIgnore = await loadResolveRouteGroupIgnore()
    const root = await createFixture({
      'runtime/server/types/internal.ts': 'export default () => "internal"\n',
      'runtime/server/types/keep.ts': 'export default () => "keep"\n',
      'runtime/server/users.ts': 'export default () => "users"\n',
    })

    expect(resolveRouteGroupIgnore).toBeTypeOf('function')

    const handlers = await scanServerRoutes(root, 'runtime/server', '/demo', {
      ignore: resolveRouteGroupIgnore?.(['**/types/**'], ['!**/types/keep.ts']),
    })

    expect(handlers.map(handler => basename(handler.handler)).sort()).toEqual([
      'keep.ts',
      'users.ts',
    ])
  })

  it('stops inheriting collection ignore when routeGroup ignore starts with !...', async () => {
    const resolveRouteGroupIgnore = await loadResolveRouteGroupIgnore()
    const root = await createFixture({
      'runtime/server/types/internal.ts': 'export default () => "internal"\n',
      'runtime/server/users.ts': 'export default () => "users"\n',
    })

    expect(resolveRouteGroupIgnore).toBeTypeOf('function')

    const handlers = await scanServerRoutes(root, 'runtime/server', '/demo', {
      ignore: resolveRouteGroupIgnore?.(['**/types/**'], ['!...']),
    })

    expect(handlers.map(handler => basename(handler.handler)).sort()).toEqual([
      'internal.ts',
      'users.ts',
    ])
  })
})
