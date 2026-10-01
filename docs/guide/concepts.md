# 核心概念

## 四个阶段

### 1. 解析 collection

模块读取 `apim.collections`，把目录、显式文件和 glob 解析成 collection 入口文件。入口必须默认导出 `defineApiModule(...)` 返回的 entry。

### 2. 扫描 handlers

每个 `routeGroup` 扫描自己的 `dir`。文件名沿用 Nitro 约定，扫描结果包含文件路径、HTTP method、最终 route 和 lazy 等注册信息。

### 3. 注册与校验

扫描结果会注册到 Nitro，同时和宿主 `server/api`、`server/routes`、`serverHandlers` 做跨来源冲突检查。`apim.exclude` 会在冲突检查和类型生成前过滤指定签名。

### 4. 生成类型并转换调用

模块读取 handler 的 `ApiModuleMeta`，生成 `#apim/apim` 的 `InternalApiPayload` 类型。Vite 插件识别没有同名局部绑定的 `apim(...)` 调用，并将其转换为 `useFetch(...)`。

## 运行时边界

apim 不替换 Nitro router，也不提供新的 HTTP client。它提供的是：

- handler 注册和路由冲突保护；
- 根据源码模型生成的 TypeScript 类型；
- 编译期到 `useFetch` 的转换。

因此运行时依然使用 Nuxt/Nitro 的 handler、fetch、缓存和错误处理语义。
