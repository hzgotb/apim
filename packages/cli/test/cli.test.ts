import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vite-plus/test'

const execFileAsync = promisify(execFile)
const cliPath = fileURLToPath(new URL('../src/apim.mjs', import.meta.url))
const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url))
const tempDirs: string[] = []

async function createTempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'apim-cli-'))
  tempDirs.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

describe('apim cli', () => {
  it('uses a stable bin entry that exists before build', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))

    expect(packageJson.bin).toEqual({
      apim: './bin/apim.mjs',
    })
    expect(packageJson.files).toContain('bin')
  })

  it('builds dist during prepack for publish on a fresh runner', async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))

    expect(packageJson.scripts).toMatchObject({
      build: 'vp pack',
      prepack: 'pnpm build',
    })
  })

  it('creates the minimal collection scaffold', async () => {
    const rootDir = await createTempRoot()
    const { stdout } = await execFileAsync(
      process.execPath,
      [cliPath, 'collection', 'modules/demo-api'],
      { cwd: rootDir },
    )

    const collection = await readFile(join(rootDir, 'modules/demo-api/collection.ts'), 'utf8')

    expect(collection).toContain(`name: "demo-api"`)
    expect(collection).toContain(`clientPrefix: "/demo-api"`)
    expect(stdout).toContain('derived from the last segment of "modules/demo-api"')

    const gitkeep = await readFile(
      join(rootDir, 'modules/demo-api/runtime/server/.gitkeep'),
      'utf8',
    )
    expect(gitkeep).toBe('')
  })

  it('creates the example handler when requested', async () => {
    const rootDir = await createTempRoot()

    await execFileAsync(
      process.execPath,
      [cliPath, 'collection', 'modules/demo-example', '--example'],
      { cwd: rootDir },
    )

    const handler = await readFile(
      join(rootDir, 'modules/demo-example/runtime/server/hello.get.ts'),
      'utf8',
    )

    expect(handler).toContain('export interface ApiModuleMeta')
    expect(handler).toContain('message: `Hello, ${name}!`')
  })

  it('aborts when the target directory is not empty', async () => {
    const rootDir = await createTempRoot()
    const targetDir = join(rootDir, 'modules/demo-api')
    await mkdir(targetDir, { recursive: true })
    await writeFile(join(targetDir, 'existing.txt'), 'occupied', 'utf8')

    await expect(
      execFileAsync(process.execPath, [cliPath, 'collection', 'modules/demo-api'], {
        cwd: rootDir,
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('already exists and is not empty'),
    })
  })
})
