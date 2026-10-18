# BlockOS R3 修复与验证结果

日期：2026-10-18（Asia/Shanghai）

## 结论与范围

已完成本轮 D-09、D-25、D-26、D-27、D-28 的本地修复与验证。全量自动测试 37 个文件、376 项全部通过；真实 Chrome 浏览器回归 23 项全部通过，未捕获页面异常；生产构建及其 TypeScript 检查通过。

本次使用独立临时数据库、新建测试账号及独立构建目录，未操作线上业务数据。没有执行部署，本报告不代表线上页面已经更新。本报告中的 D-09 结论取代 R2 关于打印兜底的结论。

## 缺陷与处理

| 编号 | 修复后的行为 | 本地验证证据 |
| --- | --- | --- |
| D-09 PDF 导出 | 优先请求服务端 PDF；服务返回 503、超时或文件内容无效时，浏览器直接生成 PDF 并下载，不再依赖打印窗口，也不再显示“已打开浏览器打印窗口”。生成失败会显示实际错误。 | 服务端正常路径返回真实 PDF；拦截服务端响应为 503 后，浏览器仍触发真实文件下载。检查文件头 `%PDF-`、文件大小和分页结构，并将下载的两页 PDF 渲染为图片逐页检查，中文清晰，分页没有切断文字。 |
| D-25 文档关联 | 补上遗漏的面板挂载，点击按钮打开“文档关联推荐”；面板增加对话框语义和 Esc 关闭。 | Chrome 点击企业模式顶栏按钮，面板出现；切换个人模式后该入口隐藏。遵循此前需求，此类专业工具保留在企业模式。 |
| D-26 导出弹窗关闭 | 支持 Esc、点击遮罩、取消按钮和右上角关闭；增加 dialog、aria-modal、可访问名称、初始焦点、Tab 焦点约束及关闭后焦点恢复。 | Chrome 分别使用真实 Esc、遮罩点击、取消按钮，三种路径均使导出弹窗消失。 |
| D-27 历史恢复保护 | 点击快照先确认，明确显示当前卡片数、目标卡片数及不在目标中的当前卡片数。确认时先自动保存“恢复前备份”，再恢复；提供“撤销这次恢复”。 | 打开确认及取消后数据未改变；确认后有保存请求和恢复前备份；点击撤销后服务端卡片 ID 集合与恢复前完全一致。专项测试检查备份内容、撤销及重做。 |
| D-28 复合请求虚假完成 | 统一经画布指令接口处理问答与操作，允许响应同时包含回答和操作；只有实际执行后才显示操作完成。对明确命名的正文卡片创建请求补齐遗漏操作；无可执行操作时明确提示未修改画布，过滤虚假的新卡片跳转入口。 | 原复合指令实际调用 `/api/ai/command`，产生保存请求，服务端卡片恰好新增一张，localStorage 同步出现相同标题。受控模型仅回复“已经新建”时仍能补齐明确创建操作；另有专项测试验证 `agent_response` 携带操作仍执行，以及无操作的完成声明被拒绝。 |

## 验证范围

- 全量自动测试：`npx vitest run`，37 个文件、376 项通过。
- 真实浏览器回归：`node tests/e2e-regression.mjs`，23 项通过，`pageErrors` 为空。除本轮项目，也覆盖登录、编辑保存及刷新、富文本、模板、搜索、助手执行日志、工作流导入、成员校验、任务状态、里程碑、卡片拖拽和代码卡片隔离等已有路径。
- 生产构建：独立构建目录运行 `npm run build`，编译、类型检查及静态页面生成通过。
- PDF 视觉检查：503 兜底下载的 PDF 渲染为两页图片，逐页检查中文内容、边距和分页。
- `git diff --check` 通过。

## 实现文件

- PDF：`src/components/ExportPanel.tsx`、`src/lib/client-pdf.ts`、依赖清单。
- 文档关联：`src/components/DesktopWorkspace.tsx`、`src/components/DocRelationsPanel.tsx`。
- 历史恢复：`src/components/HistoryPanel.tsx`、`src/store/blockStore.ts`。
- 复合请求：`src/lib/assistant-intent.ts`、`src/hooks/useCanvasAssistant.ts`、`src/app/api/ai/command/route.ts`。
- 回归：`tests/e2e-regression.mjs`、`tests/components/AssistantExecutionRegression.test.tsx`、`tests/lib/assistant-intent.test.ts`、`tests/lib/regression-persistence.test.ts`。

## 实际限制

客户端 PDF 兜底解决无服务端浏览器环境时的文件交付，不会修复该环境本身的 503。兜底 PDF 使用图像分页，文字不能像文本 PDF 一样选择或搜索；跨域媒体仍受图片源的跨域访问策略限制。正常服务端路径优先保留。

本轮明确复合指令经过真实应用接口和保存接口；模型异常分支使用受控响应验证，未调用外部模型供应商，因此没有把特定供应商所有自由表达方式列为已验证。自动补齐严格限定于用户明确要求、带标题的正文卡片创建，不推测删除或其他破坏性操作。

PDF 客户端实现参考 [html2canvas 官方说明](https://github.com/niklasvh/html2canvas) 与 [jsPDF 官方说明](https://github.com/parallax/jsPDF)。
