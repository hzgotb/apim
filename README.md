# `@hzgotb/apim-nuxt`

Nuxt 4 module for file-based API collections, typed `apim(...)` requests, and `ApiModuleMeta`-driven request/response inference.

## 它提供什么

- 用 `defineApiModule(...)` 显式声明一组 API collection
- 扫描 collection 下的 `runtime/server` handlers，并挂到 Nuxt/Nitro
- 从 handler 里导出的 `ApiModuleMeta` 生成 `apim(...)` 的请求/响应类型
- 把 `apim(...)` 在编译期改写成 `useFetch(...)`
- 检查 collection 之间、以及宿主 `server/api` / `server/routes` 和 collection 之间的路由冲突
- 支持用 `apim.exclude` 按最终路由签名排除第三方 collection handler

## 安装

```bash
pnpm add @hzgotb/apim-nuxt
```

当前 peer dependency:

- `nuxt: ^4.0.0`

## 快速开始

### 1. 在 `nuxt.config.ts` 里启用模块

```ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/demo-api'],
    injectApimToGlobal: true,
  },
})
```

### 2. 创建 collection 入口

`apim.collections` 默认按 Nuxt 应用的 `rootDir` 解析。目录式路径会自动补成 `/collection.ts`。

例如 `modules/demo-api` 会解析到 `modules/demo-api/collection.ts`：

```ts
import { defineApiModule } from '@hzgotb/apim-nuxt'

export default defineApiModule({
  name: 'demo-api',
  ignore: ['**/types/**', '**/*.types.*'],
  handlers: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
    },
  ],
})
```

注意：

- collection 默认导出必须是 `defineApiModule({...})`
- 直接 `export default { ... }` 不是合法入口

### 3. 写 server handlers

`packages/nuxt` 的文件名语义对齐 Nitro。

例如：

```ts
import { getQuery, type H3Event } from 'h3'

export interface ApiModuleMeta {
  query: {
    name?: string
  }
  res: {
    message: string
  }
}

export default defineEventHandler((event: H3Event) => {
  const query = getQuery(event)
  const name = typeof query.name === 'string' ? query.name : 'apim'

  return {
    message: `Hello, ${name}!`,
  } satisfies ApiModuleMeta['res']
})
```

再比如一个 POST handler：

```ts
import { readBody, type H3Event } from 'h3'

export interface ApiModuleMeta {
  body: {
    message: string
    repeat?: number
  }
  res: {
    echoed: string[]
    total: number
  }
}

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<ApiModuleMeta['body']>(event)
  const repeat = Math.max(1, Math.min(3, body?.repeat ?? 1))
  const message = body?.message ?? ''

  return {
    echoed: Array.from({ length: repeat }, () => message),
    total: repeat,
  } satisfies ApiModuleMeta['res']
})
```

### 4. 在客户端调用

默认 `injectApimToGlobal: true`，所以可以直接用全局 `apim`：

```ts
const { data: profile } = await apim('/api/profile', {
  query: { name: 'apim' },
})

const { data: echoed } = await apim('/api/echo', {
  method: 'POST',
  body: {
    message: 'hello',
    repeat: 2,
  },
})
```

如果你把 `injectApimToGlobal` 关掉：

```ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/demo-api'],
    injectApimToGlobal: false,
  },
})
```

则显式导入：

```ts
import { apim } from '#apim/apim'
```

## 路由文件命名规则

以下示例假设 `clientPrefix` 是 `/api`：

| 文件                | 最终路由             |
| ------------------- | -------------------- |
| `profile.get.ts`    | `GET /api/profile`   |
| `profile.post.ts`   | `POST /api/profile`  |
| `users/[id].get.ts` | `GET /api/users/:id` |
| `[...slug].ts`      | `* /api/**:slug`     |
| `index.ts`          | `* /api`             |

还支持 Nitro 风格的：

- handler group segment: `(admin)`
- env suffix: `.dev` / `.prod` / `.prerender`

## `apim.collections` 支持的写法

### 目录式

会自动补 `/collection.ts`：

```ts
apim: {
  collections: ['modules/demo-api'],
}
```

### 显式 TypeScript 文件

```ts
apim: {
  collections: ['modules/demo-explicit/demo-module.ts'],
}
```

### glob

```ts
apim: {
  collections: ['modules/*'],
}
```

## Collection 配置

### `defineApiModule(...)`

```ts
import { defineApiModule } from '@hzgotb/apim-nuxt'
```

它返回一个带运行时 key 的 collection entry，模块加载时会先校验这个 key，再解包出真正的 collection 配置。

### `ApiCollection`

```ts
interface ApiCollection {
  name: string
  root?: string
  handlers: ApiHandlers[]
  ignore?: string[]
}
```

字段说明：

- `name`: collection 名，用于错误信息和冲突提示
- `root`: 可选。默认是 collection 文件所在目录；如果你需要把入口文件和 runtime 目录分开，可以显式指定
- `handlers`: 必填。告诉模块要扫哪些目录、映射到哪个客户端前缀
- `ignore`: collection 级别忽略规则

### `ApiHandlers`

```ts
type ApiHandlers = {
  dir: string | RegExp
  clientPrefix: string
  ignore?: string[]
}
```

字段说明：

- `dir`: 可以是字符串目录，也可以是 `RegExp`
- `clientPrefix`: 扫描结果最终挂到哪个前缀下
- `ignore`: handler 分组级别忽略规则

## Ignore 规则

ignore 有两层：

- `collection.ignore`
- `handlers[].ignore`

合并规则：

- 默认先继承 `collection.ignore`
- 再追加 `handlers[].ignore`
- 如果 `handlers[].ignore[0] === '!...'`，则取消继承，只使用当前 handler 分组自己的规则

示例：

```ts
export default defineApiModule({
  name: 'demo-api',
  ignore: ['**/types/**', '**/*.types.*'],
  handlers: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
    },
    {
      dir: 'runtime/server/admin',
      clientPrefix: '/admin',
      ignore: ['!...', '**/*.draft.*'],
    },
  ],
})
```

说明：

- 第一个 group 继承 collection 级 ignore
- 第二个 group 不继承 collection ignore，而是从自己的规则重新开始

## `ApiModuleMeta` 规则

模块只会从 handler 里提取名为 `ApiModuleMeta` 的导出类型，且只识别三个字段：

- `body`
- `query`
- `res`

支持两种写法：

```ts
export interface ApiModuleMeta {
  query: { id: string }
  res: { ok: true }
}
```

```ts
export type ApiModuleMeta = {
  body: { message: string }
  res: { ok: true }
}
```

不会参与类型生成的情况：

- 导出名不是 `ApiModuleMeta`
- 不是 interface / type literal
- 字段不是 `body` / `query` / `res`

## `apim.exclude`

当宿主应用已经有 `server/api` 或 `server/routes` 路由，而你又引入了第三方 collection 时，可以用 `exclude` 主动屏蔽 collection handler。

`exclude` 按最终路由签名匹配：

- `GET /api/profile`
- `POST /foo`
- `* /bar`

示例：

```ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/demo-api'],
    exclude: ['GET /api/profile'],
  },
})
```

命中 `exclude` 后，该 collection handler 会：

- 不参与冲突检测
- 不注册到 Nitro
- 不进入 `apim` 类型生成

## 宿主路由冲突

当前实现会把 collection handlers 和宿主 Nuxt 项目里已经存在的：

- `server/api/*`
- `server/routes/*`

一起做冲突检测。

如果同一路径、同 method 冲突，或者任意一方是 methodless 路由，就会直接报错并阻止继续构建。

例如这些会冲突：

- `host: GET /api/profile` vs `collection: GET /api/profile`
- `host: * /api/profile` vs `collection: GET /api/profile`
- `host: GET /foo` vs `collection: * /foo`

这些不会冲突：

- `host: GET /api/profile` vs `collection: POST /api/profile`

## `apim(...)` 的运行方式

`apim` 不是额外的请求运行时。当前实现是：

1. 从 handler 的 `ApiModuleMeta` 生成类型模板
2. 把源码里的 `apim(...)` 编译期改写成 `useFetch(...)`

所以你得到的是：

- `useFetch` 的运行时行为
- `ApiModuleMeta` 驱动的请求/响应类型

## `runtime/stores`

如果 collection 下有 `runtime/stores` 目录，模块会把它加入 Nuxt 的 `imports:dirs`，这样这些 store/composable 文件可以被 Nuxt 自动导入。

示例目录结构：

```txt
modules/demo-api/
  collection.ts
  runtime/
    server/
      profile.get.ts
      echo.post.ts
    stores/
      useProfileStore.ts
```

## 一个完整示例

```txt
app/
  nuxt.config.ts
  modules/
    demo-api/
      collection.ts
      runtime/
        server/
          profile.get.ts
          echo.post.ts
```

`nuxt.config.ts`

```ts
export default defineNuxtConfig({
  modules: ['@hzgotb/apim-nuxt'],
  apim: {
    collections: ['modules/demo-api'],
  },
})
```

`modules/demo-api/collection.ts`

```ts
import { defineApiModule } from '@hzgotb/apim-nuxt'

export default defineApiModule({
  name: 'demo-api',
  ignore: ['**/types/**', '**/*.types.*'],
  handlers: [
    {
      dir: 'runtime/server',
      clientPrefix: '/api',
    },
  ],
})
```

客户端：

```ts
const { data } = await apim('/api/profile', {
  query: { name: 'apim' },
})
```

## 适合什么场景

- 你想把一组 API 以 collection 的形式封装成 Nuxt 可复用模块
- 你希望 `useFetch` 调用保留 Nuxt 运行时语义，但补上更明确的请求/响应类型
- 你希望宿主应用能在接入第三方 collection 时，对路由冲突和排除策略有明确控制

## 开发与验证

仓库使用 Vite+ 1.0.0，保留 pnpm workspace、Nuxt 和 VitePress 的框架流程。
本地工具链无需全局安装 `vp`；使用 Node.js 24.11+ 和 `pnpm@12.8.1`。

```bash
pnpm install --frozen-lockfile
pnpm exec vp check
pnpm exec vp test run
pnpm exec vp run --workspace-root test:types
pnpm exec vp run --workspace-root build
pnpm exec vp run --workspace-root test:consumers
pnpm exec vp run --workspace-root dev:build
pnpm exec vp run --workspace-root docs:build
```

`build` 调度两个库的 `vp pack`，并保留 Nuxt 声明生成步骤。
`test:consumers` 需要先构建库产物。

开发 playground 使用 `pnpm exec vp run --workspace-root dev`，文档使用
`pnpm exec vp run --workspace-root docs:dev`。`vp dev` / `vp build` 直接调用 Vite，
不替代这里的 Nuxt / VitePress 命令；`vp test` 是内置测试工具，`vp run test`
执行项目的同名脚本。`packageManager` 决定 `vp install` / `vp add` / `vp remove`
使用的包管理器。

迁移详情、兼容设置清理和验证记录见 [TOOLCHAIN.md](./TOOLCHAIN.md)。
