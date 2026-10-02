# Vite+ Upgrade Record

Date: 2026-10-02. Target: `vite-plus@1.0.0`.

## Scope

The repository already had a partial Vite+ setup. This used the existing-project
upgrade flow, without `--full`, scaffolding, a global installation, or commits.
The starting worktree was clean. Node.js 24.21.0 and pnpm 12.8.1 were used.
The original Vite 8.3.1 and Vitest 5.0.3 already met migration prerequisites.

The target CLI's `help`, `help migrate`, and `migrate --no-interactive` were run
through `pnpm dlx --package=vite-plus@1.0.0 vp` at the workspace root.
There were no BLOCK or REVIEW findings. The manual tsdown config merge warnings
were resolved by moving package builds into their `vite.config.ts` pack blocks.

## Changes

- Pin Vite+ 1.0.0; preserve the migrator's pnpm catalogs, Vite alias, Vitest
  override, direct upstream dependencies and peer rules. Vitest is unified at
  the toolchain's 5.0.1, including Nuxt test utilities.
- Use `vite-plus/test` in tests. Retain the library's upstream `vite` Plugin
  type import so published declarations do not require consumer Vite+ installs.
  Nuxt type augmentation remains on `nuxt/schema`.
- Move Oxlint configuration into root `vite.config.ts`, with type-aware lint
  and type checking. Preserve project rule exceptions and semantic ESLint.
- Enable Oxfmt with single quotes, no semicolons, and a 100-column width.
  Apply its formatting baseline to project files, excluding vendored skills
  and CodeGraph data. Disable conflicting ESLint formatting rules only.
- Replace standalone tsdown configs with package `pack` blocks. Root build
  schedules library tasks; preserve the custom Nuxt declaration generator.
- Keep Nuxt and VitePress builds as framework tasks. Direct `vp build` was
  tried in both app directories and rejected the missing `index.html`;
  `vp run --workspace-root dev:build` and `docs:build` are the validated paths.
- Fix the pre-existing Nuxt runtime/CLI output collision: public runtime stays
  at `dist/apim.mjs`, the secondary CLI uses `dist/cli.mjs`, and the internal
  wrapper follows the renamed file. Add an output-uniqueness regression test
  verified failing before the fix and passing afterward.
- Correct Nuxt's user-input config to `Partial<ModuleOptions>` while retaining
  resolved runtime option types/defaults. Add explicit framework helper imports
  to fixtures and playground handlers for standalone type checking.
- Preserve assertions while updating the CLI build-script expectation and
  typing conflict test fixtures. Missing imports now fail directly rather than
  being swallowed by the ignore test's fallback.
- Add `test:consumers` for emitted runtime exports, CLI entries, declaration
  imports and public consumer types, including negative type assertions.

## Compatibility Cleanup

All removal trials kept application/test code unchanged. Each removal and its
generated comments were accepted only after an affected build and consumer
check passed. `resolveDepSubpath` now uses the default `false`, preserving
external subpath imports as written. There are no inherited pack overrides.

| Candidate                                                        | Status        | Commands and Result                                                                                                |
| ---------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `packages/cli/vite.config.ts`, `pack.deps.resolveDepSubpath`     | Removed       | `pnpm exec vp -C packages/cli pack`; `pnpm test:consumers`: passed                                                 |
| `packages/nuxt/vite.config.ts`, `pack[0].deps.resolveDepSubpath` | Removed       | `pnpm exec vp -C packages/nuxt pack`; `node scripts/build-nuxt-dts.mjs`; `pnpm test:consumers`: passed             |
| `packages/nuxt/vite.config.ts`, `pack[1].deps.resolveDepSubpath` | Removed       | Same Nuxt commands, rerun separately: passed                                                                       |
| Root generated tsdown compatibility                              | Obsolete      | Root workspace-only pack config was replaced with task scheduling; both actual package builds and consumers passed |
| Vitest v4 compatibility                                          | Not generated | Original project already used Vitest v5; no candidate settings, assertion changes, snapshot updates or new skips   |
| `attw.profile: 'strict'`                                         | Not generated | No existing ATTW profile/check was removed or relaxed                                                              |

No generated compatibility settings remain, and none required deferred rewrites.

## Validation

After the accepted compatibility removals, the full validation passed:

| Command                                            | Result                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                   | Passed, lockfile unchanged                                              |
| `pnpm exec vp check`                               | Passed, 107 formatted files and 69 lint/type-checked files              |
| `pnpm exec vp test run`                            | Passed, 12 files and 46 tests                                           |
| `pnpm exec vp run --workspace-root test:types`     | Passed, source tsc and playground vue-tsc                               |
| `pnpm exec vp run --workspace-root dev:build`      | Passed, both library pack tasks, declarations and Nuxt production build |
| `pnpm exec vp run --workspace-root docs:build`     | Passed, VitePress production build                                      |
| `pnpm exec vp run --workspace-root test:consumers` | Passed, runtime and declaration consumers                               |
| `pnpm lint`                                        | Passed with the existing JSDoc warning                                  |
| `git diff --check`                                 | Passed                                                                  |

The test suite has 12 files and 46 tests, including Nuxt end-to-end tests and
the added output-collision regression. No configured browser, coverage or
benchmark suites were found; none were removed or disabled.

Both packages were also packed through their existing pnpm prepack hooks and
installed into an isolated consumer in ignored `.cache/viteplus-consumer`.
That consumer tested the published package imports, `apim --help`, and the
public type fixture using TypeScript 6.0.3. The unpublished workspace CLI
dependency was redirected to its local tarball in this temporary environment.
The existing `skipLibCheck` policy was retained; local emitted declaration
imports are additionally resolved individually by `test:consumers`.

## Remaining Notes

- Semantic ESLint remains alongside Oxlint because its project-specific rules
  have not been discarded. One existing JSDoc warning remains in
  `packages/cli/src/collection.mjs`.
- Nuxt emits an upstream DEP0155 warning involving `@vue/shared` export mapping.
- Build output still targets Node 18 as before. Runtime validation used Node
  24.21.0, not a separate Node 18/20 matrix.
- No known migration BLOCK/REVIEW findings remain. No commit or push was made.
