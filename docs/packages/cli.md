# @hzgotb/apim-cli

CLI 用于快速生成 collection 目录和 handler 模板。

## 安装与调用

```bash
pnpm add -D @hzgotb/apim-cli
pnpm exec apim collection modules/demo-api
```

也可以生成带示例 handler 的 collection：

```bash
pnpm exec apim collection modules/demo-api --example
```

CLI 会创建：

```text
modules/demo-api/
├─ collection.ts
└─ runtime/server/
   ├─ .gitkeep
   └─ hello.get.ts  # 使用 --example 时生成
```

目标目录必须不存在，或为空目录。生成后把路径加入 `apim.collections`。
