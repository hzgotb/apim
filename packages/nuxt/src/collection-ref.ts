import { fileURLToPath, pathToFileURL } from 'node:url'
import { isAbsolute, resolve } from 'pathe'
import { resolvePath } from '@nuxt/kit'
import { glob, isDynamicPattern } from 'tinyglobby'

const TYPESCRIPT_FILE_RE = /\.[cm]?tsx?$/i

function sortPaths(paths: string[]) {
  return paths.sort((a, b) => a.localeCompare(b))
}

function dedupePaths(paths: string[]) {
  return [...new Set(paths)]
}

function ensureCollectionEntryRef(collectionRef: string) {
  if (TYPESCRIPT_FILE_RE.test(collectionRef)) {
    return collectionRef
  }

  if (collectionRef.startsWith('file:')) {
    const filePath = fileURLToPath(collectionRef).replace(/[\\/]$/, '')
    return pathToFileURL(`${filePath}/collection.ts`).href
  }

  return `${collectionRef.replace(/[\\/]$/, '')}/collection.ts`
}

async function resolveCollectionGlob(collectionRef: string, rootDir: string) {
  const matches = sortPaths(
    await glob(collectionRef, {
      cwd: rootDir,
      dot: true,
      onlyFiles: true,
      absolute: true,
    }),
  )

  if (!matches.length) {
    throw new Error(
      `[calla] Collection glob "${collectionRef}" matched no files under "${rootDir}".`,
    )
  }

  return matches
}

async function resolveProjectCollectionPath(
  collectionRef: string,
  rootDir: string,
) {
  const projectPath = isAbsolute(collectionRef)
    ? collectionRef
    : resolve(rootDir, collectionRef)

  return resolvePath(projectPath)
}

async function resolveCollectionRef(collectionRef: string, rootDir: string) {
  const normalizedRef = ensureCollectionEntryRef(collectionRef)

  if (normalizedRef.startsWith('file:')) {
    return [await resolvePath(fileURLToPath(normalizedRef))]
  }

  if (isDynamicPattern(normalizedRef)) {
    return resolveCollectionGlob(normalizedRef, rootDir)
  }

  try {
    return [await resolveProjectCollectionPath(normalizedRef, rootDir)]
  }
  catch (projectError) {
    try {
      return [await resolvePath(normalizedRef)]
    }
    catch {
      throw projectError
    }
  }
}

export async function resolveCollectionRefs(
  collectionRefs: string[],
  rootDir: string,
): Promise<string[]> {
  const resolvedGroups = await Promise.all(
    collectionRefs.map(collectionRef =>
      resolveCollectionRef(collectionRef, rootDir),
    ),
  )

  return dedupePaths(resolvedGroups.flat())
}
