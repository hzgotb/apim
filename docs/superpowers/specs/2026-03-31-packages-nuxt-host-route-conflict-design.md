# `packages/nuxt` 宿主路由冲突治理设计

## 背景

当前 `sdkr` 会扫描 collection handlers，并在模块 setup 期间通过
`addServerHandler(...)` 把这些路由注册到 Nuxt/Nitro。

现有冲突检测只覆盖 `sdkr` 自己扫描出来的 collection handlers 之间的冲突，
不会检查宿主 Nuxt 项目自身已经存在的路由，例如：

- `server/api/*.ts`
- `server/routes/*.ts`

这会带来两个问题：

1. 宿主路由与 collection 路由发生同路径同 method 冲突时，`sdkr` 当前不会提前报错
2. `calla` 类型生成只基于 collection handlers，可能出现运行时命中宿主路由、类型却来自 collection 路由的失真

## 设计目标

本次设计的目标是：

1. 在宿主路由与 collection 路由冲突时，默认直接报错并阻止启动
2. 冲突判定沿用 `sdkr` 当前 collection 内部使用的规则，避免新增第二套判定标准
3. 开发模式下，当宿主或 collection 变化后产生新的冲突时，仍然能再次检测并报错
4. 不重复扫描宿主 Nuxt 项目的 `server/api` / `server/routes`

## 非目标

本次设计不包含以下内容：

1. 不提供“宿主优先”或“collection 优先”的覆盖策略
2. 不把冲突降级为 warning
3. 不改变 Nuxt/Nitro 自身的 handler 合并顺序
4. 不重复扫描宿主文件系统来模拟宿主路由结果

## 主方案

### 检测输入

冲突检测的两侧输入分别是：

1. 宿主 Nuxt/Nitro 已经扫描并产出的 handler 列表
2. `sdkr` 自己扫描得到的 collection handlers

这里最重要的约束是：

- `sdkr` 不负责“发现宿主路由”
- `sdkr` 只负责“消费宿主已经发现出来的真实 handler 集合”

也就是说，宿主侧输入必须来自 Nuxt/Nitro 的既有扫描结果，而不是 `sdkr`
自己再次去扫描 `server/api` 或 `server/routes`。

### 检测时机

主方案要求把冲突检测放在这样一个时机：

- 宿主 handlers 已经就绪
- `sdkr` 还来得及阻止自己继续注册 collection handlers

具体挂载在哪个 Nuxt/Nitro 生命周期 hook 上，属于实现细节；但设计层面必须满足上述前提。

### 冲突判定规则

宿主路由与 collection 路由之间，沿用 `sdkr` 当前 collection 内部的冲突判定规则：

1. 路径不同：不冲突
2. 路径相同，双方 method 都存在且不同：不冲突
3. 路径相同，任意一方没有 method：冲突
4. 路径相同，双方 method 相同：冲突

这意味着以下示例都应判定为冲突：

- `host: GET /api/xx` vs `collection: GET /api/xx`
- `host: * /api/xx` vs `collection: GET /api/xx`
- `host: GET /api/xx` vs `collection: * /api/xx`

而以下示例不冲突：

- `host: GET /api/xx` vs `collection: POST /api/xx`

### 发生冲突时的行为

一旦发现宿主与 collection 冲突：

1. 直接抛错
2. 阻止 `sdkr` 继续注册 collection handlers
3. 阻止继续使用这组不一致的 collection 结果生成 `calla` 类型

本次设计不允许在冲突状态下继续运行。

## 开发模式下的重复校验

开发模式下，冲突检测不能只发生一次。

设计要求：

1. 当宿主 handler 集合变化时，重新检测
2. 当 collection handler 集合变化时，重新检测
3. 每次都使用“当前宿主真实 handler 集合 + 当前 collection handler 集合”重新计算
4. 发现新的冲突时，再次报错

这里不要求做增量推理；重新全量比对即可。

## 内部数据模型

建议在 `sdkr` 内部统一出一个只用于冲突检测的结构，例如：

```ts
interface ComparableHandler {
  source: 'host' | 'collection'
  ownerLabel: string
  handler: string
  route: string
  method?: string
}
```

用途：

- `source` 用于区分宿主与 collection
- `ownerLabel` 用于错误信息展示
- `handler` 用于定位文件
- `route` / `method` 用于复用既有冲突判定逻辑

### ownerLabel 约定

建议：

- 宿主 `server/api` 来源显示为 `host server/api`
- 宿主 `server/routes` 来源显示为 `host server/routes`
- collection 继续显示 collection name

## 错误信息

错误信息必须能直接回答“谁和谁撞了”。

推荐格式：

```txt
[sdkr] Route conflict on GET /api/xx:
host server/api (/abs/app/server/api/xx.get.ts) conflicts with
demo-collection (/abs/.../runtime/server/xx.get.ts).
```

如果是 methodless 冲突：

```txt
[sdkr] Route conflict on * /api/xx:
host server/routes (/abs/app/server/routes/xx.ts) conflicts with
demo-collection (/abs/.../runtime/server/xx.get.ts).
```

错误信息至少要包含：

1. method
2. route
3. 宿主来源标签与文件路径
4. collection 名与文件路径

## 后备方案

如果主方案在实现阶段出现以下问题：

1. 无法稳定拿到宿主已扫描好的 handler 集合
2. 开发模式下宿主 handler 视图不可靠
3. 生命周期时机导致前置冲突检测无法稳定工作

则保留一个已经批准的后备方案：

- 在更晚阶段，对 Nitro 最终的 handlers 或 route table 做冲突检查

### 后备方案的定位

这个后备方案需要被固化到设计里，但不属于本次实现范围。

明确约束：

1. 本次实现优先主方案
2. 后备方案只作为已批准的保底方向写入 spec
3. 本次不实现后备方案
4. 如果未来主方案验证失败，可以直接切换到这个后备方案，而不需要重新发散设计讨论

## 测试设计

主方案至少需要覆盖以下场景：

1. 宿主 `server/api/xx.get.ts` 与 collection `GET /api/xx` 冲突时报错
2. 宿主 `server/api/xx.ts` 与 collection `GET /api/xx` 冲突时报错
3. 宿主 `server/api/xx.get.ts` 与 collection `POST /api/xx` 不报错
4. 宿主 `server/routes/foo.get.ts` 与 collection `GET /foo` 冲突时报错
5. 开发模式下，宿主或 collection 变更后，新产生冲突时会再次报错

## 实现范围

本次后续实现预计会涉及：

- `packages/nuxt/src/module.ts`
- 与冲突检测相关的新内部 helper
- `packages/nuxt/test/*`
- 必要的开发态集成测试或夹具

本次不在实现范围内：

- 重复扫描宿主 `server/api` / `server/routes`
- 提供配置项让宿主或 collection 胜出
- 后备方案本身的落地实现

## 验收标准

交付后的结果应满足：

1. 宿主路由与 collection 路由冲突时，`sdkr` 会直接报错
2. 冲突判定规则与当前 collection 内部规则一致
3. 宿主路由来源于 Nuxt/Nitro 已扫描结果，而不是 `sdkr` 自己重新扫描文件系统
4. 开发模式下新出现的冲突会再次被检测出来
5. 后备方案被固化在设计文档中，但不进入本次实现
