# `packages/nuxt` ignore 语义设计

## 背景

当前 `packages/nuxt/src/module.ts` 会在扫描 collection 路由时，隐式注入两条忽略规则：

- `**/types/**`
- `**/*.types.*`

这两条规则今天不是由 collection 作者显式声明，而是模块层的内置行为。与此同时，现有公开契约里只有 `ApiCollection.ignore?: string[]`，没有 `ApiRouteGroup.ignore`，也没有对多层 ignore 组合语义做清晰定义。

本次讨论后，方向已经收敛：

1. 不引入 `ModuleOptions.ignore`
2. `scanServerRoutes(...)` 不保留业务层默认忽略规则
3. ignore 的拥有者回到 collection 作者
4. ignore 只保留 collection 内两层：
   - `ApiCollection.ignore`
   - `ApiRouteGroup.ignore`

## 设计目标

本次设计需要满足以下目标：

1. 让 `scanServerRoutes(...)` 变成纯扫描器，只消费调用方传入的 `ignore`。
2. 让 collection 作者显式声明默认忽略规则，不再依赖模块层隐式注入。
3. 支持 route group 在继承 collection 默认规则的前提下继续追加忽略项。
4. 支持 route group 显式取消继承 collection 默认规则。
5. 让 ignore 的组合语义足够少、足够稳定、足够容易文档化和测试。

## 非目标

本次设计不包含以下内容：

1. 不新增 `ModuleOptions.ignore`
2. 不增加 collection 之外的第四层 ignore 配置
3. 不引入新的公开 helper 或共享常量导出
4. 不保留“框架默认帮作者忽略类型文件”的隐式契约

## API 设计

目标公开类型如下：

```ts
export interface ApiRouteGroup {
  dir: string | RegExp
  clientPrefix: string
  ignore?: string[]
}

export interface ApiCollection {
  name: string
  root?: string
  routeGroups: ApiRouteGroup[]
  ignore?: string[]
}
```

含义定义：

- `ApiCollection.ignore` 是 collection 级基础忽略规则
- `ApiRouteGroup.ignore` 是 route group 对 collection 基础规则的局部修正

## 组合语义

### Collection 层

- `collection.ignore === undefined` 等价于 `[]`
- `collection.ignore` 不支持 `'!...'`
- `collection.ignore` 内的 `!pattern` 仍按普通 ignore 模式参与顺序计算

### Route Group 层

- `routeGroup.ignore === undefined`
  最终规则等于 `collection.ignore ?? []`
- `routeGroup.ignore` 存在且第一个元素不是 `'!...'`
  最终规则等于 `[...collectionIgnore, ...routeGroup.ignore]`
- `routeGroup.ignore[0] === '!...'`
  最终规则等于 `routeGroup.ignore.slice(1)`

这里的 `'!...'` 不是 glob 模式，而是 `sdkr` 自己定义的控制标记，表示：

- 不继承 collection 级 ignore
- 从 route group 自己的数组重新开始解释最终规则

### 顺序与覆盖规则

最终交给扫描器的 ignore 数组，必须保留作者书写顺序，并按从左到右解释：

- 后面的规则可以覆盖前面的规则
- `!pattern` 可以把前面忽略掉的文件重新放出来

这条顺序语义是 `sdkr` 的契约，不是对底层扫描库行为的模糊依赖。后续实现必须验证当前扫描后端能正确保留这套语义；如果底层库不能稳定满足该要求，则需要在 `sdkr` 自己的 ignore 解析或文件过滤阶段补齐，而不是弱化文档语义。

这意味着：

- `routeGroup.ignore = []` 不是“清空继承”
- `routeGroup.ignore = []` 的效果仍然是纯继承 collection.ignore
- 真正的“不要继承 collection.ignore”必须写成 `['!...']`

### 非法输入

为了避免语义歧义，`'!...'` 只在 `routeGroup.ignore` 的第一个元素有特殊含义。

以下情况应视为配置错误并直接报错：

1. `collection.ignore` 中出现 `'!...'`
2. `routeGroup.ignore` 中在非首位出现 `'!...'`

## 数据流

推荐把 ignore 解析抽成一个纯函数，例如：

```ts
resolveRouteGroupIgnore(
  collectionIgnore: string[] | undefined,
  routeGroupIgnore: string[] | undefined,
): string[]
```

数据流如下：

1. collection 被加载后，读取 `collection.ignore`
2. 遍历每个 route group 时，读取 `group.ignore`
3. 通过纯函数解析出该 group 的最终 ignore 数组
4. 将最终 ignore 原样传给 `scanServerRoutes(...)`
5. `scanServerRoutes(...)` 不再追加任何框架内置规则

这样可以把“ignore 语义解释”与“文件系统扫描”分离开：

- `module.ts` 负责组装语义
- `scan.ts` 负责消费最终结果

## 迁移策略

这次变更按 breaking change 处理。

行为变化如下：

- 如果一个 collection 之前依赖模块层隐式排除 `types` 文件，那么在本次变更后，如果作者没有显式写 `ignore`，这些文件将重新进入扫描范围

为了让迁移尽量可见且可控，本次设计要求：

1. CLI 脚手架生成的 collection 默认显式写出：
   - `**/types/**`
   - `**/*.types.*`
2. playground 中现有 collection 显式补上这两条 ignore
3. README、OVERVIEW、中文概览同步说明：
   - ignore 不再有模块内置默认值
   - 类型辅助文件之所以被忽略，是因为 collection 作者显式配置了 ignore

这次不额外提供兼容开关，也不保留模块层兜底默认值。

## 文档要求

文档需要明确写出以下事实：

1. `scanServerRoutes(...)` 自身不带默认忽略规则
2. `ApiCollection.ignore` 是 collection 的基础规则
3. `ApiRouteGroup.ignore` 默认在 collection 基础上追加
4. `routeGroup.ignore` 以 `'!...'` 开头时，不继承 collection 规则
5. `!pattern` 服从从左到右的覆盖顺序
6. `routeGroup.ignore = []` 不会清空继承

文档中至少提供一个最小例子：

```ts
export default defineApiCollection({
  name: 'demo',
  ignore: ['**/types/**', '**/*.types.*'],
  routeGroups: [
    {
      dir: 'runtime/server',
      clientPrefix: '/demo',
    },
    {
      dir: 'runtime/server/admin',
      clientPrefix: '/admin',
      ignore: ['!...', '**/*.draft.*', '!keep.draft.ts'],
    },
  ],
})
```

这个例子表达的是：

- 第一个 group 继承 collection.ignore
- 第二个 group 不继承 collection.ignore
- 第二个 group 自己忽略 `**/*.draft.*`
- 第二个 group 再通过 `!keep.draft.ts` 放回一个前面忽略掉的文件

## 错误处理

出现以下情况时，应在 collection 扫描阶段尽早报错，而不是静默降级：

1. `collection.ignore` 中出现 `'!...'`
2. `routeGroup.ignore` 中在第一项之外出现 `'!...'`

错误信息应直接指出：

- 是哪一个 collection
- 是哪一个 route group
  可以通过 `dir` 和 `clientPrefix` 定位
- 哪个 ignore 数组包含非法位置的 `'!...'`

## 测试设计

测试分两层。

### 底层扫描测试

`packages/nuxt/test/scan.test.ts` 继续覆盖：

1. 传入 ignore 时，扫描器会正确排除匹配文件
2. 不传 ignore 时，扫描器不会自动排除 `types` 文件

### ignore 组合语义测试

建议为 ignore 解析纯函数增加 focused 单测，至少覆盖：

1. `collectionIgnore === undefined` 与空数组等价
2. `routeGroupIgnore === undefined` 时纯继承
3. `routeGroupIgnore === []` 时仍然继承 collection.ignore
4. 普通追加模式
5. `['!...']` 时完全取消继承
6. `['!...', ...patterns]` 时从 group 自身规则重新开始
7. `!pattern` 可以放回前序规则忽略掉的文件
8. `collection.ignore` 中使用 `'!...'` 会报错
9. `routeGroup.ignore` 在非首位使用 `'!...'` 会报错

### 集成测试

集成层至少补一个用例：

1. collection 定义基础 ignore
2. 一个 route group 默认继承
3. 另一个 route group 使用 `['!...']`
4. 断言两个 group 的扫描结果确实不同

## 实现范围

本次后续实现预计会涉及：

- `packages/nuxt/src/collection.ts`
- `packages/nuxt/src/module.ts`
- `packages/nuxt/src/scan.ts`
- `packages/nuxt/test/*`
- `packages/cli/src/collection.mjs`
- `packages/nuxt/playground/modules/*`
- `README.md`
- `OVERVIEW.md`
- `OVERVIEW.zh-CN.md`

不在本次设计范围内：

- 新增模块级 ignore 配置
- 提供向后兼容的隐式默认忽略行为

## 验收标准

交付后的结果应满足：

1. `scanServerRoutes(...)` 不再隐式附加 `**/types/**` 和 `**/*.types.*`
2. `ApiRouteGroup` 支持 `ignore?: string[]`
3. `routeGroup.ignore` 默认追加 `collection.ignore`
4. `routeGroup.ignore` 以 `'!...'` 开头时完全取消继承 collection.ignore
5. `!pattern` 在最终规则数组中按顺序参与覆盖
6. 非法位置的 `'!...'` 会被显式报错
7. 现有脚手架、playground、示例文档都显式写出两条原先的默认忽略规则
