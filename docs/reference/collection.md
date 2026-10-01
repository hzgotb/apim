# Collection 模型

## `defineApiModule`

```ts
function defineApiModule<T extends ApimCollection>(
  options: T,
): ApiModuleEntry<T>
```

它返回一个带有内部 key 的 entry。模块会校验这个 key，避免把普通默认导出误当成 collection。

## `ApimCollection`

```ts
interface ApimCollection {
  name: string
  root?: string
  routeGroups: ApiRouteGroup[]
  ignore?: string[]
}
```

| 字段 | 说明 |
| --- | --- |
| `name` | collection 名称，用于类型上下文和冲突错误。 |
| `root` | 可选根目录。默认是 collection 文件所在目录。 |
| `routeGroups` | 至少一个扫描组。 |
| `ignore` | collection 级 glob 忽略规则。 |

## `ApiRouteGroup`

```ts
interface ApiRouteGroup {
  dir: string | RegExp
  clientPrefix: string
  ignore?: string[]
}
```

同一个 collection 可以配置多个 route group，将不同目录映射到不同客户端前缀：

```ts
export default defineApiModule({
  name: 'admin-api',
  routeGroups: [
    { dir: 'runtime/server', clientPrefix: '/api' },
    { dir: 'runtime/admin', clientPrefix: '/admin' },
  ],
})
```
