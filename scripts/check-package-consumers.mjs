import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const cli = await import('../packages/cli/dist/index.mjs')
const nuxt = await import('../packages/nuxt/dist/module.mjs')
const runtime = await import('../packages/nuxt/dist/apim.mjs')

assert.equal(typeof cli.scaffoldCollection, 'function')
assert.equal(typeof nuxt.default, 'function')
assert.equal(typeof nuxt.defineApiModule, 'function')
assert.equal(typeof runtime.apim, 'function')

for (const entry of ['packages/cli/bin/apim.mjs', 'packages/nuxt/bin/apim.mjs']) {
  const output = execFileSync(process.execPath, [resolve(root, entry), '--help'], {
    encoding: 'utf8',
  })
  assert.match(output, /apim collection/)
}

const configPath = resolve(root, 'packages/nuxt/tsconfig.consumer.json')
const config = ts.readConfigFile(configPath, file => ts.sys.readFile(file))
assert.equal(config.error, undefined)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve(root, 'packages/nuxt'))
const program = ts.createProgram(parsed.fileNames, parsed.options)
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]

// Check every emitted declaration import, including dependencies hidden by skipLibCheck.
for (const file of ts.sys.readDirectory(resolve(root, 'packages/nuxt/dist'), ['.ts'])) {
  const source = ts.createSourceFile(file, ts.sys.readFile(file), ts.ScriptTarget.Latest)
  for (const statement of source.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const specifier = statement.moduleSpecifier.text
      assert.ok(
        ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule,
        `Unresolved declaration import ${specifier} in ${file}`,
      )
    }
  }
}

assert.equal(
  diagnostics.length,
  0,
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => fileURLToPath(new URL('..', import.meta.url)),
    getNewLine: () => '\n',
  }),
)
console.log('Library runtime exports, CLI entries, declaration imports and consumer types passed.')
