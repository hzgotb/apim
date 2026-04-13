# 仓库 Agent 指南

## Agent Workflow

- 所有任务默认先通过对话明确范围、默认行为和边界，再开始执行；只有在你明确说明直接执行时，才跳过这一步。
- `specs` 文档放在 `docs/specs`，`plans` 文档放在 `docs/plans`；内容较多时应按主题或阶段拆分，并在对应目录下用子目录组织。
- 默认在现有代码和现有应用上做小步、增量、可验证的修改；除非任务明确要求，不要扩展大范围脚手架、批量安装不必要依赖、额外铺设新的应用结构，或顺手改动无关应用。
- 不要默认使用 `using-superpowers` skill。只有在用户明确要求，或任务确实需要时再使用。
- 写文件时优先使用 `apply_patch`、现有 generator 或明确的 shell command；只有在确有必要时才使用临时脚本。
- 如果某个命令只是因为 sandbox 限制而失败，且它属于常规 package task，可以直接申请 escalated execution。
- 申请持久化授权时，`prefix_rule` 应尽量精确到 package 和 script，不要请求过宽的前缀；对 `pnpm --filter <package> ...` 这类流程，优先为当前 package 的当前 script 申请授权。
- 如果任务需要理解代码结构、调用关系或影响范围，先使用 GitNexus MCP；如果仓库没有索引，再使用其他方式补充。
