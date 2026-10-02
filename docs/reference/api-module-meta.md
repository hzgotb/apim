# ApiModuleMeta 模型

`ApiModuleMeta` 是每个 Nitro handler 可选导出的 TypeScript 模型。模块不会在运行时读取它，也不会把它编译成校验器；它只在构建 Nuxt 类型模板时读取字段声明。

## 三个字段

```ts
export interface ApiModuleMeta {
  body: BodyModel
  query: QueryModel
  res: ResponseModel
}
```

| 字段    | 对应客户端位置         | 典型方法         | 作用           |
| ------- | ---------------------- | ---------------- | -------------- |
| `query` | `apim(url, { query })` | GET              | 查询参数模型。 |
| `body`  | `apim(url, { body })`  | POST、PUT、PATCH | 请求体模型。   |
| `res`   | `data`                 | 所有方法         | 成功响应模型。 |

字段都是可选的。只声明 `res` 的 GET handler 不会要求 query；只声明 `body` 的 POST handler 不会凭空生成 query。

## 完整示例

```ts
// runtime/server/echo.post.ts
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

export default defineEventHandler(async event => {
  const body = await readBody<ApiModuleMeta['body']>(event)
  const repeat = Math.max(1, Math.min(3, body.repeat ?? 1))

  return {
    echoed: Array.from({ length: repeat }, () => body.message),
    total: repeat,
  } satisfies ApiModuleMeta['res']
})
```

客户端调用会获得对应的约束：

```ts
const { data } = await apim('/api/echo', {
  method: 'POST',
  body: { message: 'hello', repeat: 2 },
})
// data.value?.echoed: string[]
// data.value?.total: number
```

## 方法与路由匹配

模块按扫描得到的 route 和 method 建立 payload map：

- `profile.get.ts` 写入 `GET /api/profile`；
- `profile.post.ts` 写入同一路由的 `POST` schema；
- 未带 method 的 handler 使用默认 route schema，GET 调用可以读取它；
- `apim()` 没有显式 method 时优先选择 GET，若路由没有 GET 则使用可用方法。

## 类型来源与限制

`ApiModuleMeta` 必须是 handler 文件中的导出 `interface` 或 `type`，名字必须精确为 `ApiModuleMeta`。模块只提取 `body`、`query`、`res` 三个字段。

它不会：

- 验证实际返回值；请使用 `satisfies ApiModuleMeta['res']` 保持实现和模型同步；
- 推断任意未导出的局部类型；
- 替代 h3/Nitro 的运行时 schema 校验。

需要运行时校验时，可在 handler 中配合 Zod、Valibot 或 Nitro 自己的校验方式；`ApiModuleMeta` 负责静态请求体验。

## 公开请求模型

`@hzgotb/apim-nuxt/apim` 还导出了几个可以在 composable、封装函数和组件 props 中复用的类型：

```ts
import type { ApimBody, ApimOpts, ApimQuery, ApimRes } from '@hzgotb/apim-nuxt/apim'
```

| 类型                         | 默认方法                       | 取值来源                           | 典型用途                                             |
| ---------------------------- | ------------------------------ | ---------------------------------- | ---------------------------------------------------- |
| `ApimQuery<Route, Method>`   | GET                            | `ApiModuleMeta['query']`           | 表单、筛选器和 query builder 的参数类型。            |
| `ApimBody<Route, Method>`    | POST                           | `ApiModuleMeta['body']`            | mutation payload、表单提交和请求封装。               |
| `ApimRes<Route, Method>`     | 路由中的 GET，或第一个可用方法 | `ApiModuleMeta['res']`             | composable 返回值和缓存层的响应类型。                |
| `ApimOpts<ResT, DataT, ...>` | 无                             | `AsyncDataOptions` + fetch options | 为通用请求封装保留 `key`、`watch`、`$fetch` 等选项。 |

例如，可以把一条 API 封装成业务函数，同时保持和 handler 相同的类型来源：

```ts
import type { ApimBody, ApimRes } from '@hzgotb/apim-nuxt/apim'

type EchoBody = ApimBody<'/api/echo', 'post'>
type EchoResponse = ApimRes<'/api/echo', 'post'>

export function useEcho(body: EchoBody) {
  return apim<EchoResponse>('/api/echo', {
    method: 'POST',
    body,
  })
}
```

这些类型依赖 Nuxt 生成的 `InternalApiPayload`。因此它们通常应该在 Nuxt 类型环境已经生成后使用，例如 Nuxt 应用源码、模块测试或经过 `nuxt prepare` 的编辑器环境中。

## `ApiModuleMeta` 与运行时校验

`ApiModuleMeta` 是静态契约，不会自动检查来自网络的输入。建议让运行时实现显式使用同一模型：

```ts
export interface ApiModuleMeta {
  body: CreateUserInput
  res: CreateUserOutput
}

export default defineEventHandler(async event => {
  const body = await readBody<CreateUserInput>(event)
  // 在这里使用 schema.parse(body) 完成运行时校验。
  const user = await createUser(body)
  return user satisfies CreateUserOutput
})
```

这样可以分别覆盖两个边界：schema 负责不可信输入，`ApiModuleMeta` 负责客户端编译期体验和响应类型推导。
