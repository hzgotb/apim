import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import { dirname, extname, isAbsolute, resolve } from 'pathe'
import {
  addTypeTemplate,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'
import {
  parseCallaCollectionEntry,
  type CallaCollection,
  type ApiRouteGroup,
} from './collection'
import {
  assertNoComparableRouteConflicts,
  filterExcludedCollectionHandlers,
  toComparableHostHandler,
  toComparableCollectionHandler,
  type CollectionHandler,
} from './conflict'
import { resolveCollectionRefs } from './collection-ref'
import { resolveRouteGroupIgnore } from './ignore'
import { CALLA_MODULE_ID, gencallaTemplate } from './templates'
import { scanServerRoutes } from './scan'
import { createCallaToUseFetchPlugin } from './transform'

export * from './collection'

const jiti = createJiti(import.meta.url)

export interface ModuleOptions {
  collections: string[]
  injectCallaToGlobal: boolean
  exclude: string[]
}

interface LoadedCollection extends CallaCollection {
  moduleRoot: string
  serverRoot: string
  storesRoot: string
}

function describeRouteGroup(group: ApiRouteGroup) {
  const dir = group.dir instanceof RegExp ? group.dir.toString() : group.dir
  return `"${dir}" -> "${group.clientPrefix}"`
}

function isFileLikePath(path: string) {
  return Boolean(extname(path))
}

function resolveCollectionRoot(
  root: string | undefined,
  collectionPath: string,
) {
  if (!root) {
    return dirname(collectionPath)
  }

  if (root.startsWith('file:')) {
    const filePath = fileURLToPath(root)
    return isFileLikePath(filePath) ? dirname(filePath) : filePath
  }

  const normalizedRoot = isAbsolute(root)
    ? root
    : resolve(dirname(collectionPath), root)
  return isFileLikePath(normalizedRoot)
    ? dirname(normalizedRoot)
    : normalizedRoot
}

async function loadCollection(
  collectionPath: string,
): Promise<LoadedCollection> {
  const importedCollection = await jiti.import(collectionPath, {
    default: true,
  })
  const normalizedCollection = parseCallaCollectionEntry(
    importedCollection,
    collectionPath,
  )

  if (
    !Array.isArray(normalizedCollection.routeGroups)
    || normalizedCollection.routeGroups.length === 0
  ) {
    throw new Error(
      `[calla] Collection "${normalizedCollection.name}" must define at least one route group.`,
    )
  }

  const moduleRoot = resolveCollectionRoot(
    normalizedCollection.root,
    collectionPath,
  )
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

async function scanCollectionRoutes(
  collection: LoadedCollection,
): Promise<CollectionHandler[]> {
  const handlerGroups = await Promise.all(
    collection.routeGroups.map((group) => {
      const ignore = resolveRouteGroupIgnore(
        collection.ignore,
        group.ignore,
        {
          collectionName: collection.name,
          routeGroupLabel: describeRouteGroup(group),
        },
      )

      return scanServerRoutes(
        collection.moduleRoot,
        group.dir,
        group.clientPrefix,
        {
          ignore,
        },
      )
    },
    ),
  )

  return handlerGroups.flat().map(handler => ({
    ...handler,
    collectionName: collection.name,
  }))
}

async function scanConfiguredCollections(collections: LoadedCollection[]) {
  const handlerGroups = await Promise.all(
    collections.map(scanCollectionRoutes),
  )
  return handlerGroups.flat()
}

const callaModule: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'calla',
    configKey: 'calla',
  },
  defaults: {
    collections: [],
    injectCallaToGlobal: true,
    exclude: [],
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const callaEntry = resolver.resolve('./calla')
    const collectionRefs = await resolveCollectionRefs(
      options.collections,
      nuxt.options.rootDir,
    )
    const collections = await loadCollections(collectionRefs)

    collections.forEach((collection) => {
      nuxt.options.watch.push(collection.serverRoot)
    })

    const getActiveCollectionHandlers = async () => {
      const scannedHandlers = await scanConfiguredCollections(collections)
      const filteredHandlers = filterExcludedCollectionHandlers(
        scannedHandlers,
        options.exclude,
      )

      assertNoComparableRouteConflicts(
        filteredHandlers.map(toComparableCollectionHandler),
      )

      return filteredHandlers
    }

    let activeCollectionHandlers: CollectionHandler[] | undefined
      = await getActiveCollectionHandlers()

    nuxt.hook('nitro:config', async (nitroConfig) => {
      activeCollectionHandlers = await getActiveCollectionHandlers()

      const collectionHandlerPaths = new Set(
        activeCollectionHandlers.map(handler => handler.handler),
      )
      const hostHandlers = [
        ...(nuxt.options.serverHandlers ?? []),
        ...(nitroConfig.handlers ?? []),
      ]
        .filter(handler => !collectionHandlerPaths.has(handler.handler))
        .map(toComparableHostHandler)
      const collectionHandlers = activeCollectionHandlers.map(
        toComparableCollectionHandler,
      )

      assertNoComparableRouteConflicts([
        ...hostHandlers,
        ...collectionHandlers,
      ], { crossSourceOnly: true })

      nitroConfig.handlers ||= []
      nitroConfig.handlers.push(
        ...activeCollectionHandlers.map(
          ({ collectionName: _collectionName, ...handler }) => handler,
        ),
      )
    })

    nuxt.hook('nitro:init', async (nitro) => {
      activeCollectionHandlers = activeCollectionHandlers
        ?? (await getActiveCollectionHandlers())

      const collectionHandlerPaths = new Set(
        activeCollectionHandlers.map(handler => handler.handler),
      )
      const hostHandlers = nitro.scannedHandlers
        .filter(handler => !collectionHandlerPaths.has(handler.handler))
        .map(toComparableHostHandler)
      const collectionHandlers = activeCollectionHandlers.map(
        toComparableCollectionHandler,
      )

      assertNoComparableRouteConflicts([
        ...hostHandlers,
        ...collectionHandlers,
      ], { crossSourceOnly: true })
    })

    nuxt.options.alias[CALLA_MODULE_ID] = callaEntry

    addTypeTemplate({
      filename: 'types/calla.d.ts',
      getContents: async () => {
        const handlers
          = activeCollectionHandlers ?? (await getActiveCollectionHandlers())
        return gencallaTemplate(handlers, options.injectCallaToGlobal)
      },
    })

    activeCollectionHandlers = undefined

    nuxt.hook('imports:dirs', (dirs) => {
      collections.forEach((collection) => {
        if (existsSync(collection.storesRoot)) dirs.push(collection.storesRoot)
      })
    })

    addVitePlugin(() => createCallaToUseFetchPlugin(), { prepend: true })
  },
})

export default callaModule

declare module 'nuxt/schema' {
  interface NuxtConfig {
    calla?: ModuleOptions
  }
}
