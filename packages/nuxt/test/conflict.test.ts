import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import type { CollectionHandler, HostHandler } from '../src/route/conflict'
import { genApimTemplate } from '../src/generator/templates'
import {
  assertNoComparableRouteConflicts,
  filterExcludedCollectionHandlers,
  toComparableCollectionHandler,
  toComparableHostHandler,
  toRouteSignature,
} from '../src/route/conflict'

const profileHandler = fileURLToPath(
  new URL('../playground/modules/demo-api/runtime/server/profile.get.ts', import.meta.url),
)

// Nitro supplies metadata beyond the fields used for route comparisons.
function hostHandler(handler: HostHandler & { lazy: true; middleware: false }) {
  return toComparableHostHandler(handler)
}

describe('route signatures', () => {
  it('formats explicit methods in uppercase and methodless routes as *', () => {
    expect(toRouteSignature({ route: '/api/profile', method: 'get' })).toBe('GET /api/profile')
    expect(toRouteSignature({ route: '/api/profile' })).toBe('* /api/profile')
  })
})

describe('host owner labels', () => {
  it('labels server/api handlers as host server/api', () => {
    expect(
      hostHandler({
        handler: '/abs/app/server/api/profile.get.ts',
        route: '/api/profile',
        method: 'get',
        lazy: true,
        middleware: false,
      }),
    ).toMatchObject({
      source: 'host',
      ownerLabel: 'host server/api',
    })
  })

  it('labels server/routes handlers as host server/routes', () => {
    expect(
      hostHandler({
        handler: '/abs/app/server/routes/foo.get.ts',
        route: '/foo',
        method: 'get',
        lazy: true,
        middleware: false,
      }),
    ).toMatchObject({
      source: 'host',
      ownerLabel: 'host server/routes',
    })
  })
})

describe('conflict rules', () => {
  it('rejects host GET vs collection GET conflicts', () => {
    const host = hostHandler({
      handler: '/abs/app/server/api/profile.get.ts',
      route: '/api/profile',
      method: 'get',
      lazy: true,
      middleware: false,
    })
    const collection = toComparableCollectionHandler({
      collectionName: 'demo-collection',
      handler: '/abs/modules/demo/runtime/server/profile.get.ts',
      route: '/api/profile',
      method: 'get',
      lazy: true,
      middleware: false,
    })

    expect(() => assertNoComparableRouteConflicts([host, collection])).toThrow(
      /host server\/api[\s\S]*demo-collection/,
    )
  })

  it('rejects host methodless vs collection GET conflicts', () => {
    const host = hostHandler({
      handler: '/abs/app/server/api/profile.ts',
      route: '/api/profile',
      lazy: true,
      middleware: false,
    })
    const collection = toComparableCollectionHandler({
      collectionName: 'demo-collection',
      handler: '/abs/modules/demo/runtime/server/profile.get.ts',
      route: '/api/profile',
      method: 'get',
      lazy: true,
      middleware: false,
    })

    expect(() => assertNoComparableRouteConflicts([host, collection])).toThrow(/\* \/api\/profile/)
  })

  it('allows host GET vs collection POST on the same route', () => {
    const host = hostHandler({
      handler: '/abs/app/server/api/profile.get.ts',
      route: '/api/profile',
      method: 'get',
      lazy: true,
      middleware: false,
    })
    const collection = toComparableCollectionHandler({
      collectionName: 'demo-collection',
      handler: '/abs/modules/demo/runtime/server/profile.post.ts',
      route: '/api/profile',
      method: 'post',
      lazy: true,
      middleware: false,
    })

    expect(() => assertNoComparableRouteConflicts([host, collection])).not.toThrow()
  })
})

describe('exclude filtering', () => {
  it('drops excluded collection handlers before conflict checks and registration', () => {
    const handlers: CollectionHandler[] = [
      {
        collectionName: 'demo-collection',
        handler: '/abs/modules/demo/runtime/server/profile.get.ts',
        route: '/api/profile',
        method: 'get',
        lazy: true,
        middleware: false,
      },
    ]

    expect(filterExcludedCollectionHandlers(handlers, ['GET /api/profile'])).toEqual([])
  })

  it('keeps excluded handlers out of the generated apim template', async () => {
    const handlers = filterExcludedCollectionHandlers(
      [
        {
          collectionName: 'demo-collection',
          handler: profileHandler,
          route: '/api/profile',
          method: 'get',
          lazy: true,
          middleware: false,
        },
      ],
      ['GET /api/profile'],
    )

    await expect(genApimTemplate(handlers, false)).resolves.not.toContain("'/api/profile'")
  })
})
