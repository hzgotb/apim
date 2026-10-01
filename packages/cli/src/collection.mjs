import { lstat, mkdir, readdir, writeFile } from 'node:fs/promises'
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path'

const TYPESCRIPT_FILE_RE = /\.[cm]?[jt]sx?$/i

/**
 * Removes trailing path separators from a string.
 * Handles both Unix (/) and Windows (\) separators.
 * @param {string} value - The path string to trim
 * @returns {string} - The trimmed path string with no trailing separators
 */
function trimTrailingSeparators(value) {
  return value.replace(/[\\/]+$/, '')
}

/**
 * Checks if a relative path escapes outside the root directory.
 * Used to prevent paths like '../foo' or absolute paths from being resolved incorrectly.
 * @param {string} relativePath - The path to check
 * @returns {boolean} - True if the path would escape the root, false otherwise
 */
function isOutsideRoot(relativePath) {
  return (
    relativePath === '..'
    || relativePath.startsWith(`..${sep}`)
    || isAbsolute(relativePath)
  )
}

/**
 * Generates the contents of a collection.ts configuration file.
 * This file exports an API collection definition for the APIM tool.
 * @param {string} name - The name of the collection (typically derived from directory name)
 * @param {string} clientPrefix - The prefix to use for client-side routes (e.g., '/api')
 * @returns {string} - TypeScript source code for the collection file
 */
function toCollectionFileContent(name, clientPrefix) {
  return [
    `import { defineApiModule } from '@hzgotb/apim-nuxt'`,
    '',
    'export default defineApiModule({',
    `  name: ${JSON.stringify(name)},`,
    `  ignore: ['**/types/**', '**/*.types.*'],`,
    '  routeGroups: [',
    '    {',
    `      dir: 'runtime/server',`,
    `      clientPrefix: ${JSON.stringify(clientPrefix)},`,
    '    },',
    '  ],',
    '})',
    '',
  ].join('\n')
}

/**
 * Generates an example h3 event handler with TypeScript definitions.
 * This creates a greeting endpoint as a template/example for users.
 * @returns {string} - TypeScript source code for the example handler file
 */
function toExampleHandlerContent() {
  return [
    `import { getQuery } from 'h3'`,
    '',
    'export interface ApiModuleMeta {',
    '  query: {',
    '    name?: string',
    '  }',
    '  res: {',
    '    message: string',
    '  }',
    '}',
    '',
    'export default defineEventHandler((event) => {',
    '  const query = getQuery(event)',
    `  const name = typeof query.name === 'string' ? query.name : 'apim'`,
    '',
    '  return {',
    '    message: `Hello, ${name}!`,',
    `  } satisfies ApiModuleMeta['res']`,
    '})',
    '',
  ].join('\n')
}

/**
 * Derives a collection name from a target directory path.
 * Extracts the basename and validates that it's a valid directory name (not a file extension).
 * @param {string} targetPath - The filesystem path to the directory
 * @returns {string} - The extracted directory name
 * @throws {Error} If the path is empty, refers to current/parent directory ('.' or '..'),
 *                 points to root, or has a TypeScript file extension
 */
export function deriveCollectionName(targetPath) {
  const normalizedPath = trimTrailingSeparators(targetPath.trim())
  const name = basename(normalizedPath)

  if (!name || name === '.' || name === sep) {
    throw new Error('[apim] Target path must end with a directory name.')
  }

  if (TYPESCRIPT_FILE_RE.test(name)) {
    throw new Error(
      '[apim] Target path must be a directory path, not a TypeScript file path.',
    )
  }

  return name
}

/**
 * Resolves and validates the target directory for a collection scaffold operation.
 * Ensures the path is valid, relative to project root, and accessible.
 * @param {string} targetPath - The user-provided directory path (project-relative)
 * @param {string} [rootDir] - The root directory of the Nuxt app/project
 * @returns {{name: string, resolvedTarget: string, relativeTarget: string}} - Object containing:
 *   - name: The extracted collection name
 *   - resolvedTarget: Absolute filesystem path to target directory
 *   - relativeTarget: Path relative to project root ('.' if in root)
 * @throws {Error} If the path is missing, absolute (should be relative), or escapes outside root
 */
export function resolveTargetDirectory(targetPath, rootDir = process.cwd()) {
  const trimmedTargetPath = targetPath.trim()

  if (!trimmedTargetPath) {
    throw new Error(
      '[apim] Missing target path. Pass a project-relative directory path.',
    )
  }

  if (isAbsolute(trimmedTargetPath)) {
    throw new Error(
      '[apim] Target path must be relative to the Nuxt app root.',
    )
  }

  const resolvedTarget = resolve(rootDir, trimmedTargetPath)
  const relativeTarget = relative(rootDir, resolvedTarget)

  if (isOutsideRoot(relativeTarget)) {
    throw new Error('[apim] Target path must stay inside the Nuxt app root.')
  }

  return {
    name: deriveCollectionName(trimmedTargetPath),
    resolvedTarget,
    relativeTarget: relativeTarget || '.',
  }
}

/**
 * Asserts that a target directory is safe to write to.
 * Checks if the path exists and, if so, ensures it's either a non-existent
 * directory or an empty directory ready for scaffold operation.
 * @param {string} targetDir - Absolute filesystem path to check
 * @param {string} targetLabel - Human-readable label used in error messages (e.g., 'collection')
 * @returns {void|Promise<void>}
 * @throws {Error} If the target exists but is not a directory, or if it exists and contains files
 */
export async function assertTargetDirectoryIsWritable(targetDir, targetLabel) {
  try {
    const stats = await lstat(targetDir)

    if (!stats.isDirectory()) {
      throw new Error(
        `[apim] Target "${targetLabel}" already exists and is not a directory.`,
      )
    }

    const entries = await readdir(targetDir)
    if (entries.length > 0) {
      throw new Error(
        `[apim] Target "${targetLabel}" already exists and is not empty.`,
      )
    }
  }
  catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'ENOENT'
    ) {
      return
    }
    throw error
  }
}

/**
 * Builds the list of files needed for a collection scaffold operation.
 * Creates file definitions with relative paths and contents based on the selected template.
 * @param {{name: string, clientPrefix: string, template: 'minimal' | 'example'}} options - Configuration object
 * @returns {Array<{relativePath: string, contents: string}>} - Array of file objects to create
 */
export function buildCollectionFiles({ name, clientPrefix, template }) {
  const files = [
    {
      relativePath: 'collection.ts',
      contents: toCollectionFileContent(name, clientPrefix),
    },
    {
      relativePath: 'runtime/server/.gitkeep',
      contents: '',
    },
  ]

  if (template === 'example') {
    files.push({
      relativePath: 'runtime/server/hello.get.ts',
      contents: toExampleHandlerContent(),
    })
  }

  return files
}

/**
 * Main entry point for scaffolding an API collection.
 * Orchestrates the entire operation: resolving paths, building file definitions,
 * creating directories, and writing files to disk.
 * @param {{targetPath: string, template?: 'minimal' | 'example', rootDir?: string}} options - Operation options
 *   - targetPath: Project-relative directory path where collection will be created
 *   - template: Template to use ('minimal' creates basic structure, 'example' includes sample handler)
 *   - rootDir: Root directory of the project (defaults to process.cwd())
 * @returns {Promise<{clientPrefix: string, createdFiles: string[], name: string, targetPath: string, template: 'minimal' | 'example'}>} - Result object containing:
 *   - clientPrefix: The prefix used for client routes (e.g., '/collection-name')
 *   - createdFiles: List of relative paths to created files/directories
 *   - name: Extracted collection name
 *   - targetPath: Path where the collection was created (relative to project root)
 *   - template: The template that was used for scaffolding
 */
export async function scaffoldCollection({
  targetPath,
  template = 'minimal',
  rootDir = process.cwd(),
}) {
  const target = resolveTargetDirectory(targetPath, rootDir)
  const clientPrefix = `/${target.name}`
  const files = buildCollectionFiles({
    name: target.name,
    clientPrefix,
    template,
  })

  await assertTargetDirectoryIsWritable(
    target.resolvedTarget,
    target.relativeTarget,
  )
  await mkdir(target.resolvedTarget, { recursive: true })

  const createdFiles = []

  for (const file of files) {
    const absolutePath = resolve(target.resolvedTarget, file.relativePath)
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, file.contents, 'utf8')
    createdFiles.push(relative(rootDir, absolutePath) || '.')
  }

  return {
    clientPrefix,
    createdFiles,
    name: target.name,
    targetPath: target.relativeTarget,
    template,
  }
}
