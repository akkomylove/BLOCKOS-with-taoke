# 🏛️ BlockOS 架构决策与设计推演记录 (Architecture Decision Records)

> **所属项目**：`01_AI智能体与创新竞赛 / BLOCKOS-with-taoke`（团队官方最终汇总版）  
> **赛道背景**：FDoc 创新竞赛「赛道四 · 无界文档 π（半命题）」参赛作品  
> **核心公式**：`(agent + md) × ai + html`  
> **维护宗旨**：记录团队从概念设计、角色分工、模型选型、状态设计到工程落地的关键技术决策，保持系统演进有据可循。

---

## 📑 架构决策记录列表 (ADR Index)

- [ADR-001: 范式颠覆：从传统单体文件向原子级 Block 知识操作系统的转变](#adr-001-范式颠覆从传统单体文件向原子级-block-知识操作系统的转变)
- [ADR-002: 角色透视折叠引擎：保留单一事实源，零内容篡改的多角色自适应投影](#adr-002-角色透视折叠引擎保留单一事实源零内容篡改的多角色自适应投影)
- [ADR-003: 双模智能体协同架构：AI 从对话栏升级为拥有独立画布的副驾协同者](#adr-003-双模智能体协同架构ai-从对话栏升级为拥有独立画布的副驾协同者)
- [ADR-004: 轻量高性能混合持久化：Zustand + Immer 块级状态树与 WebAssembly SQLite (sql.js) 离线自闭环](#adr-004-轻量高性能混合持久化zustand--immer-块级状态树与-webassembly-sqlite-sqljs-离线自闭环)
- [ADR-005: 商业 ROI 与算力防御：分层调度与按需推理的成本控制机制](#adr-005-商业-roi-与算力防御分层调度与按需推理的成本控制机制)
- [ADR-006: 产研全链路咬合架构 (Notion × Jira × Linear)：从 PRD 到任务看板与自研 SVG 甘特图的无缝流转](#adr-006-产研全链路咬合架构-notion--jira--linear从-prd-到任务看板与自研-svg-甘特图的无缝流转)
- [ADR-007: 工程质量基线治理与单基准滚动版本管理规范](#adr-007-工程质量基线治理与单基准滚动版本管理规范)
- [ADR-008: 生产级双层数据库混合持久化架构演进：WebAssembly SQLite (sql.js) 内存内核与 Vercel Neon Postgres 无服务云同步](#adr-008-生产级双层数据库混合持久化架构演进webassembly-sqlite-sqljs-内存内核与-vercel-neon-postgres-无服务云同步)
- [ADR-009: 新手交互式引导重构与入门画布实验场落地 (Interactive Spotlight Onboarding & Playground Canvas)](#adr-009-新手交互式引导重构与入门画布实验场落地-interactive-spotlight-onboarding--playground-canvas)
- [ADR-010: 飞书/钉钉风格官方新手入门系统重塑与 Agent 衍生卡片垂直避让排布治理 (Enterprise Onboarding & Vertical Avoidance Layout)](#adr-010-飞书钉钉风格官方新手入门系统重塑与-agent-衍生卡片垂直避让排布治理-enterprise-onboarding--vertical-avoidance-layout)
- [ADR-011: 无遮挡交互导览 (Draggable & Minimizable) 与画布全分辨率自适应缩放引擎治理 (Zero-Occlusion Tour & Canvas Responsive Auto-Fit Engine)](#adr-011-无遮挡交互导览-draggable--minimizable-与画布全分辨率自适应缩放引擎治理-zero-occlusion-tour--canvas-responsive-auto-fit-engine)
- [ADR-012: 废除激进自适应缩放引擎、全面转向单列垂直居中排布与三向拉伸治理 (Removal of Auto-Zoom Engine, Centered Vertical Layout & 3-Way Resize)](#adr-012-废除激进自适应缩放引擎全面转向单列垂直居中排布与三向拉伸治理-removal-of-auto-zoom-engine-centered-vertical-layout--3-way-resize)
- [ADR-013: 顶层工具栏响应式弹性自适应重构与功能聚合收纳机制 (Responsive Adaptive Toolbar & Unified Overflow Menu)](#adr-013-顶层工具栏响应式弹性自适应重构与功能聚合收纳机制-responsive-adaptive-toolbar--unified-overflow-menu)
- [ADR-014: 视口漫游小地图 (Canvas Minimap) 与高度拉伸智能推移治理 (Viewport Minimap & Height Resize Push-down)](#adr-014-视口漫游小地图-canvas-minimap-与高度拉伸智能推移治理-viewport-minimap--height-resize-push-down)
- [ADR-015: 系统首个稳定基准版本确立 (v1.0.0 Baseline Release Checkpoint)](#adr-015-系统首个稳定基准版本确立-v100-baseline-release-checkpoint)
- [ADR-016: 第一阶段数据安全治理与保存链路闭环落地 (Data Persistence Pipeline, HMAC Auth, RBAC & Sandbox Isolation)](#adr-016-第一阶段数据安全治理与保存链路闭环落地-data-persistence-pipeline-hmac-auth-rbac--sandbox-isolation)
- [ADR-017: 产研全链路语义闭环、持久化后台引擎、跨视图状态协同与离线自愈架构 (Semantic Requirements, Persistent Agent Jobs, Cross-View Sync & Resilient Offline Fallback)](#adr-017-产研全链路语义闭环持久化后台引擎跨视图状态协同与离线自愈架构-semantic-requirements-persistent-agent-jobs-cross-view-sync--resilient-offline-fallback)
- [ADR-018: 沙箱独立滚动隔离、工具栏语义极简化与 Portal 标签管理重塑 (Sandbox Scroll Isolation, Concise Toolbar & Portal Tag Picker)](#adr-018-沙箱独立滚动隔离工具栏语义极简化与-portal-标签管理重塑-sandbox-scroll-isolation-concise-toolbar--portal-tag-picker)
- [ADR-019: 多模态 Block 闭环治理：表格 Excel 剪贴板/文件拖拽互通、画板全尺寸弹性自适应、媒体 Block 全生命周期换源与高可用 AI 智能体容灾 (Multimodal Blocks Enhancements & Resilient Agent Fallback)](#adr-019-多模态-block-闭环治理表格-excel-剪贴板文件拖拽互通画板全尺寸弹性自适应媒体-block-全生命周期换源与高可用-ai-智能体容灾-multimodal-blocks-enhancements--resilient-agent-fallback)
-[ADR-020: 子 Block 响应式树状嵌套治理、架构导图节点与落地 Block 双向互通及多角色交互打磨 (Hierarchical Sub-Blocks, Mindmap Node-to-Block Linking & Multimodal Polish)](#adr-020-子-block-响应式树状嵌套治理架构导图节点与落地-block-双向互通及多角色交互打磨-hierarchical-sub-blocks-mindmap-node-to-block-linking--multimodal-polish)
- [ADR-027: 双端职责分离式移动端适配架构与章节大纲引擎 (Dual-Workspace Mobile Adaptation & Chapter Outline Engine)](#adr-027-双端职责分离式移动端适配架构与章节大纲引擎-dual-workspace-mobile-adaptation--chapter-outline-engine)
- [ADR-028: 飞书风格多维分类菜单重构与高亮/倒计时/书签/Mermaid四大多维组件落地 (Lark-Style Block Categorization & Four Multi-Dimensional Interactive Blocks)](#adr-028-飞书风格多维分类菜单重构与高亮倒计时书签mermaid四大多维组件落地-lark-style-block-categorization--four-multi-dimensional-interactive-blocks)
- [ADR-029: 全链路 AI 原生安全合规体系与对抗性探针防御架构 (Full-Stack AI Security Compliance & Adversarial Probe Defense Framework)](#adr-029-全链路-ai-原生安全合规体系与对抗性探针防御架构-full-stack-ai-security-compliance--adversarial-probe-defense-framework)
- [ADR-030: 外部智能体无缝集成体系 (Open API / MCP Server / API Key) 与内置 AI 工具调用拓展 (Sub-Block & Hierarchy Tool-Calling)](#adr-030-外部智能体无缝集成体系-open-api--mcp-server--api-key-与内置-ai-工具调用拓展-sub-block--hierarchy-tool-calling)

---

## ADR-001: 范式颠覆：从传统单体文件向原子级 Block 知识操作系统的转变

### 1. 背景与业务痛点
传统协同文档（Word、标准 Wiki、线性 Markdown）本质上仍是一个纵向线性的“静态文件容器”：
- **线性锁死**：信息被固化在单一长篇页面中，跨章节的逻辑依赖（如需求描述与对应验收标准、设计规范与前端实现）难以建立网状关联；
- **AI 边缘化**：绝大多数“AI 文档”仅是在右侧边缘挂载一个聊天面板（Chatbox），AI 无法真正感知文档的网状拓扑，只能进行单薄的润色或改写；
- **协作撕裂**：一份完整的软件工程方案，产品经理、UI 设计师、前后端开发、测试人员只能共同面对一份混杂冗长的长文本，检索效率极其低下。

### 2. 决策方案与推导：`(agent + md) × ai + html`
团队经多轮推演，决定**彻底打碎“文件”概念**，以 **Block（块）** 为原子信息单元重构知识环境：
- **`md` (Markdown)**：作为所有文本与逻辑 Block 的结构化语义内核，保持跨平台高迁移性与人类可读性；
- **`agent` (自主行动规则)**：在 Block 之间赋予事件响应与自驱动能力（如任务状态联动、数据质检与审计留痕）；
- **`ai` (环境乘数因子)**：AI 不再是外挂，而是渗透进 Block 状态变更与图谱关联的底层驱动力；
- **`+html` (开放渲染层)**：基于 Web 标准（React 19 + TailwindCSS + @dnd-kit），赋予各类 Block（文本、待办、代码、表格、媒体、白板、导图、LaTeX 公式）自由拖拽、缩放、组合与实时渲染能力。

### 3. 产生的影响与 Trade-off
- **优势**：文档获得了无限二维白板画布的自由度，各类 Block 支持自由拖拽排版与多维连接；
- **代价**：状态管理复杂度显著上升，需维护统一的 BlockTree 拓扑、拖拽碰撞检测与坐标持久化。

---

## ADR-002: 角色透视折叠引擎：保留单一事实源，零内容篡改的多角色自适应投影

### 1. 业务痛点与技术冲突
在多角色产研协同中，各角色的信息偏好截然不同：
- **产品经理**：关注业务目标、用户画像、核心功能清单与优先级；
- **UI/UX 设计师**：关注交互状态、视觉规范、原型跳转逻辑；
- **前后端工程师**：关注接口定义、数据结构、性能指标与状态机；
- **测试工程师**：关注验收标准 (DoD)、边界用例、安全合规。

传统方案若拆分为多份文档，会导致“信息同步地狱”与事实不一致；若写在同一份文档中，则长达数十页无法聚焦。

### 2. 决策方案：折叠透视投影（Role-Perspective Folding Engine）
我们设计了**基于单一事实源（Single Source of Truth）的角色透视折叠引擎**：
- **原文零篡改**：文档数据底层保持唯一真实版本，绝不通过大模型篡改或另存多份副本；
- **标签与元数据驱动**：每个 Block 携带语义类型（PRD/Tech/Design/QA）与职能标签；
- **透视算子**：切换视角（如切换至“测试工程师”）时，非核心关联 Block 自动以微型折叠态（Folded Anchor）呈现，保留上下文轮廓同时消除视觉噪音；
- **AI 辅助规划（FoldPlanPanel）**：内置 `useFoldPlan` 智能分析器，可基于 LLM 一键为长篇项目方案计算出各角色最优折叠策略。

---

## ADR-003: 双模智能体协同架构：AI 从对话栏升级为拥有独立画布的副驾协同者

### 1. 设计推导
市面产品多为“人写人看，AI 负责生成零散回复”。团队创新提出**双模智能体协同机制（Dual-Mode Agent System）**：
1. **画布级 Copilot（AI Copilot Panel）**：
   - 具备“计划（Plan）- 定稿（Finalize）- 审阅（Review）”全生命周期；
   - 能够基于多轮追问完成需求探查，并直接在白板上实例化为成套关联 Block 矩阵；
2. **审计留痕与决策溯源（Agent Log & History Panel）**：
   - 任何由 Agent 或 AI 建议触发的变更均被打上溯源指纹（Timestamp, Prompt, Delta Diff）；
   - 用户可随时回滚、比对与审查 AI 的介入历史，确保团队协作的决策透明。

---

## ADR-004: 轻量高性能混合持久化：Zustand + Immer 块级状态树与 WebAssembly SQLite (sql.js) 离线自闭环

### 1. 选型对比
| 维度 | 方案 A: 远程重型数据库 (PostgreSQL + Prisma) | 方案 B: 纯前端 localStorage | 方案 C: Zustand/Immer + sql.js (最终选型) |
|------|----------------------------------------------|-----------------------------|-------------------------------------------|
| **启动门槛** | 依赖外部 Docker/云数据库，部署极重 | 数据容量受限 (5MB)，不支持复杂关系查询 | **零外部依赖，极速冷启动，完整 SQL 能力** |
| **离线可用** | 离线无法运行 | 离线可用但难以支持图谱分析 | **本地内存 WASM 极速读写，开箱即用** |
| **状态响应** | 网络延迟显著，拖拽高频卡顿 | 本地快但无原子不可变更新保证 | **Zustand + Immer 保证 60fps 拖拽与局部渲染** |

### 2. 落地实施
- 核心画布交互由 `src/store/blockStore.ts` 采用 Zustand + Immer 维护；
- 团队、权限、多项目元数据由 `src/lib/db.ts` 采用 `sql.js`（WebAssembly SQLite）进行内存与本地持久化双向同步；
- 极大降低了参赛与本地评审时的运行部署摩擦力。

---

## ADR-005: 商业 ROI 与算力防御：分层调度与按需推理的成本控制机制

### 1. 成本防御基线
在无界画布环境中，Block 的数量可能达到数十甚至上百个，若高频全量调用 LLM，不仅 API 消耗极其昂贵，更会带来长达数秒的界面阻塞。

### 2. 防御漏斗设计
```
[ 用户交互 / 块级拖拽 / 内容变更 ]
           │
           ▼
[ L0 本地纯静态规则过滤 (100% 免费) ] ──> 坐标吸附、语法高亮、标签归类、DOM 局部重绘
           │ (仅在明确点击 AI 辅助/分析时)
           ▼
[ L1 本地 AST 结构切分 (0 成本) ] ──> 提取 Block 依赖链与标题层级，构建精简上下文 Prompt
           │ (过滤 85% 冗余无效文本)
           ▼
[ L2 阿里 DashScope / Qwen 异步推理 ] ──> 针对性完成多角色审阅、项目计划拆解与结构化生成
```
- **ROI 收益**：上下文输入 Token 缩减 80% 以上，高频操作零 Token 开销，大模型仅在最具价值的知识重组节点介入。

---

## ADR-006: 产研全链路咬合架构 (Notion × Jira × Linear)：从 PRD 到任务看板与自研 SVG 甘特图的无缝流转

### 1. 业务痛点与断层危机
在绝大多数产研协作场景中，文档（Notion/语雀）与项目管理（Jira/TAPD/Linear）高度割裂：
- 产品经理在文档中写完 PRD，研发负责人需要花费数小时手动向看板逐条新建 Issue、指派人员并排期；
- 开发过程中任务状态的变更无法反哺文档上下文，导致文档迅速失效过时。

### 2. 决策方案：PRD 智能拆解与多维执行视图统一
团队决定在 `BLOCKOS-with-taoke` 最终汇总版中实现**文档到执行的零摩擦流水线**：
1. **AI 计划书一键切分**：通过 LLM 解析 Markdown PRD，自动提取功能模块、工时预估、优先级与依赖拓扑；
2. **预设 5 人产研团队智能匹配**：根据任务类型（UI规范、API接口、单元测试）自动匹配到团队成员（陈明远-PM, 林小薇-FE, 张浩然-BE, 苏婉清-UI, 王志强-QA）；
3. **多维联动视图**：
   - **三列敏捷看板**：支持拖拽流转、DoD 验收标准检查与任务级评论；
   - **自研 SVG 甘特图**：时间线精确到天、周数自动演算、实时今天基准红线、按优先级色彩编码；
   - **里程碑时间线**：关键阶段状态追踪。
- **架构价值**：将知识创作与任务执行深度缝合在同一套状态树与 SQLite 存储中，实现端到端的产研数字化闭环。

---

## ADR-007: 工程质量基线治理与单基准滚动版本管理规范

### 1. 业务痛点与技术冲突
1. **历史测试与构建红线失效**：
   - 随系统功能快速迭代，ESLint 规范（如 `prefer-const`）未严格阻断导致生产编译挂起；
   - API 路由引入严格鉴权后，部分旧测试 mock 未同步支持 `session.userId` 导致 55 项单元测试返回 401 报红；
   - 测试异步泄露（定时器未 drain）导致跨用例状态污染。
2. **缺乏防倒退版本追溯机制**：
   - 面对即将进行的大规模优化调整，若无清晰的基准版本切片，一旦重构遭遇未知兼容性问题，团队将陷入无法快速安全回滚的风险。

### 2. 决策方案：全绿质量基线与“单基准滚动继承”机制 (Single-Baseline Succession)
1. **质量基线全面加固**：
   - 修复生产构建（Next.js `npm run build` 37 个路由页面 100% 编译成功）；
   - 修复鉴权工具层 `getUserId()`，既支持 NextAuth v5 的 `session.user.id`，也完全兼容 `session.userId` 并在无 Request 上下文时优雅降级；
   - 修复 Vitest 异步用例泄露与 mock 图标遗漏，达成 **165/165 测试 100% 绿色全通**。
2. **版本管理核心规则（用户明确拍板准则）**：
   - **基准唯一定义**：当前全绿状态（通过全部测试与完整生产构建）确立为系统的**官方基准版本 (Baseline Version)**；
   - **单基准滚动继承**：
     - 进行后续大优化或大重构时，以当前基准版本作为随时回滚的安全锚点；
     - 确定升级下一个大版本且经过多轮测试确认稳定无误后，将旧基准版本销毁/移出活跃基线，以新的大版本作为唯一全新基准版本；
     - 严禁版本碎片化蔓延，确保团队始终保持单一、稳定、清晰的事实基准源。



---

## ADR-008: 混合持久化架构：WebAssembly SQLite 内存引擎 + Neon (Vercel Postgres) 远端快照无缝同步

### 1. 业务痛点与技术冲突
1. **Serverless 无状态存储困境**：
   - Vercel Serverless Function 宿主容器为只读文件系统且具有瞬态生命周期，本地 /tmp/blockos.db 会在函数空闲冷启后重置为初始种子，无法实现跨容器永久持久化；
2. **全盘重构 Postgres 的巨大破坏性成本**：
   - 全站 22 个 API 路由及 165 个测试用例均基于 SQLite 内存引擎的纯同步调用（query(...)、run(...)，无 await）；
   - 若将数据层全面重构为异步 PostgreSQL（await pg.query），需要彻底破坏 22 个文件接口定义、转换 SQL 占位符（? 转 $1, $2）并重写全部测试，违背“架构整洁与无破坏性演进原则”。

### 2. 决策方案：双层混合持久化 (Dual-Tier Hybrid Persistence)
1. **读写执行层（Tier 1）**：
   - 保持 WebAssembly SQLite (sql.js) 作为唯一内存 SQL 执行内核，保留 60fps 无延迟读写与 100% 同步语法兼容；
2. **云端持久化层（Tier 2 - Vercel Neon Postgres）**：
   - 引入 @neondatabase/serverless，利用 HTTP API 实现轻量无池化云端连接；
   - 在 Neon 中维护 blockos_db_sync 元数据与 Base64 快照存储；
   - **冷启动载入**：getDb() 优先从 Neon 拉取最新的云端数据库快照，拉取成功即自动水合进入内存；
   - **状态变更推送**：saveDb() 在写入本地临时磁盘的同时，异步将最新二进制快照回传同步至 Neon；
   - **自动优雅降级**：未绑定 POSTGRES_URL 或本地离线开发时，自动平滑回退至种子数据库，绝不产生网络阻塞与页面白屏；
3. **健康透视 API (/api/db-status)**：
   - 暴露实时连通性、同步时间戳与引擎状态，确保数据状态透明可测。

---

## ADR-009: 新手交互式引导重构与入门画布实验场落地 (Interactive Spotlight Onboarding & Playground Canvas)

### 1. 业务痛点与用户诉求
1. **首屏打扰与文档脱节**：
   - 首屏弹出的 `PdfNoticeModal`（比赛提交时间说明）对正常使用者造成操作干扰，其说明文档未能有机融入产品上手流程；
2. **预制文档缺乏互动性**：
   - 原预置的 5 篇文档（PRD、技术架构、UI 规范、数据分析、测试计划）均为单向展示性静态长文本，未能展现 BlockOS 的白板自由漫游、Agent 自主行动规则、多语言沙箱执行及类型专属 AI 等核心原子能力；
3. **旧版引导粗糙单调**：
   - 旧版 `OnboardingTour` 仅为屏幕居中的纯文本弹窗，缺乏目标定位与操作反馈，新用户缺乏“一步一步引导点击试用”的沉浸式指引。

### 2. 决策方案：高互动实验画布 + SVG 聚光灯互动导览
1. **彻底移除首屏通知弹窗**：
   - 移除 `PdfNoticeModal` 组件及其在首屏的强制拦截状态，保持首屏视野纯净；
2. **重塑首选入门画布 (`doc-guide` · 🚀 新手起航：无界文档交互实验场)**：
   - 作为默认激活的首篇工作区画布，专为新用户设计六大高互动 Block：
     - **原子 Block 欢迎卡片**：演示标题栏自由拖拽、右缘尺寸伸缩与画布滚轮漫游；
     - **Agent 规则自驱动待办**：用户点击勾选即刻触发 Agent 引擎，自动追加时间戳日志 Block 并调用智谱 GLM 大模型生成祝贺语；
     - **单 Block 专属 AI 体验**：引导悬停 ✨ 按钮，体验总结、扩写、改写与思维导图生成；
     - **双端代码沙箱**：内置 JavaScript 运行时代码，点击「运行」即刻安全沙箱执行并展示控制台输出；
     - **结构化功能对比表格**：直观呈现传统文档 vs BlockOS 的四大维度对比；
     - **角色透视与协同指引**：打上“产品经理”、“前端开发”角色标签，展示角色折叠与看板协同。
3. **升级为 SVG 聚光灯交互式导览 (`OnboardingTour`)**：
   - **动态镂空遮罩 (Spotlight Mask)**：使用 SVG mask 与高亮发光环精确聚焦目标 Block 与工具栏；
   - **自适应视口排版**：自动计算上下左右最佳气泡位置，平滑滚动目标元素至可视区；
   - **真机可操作性**：高亮区域保留真实交互能力，用户可边看指引边亲手点击勾选或运行代码；
   - **帮助中心常驻重播**：在「帮助中心」提供“重新启动新手交互引导”按钮，支持随时再次回看。

### 3. 质量验证与基线
- 运行 `npm run test:run`：9 个套件、165/165 测试 100% 绿色全通；
- 运行 `npm run build`：全站 38 个路由页面 100% 编译通过，零语法与类型错误。

---

## ADR-010: 飞书/钉钉风格官方新手入门系统重塑与 Agent 衍生卡片垂直避让排布治理 (Enterprise Onboarding & Vertical Avoidance Layout)

### 1. 业务痛点与用户反馈
1. **默认首篇文档认知割裂**：
   - 客户端打开后仍呈现旧版“产品需求文档（PRD）”，缺乏飞书、钉钉官方风格的开箱新手沉浸指南；
2. **待办任务演示业务价值弱**：
   - 原 Agent 待办演示为“生成祝贺语”，业务价值偏弱且视觉表现不够严肃专业；用户要求替换为更具实际产研价值的流转演示；
3. **衍生子卡片严重坐标叠放 Bug**：
   - 用户明确指出：“运行 Agent 规则自驱动，生成的卡片会不停叠加在同一个位置。拖开它之后，会有好几个；没脱开之前，它们是重复在一个位置的”。
   - **根因推演**：
     - Action 1（创建日志）与 Action 2（调用 AI）均传入目标待办 ID（`afterId`）；`addBlock` 粗暴计算 `y = target.y + 60`，导致两个衍生 Block 物理坐标 100% 像素级重叠；
     - 取消勾选再勾选时，缺乏关联源防重机制，重复创建堆叠，形成多层隐蔽重叠卡片。

### 2. 决策方案与架构落地
1. **飞书/钉钉风格官方新手入门指南 (`doc-guide`) 重塑**：
   - 标题命名为 `👋 欢迎使用 BlockOS ｜ 新手快速入门指南`，图标设为 `👋`；
   - 模块划分为 6 大企业级核心区域：欢迎开篇、[P0需求交付] Agent 自主交付实操区、单 Block 专属 AI 助手、多语言安全代码沙箱、结构化对比矩阵（多维表格体感）、角色透视与协同看板；
   - 在客户端水合 (`BlockOSApp.tsx`) 中加入强制升级置顶机制，检测并保障首篇默认文档激活为该入门指南，彻底告别老 PRD 遮蔽。
2. **Agent 业务动作升级为真实产研交付流转**：
   - 彻底废除“祝贺语”，升级为企业级敏捷交付流转：
     - **Action 1**：自动归档生成【📋 迭代发布报告】，含质量验收状态、执行时间戳与协同状态机流转；
     - **Action 2**：联动智谱 GLM 4.7 Flash 大模型流式规划【🚀 下一步上线保障与测试 Checklist】（灰度放量、监控指标与应急预案）。
3. **卡片智能垂直避让排布算法 (`estimateBlockHeight` + `addBlock`)**：
   - 引入高度估算器 `estimateBlockHeight`，根据 Block 类型与行数自适应计算卡片包围盒；
   - `addBlock` 在同列检索所有已存在卡片底部边界，计算 `targetY = max(afterBottom + 20, columnBottom + 20)`，保证每一个衍生 Block 无论先后顺序均排布在下方的非重叠安全区域。
4. **基于源块指纹的防重与就地幂等更新机制 (`useAgent.ts`)**：
   - 为衍生卡片注入 `sourceBlockId` 与 `ruleRole`（`audit-report` / `ai-checklist`）元数据；
   - 重复勾选时就地刷新已有卡片内容与时间戳，取消勾选时重置触发锁，彻底根除“拖开后底下叠了一大堆重复卡片”的视觉缺陷。

### 3. 质量验证与基线
- 运行 `npm run test:run`：9 个套件、165/165 测试 100% 绿色通过；
- 运行 `npm run build`：全站 38 个路由页面 100% 编译通过，零语法与类型错误。

---

## ADR-011: 无遮挡交互导览 (Draggable & Minimizable) 与画布全分辨率自适应缩放引擎治理 (Zero-Occlusion Tour & Canvas Responsive Auto-Fit Engine)

### 1. 业务痛点与用户实测反馈
1. **引导卡片遮挡执行结果 ("结果别挡住了")**：
   - 用户在运行代码沙箱（步骤 4）时，浮动引导卡片过大且悬浮在代码块下方，直接遮挡了沙箱控制台执行结果；
   - 用户勾选待办任务（步骤 2）触发 Agent 时，原有向下排列的引导卡片亦容易阻挡下游自动衍生的发布报告与 Checklist 卡片；
2. **画布视口未自适应与边缘截断 ("页面没有做自动适应，布局展示应该还需要做调整")**：
   - 画布初始视口固定为 `zoom: 1, pan: {x: 0, y: 0}`，且预制卡片总宽度达 1030px+，在常见 1366px/1440px 笔记本或展开侧边栏（240px）后，右侧代码沙箱、数据表格出现 30%~40% 宽度被浏览器右边缘直接切断；缺乏自适应全景缩放与居中机制。

### 2. 决策方案与架构落地
1. **彻底消除遮挡的三维防御机制 (`OnboardingTour.tsx`)**：
   - **智能避让排布算子 (Step-Aware Anti-Collision Placement)**：
     - **步骤 4 (代码沙箱)**：控制台在下方展开，引导卡片强制向左侧或左下停靠，100% 腾出右列代码块与控制台输出；
     - **步骤 2 (待办自驱动)**：衍生卡片向下生成，引导卡片强制停靠在右侧，杜绝任何纵向覆盖；
     - **步骤 3 (单 Block AI)**：悬停 ✨ 菜单在右上展开，引导卡片向左侧避让；
   - **极简折叠模式 (Minimizable Capsule Mode)**：
     - 卡片顶栏提供一键收起按钮；点击后卡片瞬时收拢为右下角轻量小胶囊（`[💡 步骤 4/5: 代码沙箱即时运行 ↗ 展开] [下一步 >] [✕]`），整个画布 100% 裸露供用户操作与核验；
   - **自由拖拽漫游 (Draggable Header)**：
     - 增加 `handleHeaderMouseDown` 与 `cursor-grab` 交互，用户可随时随心拖动引导卡片至屏幕任意角落；
   - **紧凑高精致尺寸**：卡片宽度由 440px 压缩精炼至 360px，内边距与字体排印更通透。
2. **画布智能全分辨率自适应缩放引擎 (`BlockEditor.tsx`)**：
   - **包围盒计算与最佳 Zoom 求解 (`autoFitView`)**：
     - 实时探测顶层 Block 的最小/最大 X 和 Y 坐标，计算内容包围盒；
     - 结合容器当前实际视口宽高，计算 `scaleX` 与 `scaleY`，在 `0.55 ~ 1.0` 舒适阅读区间内取最佳比例，并自动居中计算 `pan.x` 与 `pan.y`；
   - **全生命周期响应 (ResizeObserver)**：
     - 监听画布容器尺寸变化（侧边栏展开/折叠、窗口 Resize），在用户未手动平移缩放前始终保持自适应居中；
   - **交互工具栏自适应按钮**：
     - 在右下角缩放控制器新增 `Maximize2`「自适应」按钮，支持用户随时一键复位至最佳视口；
3. **入门指南文档网格再压实 (`presetDocuments.ts`)**：
   - 将卡片总布局包围盒由 1030px 进一步压缩至 934px（左列 450px，右列 460px，间隙 24px），即便在 1280px 标准分辨率下展开 240px 侧边栏，首屏宽度亦能 100% 完整容纳。

### 3. 质量验证与基线
- 运行 `npm run test:run`：9 个套件、165/165 测试 100% 绿色全通；
- 运行 `npm run build`：Next.js 全站 38 个路由生产打包 100% 成功。

---

## ADR-012: 废除激进自适应缩放引擎、全面转向单列垂直居中排布与三向拉伸治理 (Removal of Auto-Zoom Engine, Centered Vertical Layout & 3-Way Resize)

### 1. 业务痛点与用户实测推翻
在落地 ADR-011 的“画布全分辨率自适应缩放引擎”后，用户实机体验遭遇严重交互挫败，明确下达决策指令推倒重做：
1. **自动缩放突兀与阅读崩塌**：拖动或渲染时画布突兀缩小（自动缩放至 59%），字号过小导致无法看清内容；拖拽到边界时体验极差；
2. **Block 拉伸维度单一且表格文字截断**：原系统 Block 仅支持左右拉伸，不支持上下垂直拉伸，导致长文本和表格无法完整展示；表格单元格受单行 input 限制出现文字硬截断；
3. **右向拉伸全局文字被意外选中**：拉伸手柄未做 `user-select: none` 和事件默认阻断，鼠标右向拖拽时直接触发浏览器全局文本选区高亮；
4. **左右双列依然存在纵向物理碰撞**：在双列布局下，Block 3（单块 AI，高约 280px）与 Block 4（代码沙箱，y: 260）在物理坐标上重叠。用户明确指示：“建议先全部竖着往下展示，居中排列，整个 Block 一个一个往下展示，不用左右两排分”。

### 2. 决策方案与架构重构
1. **彻底废除自适应缩放引擎，回归 100% 原始比例白板**：
   - 彻底移除 `autoFitView`、`ResizeObserver` 及自动动态计算 `scale/pan` 的逻辑；
   - 画布初始视口稳定锁定在 100% 原始缩放（`zoom: 1, pan: { x: 0, y: 0 }`），杜绝任何自动跳变和突兀缩小；
   - 仅保留底栏原生的手动 `+ / − / Reset (100%)` 缩放控制。
2. **全面重构为单列垂直居中排布 (`presetDocuments.ts`)**：
   - 入门指引文档（`doc-guide`）全面废弃双列，改为统一定宽（760px）、居中排布（`x: 100`）的单列自上而下瀑布流：
     - Block 1 (欢迎与核心概念): `y: 40, width: 760`
     - Block 2 (Agent 待办任务自驱动): `y: 320, width: 760`（保留纵向缓冲带供 Agent 衍生报告与 Checklist 排布）
     - Block 3 (单 Block AI 智能重塑): `y: 800, width: 760`
     - Block 4 (交互式代码沙箱): `y: 1060, width: 760`
     - Block 5 (多维结构化表格): `y: 1380, width: 760`
     - Block 6 (角色透视与看板视图): `y: 1680, width: 760`
   - 从物理坐标拓扑上彻底根除 Block 3 与 Block 4 叠放冲突。
3. **支持 Block 三向自由拉伸与全向尺寸控制 (`BlockEditor.tsx`)**：
   - 在 `Block` 接口增加可选属性 `height?: number`，`resizeBlock` 支持宽与高的双向调整；
   - 为 Block 增加三处微交互拉伸把手：
     - **右边缘**（`cursor: ew-resize`）：横向宽度调节；
     - **底边缘**（`cursor: ns-resize`）：纵向高度调节；
     - **右下角**（`cursor: nwse-resize`）：对角线宽高双向调节；
   - **杜绝文字全选 Bug**：拉伸期间主动调用 `e.preventDefault()`、`window.getSelection()?.removeAllRanges()`，并向 `document.body.style.userSelect = 'none'` 施加全局文本选区抑制，松手时无缝还原。
4. **多维表格长文本自适应呈现与 Light 模式高对比度对比度治理 (`TableBlock.tsx`)**：
   - 将只读与默认渲染态由单行 `<input>` 升级为带 `whitespace-pre-wrap` 的动态 `div`；编辑态切换为多行 `<textarea>`，彻底解决文字被硬性切断；
   - **全面修复 Light 模式字体浅淡失真**：彻底剔除单元格硬编码的 `text-zinc-200`，重构为具备清晰层次的高对比色彩语义 `text-gray-900 dark:text-zinc-100`；首列（对比维度）追加轻量底色与字重加粗；表头统一为加粗黑体（`font-semibold text-gray-900 dark:text-zinc-100`）配合清爽浅灰底色（`bg-gray-100/90 dark:bg-zinc-800/90`）；
   - **向下兼容与预设纠正**：在 `TableBlock` 中实现 `columns` 与 `headers` 属性双向解构兼容，并在 `presetDocuments.ts` 中规范化结构化能力矩阵定义；水合版本自增至 `blockos-guide-v7-table-contrast`。
5. **视口平滑定位引导 (`OnboardingTour.tsx`)**：
   - 适配单列布局，每一步导览通过自定义事件 `blockos-scroll-to-block` 平滑驱动画布平移（`pan.y`），确保聚焦的目标卡片始终在视口黄金阅读区。

### 3. 质量验证与基线
- 单元测试：165 个测试用例（9 个套件）100% 通过；
- 生产构建：全站 38 个路由生产构建成功，零类型与编译报错；
- 界面实测：Light / Dark 双模下表格文字清晰可见，对比度符合 WCAG AA 标准。

---

## ADR-013: 顶层工具栏响应式弹性自适应重构与功能聚合收纳机制 (Responsive Adaptive Toolbar & Unified Overflow Menu)

### 1. 业务痛点与用户实测真相反馈
用户提供两张不同视口尺寸下的现场对比截屏（大窗口完整 vs 小窗口截断），并明确阐述其对“自适应”的真实定义：
1. **“自适应”真实诉求对齐**：用户所指的自适应并非画布缩放分辨率（Canvas Zoom Auto-Fit），而是**系统 UI 顶栏及操作控件的响应式自适应布局 (Responsive UI Adaptive Layout)**；
2. **顶栏功能严重截断溢出**：
   - 顶层工具栏原先硬编码平铺了 19 个独立功能按钮与 4 组分隔线，总宽度占用超过 1050px；
   - 在常见笔记本屏幕（如 1366px 且侧边栏展开占用 240px）、半屏分屏或缩放窗口时，由于缺乏响应式折叠设计与溢出保护，右侧核心功能区（团队协作、Agent 日志、主题切换、新手帮助、甚至个人中心用户头像）被硬生生挤出屏幕视口截断，导致用户在较小屏幕下无法触达右侧关键能力。

### 2. 决策方案与架构重塑
团队基于经典企业级 Web 协同产品（Linear / Notion / Figma）设计范式，落地**分层优先级弹性响应式工具栏与全量收纳引擎**：
1. **右侧高频与状态控件永久锚定 (`Right Section`)**：
   - 将原位于中央工具群中的「主题切换」抽离，与「用户中心」合并固定在最右侧（`shrink-0`）；
   - 工具栏全局添加 `overflow-hidden`，无论屏幕尺寸多小，右侧的用户中心与主题切换永不被挤压溢出，始终 100% 悬停于视口右上角黄金交互区。
2. **功能优先级与响应式断点折叠 (`Center Section`)**：
   - **基础核心组（全尺寸常驻）**：`AI 助手`、`AI 对话`、`Agent 规则开关`、`撤销/重做`、`全局搜索`；
   - **中屏/大屏展开组**：
     - `md:flex`（≥768px）：敏捷协作看板、Agent 执行日志；
     - `lg:flex`（≥1024px）：块级大纲导航、关系网图谱、版本历史、新手帮助；
     - `xl:flex`（≥1280px）：AI Copilot、工作流分析、导出、导入；
     - `2xl:flex`（≥1536px）：角色审阅、文档关联；
   - **文档标题弹性收缩**：输入框宽度由固定的 `w-56` 改造为 `w-24 sm:w-36 md:w-44 lg:w-52 truncate`，优先腾出中心交互空间。
3. **全量聚合收纳「更多功能」抽屉 (`MoreHorizontal Popover`)**：
   - 在中小屏（`< 2xl`）下自动展示高集成度「··· 更多」操作入口；
   - 打开后以清晰的三大板块层级展开所有进阶能力：
     - **🤖 AI 进阶套件**：AI Copilot 画布规划、工作流产研分析、多角色透视审阅、双向文档拓扑关联；
     - **📐 视图与图谱**：块级大纲导航、全局关系网图谱、历史版本留痕；
     - **🛠️ 工具与协作**：导出 (PDF/MD)、导入、团队敏捷协作看板、Agent 执行流水审计、使用指南与引导重跑；
   - 交互闭环：点击任意功能即时执行对应回调并自动关闭抽屉；弹层采用动态 Boundary 保护，保证视口边缘不越界。
4. **快捷添加 Block 浮动栏自适应保护 (`BlockEditor.tsx`)**：
   - 为白板中央浮动的 8 项快捷 Block 添加 `max-w-[calc(100vw-32px)] overflow-x-auto shadow-sm`，杜绝小屏下浮动栏横向超出视口。

### 3. 质量验证与基线
- 单元测试：165 个测试用例（9 个套件）100% 通过；
- 生产构建：全站 38 个路由生产构建成功，零类型与编译报错；
- 实机体验：在 800px、1024px、1280px、1440px 及 1920px 任意视口缩放与分屏下，工具栏 0 溢出、0 截断，右侧用户与主题永久在位，所有 19 项功能入口 100% 可触达。

---

## 🏛️ ADR-014：视口鹰眼导航（Minimap）、新手导览平滑跟随与预置卡片三组重叠根除

- **日期**：2026-10-13
- **决策状态**：已落地实施并通过全量自动化测试与构建校验
- **关联文件**：
  - [CanvasMinimap.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/CanvasMinimap.tsx)
  - [BlockEditor.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockEditor.tsx)
  - [OnboardingTour.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/OnboardingTour.tsx)
  - [presetDocuments.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/config/presetDocuments.ts)
  - [BlockOSApp.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockOSApp.tsx)

### 1. 痛点根因与物理事实证伪 (Evidence & Root Cause)
1. **导览框步骤 3 跳步骤 4 巨大位移跳跃**：
   - 查验代码发现：[OnboardingTour.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/OnboardingTour.tsx) 对 `currentStep === 3`（步骤 4）硬编码了 `nextLeft = 24; nextTop = window.innerHeight - estimatedCardHeight - 24;`（左下角停靠），而步骤 3 位于屏幕居中。点击“下一步”时卡片从屏幕中央横跨全屏飞向左下角，体验极突兀。
2. **预置卡片 1~6 分三组相互重叠遮挡**：
   - 数据事实：Block 1 高 360px (底 400)，但 Block 2 设在 `y: 320`（逆向重叠 80px）；Block 3 高 280px (底 1080)，但 Block 4 设在 `y: 1060`（重叠 20px）；Block 5 表格高 340px (底 1720)，但 Block 6 设在 `y: 1680`（重叠 40px）。三组均存在明确的数学碰撞重叠。
3. **滚轮提示与画布交互预期冲突**：
   - 画布实际交互为“常规滚轮 = 上下平移画幅，Ctrl+滚轮 = 缩放”，但左下角提示文案写为“滚轮缩放”，导致用户直接滑动滚轮时误以为缩放失效。同时用户需要全局全览与自由漫游画幅各角落的能力，但坚决拒绝“拖拽改变分辨率”的自适应失真设计。

### 2. 核心架构与工程决策 (Architectural Decisions)
1. **打造鹰眼缩略图导航器（Canvas Minimap）**：
   - 创建专用组件 `CanvasMinimap.tsx`，动态计算所有 Block 的包围盒，以等比微缩模型渲染所有卡片（依 Block 类型赋予辨识度配色）；
   - 将主视口当前可视区域计算映射为半透明蓝框指示器，支持按住小视口框自由拖拽漫游画幅各个角落（实时双向更新画布 `pan`）；
   - 支持点击小地图任意位置瞬间将视口居中于该点；提供“居中全览（Crosshair）”快捷按钮与展开/收起浮动胶囊。
2. **统一步骤 1~4 导览定位逻辑，消除跳跃**：
   - 废除步骤 4 的硬编码左下角分支。步骤 1~4 统一采用“右侧优先对齐”策略（`rect.right + 20`，与 Block 顶部平齐）；
   - 在 `BlockEditor.tsx` 的 `handleScrollTo` 中引入智能水平居中：计算 `targetBlock.width + 380px` 导览卡片总宽度并在屏幕中居中，确保屏幕右侧始终保留 380px 舒适阅读区；步骤 1 到 4 在纵向平滑滑动，水平坐标稳定无跳跃。
3. **数学安全间隔重排（彻底根除三组重叠）**：
   - Block 1 (Welcome): `y: 40` (底 400)
   - Block 2 (Todo): `y: 460` (底 550；留 460~1040 达 580px 充裕空间供 Agent 自驱动衍生卡片与 Checklist 展开)
   - Block 3 (AI): `y: 1040` (底 1320)
   - Block 4 (Code): `y: 1400` (底 1760，含控制台输出)
   - Block 5 (Table): `y: 1840` (底 2160)
   - Block 6 (Collab): `y: 2260` (底 2520)
   - 组间均保留 60px~100px 干净间距，彻底消除重叠。
4. **交互提示纠偏**：
   - 更新左下角提示为：“`右键空白处添加 Block · 滚轮上下平移 · Ctrl+滚轮缩放`”，与真实交互行为 100% 吻合。
5. **升级水合版本号**：
   - 将 `GUIDE_VERSION_KEY` 升级为 `blockos-guide-v8-anti-overlap-minimap`，保证现有浏览器刷新时无缝加载最新防重叠布局。

### 3. 验证与工程闭环 (Verification)
- 单元测试：Vitest 165 个测试全部通过（100% Green）。
- 生产构建：Next.js 全量 38 个路由生产构建通过，无任何语法或编译错误。
- 事实闭环：三组 Block 物理重叠彻底消解，步骤 3->4 平滑无跳跃，鹰眼小地图即时可用。

---

## 🏛️ ADR-015：系统首个稳定基准版本确立 (v1.0.0 Baseline Release Checkpoint)

- **日期**：2026-10-13
- **决策状态**：已正式拍板确立并打标归档 (Git Tag: `v1.0.0-baseline`)
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **里程碑定位**：当前代码库状态正式定为后续迭代的**不可倒退基准版本 (Baseline Release)**。后续所有增量开发均以此版本为坚实基石，严禁在架构与核心交互上回退。

### 1. 基准版本五大核心能力矩阵 (Baseline Capabilities)
1. **无界智能画布与视口漫游**：
   - 彻底废除失真的“自适应分辨率缩放”，坚持 100% 原始真实比例白板；
   - 配备独立**鹰眼缩略图导航器 (Canvas Minimap)**，动态计算包围盒与等比渲染，支持按住小视口框自由拖拽漫游画幅各个角落与一键十字准星全览；
   - 滚轮平滑上下移动画幅、Ctrl+滚轮缩放，左下角交互提示准确无歧义。
2. **原子 Block 编排与自适应拉伸**：
   - 支持自由拖拽摆放、右边缘左右宽度拉伸、下边缘与对角线上下高度拉伸；
   - 卡片主体 DOM 贯通高度继承，白色背景与边框紧贴把手实时延展（0 悬空断层）；
   - 内置**智能纵向推移算法 (Smart Push-down)**：卡片高度拉长推挤下方同一列 Block 时自动平移避让 60px，彻底消解碰撞覆盖。
3. **沉浸式新手引导系统 (Onboarding Tour)**：
   - 针对原子 Block 统一采用右侧贴靠、顶部平齐的稳定定位策略；
   - 视口跳转智能居中（预留 380px 右侧舒适区），彻底消除步骤 3->4 的跨屏瞬移；
   - 支持键盘快捷键 (Esc / 箭头 / Enter) 与一键最小化为浮动胶囊。
4. **AI 智能体原生融合与规则自驱动**：
   - 智谱大模型 `GLM-4.7-Flash` 原生 Key 真实流式调用；
   - 单 Block 专属 ✨ (Sparkles) 悬停菜单（总结、扩写、转思维导图）；
   - Todo 任务验收自动化规则引擎（勾选触发状态流转、归档发布报告、自动衍生上线保障 Checklist）。
5. **企业级协作与多维透视工作台**：
   - 响应式工具栏 (Responsive Toolbar)：窗口缩放时平滑折叠至“更多”下拉菜单，右侧用户与主题永久在位，19 项核心入口 100% 畅通；
   - 代码沙箱即时运行与控制台输出捕获；
   - 结构化表格（深浅色模式高对比度、列类型与增删）；
   - 关系拓扑图谱 (Relation Drawer)、角色折叠 (Role Filter)、敏捷任务看板与操作审计日志。

### 2. 质量验收与度量基线
- **单元测试**：Vitest 9 套测试套件、165 项用例 100% 绿色通过；
- **生产构建**：Next.js 全量 38 个路由（含 API 与页面）编译打包 0 错误；
- **视觉对比**：Light/Dark 双主题经过对比度矫正，文字与线框清晰锐利。

---

## 🏛️ ADR-016：第一阶段数据安全治理与保存链路闭环落地 (Data Persistence Pipeline, HMAC Auth, RBAC & Sandbox Isolation)

- **日期**：2026-10-13
- **决策状态**：已全面落地、验证通过并沉淀为工程宪法
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **对应规划项**：全盘 32 项产品优化规划中第 1—8 项（核心数据安全与保存基础），配合第 28 项（自动化测试用例）、第 29 项（架构与决策文档同步）。

### 1. 背景与核心问题诊断
在确立 v1.0.0 交互基准后，系统在实际生产与团队使用场景下面临底层数据链路与安全隐患：
1. **保存链路 405 阻塞**：前端调用 `PUT /api/pages` 和 `PUT /api/pages/[id]/blocks` 时，服务端仅实现了 GET/POST，导致静默报错 405 Method Not Allowed；
2. **PostgreSQL 全量覆盖隐患**：整份二进制 SQLite 文件 Base64 单字段覆盖存储，无法支持多人并发更新合并与细粒度版本检查；
3. **身份伪造漏洞**：非生产/简单登录接口直接信任客户端明文 Cookie `demo-session: userId`，攻击者修改 Cookie 即可冒充任意管理员；
4. **项目权限缺失**：接口层仅检查“是否为项目成员”，未区分 Owner、Admin、Member 与 Viewer，导致只读访客可随意增删改任务，普通成员可随意提权；
5. **代码沙箱环境变量泄露**：代码执行接口直接以子进程运行外部代码，继承宿主所有系统环境变量，导致应用生产密钥面临泄露风险；
6. **XSS 注入隐患**：ToggleBlock 直接使用 `dangerouslySetInnerHTML` 渲染用户输入，缺少 HTML 过滤机制；
7. **多用户本地存储冲突**：Canvas 本地缓存固定使用单一名空间 `block-os-storage`，同一浏览器切换账号导致数据穿透；
8. **缺乏数据恢复机制**：页面与任务物理硬删除，缺少软删除与回收站恢复能力。

### 2. 架构设计与技术方案

#### (1) 打通保存链路与前端状态感知（第 1 项）
- **路由补齐**：`src/app/api/pages/route.ts` 与 `src/app/api/pages/[id]/blocks/route.ts` 完整导出 `PUT` 与 `POST` 方法，支持原子批量更新；
- **Block 结构全量持久化**：统一映射 `id, pageId, type, title, content, meta, parentId, groupId, orderIndex, x, y, width, height, collapsed, version`，SQLite 表结构补齐相应字段并支持幂等迁移；
- **前端状态指示与重试机制**：Zustand store 引入 `saveStatus: 'idle' | 'saving' | 'saved' | 'error'` 与 `retrySave()`，顶部工具栏显式渲染“保存中 / 已保存 / 保存失败(重试)”状态胶囊。

#### (2) 乐观锁版本并发控制与实体保存（第 2 项）
- 表结构增加 `version INTEGER NOT NULL DEFAULT 1`；
- 更新接口支持并发冲突检测：若客户端提交过期版本，服务端返回 `409 Conflict` 并携带最新服务端版本号，拒绝覆盖他人的并发修改。

#### (3) HMAC-SHA256 会话防篡改签名体系（第 3 项）
- 设计 `createSignedSessionToken(userId)` 与 `verifySignedSessionToken(token)`；
- 令牌格式采用 `userId.expiry.hmacSignature`，由服务端私钥 `AUTH_SECRET` 进行签名；
- 客户端私自篡改 Cookie 或伪造用户 ID 将直接触发签名失效，服务端拦截并返回 `401 Unauthorized`；
- 生产环境关闭任意 ID 快捷登录，Cookie 设置 `httpOnly: true, secure: true, sameSite: 'lax'`。

#### (4) 统一 RBAC 项目权限矩阵（第 4 项）
- 确立清晰的角色能力矩阵：
  - **Owner**：拥有项目所有管理权限（删除项目、管理成员、全量读写任务）；
  - **Admin**：管理成员与全量读写任务；
  - **Member**：创建与修改任务，禁止邀请成员或调整角色；
  - **Viewer**：严格只读，禁止创建、修改、删除任务或邀请成员；
- 接口层（`tasks/route.ts`, `tasks/[id]/route.ts`, `projects/[id]/members/route.ts`）严格拦截越权操作并返回 `403 Forbidden`。

#### (5) 代码执行沙箱安全隔离（第 5 项）
- 改造 `src/app/api/run-code/route.ts`，彻底剥离宿主环境变量；
- 仅向执行子进程注入严格白名单变量（`PATH, LANG, NODE_ENV, PYTHONUNBUFFERED, TMPDIR`），绝不传递 `ZHIPU_API_KEY`、`POSTGRES_URL` 等密钥；
- 引入 3 秒看门狗超时中断机制（检测到死循环即时 SIGTERM 熔断）与 10KB 代码配额、50KB 缓冲区限制。

#### (6) 全局 XSS 净化与输入校验（第 6 项）
- 编写 `src/lib/sanitize.ts`，剥离 `<script>`, `<style>`, `<iframe>`, `onerror=`, `javascript:` 等所有执行标签与事件属性；
- 移除 `ToggleBlock.tsx` 中的 `dangerouslySetInnerHTML`，使用受控纯文本输入；
- 表格 CSV 限制 2MB、图片上传限制 5MB、Markdown 限制 2MB，防止超大异常数据撑爆内存。

#### (7) 本地存储多账号隔离（第 7 项）
- 前端 localStorage 引入 `block-os-storage-${userId}` 动态命名空间隔离；
- `useBlockStore` 增加 `setCurrentUserId(userId)`，账号切换时加载对应的独立镜像，杜绝跨用户数据污染。

#### (8) 软删除与回收站恢复能力（第 8 项）
- `pages` 与 `tasks` 表增加 `deleted_at INTEGER DEFAULT NULL`；
- DELETE 接口默认执行软删除，查询接口默认过滤已删除记录；
- 提供 `POST /api/pages/[id]/restore` 与 `POST /api/tasks/[id]/restore` 实现一键恢复。

### 3. 产出与验收度量（第 28 项）
- **单元测试扩充**：新增 `pages-sync.test.ts`、`rbac.test.ts`、`run-code-sandbox.test.ts`、`sanitize.test.ts`，测试套件增加至 13 个，测试用例由 165 个增至 **185 个，100% 绿色通过**；
- **生产构建验证**：Next.js 15 全量 38 个路由与中间件 `npm run build` 打包 **0 错误、0 警告阻断**。

---

## ADR-017: 产研全链路语义闭环、持久化后台引擎、跨视图状态协同与离线自愈架构 (Semantic Requirements, Persistent Agent Jobs, Cross-View Sync & Resilient Offline Fallback)

### 1. 业务痛点与技术冲突
在产研协同演进到真实团队使用阶段后，出现了一系列深层次交互与工程挑战：
1. **需求与任务割裂**：任务无法准确反向追溯来源需求与版本确认人，缺乏客观拓扑关系支撑；
2. **AI 行为缺乏可控性与审计闭环**：AI 变更缺乏可审查的 Diff 对比与逐项采纳能力，Agent 自动化仅在浏览器前端运行，页面关闭即丢失，且缺乏紧急暂停与执行级可逆回滚；
3. **多视图事实源不一致**：画布（Canvas）、看板（Kanban）、甘特图（Gantt）状态各自为政，无法做到修改状态双向联动；
4. **弱网与离线容错缺失**：偶发网络断连或 5xx 异常容易导致用户正在编辑的块数据丢失或页面崩溃；
5. **导入导出格式脆弱**：超大文件无保护，CSV 中文在 Windows Excel 下出现乱码，缺少整画幅无损恢复的 JSON 结构规范。

### 2. 架构设计与技术方案

#### (1) 结构化需求与双向业务语义连线（第 9-11 项）
- **自增编号与结构化实体**：创建 `requirements` 独立数据表，系统自动分配稳定唯一编号（如 `REQ-001`），支持绑定负责人、优先级、版本以及验收标准 (DoD) 数组；
- **强类型业务关联图谱**：创建 `semantic_relations` 表，细分为 `implements` (实现)、`verifies` (验证)、`depends_on` (依赖)、`references` (引用)，支持双向图遍历与删除级联检查；
- **变更影响客观分析算法**：实现 `src/app/api/projects/[id]/ai-impact/route.ts`，结合拓扑关联与中文 2-4 字符 n-gram 关键词提取算法，精准区分“直接关联任务”与“语义推测影响”。

#### (2) 项目成员作用域限定与产研验收解耦（第 12-14 项）
- **严格负责人推荐限定**：AI 任务拆解推荐负责人严格限定在当前项目成员集合 (`project_members`) 内，彻底杜绝分配给项目外无关人员；无法精准匹配时保留“未分配”；
- **任务状态流转解耦**：将任务状态扩展为 `todo` (待办) -> `in_progress` (进行中) -> `pending_review` (待验收) -> `done` (已完成) / `rejected` (已退回)；
- **真实评审依据**：勾选待办不再虚构“质检通过”，而是流转至 `pending_review`，必须关联 `deliverables` (交付物)、`reviewed_by` (验收人) 与 `review_notes` (评审依据)。

#### (3) AI 变更可逆预览与持久化后台引擎（第 17-21 项）
- **Diff 预览与分项采纳**：创建 `ai_modifications` 表，生成包含 `before`/`after` 快照的变更草案，支持整批或逐项接受，并提供一键原样撤销回滚；
- **持久化后台任务与幂等防重**：创建 `agent_jobs` 表与 `agent_executions` 审计表，引入 `event_id` 唯一约束防止重复触发；页面关闭或刷新后后台任务依然在服务端完整持久化；
- **紧急熔断与执行级反向回滚**：提供 `agent/toggle` 全局一键暂停/恢复制动开关，以及 `agent-executions/[execId]/rollback` 单次执行逆向还原能力。

#### (4) 跨视图双向状态联动与健壮导入导出（第 22-27 项）
- **跨视图双向响应式同步**：画布 `TodoBlock` 与看板 `ProjectBoard` / 任务详情 `TaskDetail` 建立双向监听；看板拖拽完成任务时自动同步更新画布对应 Block 勾选状态，画布勾选完成时自动同步流转看板任务；
- **10MB 安全导入防护与 JSON 校验**：`ImportPanel` 引入 10MB 文件配额，提供“覆盖当前画布”与“追加导入”双模式，JSON 格式异常时显示清晰 Banner 提示；
- **带 UTF-8 BOM 的任务 CSV 导出与 BlockOS JSON 快照**：`ExportPanel` 提供带 `\ufeff` 的任务清单 CSV 导出（Windows Excel 打开永不乱码）以及全量 BlockOS JSON 快照。

#### (5) 优雅离线降级与断网保护（第 30 项）
- **网络状态感知与离线保护**：顶部工具栏动态监听 `navigator.onLine` 与 window `online`/`offline` 事件，断网时显式展示“离线保护”状态；
- **本地队列暂存与自愈重连**：网络异常或 5xx 故障时，自动将待同步数据写入 `localStorage('block-os-offline-pending')` 队列；网络恢复或重试时自动触发增量补偿同步。

### 3. 产出与验收度量（第 31-32 项）
- **全量测试套件通过**：累计新增 `requirements-relations.test.ts`、`ai-impact-invites.test.ts`、`batch3-agent-preview.test.ts`、`batch4-import-export.test.ts`，测试套件达到 **17 个**，测试用例达到 **206 个，100% 绿色通过**；
- **全量生产环境构建**：Next.js 15 生产级打包 `npm run build` 完成全量 44 个路由与中间件编译，**0 编译错误、0 类型故障**；
- **生产线上部署**：Vercel Production 验证 HTTP 200 OK，线上稳定运行。

---

## ADR-018: 沙箱独立滚动隔离、工具栏语义极简化与 Portal 标签管理重塑 (Sandbox Scroll Isolation, Concise Toolbar & Portal Tag Picker)

### 1. 业务痛点与技术冲突
在真实高频使用与多分辨率真机体验中，暴露了以下三处关键交互体验与视觉短板：
1. **沙箱代码滚动冲突**：在代码沙箱内部上下滚动浏览长代码或执行输出时，`wheel` 事件冒泡至外层画布 `canvasRef`，导致画布同时被联动拖拽/位移，产生严重的操作眩晕感；
2. **顶层工具栏更多菜单臃肿冗长**：下拉菜单中的工具名称普遍长达 8~10 个中文字符（如“AI Copilot 画布规划”、“Agent 执行流水审计”等），视觉层级拥挤且缺乏快速抓取焦点的干练感；
3. **标签圆盘功能严重漂移且不美观**：原本的 `TagWheelPicker` 采用纯前端轮盘（Pie Wheel）设计，文字倾斜可读性差，且因为直接渲染在带有 CSS `transform: translate(...) scale(...)` 的画布 DOM 树内，导致其 fixed 坐标被坐标系污染，弹窗严重漂移至屏幕右下角，无法紧贴 Block 渲染。

### 2. 架构设计与技术方案

#### (1) 代码沙箱滚动隔离与边界约束
- **根容器事件阻断**：在 `CodeBlock` 根容器显式声明 `data-sandbox-scroll="true"`，并挂载 `onWheel={(e) => e.stopPropagation()}`，直接切断向外层 React 状态树冒泡；
- **画布滚动智能避让**：在 `BlockEditor.tsx` 的 `handleWheel` 中加入目标元素检测：
  `target?.closest('[data-sandbox-scroll], [data-no-canvas-wheel], textarea, pre, .overflow-y-auto, .overflow-auto')` 时立即返回，实现“鼠标在沙箱内部时优先且独占沙箱滚动，移出沙箱后平滑漫游整个画布”；
- **样式链防御**：代码编辑 `textarea`、高亮预览 `pre` 及终端执行日志容器全量应用 `overscroll-contain`，杜绝边缘触底反弹传递。

#### (2) 顶层工具栏语义极净化
- 遵循极简主义（Simplicity First）原则，将所有更多菜单项重构为高度对称统一的 4 字（或 2~4 字）现代产研专业词汇：
  - `AI Copilot 画布规划` -> `Copilot 规划`
  - `工作流产研分析` -> `工作流分析`
  - `多角色透视审阅` -> `多角色审阅`
  - `双向文档拓扑关联` -> `文档拓扑`
  - `产研智能折叠规划` -> `智能折叠`
  - `块级大纲导航` -> `大纲导航`
  - `全局关系网图谱` -> `关系图谱`
  - `历史版本留痕` -> `历史版本`
  - `导出文档 (PDF/MD)` -> `导出文档`
  - `导入外部文档` -> `导入文档`
  - `团队敏捷协作看板` -> `敏捷看板`
  - `Agent 执行流水审计` -> `执行审计`
  - `使用指南与引导重跑` -> `使用指南`

#### (3) 基于 React Portal 的 Notion / Linear 风格标签管理体系重构
- **脱离 CSS 变形上下文**：使用 `createPortal(content, document.body)` 将面板脱敏挂载到 `document.body`，彻底摆脱画布 `transform` 对视口定位的干扰；
- **像素级动态吸附**：精准基于触发按钮的 `getBoundingClientRect()` 计算屏幕坐标，自动根据视口上下边界进行智能翻转（避免溢出屏幕）；
- **成熟现代的卡片式标签交互**：
  - 内置搜索框与回车一键新建；
  - 常用预设标签磁贴阵列，支持单击即时勾选/取消勾选（Toggle）；
  - 已添加标签即时呈现，支持一键移除；
  - 自定义色调圆点选择器。

### 3. 产出与验收度量
- **自动化测试无回退**：17 个测试套件、206 项单元与集成测试持续 **100% 绿色全过**；
- **生产构建零警告阻断**：`npm run build` 成功完成全量 44 条路由编译打包；
- **真机行为验证**：鼠标进入代码沙箱内流畅滚动代码与终端输出，画布纹丝不动；移出后自由缩放平移；标签弹窗紧贴 Block 顶部右侧对齐展开，交互直观顺畅。

---

## ADR-019: 多模态 Block 闭环治理：表格 Excel 剪贴板/文件拖拽互通、画板全尺寸弹性自适应、媒体 Block 全生命周期换源与高可用 AI 智能体容灾 (Multimodal Blocks Enhancements & Resilient Agent Fallback)

### 1. 业务痛点与技术冲突
在产研实际协同与演示验收中，暴露了 4 个高频阻断体验的问题：
1. **表格 Block 数据孤岛**：真实产研协作中，绝大多数技术指标、工时排期与测试矩阵均存储在 Excel、WPS 或 Google Sheets 中。此前 TableBlock 仅支持手动逐个单元格键入，缺乏与宿主操作系统的剪贴板互通能力，严重制约实用价值；
2. **画板 Block 尺寸僵死**：当用户在画布中将白板 Block 拖拽放大至 800px、1200px 宽度甚至全屏时，内部绘图 `<canvas>` 元素固定为硬编码的 320px 高度，四周留出大片无用空白，无法利用拉伸后的画布空间；
3. **媒体 Block 无法换源/修改**：外链网页（如 BlockOS 官网、Figma 嵌入）或本地媒体添加后，卡片固化，缺乏重置或更换链接的交互入口，用户若填错必须整块删除重建；
4. **AI 智能体生成假死与命令单点依赖**：当运行环境缺少外部大模型 API Key，或网络出现偶发超时/500 时，前端勾选上线保障规则后卡片长期停滞在 `⏳ 正在调用智谱 GLM 4.7 Flash 大模型规划上线保障清单...`；AI 助手输入 "123" 等文本时提示为空白或直接报错，无法形成闭环。

### 2. 架构设计与技术方案

#### (1) 表格 Block Excel 剪贴板与拖拽导入体系 (TableBlock Clipboard & Drag-Drop Engine)
- **多格式解析器 `parseClipboardTable`**：
  - **TSV 优先**：Excel / WPS 复制单元格的标准剪贴板格式为 Tab 制表符分隔文本（`\t`）及换行符（`\r?\n`）；
  - **HTML 降级**：支持富文本剪贴板中的 `<table><tr><td>` 结构化提取；
  - **智能类型推断**：自动嗅探单元格数值（`number`）、日期（`date`）与纯文本（`text`）类型，自动生成第一行作为表头（Columns），后续行为数据行（Rows）；
- **全域粘贴与拖放接入**：
  - 容器监听全局 `onPaste` 事件，直接唤醒快速写入；
  - 挂载 `onDragOver` / `onDrop` 事件，支持 `.csv` / `.tsv` / `.txt` 文件直接拖拽至表格并即时渲染，提供直观的拖拽悬停高亮蒙层；
  - 表头常驻「粘贴 Excel」便捷操作按钮及空状态图文指引。

#### (2) 画板 Block 响应式弹性重绘引擎 (Responsive Whiteboard Canvas)
- **Flex 自适应容器**：样式层从固定 `320px` 重构为 `flex-1 h-full min-h-[260px]`，容器随外层卡片拉伸自动填充满尺寸；
- **ResizeObserver 动态尺寸嗅探与笔画无损重绘**：
  - 使用 `ResizeObserver` 实时监听父容器像素尺寸变化；
  - 尺寸变化时自适应更新 `canvas.width` 与 `canvas.height`，并利用已持久化的 `strokes` 笔画轨迹坐标流进行即时重绘，保证放大缩小过程中画作零变形、零丢失。

#### (3) 媒体 Block 全生命周期换源与动作控制 (MediaBlock Lifecycle Management)
- **常驻悬浮药丸操作区**：在媒体卡片右上角增加绝对定位的磨砂半透明悬浮药丸（Floating Action Pill），提供「更换媒体」与「清空重选」入口；
- **全类型编辑状态支持**：无论是上传图片/视频，还是外部嵌入 URL（如 default 网页 iframe），均支持点击进入编辑态，自由切换链接或重新上传本地文件；
- **安全表单控制**：表单提供「取消」与「清空」动作，防止误操作。

#### (4) AI 智能体容灾韧性与本地命令状态机 (Resilient Agent & Deterministic Command Engine)
- **离线企业级交付清单保底 (Enterprise Resilient Fallback)**：
  - 在 `useAgent.ts` 的 `callAI` 中加入严密的容灾捕获：即便外部大模型 API 出现无 Key、401、500 或超时，自动触发企业级标准 3 步上线保障清单（P0 核心冒烟、P1 灰度配置、数据巡检），绝不让界面卡死在加载态；
- **本地确定性命令解析器 (`executeLocalCommand`)**：
  - 在 `CommandPalette.tsx` 中集成正则规则状态机，覆盖批量创建 Block、清空画布、高亮关键词、删除特定 Block 等高频指令，在网络离线或无 AI 算力支持下依然具备 100% 确定性的执行能力。

### 3. 产出与验收度量
- **自动化测试无回退**：17 个测试套件、206 项单元与集成测试持续 **100% 绿色全过**；
- **生产打包构建**：`npm run build` 全量 44 条路由编译成功，零编译报错；
- **真机实测闭环**：
  - 从 Excel/WPS 复制任意多行多列单元格，在表格 Block 按 `Ctrl+V` 即可瞬间生成完整表格；
  - 白板 Block 自由拉伸至任意尺寸，绘图区域 100% 自适应扩展，笔画绘制流畅无遮挡；
  - 媒体 Block 点击「更换」可即时换源或取消；
  - 勾选 Block 2 的发布保障后，Agent 顺畅生成任务清单，无任何停滞挂起。

---

## ADR-020: 子 Block 响应式树状嵌套治理、架构导图节点与落地 Block 双向互通及多角色交互打磨 (Hierarchical Sub-Blocks, Mindmap Node-to-Block Linking & Multimodal Polish)

### 1. 业务痛点与技术冲突
在深入模拟多角色（架构师、产品经理、工程师、测试）真实操作时，发现两项严重的结构性交互断层：
1. **子 Block UI 严重畸变与画幅冲突**：
   - 当用户在画布中将一个大画幅 Block（如 600px 导图或表格）设为另一个小卡片（如 400px 待办卡片）的「子 Block」时，子卡片带着孤立的绝对宽度强制渲染在父卡片内部；
   - 子 Block 严重突兀地冲破父卡片右边框，且卡片与内容重叠遮挡；
   - 子卡片依然带有外层画布的拉伸手柄，在嵌套层拖动直接引发坐标失控；且一旦设为子 Block 后，界面完全缺失「移出子 Block / 提升为顶级 Block」的逆向操作入口；
2. **思维导图与落地原子 Block 割裂无网**：
   - 用户在导图梳理顶层架构（如需求、架构、测试），但导图节点无法与画布具体的待办 Block、代码 Block、文档 Block 产生业务关联；
   - 用户误以为“建立联系”必须依靠“设为子 Block”，从而触发了上述 UI 畸变；
   - 原导图 Block 存在高度硬编码（320px）、树形排布算法缺陷（多子节点垂直碰撞重叠、连线控制点飞出视口引发粗大滚动条）。

### 2. 架构设计与技术方案

#### (1) 响应式子 Block 树状嵌套容器体系 (Hierarchical Sub-Block Engine)
- **自适应宽度约束 (`w-full`)**：子 Block 渲染时彻底废除外部绝对硬编码像素宽度，强制应用 `w-full max-w-full box-border`，100% 自适应收纳在父卡片可用容器内；
- **父级尺寸智能自愈 (`handleSetAsChild`)**：在将较大 Block 设为子 Block 时，系统智能感知子 Block 的最小舒适宽度，自动弹性拓宽父卡片宽度（`Math.max(parent.width, maxChildWidth)`），避免内容过度压缩；
- **IDE 风格树形层级引导轨**：父卡片底部开辟独立子 Block 容器，带有 `border-l-2 border-blue-400/40` 左侧缩进导轨线与「包含的子 Block (N)」计数徽章；
- **画布手柄隔离与逆向解除 (`outdentBlock`)**：
  - 嵌套子 Block 彻底禁用画布层拖拽与外缘拉伸手柄（`depth === 0` 条件防护）；
  - 子 Block 标题栏常驻「移出」快捷按钮，点击调用 `outdentBlock`，自动将该 Block 平滑定位并平铺至父 Block 右侧画布（`parent.x + parent.width + 40`），避免叠放遗失；
  - 底部多选浮动栏动态识别所选 Block 是否包含子 Block，自适应切换为「移出子 Block」黄色高亮操作。

#### (2) 思维导图 Reingold-Tilford 递归布局与节点级 Block 互通 (Mindmap Node-to-Block Architecture)
- **精准子树高度递归排布**：
  - 引入标准树形布局算法：每个分支的纵向位置严格由其子孙节点真实总高度决定，彻底解决分支重叠、碰撞或负轴偏移；
  - 贝塞尔曲线控制点动态基于父节点右边缘中点与子节点左边缘中点计算，弧度优雅自然；
  - SVG 视口高度与宽度完全自适应实际节点包围盒，根除内部不必要的双重厚重滚动条；
- **节点级 Block 双向关联 (`linkedBlockId`)**：
  - 导图节点数据模型扩展 `linkedBlockId` 属性；
  - 节点悬停常驻「🔗」关联入口，弹出基于 React Portal 的跨层级选择器，支持直接关联当前画布上的任意 Block（待办、文档、代码、表格、媒体、白板）；
  - 关联后节点右上角显示 `[↗]` 联动药丸，点击一键派发 `blockos-scroll-to-block` 视口平滑定位并自动高亮目标 Block；
- **一键从导图分支裂变落地 Block**：
  - 弹窗内置「⚡ 基于此分支在画布直接生成落地 Block」：一键生成待办 Block、文本 Block 或代码 Block，自动建立双向拓扑连线并居中呈现，实现“顶层导图架构规划 ➔ 落地原子 Block 实施”的端到端闭环。

#### (3) 拓扑连线坐标映射自愈 (Canvas Link Coordinate Mapping)
- 在画布全局连线渲染层中，新增 `getVisualPos` 映射函数：当连线源端或目标端属于子 Block 时，自动叠加父容器当前屏幕绝对坐标与层级偏倚量，根除连线飞向历史失效坐标的问题；
- 「创建链接」模式下顶部常驻清晰交互横幅与 ESC 退出提示。

### 3. 产出与验收度量
- **自动化测试 100% 绿色**：17 个测试套件、206 项单元与集成测试全量通过；
- **生产环境零错误构建**：Next.js 15 全量 44 条路由编译打包通过；
- **React 19 渲染与状态解耦自愈**：将 `MindmapBlock` 中在 `setRoot` 回调内触发 `onChange`（进而更新父级 Zustand 状态）的反模式重构为独立的 `commitRoot` 事务，彻底消除 Next.js Dev Overlay 报出的 `Cannot update a component ('BlockOSApp') while rendering a different component ('MindmapBlock')` 警告；
- **真机实测闭环**：
  - 任何 Block 设为子 Block 后，均完美契合在父 Block 的树形导轨容器中，自适应撑满宽度，无任何右侧突围与样式崩坏；
  - 子 Block 头部与底部工具栏均可一键「移出」，瞬间恢复为画布顶级卡片；
  - 思维导图节点可以自由关联待办、代码或文档，点击徽章画布平滑移动聚焦，或直接从导图分支一键生成新任务。

---

## ADR-021: 双向关联断开交互全链路打通、导图节点悬浮操作防抖固化与暗色子 Block 色彩对比度治理 (Bidirectional Link Disconnection, Mindmap Hover Bridge & Sub-Block Dark Contrast)

- **日期**：2026-10-14
- **决策状态**：已全面落地、验证通过并纳入工程标准基线
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/store/blockStore.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/store/blockStore.ts)
  - [src/components/SortableBlock.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/SortableBlock.tsx)
  - [src/components/BlockEditor.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockEditor.tsx)
  - [src/components/blocks/MindmapBlock.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/blocks/MindmapBlock.tsx)

### 1. 痛点与客观证据链 (Evidence & User Feedback)
1. **关联关系缺乏断开入口**：
   - 用户明确反馈：“我怎么断开两个 Block 之间的连接？如果我不需要了，该怎么断开这个链接”；
   - 之前仅实现了 `createLink`，缺少 `removeLink` 方法，且界面上只有静态的 `N links` 文本，无论是卡片上还是画布连线上均无任何断开操作。
2. **导图悬浮按钮移动即消失 Bug**：
   - 用户明确反馈：“你说放到上面会有悬浮，往右按可以链接。但我试了一下，只要不放上去，就点不到那个悬浮按钮。这边需要调整，现在不方便使用”；
   - 根因分析：
     1. SVG 节点底板矩形与悬浮按钮组（`+`、`🔗`、`×`）之间存在 6px 的空白间隙，在鼠标从节点向右滑动时，指针一旦进入间隙，浏览器判定移出 `<g>` 容器并触发 `onMouseLeave`，导致悬浮栏立即卸载消失；
     2. 单击节点直接进入了文字编辑状态，触发 `isEditing = true` 强行隐藏了工具栏。
3. **子 Block 暗色模式突兀白底与文字浅灰失真**：
   - 用户截图（`media_1791964842587_a51beee8.jpg`）显示，在暗色画布下，子 Block 呈现为突兀的纯白方块，且内部文字呈浅灰色难以阅读；
   - 根因排查：代码中误用了非标准 Tailwind 类名 `dark:bg-zinc-850/95`。浏览器直接丢弃无效类名，回退到默认浅色背景 `bg-white/95`，导致暗色模式下突兀反白并与暗色文字配色产生对比度灾难。
4. **开发模式未授权同步警告阻断**：
   - 访客或本地匿名状态下，`syncPages` 遇到 401 时执行 `console.error`，触发 Turbopack 红色全局错误覆盖层。

### 2. 决策方案与架构落地 (Decisions & Architecture)

#### (1) 全链路双向关联断开交互 (Link Disconnection Everywhere)
1. **Store 层原子方法**：在 `blockStore.ts` 中实现 `removeLink: (fromId, toId) => void`，移除 `meta.links` 中对应的 `toId` 并记录 Undo/Redo 历史栈；
2. **Block 卡片关联药丸**：在 `SortableBlock.tsx` 底部，将原本静态文本重构为交互式标签组。每个标签显示目标 Block 名称（或类型），并带有显眼的红色 `[✕]` 按钮，点击一键断开；
3. **画布连线中央直接断开**：在 `BlockEditor.tsx` 的 SVG 贝塞尔连线中点 `(midX, midY)` 处，渲染可点击的交互徽章 `[✕ 断开]`（`pointer-events-auto`），用户直接点击画布连线即可秒级切断。

#### (2) 思维导图悬浮桥接、单击固化与顶部快操三维防线 (Mindmap Hover Bridge & Selection Pinning)
1. **透明感应桥接矩形 (Hover Bridge)**：在 SVG 节点 `<g>` 容器内前置注入透明覆盖层 `<rect x={-6} y={-6} width={pos.width + (isToolbarVisible ? 86 : 12)} height={pos.height + 12} fill="transparent" pointerEvents="all" />`，将节点与按钮完全包裹在无缝感应区内，彻底根除鼠标横移滑入间隙触发 `onMouseLeave`；
2. **单击持久固化 (`selectedNodeId`)**：单击节点即将其选定并高亮边框，浮动按钮常驻固定显示，不再受鼠标移开影响；双击节点才触发文字编辑；点击画布空白处自动取消选择；
3. **顶部工具栏快捷操作兜底**：选中节点后，导图顶栏自动展开该节点的极简操作组（`[+子项]`、`[🔗关联]`、`[重命名]`、`[×删除]`），提供 100% 稳定的备用操作入口。

#### (3) 规范化暗色语义色彩与全库类名自检 (Color Contrast & Class Sanitation)
1. **子 Block 色彩回归**：将子 Block 背景与边框修正为标准暗色语义 `border-blue-300/60 dark:border-zinc-700/80 bg-gray-50/95 dark:bg-zinc-900/95`，子 Block 顶栏使用 `dark:bg-zinc-800/80`，确保与整体暗黑设计语言严密融为一体；
2. **全库非标类名彻底清剿**：排查并修复 `login/page.tsx` 与 `ProfilePanel.tsx` 中遗留的 `dark:hover:bg-zinc-750`（更正为 `dark:hover:bg-zinc-700`），实现全库 0 非标样式类名。

#### (4) 401 告警静默降级
- `syncPages` 捕获 401 时仅以 `console.warn` 记录，杜绝在本地未登录开发状态下弹出红色阻断性报错。

### 3. 产出与验收度量 (Verification)
- **单元与集成测试**：17 个测试套件、206 项测试用例全部 **100% 绿色通过**；
- **生产构建零错误**：Next.js 15 全量 44 条路由编译打包 **0 错误、0 警告阻断**；
- **全流程事实闭环**：
  - 点击 Block 底部关联药丸的 `✕` 或画布连线上的 `✕ 断开`，均可平滑断开关联；
  - 导图节点悬浮按钮移动不再消失，单击稳定固化并出现顶部快操；
  - 子 Block 在暗色主题下呈现高对比度沉稳深灰，字体清晰锐利。

---

## ADR-022: 画布连线断开药丸三层防遮挡架构与首屏极简单文档入门标准 (Unoccluded Link Disconnection Pill & Clean Single-Doc Onboarding Architecture)

- **日期**：2026-10-14
- **决策状态**：已全面落地、验证通过并纳入工程标准基线
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/components/BlockEditor.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockEditor.tsx)
  - [src/components/BlockOSApp.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockOSApp.tsx)
  - [src/store/blockStore.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/store/blockStore.ts)
  - [src/config/presetDocuments.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/config/presetDocuments.ts)

### 1. 痛点根因与事实证伪 (Evidence & Root Cause)
1. **纵向连线断开药丸被实体卡片遮挡**：
   - 用户实测截图（`media_1791967501979_adb20428.jpg`）证明：当上下两个 Block 纵向连接时，断开药丸被上方 Block 卡片本体遮挡，仅能在卡片边缘微透模糊形状；
   - **根因剖析**：
     1. **几何锚点失真**：旧算法硬编码锚点为 `(pos.x + width/2, pos.y + 30)`。当上方 Block（如导图，高 400px）位于 `y=40`、下方 Block 位于 `y=500` 时，中心点 `midY = (70 + 530) / 2 = 300`，该点物理落在上方 Block 本体（`y: 40~440`）正中间；
     2. **DOM 堆叠层级缺陷**：旧版连线与药丸均绘制在处于 DOM 树前置的单个 SVG 中，后续渲染的 Block 卡片拥有实心白底（`bg-white dark:bg-zinc-900`），在层叠上下文（Stacking Context）中自然覆盖在药丸上方。
2. **新手文档过度臃肿与样板泛滥**：
   - 用户明确纠偏：“新客户进来时，只需要先看到‘欢迎使用’的入门指南文档，剩下的 5 个文档不要在第一次就立刻出现，它们只是作为样板，而不是用户一打开软件就立刻有的。所以你的功能设计不能通过展示后面这 5 个文档来体现，得换一个方法，或者直接引导客户使用上面工具栏的 AI 助手等功能来体现。”；
   - 之前初始化将 6 个行业文档全数载入左侧侧边栏，破坏了首屏纯粹性，违背了渐进式交付逻辑。

### 2. 决策方案与架构落地 (Decisions & Architecture)

#### (1) 画布分层渲染与动态边缘路由三维防线 (3-Layer Rendering & Edge-to-Edge Routing)
1. **动态边缘路由几何算法**：
   - 弃用固定 `y + 30` 偏移，引入 `estimateBlockHeight` 动态计算 Block 真实三维包围盒（`box1` 与 `box2`）；
   - **自适应主导轴判定**：
     - 若 `|dy| >= |dx|`（纵向主导）：上方 Block 连接点取底边中心 `(box1.centerX, box1.bottom)`，下方 Block 连接点取顶边中心 `(box2.centerX, box2.top)`，中点 `midY = (box1.bottom + box2.top) / 2` 严格落在两张卡片间的空白间距内；
     - 若 `|dx| > |dy|`（横向主导）：左侧 Block 取右边中点，右侧 Block 取左边中点，确保中点始终处于开阔地带。
2. **三层独立层叠架构 (3-Layer Stacking Architecture)**：
   - **底层 SVG (`zIndex: 1`)**：仅渲染贝塞尔曲线连线与分组虚线框；
   - **中间 DOM 层 (`zIndex: 2`)**：渲染 Block 卡片实体树；
   - **顶层高优先级覆盖层 SVG (`zIndex: 30`)**：独立渲染断开连接交互药丸（`[✕ 断开]`），启用 `pointer-events-auto`。无论卡片如何拖拽、重叠，断开药丸均绝对处于视线与可点击最上层，彻底杜绝遮挡。
3. **药丸视觉升级**：
   - 尺寸调整为 `64x24 rx=12`，赋予高对比度投影 `drop-shadow(0 2px 6px rgba(0,0,0,0.18))`；
   - 默认浅蓝描边，悬停即变鲜红并切换高亮背景，操作意图明确直观。

#### (2) 极简单文档入门与样板库隔离治理 (Clean Single-Doc Onboarding & Template Segregation)
1. **首屏纯净单文档**：`createPresetPages()` 仅初始化首张《👋 欢迎使用 BlockOS ｜ 新手快速入门指南》（`doc-guide`），左侧文档列表清爽干净；
2. **样板库按需实例化**：其余 5 篇完整行业标杆文档（电商 PRD、技术架构、UI 规范、数据矩阵、测试用例）全部封装入模板中心（`TemplatePicker`），用户点击「+ 新建页面」时按需选用；
3. **欢迎页闭环演示与工具栏进阶引导**：
   - **Block 1**：明确产品 PRD 核心需求与验收 DoD；
   - **Block 2**：点击勾选【发布保障】核心功能测试用例需 100% 通过，原地由 Agent 规则引擎自驱动触发生成《迭代发布报告》与 AI 规划 Checklist，并在审计流水留痕；
   - **Block 6**：作为进阶协同总览，明确引导用户使用顶栏的「AI 助手」、「Copilot 规划」、「规则与执行审计」、「敏捷看板」与「样板中心」，构建完整的产研闭环。
4. **水合与版本升级机制**：
   - 升级版本键为 `blockos-guide-v9-clean-single-doc`，升级时自动清理旧版遗留在 localStorage 中的 5 个硬编码样板文档（保留用户自定义文档），保证新老用户均享有一致的极简首屏体验。

### 3. 产出与验收度量 (Verification)
- **自动化测试**：Vitest 17 个测试套件、206 项测试用例全部 **100% 绿色通过**；
- **生产编译**：Next.js 15 全量 38 个路由生产构建 **0 错误、0 警告阻断**；
- **事实闭环**：
  - 纵向连线断开药丸绝对悬浮于两卡片间隙最顶层，无任何遮挡，点击即可秒级切断关联；
  - 首屏仅展现《欢迎使用》单文档，其余 5 篇文档规范入驻样板库。

---

## ADR-023: 全流程云端真机交付与 Vercel 生产部署直接反馈铁律 (Cloud-First Vercel Deployment & Zero Localhost Feedback Law)

- **日期**：2026-10-14
- **决策状态**：已正式拍板确立并严格纳入全局协同准则
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联基础设施与端点**：
  - **定制主域名**：[https://blockos.hiakkocv.xyz](https://blockos.hiakkocv.xyz)
  - **Vercel 生产域名**：[https://blockos-with-taoke-hk9u.vercel.app](https://blockos-with-taoke-hk9u.vercel.app)
  - **Vercel 控制台与审查**：[blockos-with-taoke-hk9u on Vercel](https://vercel.com/akko5/blockos-with-taoke-hk9u)

### 1. 痛点根因与用户拍板要求 (Evidence & User Rule)
- **痛点**：以往更新后经常以 `http://localhost:3000` 引导用户体验，忽略了云端与本地环境在网络层、CDN 缓存、环境变量、构建打包产物上的差异，增加了人工验证成本与心智切换负担；
- **用户强制性拍板**：
  > “目前我们每次更新完后，不要通过 Localhost 打开软件。既然部署了 Vercel，就直接在那边推送到在线网站，然后我们去体验。如果你需要在谷歌浏览器调试，可以用 Localhost，但最后反馈给我的一定是在 vercel 网站上部署的，也就是在云端展示。”

### 2. 标准工程闭环工作流 (Standard Engineering Workflow)
1. **本地研发与严密自检（隐式内环）**：
   - 可以在本地进行代码修改与单元测试（Vitest 206 项测试保驾护航）；
   - 必须通过 `npm run build` 本地完整打包自检，确保 0 语法报错、0 警告阻断；
2. **远程推送与 Vercel 自动部署（触发流水线）**：
   - 本地自检通过后，提交并推送到 GitHub `main` 分支；
   - Vercel 监听 `main` 分支提交，自动拉取并启动生产构建流水线；
3. **MCP 实地核查与真机探针双重验证（客观证据链）**：
   - 严禁盲猜部署状态，必须调用 Vercel MCP 接口（`list_deployments`）确认该次 Commit SHA 对应的部署状态为 `READY`；
   - 使用网络探针（`curl.exe -sI https://blockos.hiakkocv.xyz`）实地验证 HTTP 响应状态码为 `200 OK`、`Server: Vercel` 且 `X-Vercel-Cache` 正常响应；
4. **云端显式汇报与直达体验（交付外环）**：
   - 最终交付一律提供经过验证的云端在线链接，杜绝向用户推送任何 Localhost 体验指令。

---

## ADR-024: 官方新手入门卡片与导览系统防冲毁穿透防御架构 (Onboarding Guide Blocks & Tour Anti-Wipeout Architecture)

- **日期**：2026-10-14
- **决策状态**：已全面落地、验证通过并纳入工程标准基线
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/app/api/pages/[id]/blocks/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/pages/%5Bid%5D/blocks/route.ts)
  - [src/store/blockStore.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/store/blockStore.ts)
  - [src/components/BlockOSApp.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockOSApp.tsx)
  - [src/config/presetDocuments.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/config/presetDocuments.ts)

### 1. 痛点根因与事实证伪 (Evidence & Root Cause)
1. **真实线上截屏证据**：
   - 用户在 `https://blockos.hiakkocv.xyz` 登录后截屏（`media_1791970097057_1d51c7b1.jpg`）反馈：“引导那些内容怎么没了？”；
   - 画面事实：中央画布呈纯黑无物状态，右下角 Minimap 明确显示“鹰眼导航 (0 块)”，新手入门卡片与新手导览弹窗均消失。
2. **三维时序冲突根因**：
   - **空数组破坏性覆盖 (Destructive Empty Overwrite)**：客户端 `loadFromServer(pageId)` 在加载云端数据时，将服务端响应的 `{ blocks: [] }` 盲目判定为有效结果，执行 `state.blocks = []` 与 `state.pageBlocks['doc-guide'] = []`，将客户端预置的 6 张新手卡片彻底清空；
   - **服务端静默漏灌**：服务端 `GET /api/pages/[id]/blocks` 在查询新用户数据库时，`blocks WHERE page_id = 'doc-guide'` 自然返回 0 条记录，缺乏针对官方入门页面的自动兜底初始化逻辑；
   - **水合单次守卫失效**：`hasUpgraded` 一旦被置为 `'true'`，后续刷新页面或用户被清空数据后不再触发新手卡片补齐，且导览组件因找不到锚点元素（`[data-tour="..."]`）无法正常展示。

### 2. 决策方案与穿透防御落地 (Decisions & Architecture)

#### (1) 服务端权威兜底保障 (`route.ts`)
- 当请求 `GET /api/pages/doc-guide/blocks` 时：
  - 若当前用户尚未初始化 `doc-guide` 页面记录，自动补齐页面元数据；
  - 若 `blocks` 关联表中卡片数为 0，服务端**事务级自动写入 6 张完整的官方新手卡片**并落盘保存；
  - 彻底确保服务端对 `doc-guide` 永远返回 HTTP 200 与 6 张标准卡片，杜绝返回空数组。

#### (2) Store 状态层非空防护网 (`blockStore.ts`)
- **`loadFromServer` 拦截防护**：当服务端返回 `blocks: []` 时，严禁直接赋空，若本地已有卡片则立即反向同步上云；若本地亦为空且为指南页面，强制调用 `getPresetDocumentBlocks('doc-guide')` 自动复原；
- **`setCurrentPage` 自动挽救**：用户切换至新手指南页面时，若发现当前 blocks 为空，自动注入官方预置卡片。

#### (3) 客户端多重防漏恢复机制 (`BlockOSApp.tsx`)
- 引入 `isGuideEmpty` 持续状态探测：无论版本键是否标记，只要检测到当前指南卡片为空，无条件重新灌装 6 张新手卡片并唤醒 `OnboardingTour` 交互导览；
- 在 `loadServerData` 异步结束末尾增加二次防护，彻底消除时序竞争导致的闪烁清空；
- 在帮助中心「重新启动新手交互引导」中注入卡片状态核验，确保导览启动时必有卡片锚点。

### 3. 产出与验收度量 (Verification)
- **单元测试**：Vitest 206 项自动化测试全量通过；
- **构建校验**：Next.js 38 条路由生产构建通过；
- **线上闭环**：新老用户无论何时进入系统，首屏《欢迎使用》必有 6 张完整原子 Block 卡片（需求 PRD、Agent 触发待办、专属 AI、代码沙箱、数据表格、AI 进阶协同）及新手漫游导览。

---

## ADR-025: 租户与多账号强隔离架构、动态名空间存储与全系统工程隐患消减治理 (Enterprise Multi-Tenant Isolation & Codebase Defect Remediation)

- **日期**：2026-10-14
- **决策状态**：方案已正式确立并制定系统化排查与实施基线
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/store/blockStore.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/store/blockStore.ts)
  - [src/lib/db.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/db.ts)
  - [src/app/api/pages/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/pages/route.ts)
  - [src/app/api/pages/[id]/blocks/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/pages/%5Bid%5D/blocks/route.ts)
  - [src/app/api/pages/[id]/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/pages/%5Bid%5D/route.ts)
  - [src/components/Toolbar.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/Toolbar.tsx)
  - [src/components/ProjectBoard.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/ProjectBoard.tsx)
  - [src/components/collaboration/TeamDetailPanel.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/collaboration/TeamDetailPanel.tsx)

### 1. 痛点根因与客观事实证据 (Evidence & Root Cause)
1. **客户端 LocalStorage 全局键污染 (`blockStore.ts:1231`)**：
   - Zustand 持久化配置使用固定键 `name: 'block-os-storage'`；
   - 用户登出时（`Toolbar.tsx:117-124`）仅向服务端请求 `/api/auth/logout` 并重定向，完全未清理本地存储；
   - 切换不同测试账号（Admin -> Dev）登录后，客户端优先从全局键水合上一个账号的页面与卡片，甚至会触发自动回写同步，导致多账号数据严重互串。
2. **数据库多租户主键碰撞 (`db.ts:108, 120`)**：
   - SQLite 中 `pages` 表结构为 `CREATE TABLE pages (id TEXT PRIMARY KEY, user_id TEXT ...)`；
   - 默认入门指南的页面 ID 为固定字符串 `'doc-guide'`，其包含的卡片 ID 也为固定字符串（如 `'guide-block-welcome'`）；
   - 当第二名用户在系统中尝试初始化指南或保存相同 ID 页面时，触发 SQLite `UNIQUE constraint failed: pages.id` 或 `blocks.id`，导致 `PUT /api/pages` 直接报 HTTP 500。
3. **RBAC 鉴权绕过与硬编码字符串依赖 (`ProjectBoard.tsx:72`, `TeamDetailPanel.tsx:40`)**：
   - 前端管理员权限判定硬编码写死为 `setIsAdmin(data.userId === 'demo-admin-001')`；
   - 完全脱离了数据库 `project_members` 与 `team_members` 中的真实角色字段（`owner`、`admin`），使得多账号、真实 OAuth 登录用户即便拥有合法管理员权限也无法行使管理功能。
4. **服务端无状态函数生命周期与单 Snapshot 覆写风险 (`db.ts:480-486`)**：
   - `saveDb()` 中推送 Neon Postgres 的 Promise 未做 await 阻塞等待；在 Vercel Serverless 环境下，HTTP 响应返回后容器极易进入冻结或销毁状态，导致未完成的异步网络套接字中断而丢失增量变更；
   - Neon 中全局共享一个 `main` 快照，缺乏按租户/按用户的版本隔离，存在容器并发写入时的覆写竞争。
5. **IDOR 越权跨用户卡片删除风险 (`pages/[id]/route.ts:131`)**：
   - 在永久删除页面时，先执行 `DELETE FROM blocks WHERE page_id = ?`，该语句未校验 `page_id` 的归属者，存在潜在的跨用户卡片越权破坏隐患。

### 2. 决策方案与系统重构架构 (Decisions & Architecture)

#### (1) 租户动态名空间与登出强力清场 (Dynamic Scoped Storage & Clean Logout)
1. **动态持久化键**：将 Zustand persist 键升级为基于当前用户 ID 的动态命名空间：`block-os-storage-${userId || 'guest'}`；未登录态使用独立的临时访客键；
2. **登出原子重置**：在 `Toolbar.tsx` 及 `auth-utils.ts` 中实现统一的登出清理函数：
   - 调用 `POST /api/auth/logout`；
   - 重置内存中的 `useBlockStore.getState().reset()`；
   - 彻底清除 localStorage 中残留的旧用户缓存；
   - 清除所有 cookie 状态后重定向。

#### (2) 数据库租户复合主键与租户作用域隔离 (Composite Primary Key & Tenant Scoping)
1. **复合主键隔离**：
   - `pages` 表升级支持租户隔离（复合主键或用户级页面 ID 映射），实现不同租户可同时独立拥有 `'doc-guide'`，互不干扰；
   - `blocks` 表关联至 `(page_id, user_id)` 或通过租户前缀/UUID 生成唯一物理 ID，同时通过 `meta.tourId` 保留向后兼容的引导高亮锚点；
2. **API 租户穿透防护**：
   - 严格审核 `DELETE /api/pages/[id]` 等接口，在删除关联 blocks 前必须先行验证该 `page_id` 确实归当前 `userId` 所有，杜绝 IDOR 越权越界删除。

#### (3) 规范化 RBAC 状态机与硬编码清理 (Dynamic RBAC & Hardcoded String Purge)
1. **服务端返回完整权限上下文**：`/api/user/profile` 与 `/api/auth/user` 同步下发当前用户的系统角色 `role` 及针对当前项目/团队的权限元数据；
2. **彻底移除硬编码判断**：废除所有 `userId === 'demo-admin-001'` 的硬编码代码，统一改为基于角色能力（`canManage`、`isAdmin: role === 'admin' || role === 'owner'`）的动态判断。

#### (4) 混合持久化网络可靠性加固 (Serverless Neon Persistence Hardening)
1. **生命周期保活**：在 API 响应结束前，通过 Next.js / Vercel `waitUntil` 或显式 await 确保关键数据库快照写入已落盘，避免冷冻丢失；
2. **租户快照分片支持**：长期规划支持按租户分片存储快照，消除跨账号并发写入碰撞。

### 3. 产出与验收度量 (Verification Baseline)
- 多账号切换验证：在同一浏览器中顺序登录 `demo-admin-001` 与 `demo-emp-001`，彼此画布、页面列表、看板任务 100% 物理隔离，无任何污染与穿透；
- 自动化测试与生产构建：确保 206 项自动化测试全部通过，无构建中断。

---

## ADR-026: 画布多选批量拖拽动力学重构与导览文案面向客户精细化打磨 (Canvas Multi-Selection Batch Drag Dynamics & Customer-Facing Onboarding Polish)

- **日期**：2026-10-14
- **决策状态**：已全面落地、验证通过并推送到生产环境
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/components/BlockEditor.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockEditor.tsx)
  - [src/components/OnboardingTour.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/OnboardingTour.tsx)
  - [tests/components/BlockMultiSelectDrag.test.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/tests/components/BlockMultiSelectDrag.test.ts)

### 1. 痛点根因与客观事实证据 (Evidence & Root Cause)
1. **多选状态在按下的瞬间被销毁 (`BlockEditor.tsx:550-557`)**：
   - 用户通过框选或 Shift/Ctrl 点击选中多张卡片后，鼠标在任意选中的卡片标题栏按下时，`startDragBlock` 未检查当前是否已处于多选态，直接执行了 `dragGroupMembers.current = []; setSelection([id]);`，导致按下鼠标的瞬间多选全部丢失，退化为单卡片。
2. **多卡片拖拽增量数学计算振荡抖动 (`BlockEditor.tsx:451-456`)**：
   - 原分组位移计算为 `dx = Math.round(newX) - block.x; moveBlockTo(m.id, m.ox + dx, m.oy + dy);`；
   - 这里的 `m.ox` 是起拖时的静态初始坐标，而 `block.x` 每一帧在 `moveBlockTo` 后都被动态更新。将一帧的单步增量 `dx` 加到最初的基底 `m.ox` 上，导致第二帧坐标在“新位置”与“回弹位置”之间剧烈跳跃振荡，视觉体验崩溃。
3. **框选碰撞检测高度硬编码缺陷 (`BlockEditor.tsx:497-502`)**：
   - 框选范围判断硬编码为 `b.y + 80 > rect.top && b.y < rect.bottom`；
   - 当卡片拉伸为 300px/500px 时，用户在卡片中下半部分画框完全无法命中卡片。
4. **导览弹窗遗留技术补丁口吻 (`OnboardingTour.tsx:43`)**：
   - 步骤 2 弹窗描述中包含技术排查遗留短语 `卡片垂直智能避让排布，杜绝重叠！`，语言偏向内部开发自查与补丁更新说明，不符合企业级产品规范。

### 2. 决策方案与系统实现架构 (Decisions & Implementation)
1. **多选动力学与累计位移引擎 (Rigid Body Group Drag Engine)**：
   - 拖拽启动时记录锚点卡片的初始基准 `dragOriginPos.current = { x: block.x, y: block.y }`；
   - 鼠标滑动时计算全过程累计位移 `totalDx = Math.round(newX) - dragOriginPos.current.x`，严格保持所有被选卡片的刚体相对间距，彻底消除振荡；
   - 拖拽吸附（Snap）过滤：从候选吸附卡片集合中剔除所有处于当前拖拽集合中的卡片（`movingIds`），仅与画布上静止的顶级卡片进行对齐，杜绝内部吸附冲突。
2. **符合行业标杆（Figma / Miro / 操作系统）的选择与拖拽交互闭环**：
   - 当点击已多选卡片时：`mousedown` 保留多选并准备批量拖拽；若用户仅点击未移动（`!dragHasMoved`），在 `mouseup` 时才收敛选择为单卡片；若用户拖动，则完整保持多选态；
   - 支持 Shift / Ctrl / Cmd 增量框选（`selectionBoxIsAdditive`）；
   - 升级为严密 2D AABB 矩形交叉判定：`b.x < rect.right && (b.x + bWidth) > rect.left && b.y < rect.bottom && (b.y + bHeight) > rect.top`。
3. **导览文案面向客户精细化打磨**：
   - 将 Step 2 文案调整为：`实现无缝的敏捷研发流转！`；
   - 全量 5 步导览导出 `TOUR_STEPS` 纳入自动化测试回归断言。

### 3. 产出与验收度量 (Verification Baseline)
- **自动化测试**：新增 `tests/components/BlockMultiSelectDrag.test.ts`，18 套测试套件、212 项用例 100% 绿色通过；
- **生产构建**：Next.js 全量 38 条路由打包通过；
- **线上部署**：推送到 Vercel 生产环境，在 `https://blockos.hiakkocv.xyz` 实测验证。

---

## ADR-027: 双端职责分离式移动端适配架构与章节大纲引擎 (Dual-Workspace Mobile Adaptation & Chapter Outline Engine)

- **日期**：2026-10-16
- **决策状态**：已全面落地、验证通过并推送到生产环境
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/components/BlockOSApp.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockOSApp.tsx)
  - [src/components/DesktopWorkspace.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/DesktopWorkspace.tsx)
  - [src/components/mobile/MobileWorkspace.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/mobile/MobileWorkspace.tsx)
  - [src/lib/document-outline.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/document-outline.ts)
  - [src/hooks/useMobileDocuments.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/hooks/useMobileDocuments.ts)
  - [docs/mobile-reading.md](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/docs/mobile-reading.md)

### 1. 痛点根因与客观事实证据 (Evidence & Root Cause)
1. **小屏操作 2D 画布的天然局限**：
   - 手机屏幕窄小，强行在移动端运行 2D 无限画布会导致双指缩放误触、平移拖拽卡顿、Block 尺寸变形等问题；
   - 移动端用户核心需求是便捷查阅、继续阅读上一次章节、轻量修正错别字与随时记录灵感（随手记），而非复杂的自由排版与多卡片拓扑编排。
2. **多端数据一致性与坐标防破坏刚性诉求**：
   - 手机端进行文字编辑或追加内容时，严禁破坏电脑端已排布好的 2D 坐标 (`x, y`)、卡片宽高尺寸以及父子嵌套关系。

### 2. 决策方案与系统实现架构 (Decisions & Implementation)
1. **双工作台物理拆分与零水合闪烁分流**：
   - 电脑端完整保留 [DesktopWorkspace.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/DesktopWorkspace.tsx)（自由画布、鹰眼地图、多选拖拽、AI 助手）；
   - 手机端使用独立打造的 [MobileWorkspace.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/mobile/MobileWorkspace.tsx)（目录、分章阅读、章节整理、轻编辑、随手记）；
   - 采用 `useSyncExternalStore` + `matchMedia` 分流，服务端渲染返回安全占位骨架，消灭 Hydration Mismatch。
2. **智能大纲分章引擎与数据不丢弃保障 (`document-outline.ts`)**：
   - 支持显式配置的 `page.chapters`；未配置时根据标题层级、父子层级和 Group 分组自动生成阅读目录；
   - 任何未归属于章节的卡片自动聚合至「未分章内容」，确保 100% 数据不被隐藏或丢弃。
3. **坐标零破坏与底部智能追加**：
   - 手机端正文编辑仅更新 Block 的 `content` 与 `title`；
   - 追加新内容与随手记时，自动探查画布最底部坐标并在 `bottom + 60` 处生成新 Block，电脑端排版井然有序。
4. **离线草稿缓冲与版本冲突防御 (`useMobileDocuments.ts`)**：
   - 发送前本地 `localStorage` 前置落盘暂存；
   - 遇到并发编辑 409 冲突时，严格保留本地草稿并提示合并，坚决不盲目覆盖。

### 3. 产出与验收度量 (Verification Baseline)
- **自动化测试**：22 套测试套件、226 项测试用例 100% 绿色通过；
- **生产构建**：Next.js 全量 38 条路由编译打包通过；
- **线上部署**：推送到 Vercel 生产环境，在 `https://blockos.hiakkocv.xyz` 实测验证。

---

## ADR-028: 飞书风格多维分类菜单重构与高亮/倒计时/书签/Mermaid四大多维组件落地 (Lark-Style Block Categorization & Four Multi-Dimensional Interactive Blocks)

- **日期**：2026-10-16
- **决策状态**：已全面落地、验证通过并推送到生产环境
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/lib/block-categories.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/block-categories.ts)
  - [src/components/CommandMenu.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/CommandMenu.tsx)
  - [src/components/BlockEditor.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockEditor.tsx)
  - [src/components/BlockRenderer.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/BlockRenderer.tsx)
  - [src/components/blocks/CalloutBlock.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/blocks/CalloutBlock.tsx)
  - [src/components/blocks/CountdownBlock.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/blocks/CountdownBlock.tsx)
  - [src/components/blocks/BookmarkBlock.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/blocks/BookmarkBlock.tsx)
  - [src/components/blocks/MermaidBlock.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/blocks/MermaidBlock.tsx)
  - [src/lib/document-outline.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/document-outline.ts)
  - [src/components/mobile/MobileBlockContent.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/mobile/MobileBlockContent.tsx)
  - [tests/components/LarkBlocksAndCategories.test.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/tests/components/LarkBlocksAndCategories.test.ts)

### 1. 痛点根因与客观事实证据 (Evidence & Root Cause)
1. **组件查找成本与分类缺失**：
   - 原画布 Block 菜单采用扁平单列长列表，随着 Block 种类扩充到 10+ 种，右键菜单过长且难以快速定位；
   - 用户参考飞书 (Lark) 产研协同场景，提出借鉴其功能分类矩阵与高频敏捷模块，提升创作和编排效率。
2. **缺乏多维关键信息表达容器**：
   - 团队交付紧盯发布里程碑时，缺少醒目的实时倒计时看板组件；
   - 架构设计、状态机和流程拆解依赖外部截图或冗长文字，缺少由 Mermaid 驱动的原生图表代码即时渲染能力；
   - 外部原型/文档引用退化为纯文本超链接，缺乏具有 Favicon、Host 域名、标题、描述与一键复制能力的网页书签卡片；
   - 核心风险与交付前提无法形成视觉强提示，缺少多语义（提示/注意/阻断/达成/洞察）的高亮警示块。

### 2. 决策方案与系统实现架构 (Decisions & Implementation)
1. **飞书多维分类菜单体系与顶层工具栏极净化 (`block-categories.ts`, `CommandMenu.tsx`, `BlockEditor.tsx`)**：
   - 建立 4 大标准分类：
     - **基础排版** (`basic`): 文本、待办、引用、折叠；
     - **核心与数据** (`data`): 代码、表格、网页书签、LaTeX公式；
     - **可视化与绘图** (`visual`): 思维导图、架构流程图、自由白板、多媒体；
     - **敏捷小组件** (`widget`): 高亮提示、冲刺倒计时；
   - **顶层快捷工具栏极净化**：依据用户反馈，顶部工具栏缩略至仅保留基础排版 4 大核心操作（`正文`、`待办`、`引用`、`折叠`），其他高级组件全部收敛到「更多组件」中居中唤出；
   - **分割线归位文本 Block**：分割线不再作为奇怪的独立悬浮 Block 存在，从添加 Block 菜单彻底剥离；直接集成至 `TextBlock.tsx` 工具栏中（提供一键插入分割线 `---` 按钮），保持文档流的自然连续性，同时对历史已有数据保持只读兼容；
   - 支持实时模糊搜索、分类 Tab 快速过滤、上下键循环导航与 Enter 回车确认。
2. **四大高频多维互动组件实现与 Mermaid 语法排障**：
   - **架构流程图 (`MermaidBlock`) 语法严密性与热自愈**：
     - 排障根因：节点标签中存在括号斜杠（如 `Client[客户端 (Web / Mobile)]`）时未包裹英文双引号，导致 Mermaid 词法解析器误将 `(` 识别为圆角形状开始语法触发致命报错 `got 'PS'`；
     - 修复方案：全面采用严格双引号包裹（`Client["客户端 (Web / 移动端)"]`）；在 `MermaidBlock.tsx` 中提供挂载期历史旧草稿正则热自愈；提供源码模式下快速模板切换条（架构流向图、协作时序图、研发状态机）以及语法报错时的「恢复标准模板」一键容错按钮；
   - **高亮警示块 (`CalloutBlock`)**：预设 5 种色彩语义（info/blue, warning/amber, danger/rose, success/emerald, purple），支持 Emoji 图标自由切换与 Markdown 多行编辑；
   - **冲刺倒计时 (`CountdownBlock`)**：自适应天/时/分/秒数字翻牌器，实时心跳跳动，支持点击配置目标日期与时间，超期时自动呈现已达成/已过期 Badge；
   - **网页外链书签 (`BookmarkBlock`)**：解析并高亮域名 Host，集成「复制链接」与「新标签页打开」快捷按钮，支持一键切换行内编辑模式更新标题与描述。
3. **双端大纲对齐与移动端阅读零破坏**：
   - 升级 `document-outline.ts` 中的 `blockTitle`，确保四大新组件在侧边大纲、手机端章节目录中均具备精准自解释标题；
   - 升级 `MobileBlockContent.tsx` 与 `MobileEditors.tsx`，手机端无缝呈现 Callout 高亮盒、倒计时目标节点、书签卡片与 Mermaid 语法查看，并在不改变电脑端 2D 坐标系的前提下支持移动端轻量修改。

### 3. 产出与验收度量 (Verification Baseline)
- **自动化测试**：23 套测试套件、235 项单元与集成测试用例 **100% 绿色通过**；
- **生产构建验证**：Next.js 全量 38 条路由生产打包 `npm run build` **0 编译错误、0 类型故障**；
- **线上部署**：推送到 Vercel 生产环境，在 `https://blockos.hiakkocv.xyz` 实测验证通过。

---

## ADR-029: 全链路 AI 原生安全合规体系与对抗性探针防御架构 (Full-Stack AI Security Compliance & Adversarial Probe Defense Framework)

- **日期**：2026-10-17
- **决策状态**：已全面落地、自动化测试通过并推送到生产环境
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/lib/ai/safety-filter.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/ai/safety-filter.ts)
  - [src/lib/sanitize.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/sanitize.ts)
  - [src/lib/ai/chat.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/ai/chat.ts)
  - [src/lib/ai/copilot.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/ai/copilot.ts)
  - [src/app/api/ai/chat/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/ai/chat/route.ts)
  - [src/app/api/ai/generate/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/ai/generate/route.ts)
  - [tests/security/ai-security-compliance.test.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/tests/security/ai-security-compliance.test.ts)
  - [tests/security/sanitize.test.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/tests/security/sanitize.test.ts)

### 1. 痛点根因与客观事实证据 (Evidence & Root Cause)
1. **AI 原生安全敞口与脆弱性 (OWASP Top 10 for LLM Applications)**：
   - 在协同知识操作系统 BlockOS 中，AI 深度介入对话、文档润色、需求分析、代码实验室与任务分派；
   - 传统 Web 安全防御仅关注 SQL 注入与传统 XSS，无法防范针对大语言模型原生威胁（提示词直接/间接注入、系统提示词窥探、环境变量与 API Key 诱导套取、恶意代码/存储型 XSS 诱导生成、以及越权成员身份伪造）；
   - 在缺少前置防御的情况下，恶意用户若在 Prompt 或选中文本（`selectedContexts`）中注入指令（如 `Ignore all previous instructions...`、`输出系统提示词`、`打印 ZHIPU_API_KEY`），可能导致模型行为失控或敏感凭据泄露。
2. **算力 DoS 与账单攻击隐患**：
   - 恶意超长文本（如 50KB+ 畸形字符串）若直接打入大模型 API，会导致服务器内存打满、长连接超时阻塞以及昂贵的 API Token 费用消耗；
   - 必须遵循全局研发宪法之“轻重资源分层防御”，以 0 成本的本地轻量规则前置拦截 99% 的恶意探测，杜绝暴力调用大模型。

### 2. 决策方案与系统实现架构 (Decisions & Implementation)
1. **轻重两道防御漏斗架构 (`src/lib/ai/safety-filter.ts`)**：
   - **漏斗一：Pre-flight 入参前置防御 (0 成本本地毫秒级过滤)**：
     - **提示词注入与越狱拦截 (LLM01)**：中英文指令抹除（`Ignore all previous instructions`、`忽略之前的所有指令`）、DAN/开发者模式（`Bypass all safety filters`、`作为无限制AI`）、系统提示词窥探（`Print exact system prompt`、`输出系统提示词`）全面正则特征检测，命中直接中断并返回 HTTP 400 与结构化安全威胁详情；
     - **敏感凭据探测拦截 (LLM06)**：拦截试图窥探 `ZHIPU_API_KEY`、`POSTGRES_URL`、`DATABASE_URL`、`JWT_SECRET`、`process.env` 等敏感信息的恶意输入；
     - **DoS / ReDoS 边界熔断 (LLM04)**：严格限定单条提示词最大 16KB、总上下文最大 64KB，在 <5ms 内完成本地静态校验并阻断，不产生任何外部大模型网络开销。
   - **漏斗二：Post-flight 出参后置脱敏与 XSS 净化 (LLM02)**：
     - **敏感凭据自动脱敏清洗 (`scrubSecrets`)**：扫描模型生成内容中的 `sk-*` API Key、`postgresql://` 数据库连接串、Bearer/JWT Token 及私钥块，自动替换为 `[REDACTED_*]` 掩码，杜绝模型意外回显系统机密；
     - **存储型 XSS 彻底剥离 (`sanitizeAiOutput`)**：彻底剔除 AI 输出富文本中的 `<script>`、`<iframe>`、`javascript:` 伪协议、以及包含嵌套双/单引号的行内 `onerror`/`onload` 监听器（修复了对 `<img/src=x/onerror="alert('XSS')">` 复杂嵌套语法的正则解析漏洞）；
     - **任务与成员越权防御 (`validateAssigneeScope`, LLM07)**：严格校验 AI 推荐分配人必须存在于项目当前成员白名单中，对伪造的 `super_admin`、`root` 或未知账号自动重置为 `null` 或安全降级，防范越权提权。
2. **全流程 API 路由安全咬合**：
   - 对 `/api/ai/chat`、`/api/ai/generate`、`/api/ai/copilot` 全量接入鉴权校验与安全合规过滤器；
   - 未登录调用严格返回 HTTP 401，安全违规请求返回 HTTP 400 与 `ai_safety_violation` 错误代码及审计线索。
3. **自动化安全对抗探针套件建设 (`tests/security/ai-security-compliance.test.ts`)**：
   - 建立覆盖 OWASP Top 10 for LLMs 5 大核心维度（提示词注入、敏感凭据窃取、存储型 XSS、越权分配、DoS 边界）的 26 项端到端对抗性自动化测试用例，纳入团队持续集成基线。

### 3. 产出与验收度量 (Verification Baseline)
- **自动化测试**：24 套测试套件、261 项测试用例（新增 26 项安全探针测试）**100% 绿色通过**；
- **生产构建验证**：Next.js 全量 38 条路由生产打包 `npm run build` **0 编译错误、0 类型故障**；
- **线上部署**：推送到 Vercel 生产环境，在 `https://blockos.hiakkocv.xyz` 实测验证通过。

---

## ADR-030: 外部智能体无缝集成体系 (Open API / MCP Server / API Key) 与内置 AI 工具调用拓展 (Sub-Block & Hierarchy Tool-Calling)

- **日期**：2026-10-17
- **决策状态**：已全面落地实施、26 套自动化测试通过、Next.js 生产构建完成、Playwright 真机 E2E 验证闭环
- **参与决策人**：用户 (Architect & Decision Maker), Antigravity AI Pair Engineer
- **关联文件**：
  - [src/lib/db.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/db.ts)
  - [src/lib/api-keys.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/api-keys.ts)
  - [src/lib/auth-utils.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/lib/auth-utils.ts)
  - [src/middleware.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/middleware.ts)
  - [src/app/api/open/keys/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/open/keys/route.ts)
  - [src/app/api/open/v1/canvas/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/open/v1/canvas/route.ts)
  - [src/app/api/open/v1/blocks/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/open/v1/blocks/route.ts)
  - [src/app/api/open/v1/mcp/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/open/v1/mcp/route.ts)
  - [src/app/api/ai/command/route.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/app/api/ai/command/route.ts)
  - [src/components/CommandPalette.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/CommandPalette.tsx)
  - [src/components/DesktopWorkspace.tsx](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/src/components/DesktopWorkspace.tsx)
  - [tests/api/external-agent-mcp.test.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/tests/api/external-agent-mcp.test.ts)
  - [tests/components/ai-command-subblock.test.ts](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/tests/components/ai-command-subblock.test.ts)
  - [tests/e2e-ai-command-subblock.js](file:///d:/Akko的项目文件/01_AI智能体与创新竞赛/BLOCKOS-with-taoke/tests/e2e-ai-command-subblock.js)

### 1. 痛点根因与客观事实证据 (Evidence & Root Cause)
1. **外部 Agent 接入阻断 (0 编程调用通道)**：
   - 过去 BlockOS 的鉴权体系 100% 依赖浏览器端生成的 HMAC Cookie / NextAuth 会话 Cookie，外部独立 Agent（如 Claude Desktop、Cursor、LangChain、AutoGPT 或用户自研脚本）无法使用标准的 API Token 访问系统；
   - 缺少符合业界开放协议标准的接口层，外部 Agent 既无法读取当前画布的树状 Block 拓扑，也无法以机器友好的方式在画布上创建或编排 Block。
2. **内置 AI 工具调用维度狭窄 (Tool-Calling Capability Deficit)**：
   - 用户明确询问：“现在软件里面是有内置 AI 的，这 AI 能对软件中的功能进行调用吗？例如创建多个 Block，自动将 Block 设置为子 Block 之类的”；
   - 排查发现原内置 AI 指令系统（`CommandPalette.tsx` 与 `/api/ai/command`）仅支持单平铺卡片的 `createBlock`、`deleteBlock`、`updateBlock` 和 `highlightBlocks`，底层完全未暴露对 `parentId` 的感知能力，无法理解“父子嵌套”、“将某卡片挂载为子卡片”、“批量创建需求与子卡片”等高阶层级操作。

### 2. 决策方案与系统实现架构 (Decisions & Implementation)
1. **API Key 安全鉴权体系与路由通行中间件**：
   - **底层数据存储 (`src/lib/db.ts`)**：新增 `api_keys` 表与 `idx_api_keys_hash`、`idx_api_keys_user` 索引；
   - **安全凭证引擎 (`src/lib/api-keys.ts`)**：采用 `bk_live_<64-hex>` 格式，入库前经 SHA-256 摘要加盐防泄漏存储，支持权限细分（`read`, `write`, `admin`）、过期时间控制与即时吊销 (`revokeApiKey`)；
   - **中间件放行与多源鉴权 (`src/middleware.ts` & `src/lib/auth-utils.ts`)**：重构 `getUserId(req)`，优先解析 `Authorization: Bearer <API_KEY>`，无缝兼容外部 Agent 脚本调用与浏览器用户 Session。
2. **外部 Agent 开放协议层 (Open API & Model Context Protocol MCP)**：
   - **Open REST API 体系**：
     - `GET /api/open/v1/canvas`：返回画布所有 Blocks 并递归构建树状拓扑 `blockTree`；
     - `POST /api/open/v1/canvas`：批量原子同步与写入 Blocks；
     - `POST /api/open/v1/blocks`：创建单个 Block，支持指定 `parentId` 并自动计算侧翼排布坐标；
     - `PATCH /api/open/v1/blocks`：增量更新 Block，支持更新 `parentId` 或传入 `null` 解除父子关系；
     - `DELETE /api/open/v1/blocks`：删除 Block 时自动将名下子 Block 提升为根层级，杜绝孤儿卡片悬空。
   - **标准 MCP JSON-RPC 2.0 Server (`/api/open/v1/mcp`)**：
     - 实现 MCP 协议规范，暴露 `initialize`、`tools/list` 与 `tools/call` 三大核心方法；
     - 注册 6 大专属生产级工具：`read_canvas`、`create_block`、`set_subblock`、`batch_create_hierarchy`、`create_link`、`delete_block`，支持与 Claude Desktop、Cursor 等现代智能体平台一键配置连接。
3. **内置 AI 工具调用全链路升级 (Hierarchy & Sub-Block Tool-Calling)**：
   - **大模型 Prompt 增强 (`src/app/api/ai/command/route.ts`)**：系统提示词扩充支持 `batchCreateHierarchy`、`setParent`、`outdentBlock`、`createSubBlock`、`createLink`；
   - **前端指令分发引擎 (`src/components/CommandPalette.tsx`)**：
     - 扩展 `Operation` 接口与关键词匹配器；
     - 实现 `batchCreateHierarchy` 本地执行器：一键生成 1 个父 Block 并计算其右侧侧翼坐标自动生成 N 个子 Block；
     - 实现 `setParent` 与 `outdentBlock`：智能修改 Store 内部的 `parentId` 与物理坐标；
     - 增加针对口语化指令的本地即时正则识别器（无需等待云端大模型毫秒级极速响应）；
   - **全键盘快捷键接入 (`src/components/DesktopWorkspace.tsx`)**：为桌面工作区增加 `Ctrl+K` / `Cmd+K` 全局监听，与工具栏「AI 助手」按钮双通道触发。

### 3. 产出与验收度量 (Verification Baseline)
- **自动化测试**：26 套测试套件、275 项用例（新增 10 项外部 Agent/MCP 测试与 4 项内置 AI 子 Block 指令测试）**100% 绿色全通**；
- **生产构建验证**：Next.js 全量 42 条路由生产打包 `npm run build` **0 编译错误、0 类型故障**；
- **浏览器 E2E 实测**：通过 Playwright 模拟用户在真机浏览器中唤起 AI 助手，键入自然语言指令“创建1个需求Block，并创建2个子Block”回车执行，成功渲染并捕获多层父子卡片截图证据。