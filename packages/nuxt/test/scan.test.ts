import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { basename, dirname, join } from 'pathe'
import { scanServerRoutes } from '../src/scan'

const tempRoots: string[] = []

async function createFixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'calla-nuxt-scan-'))
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
  await Promise.all(
    tempRoots.splice(0).map(root =>
      rm(root, { recursive: true, force: true }),
    ),
  )
})

describe('scanServerRoutes', () => {
  it('maps plain handler files with the configured client prefix', async () => {
    const root = await createFixture({
      'runtime/server/users.ts': 'export default () => "users"\n',
    })

    await expect(
      scanServerRoutes(root, 'runtime/server', '/demo'),
    ).resolves.toEqual([
      {
        handler: join(root, 'runtime/server/users.ts'),
        lazy: true,
        middleware: false,
        route: '/demo/users',
      },
    ])
  })

  it('matches Nitro-style route normalization for groups, params, methods, envs, and index files', async () => {
    const root = await createFixture({
      'runtime/server/(admin)/users/[id]/index.get.prod.ts':
        'export default () => "user"\n',
    })

    await expect(
      scanServerRoutes(root, 'runtime/server', '/demo'),
    ).resolves.toEqual([
      {
        env: 'prod',
        handler: join(root, 'runtime/server/(admin)/users/[id]/index.get.prod.ts'),
        lazy: true,
        method: 'get',
        middleware: false,
        route: '/demo/users/:id',
      },
    ])
  })

  it('supports regex route groups by stripping the matched prefix before mapping the route', async () => {
    const root = await createFixture({
      'modules/demo/runtime/server/posts/[slug].ts':
        'export default () => "post"\n',
    })

    await expect(
      scanServerRoutes(root, /^modules\/[^/]+\/runtime\/server/, '/demo'),
    ).resolves.toEqual([
      {
        handler: join(root, 'modules/demo/runtime/server/posts/[slug].ts'),
        lazy: true,
        middleware: false,
        route: '/demo/posts/:slug',
      },
    ])
  })

  it('sanitizes dots in dynamic parameter names the same way Nitro does', async () => {
    const root = await createFixture({
      'runtime/server/users/[user.id].ts': 'export default () => "user"\n',
    })

    await expect(
      scanServerRoutes(root, 'runtime/server', '/demo'),
    ).resolves.toEqual([
      {
        handler: join(root, 'runtime/server/users/[user.id].ts'),
        lazy: true,
        middleware: false,
        route: '/demo/users/:user_id',
      },
    ])
  })

  it('treats hyphenated named catch-all params as Nitro-style catch-all routes', async () => {
    const root = await createFixture({
      'runtime/server/[...foo-bar].ts': 'export default () => "catch-all"\n',
    })

    await expect(
      scanServerRoutes(root, 'runtime/server', '/demo'),
    ).resolves.toEqual([
      {
        handler: join(root, 'runtime/server/[...foo-bar].ts'),
        lazy: true,
        middleware: false,
        route: '/demo/**:foo-bar',
      },
    ])
  })

  it('does not exclude type helper files unless ignore patterns are provided', async () => {
    const root = await createFixture({
      'runtime/server/types/internal.ts': 'export type Internal = string\n',
      'runtime/server/users.types.ts': 'export type User = { id: string }\n',
      'runtime/server/users.ts': 'export default () => "users"\n',
    })

    const handlers = await scanServerRoutes(root, 'runtime/server', '/demo')

    expect(handlers.map(handler => basename(handler.handler)).sort()).toEqual([
      'internal.ts',
      'users.ts',
      'users.types.ts',
    ])
  })

  it('can exclude type helper files using the ignore patterns passed by the module', async () => {
    const root = await createFixture({
      'runtime/server/types/internal.ts': 'export type Internal = string\n',
      'runtime/server/users.types.ts': 'export type User = { id: string }\n',
      'runtime/server/users.ts': 'export default () => "users"\n',
    })

    await expect(
      scanServerRoutes(root, 'runtime/server', '/demo', {
        ignore: ['**/types/**', '**/*.types.*'],
      }),
    ).resolves.toEqual([
      {
        handler: join(root, 'runtime/server/users.ts'),
        lazy: true,
        middleware: false,
        route: '/demo/users',
      },
    ])
  })
})
