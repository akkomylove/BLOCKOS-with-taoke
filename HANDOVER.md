# 📋 BlockOS 项目技术交接与演进备忘录 (HANDOVER.md)

> **2026-10-16 本地开发更新**：已接入手机端章节阅读、轻编辑与随手记。章节复用原有 Block，阅读顺序独立于画布坐标；电脑端保持自由画布。参见 [手机端说明](docs/mobile-reading.md)。本次未发布到线上。

> **当前基准版本**：`v1.1.0-complete-baseline` (Git Branch: `main`)  
> **更新时间**：2026-10-14  
> **项目定位**：基于 `(Agent + Block) × AI = 无界生产力` 哲学的下一代企业级可编程智能协作画布系统。

---

## 🎯 一、 32 项全量优化实施与系统基线 (Complete 32-Item Milestone Status)

当前版本已完整实施规划的 **32 项产品与工程优化全量闭环**，达到生产交付级稳定性：

| 优化批次 | 覆盖项编号 | 核心交付能力 | 自动化测试与验证 |
|---|---|---|---|
| **第一批：数据链路与生产安全** | 第 1—8 项, 28, 29 项 | 保存链路全通、乐观锁版本控制、HMAC 防篡改签名鉴权、统一 RBAC 细粒度权限矩阵、隔离代码执行沙箱、全局 XSS 净化、多账号缓存隔离、软删除与回收站恢复 | 4 套新增套件，测试通过率 100% |
| **第二批：产研全链路协同** | 第 9—16 项 | 结构化需求编号 (`REQ-001`) 与 DoD 数组、业务语义连线 (`implements/verifies/depends_on`)、变更影响拓扑与中文分词分析、AI 任务拆解限定项目成员作用域、解耦“待办/进行中/待验收/已完成/退回”状态、看板/甘特图/画布同一事实源、项目邀请链接与块级评论 | 2 套新增套件，10 项测试全绿 |
| **第三批：可控与可信 Agent** | 第 17—21 项 | AI 修改 `before/after` Diff 预览与分项采纳、一键原样撤销回滚、持久化后台任务 (`agent_jobs`) 与 `event_id` 幂等防重放、开箱即用规则模板与沙箱 dry-run、全局紧急熔断暂停开关与单次执行逆向还原 | 1 套新增套件，5 项测试全绿 |
| **第四批：视图与导入导出** | 第 22—27 项 | 10MB 文件配额与 JSON 结构格式校验（支持覆盖与追加）、带 UTF-8 BOM (`\ufeff`) 任务 CSV 导出与完整 BlockOS JSON 快照、视口漫游鹰眼小地图、自适应响应式折叠顶栏、TodoBlock 与看板任务双向跨视图响应式状态联动 | 1 套新增套件，6 项测试全绿 |
| **第五批：质量、文档与发布** | 第 30—32 项 | 网络状态动态感知、离线队列暂存与连网自愈补偿同步、目录代码整洁度与严格 TypeScript 类型安全（0 `any`）、`DECISIONS.md` (ADR-001~ADR-017) 与 `HANDOVER.md` 齐备、Vercel 生产部署上线 | **17 套测试套件，206 项测试 100% 绿色通过；44 路由生产构建 0 错误** |

---

## 🏗️ 二、 核心架构与技术栈拓扑 (Architecture Topology)

- **前端核心**：Next.js 15.5 (App Router), React 19, Tailwind CSS 3, Lucide Icons, dnd-kit;
- **全局状态与跨视图联动**：
  - `src/store/blockStore.ts`：原子画布状态树，支持用户隔离、离线持久化暂存、JSON 快照导入导出与任务状态联动；
  - `src/store/collaborationStore.ts`：团队、项目、需求、语义关系与任务状态机；
- **双模 AI 与后台 Agent 引擎**：
  - Vercel AI SDK (`ai`), 智谱开放平台 API (`glm-4.7-flash` 模型);
  - 任务拆解前置过滤、中文字符 2-4 元 n-gram 语义相关度挖掘;
  - 服务端持久化后台作业队列 (`agent_jobs`)，通过 `event_id` 保证分布式防重与幂等处理;
- **数据持久化与安全防御**：
  - WebAssembly SQLite (sql.js) 内存内核与 Neon Postgres 无服务云同步双引擎;
  - HMAC-SHA256 签名服务端会话 Cookie，拦截客户端篡改与未授权快捷登录;
  - 细粒度 RBAC 校验 (`checkProjectPermission`) 拦截未授权增删改查;
  - 代码沙箱隔离子进程环境变量注入，配备 3 秒超时熔断看门狗。

---

## 🗺️ 三、 核心源码目录与关键文件地图 (Code Map)

```
src/
├── app/
│   ├── api/
│   │   ├── auth/                      # 会话鉴权 (HMAC-SHA256 签名令牌、登出、用户档案)
│   │   ├── pages/                     # 页面与 Block 实体级同步 (PUT/POST、乐观锁、软删除与恢复)
│   │   ├── projects/[id]/
│   │   │   ├── requirements/          # 结构化需求管理 (REQ-001 编号、DoD、进度统计)
│   │   │   ├── relations/             # 语义连线 (implements, verifies, depends_on, references)
│   │   │   ├── ai-impact/             # 变更影响分析 (直接拓扑关联 + 中文关键词分析)
│   │   │   ├── ai-analyze/            # AI 任务拆解分析 (限定项目成员作用域、查重)
│   │   │   ├── ai-preview/            # AI 修改可审查预览、分项采纳与一键撤销
│   │   │   ├── agent-jobs/            # 服务端持久化后台任务 (event_id 幂等防重)
│   │   │   ├── agent/toggle/          # Agent 全局紧急熔断暂停/恢复开关
│   │   │   ├── agent-executions/      # 执行历史审计与单次执行逆向回滚
│   │   │   ├── invites/               # 项目邀请链接生成与加入核验
│   │   │   └── comments/              # 对象级评论与 @成员 提醒
│   │   ├── run-code/                  # 安全隔离代码沙箱 (白名单环境变量、3s 超时看门狗)
│   │   └── tasks/                     # 任务协同 (RBAC 权限守卫、流转解耦、软删除与恢复)
│   ├── page.tsx                       # 无界画布主入口
│   └── login/page.tsx                 # 正式登录认证页
├── components/
│   ├── BlockEditor.tsx                # 无界画布平移漫游、框选、事件分发引擎
│   ├── CanvasMinimap.tsx              # 鹰眼小地图 (视口拖拽漫游、画幅居中全览)
│   ├── Toolbar.tsx                    # 顶栏指挥台 (保存状态胶囊、离线保护指示器、自适应菜单)
│   ├── ImportPanel.tsx                # 10MB 健壮导入面板 (JSON/MD/CSV，支持覆盖与追加)
│   ├── ExportPanel.tsx                # 多格式导出面板 (BlockOS JSON 快照、UTF-8 BOM 任务 CSV)
│   ├── ProjectBoard.tsx               # 任务看板 (4 泳道：待办/进行中/待验收/已完成，跨视图联动)
│   ├── TaskDetail.tsx                 # 任务详情侧栏 (DoD、交付物、评审依据、跨视图联动)
│   └── blocks/TodoBlock.tsx           # 待办块 (勾选自动同步流转任务状态至看板与服务端)
├── store/
│   ├── blockStore.ts                  # 画布状态机 (版本乐观锁、离线队列暂存、跨视图同步)
│   └── collaborationStore.ts          # 协同状态机 (团队、项目、需求、任务)
└── lib/
    ├── auth-utils.ts                  # HMAC 会话签名验证与 RBAC 权限拦截
    ├── db.ts                          # 双模数据库核心引擎 (幂等表结构迁移、事务、离线自闭环)
    └── sanitize.ts                    # 全局 XSS 净化与输入安全防御库
```

---

## 💡 四、 踩坑与高价值解法备忘录 (Cross-Project Knowledge Base)

### 1. Windows Excel 打开 CSV 中文乱码问题
- **踩坑现象**：导出的 CSV 文件在 VS Code 或网页中显示正常，但 Windows 默认使用 GBK 编码打开 UTF-8 CSV，导致所有中文变成乱码。
- **解法备忘**：在导出的 CSV 字符串开头强制拼装 **UTF-8 BOM 标记 (`\ufeff`)**，并在 Blob 声明 `type: 'text/csv;charset=utf-8'`。Excel 检测到 BOM 字节序标记后会自动以 UTF-8 准确解码。

### 2. Next.js 15 生产编译对 `@typescript-eslint/no-explicit-any` 的零容忍拦截
- **踩坑现象**：本地热重载开发时不报错，但在生产构建 `npm run build` 时，Next.js 15 的 ESLint 规则会将任何显式 `any` 直接判定为致命错误并终止打包退出。
- **解法备忘**：
  1. 数据库查询结果严禁使用 `Record<string, any>`，改用强类型 `type DbRecord = Record<string, string | number | null>`；
  2. catch 块中的错误对象使用 `err: unknown`，配合类型收窄 `const msg = err instanceof Error ? err.message : String(err)`；
  3. 类型转换使用 `(row as unknown as DbRecord)`，保持 100% 严格类型安全。

### 3. 中文长句分词与影响分析推断
- **踩坑现象**：英文依靠空格天然分词，而中文如果不引入几兆的大型分词库（如 nodejieba），无法直接以空格划分词汇，简单 `split(' ')` 会把整句当成一个词导致匹配率为零。
- **解法备忘**：设计了轻量级 **2~4 字符滑动窗口 (n-gram) 提取器**，结合停用词过滤，0 外部依赖即可快速从中文 PRD 中提取核心主题词，高效匹配相关任务与关联 Block。

### 4. 离线降级与网络自愈数据保护
- **踩坑现象**：网络偶发波动或服务器 500 时，如果前端直接提示错误且不保存，用户辛苦编辑的内容一刷新便永久丢失。
- **解法备忘**：在 `blockStore.ts` 的 `syncToServer` catch 块中，将当前未同步的快照写入 `localStorage('block-os-offline-pending')`；同时在前端监听 window `online` 事件，一旦检测到网络恢复，立即无感触发重试补偿同步，成功后清除离线队列，实现优雅降级自愈。

### 5. 外部 Agent (MCP / Open API) 与 Bearer Token 中间件鉴权放行
- **踩坑现象**：Next.js `middleware.ts` 默认拦截所有未携带 session cookie 的路由并强制 307 重定向到 `/login`，导致外部 Agent（如 Cursor / Claude Desktop / Python 脚本）发送带 `Authorization: Bearer <API_KEY>` 的 POST/PATCH 请求被无差别重定向并丢失 JSON 请求体。
- **解法备忘**：在 `middleware.ts` 中将 `/api/open/*` 纳入白名单并优先检测 `authHeader?.startsWith('Bearer ')` 放行，由后续 Controller 层通过 `getUserId(req)` 结合 SHA-256 严密验签，既保全了全站网页的 Session 鉴权阻断，又为标准 Model Context Protocol (MCP) 与开放 API 开辟了标准互通渠道。

---

## 🚀 五、 后续演进与维护建议 (Post-Milestone Operations)

1. **持续监控与备份演练**：生产环境下定期触发数据库整库快照导出；
2. **多端协同并发深化**：当前已完成乐观锁版本控制，后续可在 Pilot 试点阶段引入 WebSocket / CRDT (Yjs) 实时光标协作能力；
3. **模型微调与专有 Prompt 库扩充**：可基于沉淀的 `DECISIONS.md` 与实际业务文档，进一步调优任务拆解与 DoD 审查的 Prompt 命中率。
