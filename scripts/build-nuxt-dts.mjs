import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import ts from 'typescript'

const workspaceRoot = resolve(import.meta.dirname, '..')
const nuxtRoot = resolve(workspaceRoot, 'packages/nuxt')
const sourceRoot = resolve(nuxtRoot, 'src')
const distRoot = resolve(nuxtRoot, 'dist')

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: fileName => fileName,
    getCurrentDirectory: () => workspaceRoot,
    getNewLine: () => '\n',
  })
}

async function collectSourceFiles(rootDir) {
  return ts.sys
    .readDirectory(rootDir, ['.ts'], undefined, undefined)
    .filter(filePath => filePath.endsWith('.ts'))
    .map(filePath => resolve(filePath))
}

async function emitDeclaration(filePath) {
  const source = await readFile(filePath, 'utf8')
  const result = ts.transpileDeclaration(source, {
    fileName: filePath,
    reportDiagnostics: true,
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      isolatedDeclarations: false,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
      verbatimModuleSyntax: true,
    },
  })

  if (result.diagnostics?.length) {
    throw new Error(
      `[apim] Failed to generate declaration for ${relative(workspaceRoot, filePath)}\n${formatDiagnostics(result.diagnostics)}`,
    )
  }

  const outputPath = resolve(
    distRoot,
    relative(sourceRoot, filePath).replace(/\.ts$/, '.d.ts'),
  )

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, result.outputText, 'utf8')
}

async function main() {
  const files = await collectSourceFiles(sourceRoot)
  await Promise.all(files.map(emitDeclaration))
}

await main()
