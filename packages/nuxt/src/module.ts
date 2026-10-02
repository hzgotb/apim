import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import { dirname, extname, isAbsolute, resolve } from 'pathe'
import '@nuxt/nitro-server/augments'
import { addTypeTemplate, addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'
import { parseApiModuleEntry, type ApiCollection } from './collection/index'
import {
  assertNoComparableRouteConflicts,
  filterExcludedCollectionHandlers,
  toComparableHostHandler,
  toComparableCollectionHandler,
  type CollectionHandler,
  type HostHandler,
} from './route/conflict'
import { resolveCollectionRefs } from './collection/resolve'
import { resolveRouteGroupIgnore } from './route/ignore'
import { APIM_MODULE_ID, genApimTemplate } from './generator/templates'
import { scanServerRoutes } from './route/scan'
import { createApimToUseFetchPlugin } from './transform/use-fetch'

export * from './collection/index'

const jiti = createJiti(import.meta.url)

export interface ModuleOptions {
  collections: string[]
  injectApimToGlobal: boolean
  exclude?: string[]
}

interface LoadedCollection extends ApiCollection {
  moduleRoot: string
  serverRoot: string
  storesRoot: string
}

function describeRouteGroup(group: ApiCollection['handlers'][number]) {
  const dir = group.dir instanceof RegExp ? group.dir.toString() : group.dir
  return `"${dir}" -> "${group.clientPrefix}"`
}

function isFileLikePath(path: string) {
  return Boolean(extname(path))
}

function resolveCollectionRoot(root: string | undefined, collectionPath: string) {
  if (!root) {
    return dirname(collectionPath)
  }

  if (root.startsWith('file:')) {
    const filePath = fileURLToPath(root)
    return isFileLikePath(filePath) ? dirname(filePath) : filePath
  }

  const normalizedRoot = isAbsolute(root) ? root : resolve(dirname(collectionPath), root)
  return isFileLikePath(normalizedRoot) ? dirname(normalizedRoot) : normalizedRoot
}

async function loadCollection(collectionPath: string): Promise<LoadedCollection> {
  const importedCollection = await jiti.import(collectionPath, {
    default: true,
  })
  const normalizedCollection = parseApiModuleEntry(importedCollection, collectionPath)

  if (!Array.isArray(normalizedCollection.handlers) || normalizedCollection.handlers.length === 0) {
    throw new Error(
      `[apim] Collection "${normalizedCollection.name}" must define at least one handler group.`,
    )
  }

  const moduleRoot = resolveCollectionRoot(normalizedCollection.root, collectionPath)
  return {
    ...normalizedCollection,
    moduleRoot,
    serverRoot: resolve(moduleRoot, 'runtime/server'),
    storesRoot: resolve(moduleRoot, 'runtime/stores'),
  }
}

async function loadCollections(collectionRefs: string[]) {
  return Promise.all(collectionRefs.map(loadCollection))
}

async function scanCollectionRoutes(collection: LoadedCollection): Promise<CollectionHandler[]> {
  const handlerGroups = await Promise.all(
    collection.handlers.map(group => {
      const ignore = resolveRouteGroupIgnore(collection.ignore, group.ignore, {
        collectionName: collection.name,
        routeGroupLabel: describeRouteGroup(group),
      })

      return scanServerRoutes(collection.moduleRoot, group.dir, group.clientPrefix, {
        ignore,
      })
    }),
  )

  return handlerGroups.flat().map(handler => ({
    ...handler,
    collectionName: collection.name,
  }))
}

async function scanConfiguredCollections(collections: LoadedCollection[]) {
  const handlerGroups = await Promise.all(collections.map(scanCollectionRoutes))
  return handlerGroups.flat()
}

const apimModule: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'apim',
    configKey: 'apim',
  },
  defaults: {
    collections: [],
    injectApimToGlobal: true,
    exclude: [],
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const apimEntry = resolver.resolve('./apim')
    const collectionRefs = await resolveCollectionRefs(options.collections, nuxt.options.rootDir)
    const collections = await loadCollections(collectionRefs)

    collections.forEach(collection => {
      nuxt.options.watch.push(collection.serverRoot)
    })

    const getActiveCollectionHandlers = async () => {
      const scannedHandlers = await scanConfiguredCollections(collections)
      const filteredHandlers = filterExcludedCollectionHandlers(scannedHandlers, options.exclude)

      assertNoComparableRouteConflicts(filteredHandlers.map(toComparableCollectionHandler))

      return filteredHandlers
    }

    let activeCollectionHandlers: CollectionHandler[] | undefined =
      await getActiveCollectionHandlers()

    nuxt.hook('nitro:config', async nitroConfig => {
      activeCollectionHandlers = await getActiveCollectionHandlers()

      const collectionHandlerPaths = new Set(
        activeCollectionHandlers.map(handler => handler.handler),
      )
      const hostHandlers = [...(nuxt.options.serverHandlers ?? []), ...(nitroConfig.handlers ?? [])]
        .flatMap((handler): HostHandler[] => {
          if (typeof handler?.handler !== 'string' || collectionHandlerPaths.has(handler.handler)) {
            return []
          }
          return [handler as HostHandler]
        })
        .map(toComparableHostHandler)
      const collectionHandlers = activeCollectionHandlers.map(toComparableCollectionHandler)

      assertNoComparableRouteConflicts([...hostHandlers, ...collectionHandlers], {
        crossSourceOnly: true,
      })

      nitroConfig.handlers ||= []
      nitroConfig.handlers.push(
        ...activeCollectionHandlers.map(
          ({ collectionName: _collectionName, ...handler }) => handler,
        ),
      )
    })

    nuxt.hook('nitro:init', async nitro => {
      activeCollectionHandlers = activeCollectionHandlers ?? (await getActiveCollectionHandlers())

      const collectionHandlerPaths = new Set(
        activeCollectionHandlers.map(handler => handler.handler),
      )
      const hostHandlers = nitro.scannedHandlers
        .flatMap((handler): HostHandler[] => {
          if (typeof handler.handler !== 'string' || collectionHandlerPaths.has(handler.handler)) {
            return []
          }
          return [handler as HostHandler]
        })
        .map(toComparableHostHandler)
      const collectionHandlers = activeCollectionHandlers.map(toComparableCollectionHandler)

      assertNoComparableRouteConflicts([...hostHandlers, ...collectionHandlers], {
        crossSourceOnly: true,
      })
    })

    nuxt.options.alias[APIM_MODULE_ID] = apimEntry

    addTypeTemplate({
      filename: 'types/apim.d.ts',
      getContents: async () => {
        const handlers = activeCollectionHandlers ?? (await getActiveCollectionHandlers())
        return genApimTemplate(handlers, options.injectApimToGlobal)
      },
    })

    activeCollectionHandlers = undefined

    nuxt.hook('imports:dirs', dirs => {
      collections.forEach(collection => {
        if (existsSync(collection.storesRoot)) dirs.push(collection.storesRoot)
      })
    })

    addVitePlugin(() => createApimToUseFetchPlugin(), { prepend: true })
  },
})

export default apimModule

declare module 'nuxt/schema' {
  interface NuxtConfig {
    apim?: Partial<ModuleOptions>
  }
}
