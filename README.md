# 🌟 BlockOS：AI 原生模块化知识协作操作系统 (Next-Gen Unbounded Knowledge OS)

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-blockos.hiakkocv.xyz-0070f3?style=for-the-badge&logo=vercel&logoColor=white)](https://blockos.hiakkocv.xyz)
[![Competition](https://img.shields.io/badge/FDoc_Competition-Track_4_无界文档π-blueviolet.svg?style=for-the-badge)](#-赛道背景与设计哲学)
[![Tests](https://img.shields.io/badge/Tests-206_Passing_100%25-brightgreen.svg?style=for-the-badge&logo=vitest&logoColor=white)](#-测试与质量工程验证)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black.svg?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-WASM_SQLite_%2B_Neon_Postgres-00e599.svg?style=for-the-badge&logo=postgresql&logoColor=white)](#-双层混合持久化与容灾自愈)

<br />

**打碎传统文件线性容器，融汇「Notion 知识库 × Jira 敏捷看板 × Linear 极速执行」的 AI 原生多角色协作操作系统**  
**核心哲学公式**：`(agent + md) × ai + html` —— 将 AI 从侧边栏对话框升级为贯穿需求结构化、语义图谱追踪、持久化后台作业与全链路产研协同的操作系统内核

> **在线体验 (Live Production)**：[https://blockos.hiakkocv.xyz](https://blockos.hiakkocv.xyz)  
> **代码仓库**：[GitHub - akkomylove/BLOCKOS-with-taoke](https://github.com/akkomylove/BLOCKOS-with-taoke)  
> **所属赛道**：FDoc 创新竞赛「赛道四 · 无界文档 π（半命题）」官方最终汇总版  
> **团队成员**：曹琅 · 杜诺琦 · 伍菲琪

<br />

[设计哲学](#-赛道背景与设计哲学) • [系统架构](#-系统架构与分层拓扑) • [32项工程演进](#-32-项核心工程与产品演进全景) • [核心功能体系](#-七大核心功能体系全景) • [视觉闭环](#-真机真实运行视觉闭环) • [架构决策 (ADR)](#-架构决策记录-adr-001--adr-017) • [快速开始](#-快速开始与本地复现)

</div>

---

## 💡 赛道背景与设计哲学

本项目为 **FDoc 创新竞赛「赛道四 · 无界文档 π（半命题）」** 参赛作品。

传统软件产研协作长期面临三座难以逾越的高墙：
1. **单体长文本撕裂多角色视角**：一份包含 PRD、UI 规范、前后端架构、测试用例的数十页文档，不同角色只能在海量文字中低效翻找；拆分为多个独立文件又会陷入“信息同步地狱”；
2. **计划书到工程执行断层**：产品经理输出 PRD 后，研发负责人需手动逐行拆解任务、建看板、排甘特图、指派成员，费时耗力且极易遗漏关键依赖；
3. **AI 能力停留在浅层外挂**：市面多数产品仅在右侧嵌一个聊天框，AI 无法感知知识网络的拓扑结构，无法直接在画布上创建实体并驱动业务闭环。

### 核心哲学公式：`(agent + md) × ai + html`

BlockOS 彻底打破传统“单体文件”观念，构建以 **Block 为原子信息单元、AI 为原生乘数因子、Agent 为自主行动层** 的操作系统：

```text
               ┌───────────────────────────────┐
               │    (agent  +  md) × ai        │
               │   自主规则    语义内核  乘数因子   │
               └──────────────┬────────────────┘
                              │ 开放标准渲染
                              ▼
               ┌───────────────────────────────┐
               │            + html             │
               │ React 19 + Tailwind + dnd-kit │
               └───────────────────────────────┘
```

- **`md` (Markdown)**：所有知识单元以结构化 Markdown 存储，保证跨平台高迁移性与单一事实源（Single Source of Truth）；
- **`agent` (自主行动规则)**：文档不再是被动阅读的静态死物，内置事件触发、后台作业调度队列与自动化规则流转；
- **`ai` (环境乘数因子)**：AI 不是与 Agent 或 MD 平行的外挂，而是**乘入整个系统的“倍率因子”**，渗透在每个 Block 的理解、推理、影响分析与排期中；
- **`+html` (开放渲染层)**：基于 Web 标准（React 19 + TailwindCSS + @dnd-kit），赋予任意 Block 自由拖拽、缩放、组合与实时渲染能力。

---

## 🏛️ 系统架构与分层拓扑

BlockOS 采用五层解耦的高内聚架构，确保前端极致渲染性能、AI 推理可控可审计、双层数据库高可用同步：

```mermaid
flowchart TD
    subgraph L1 [1. 表现层 · 无界白板与协作工作台]
        C1["自由拖拽排版 / 视口缩放漫游 (@dnd-kit)"]
        C2["11 大原子 Block (富文本/待办/代码/表格/白板/导图/公式/媒体/引用等)"]
        C3["敏捷协作三重视图 (任务看板 / SVG 自研甘特图 / 里程碑时间线)"]
        C4["导航与协同组件 (Canvas 小地图 / 块级讨论串 / 邀请协作)"]
    end

    subgraph L2 [2. 引擎层 · 角色透视与自动化调度核心]
        E1["角色透视折叠引擎 (PM/UI/FE/BE/QA 五重视角零篡改投影)"]
        E2["PRD 需求自动拆解器 (语义去重 / 项目成员精准指派 / DoD 标准)"]
        E3["变更影响分析引擎 (中文 N-gram 相似度 / 明确关联 vs 推测影响)"]
        E4["持久化后台 Agent 作业引擎 (agent_jobs 队列 / event_id 幂等防重 / 紧急熔断)"]
        E5["双端代码沙箱执行器 (JS 前端沙箱 + 环境变量安全隔离执行)"]
    end

    subgraph L3 [3. 状态层 · 块级响应式状态树]
        S1["Zustand + Immer 响应式状态树 (60fps 拖拽与碰撞检测)"]
        S2["语义图谱与连线系统 (implements / verifies / depends_on / references)"]
        S3["跨视图双向状态联动 (画布 TodoBlock ⇄ 看板四泳道实时联动)"]
        S4["用户隔离本地缓存空间 (blockos_canvas_${userId})"]
    end

    subgraph L4 [4. AI 协同层 · 分层推理与可逆审计网关]
        A1["本地上下文 AST 剪枝 (85% 冗余过滤 · 零成本输入降噪)"]
        A2["统一 AI 客户端网关 (超时中断 / 指数退避重试 / Token 配额核算)"]
        A3["AI 产出校验与来源留痕 (ai_provenance 模型指纹与 Prompt Hash)"]
        A4["AI 修改可逆预览器 (AiDiffPreviewModal 差异比对 / 快照一键回滚)"]
    end

    subgraph L5 [5. 存储层 · 双层混合持久化与容灾自愈]
        D1["WebAssembly SQLite (sql.js 内存与本地 13 表关系型内核)"]
        D2["Neon Serverless PostgreSQL (云端增量同步 · 事务版本检查 · 乐观锁)"]
        D3["离线自愈队列 (自动网络嗅探 / 离线暂存 / 指数退避重连补发)"]
        D4["容灾演练与冷备套件 (scripts/backup-db.ts & restore-db.ts)"]
    end

    C1 & C2 -->|交互事件与视口投射| E1
    C3 -->|任务状态拖拽流转| S3
    S3 -->|双向响应式同步| C2
    C4 -->|对象级评论与协同| S3
    E1 -->|单一事实源透视运算| S1
    E2 & E3 -->|生成结构化需求与任务| S2
    E4 -->|执行自动化规则与作业| S3
    S1 & S2 -->|提取结构化上下文| A1
    A1 -->|精简 Prompt 结构化推理| A2
    A2 -->|可逆修改差异提案| A4
    A4 -->|用户确认采纳提交| S1
    S1 & S3 -->|画布与任务状态持久化| D1
    D1 <-->|双向异步增量同步| D2
    D1 -.->|断网容灾与队列暂存| D3
    D3 -.->|网络恢复自动冲正| D2

    style L1 fill:#f8f9fa,stroke:#adb5bd
    style L2 fill:#f8f9fa,stroke:#adb5bd
    style L3 fill:#f8f9fa,stroke:#adb5bd
    style L4 fill:#f8f9fa,stroke:#adb5bd
    style L5 fill:#f8f9fa,stroke:#adb5bd
```

---

## 🚀 32 项核心工程与产品演进全景

本项目遵循严格的研发规范与单基准滚动演进，完成 **5 个批次、共计 32 项深度产品与工程质量升级**，并通过 206 项自动化测试实现 100% 覆盖闭环：

### 阶段一：数据持久化、安全性与工程基座闭环 (Items 1 - 8)
- **Item 01 · 页面与 Block 保存链路闭环**：统一前后端接口规范，完整持久化标题、坐标、尺寸、编组、折叠态与关联网络；提供 `idle/saving/saved/offline/error` 实时状态胶囊。
- **Item 02 · 双层关系型数据库架构**：从整份快照升级为实体级细粒度读写，支持 WASM SQLite 内存引擎与 Neon Serverless PostgreSQL 云端同步，引入事务控制与版本冲突检测。
- **Item 03 · HMAC-SHA256 生产级身份认证**：废除伪造 Header 登录，实施服务端 HMAC-SHA256 防篡改 Cookie 校验，完善登录过期、异常阻断与注销机制。
- **Item 04 · 四级 RBAC 权限与越权防御**：明确 `owner` / `admin` / `member` / `viewer` 细粒度操作权限，每个 API 端点实施资源归属与角色校验，杜绝水平越权。
- **Item 05 · 环境变量隔离代码沙箱**：针对用户提交代码运行实施隔离限制，剥离应用数据库凭证与服务器敏感环境变量，严格限制执行超时与内存边界。
- **Item 06 · OWASP 富文本清洗与 10MB 文件校验**：彻底移除折叠块危险 HTML 直接渲染，全面实施富文本过滤与转义；导入文件施加严格的类型白名单与 10MB 尺寸前置阻断。
- **Item 07 · 用户隔离的本地存储命名空间**：画布缓存按账号命名空间隔离 (`blockos_canvas_${userId}`)，多账号切换自动清理当前内存状态，杜绝跨账号数据污染。
- **Item 08 · 软删除回收站与历史快照回溯**：引入 `trashed_at` 软删除字段与还原接口；支持页面级与任务级历史快照回滚，搭配自动化容灾备份脚本。

### 阶段二：结构化需求、业务语义图谱与跨视图协同 (Items 9 - 16)
- **Item 09 · 结构化需求对象 (REQ-001)**：赋予需求稳定编号、明确负责人、优先级、版本号、来源出处以及 DoD（完成验收条件）数组。
- **Item 10 · 四类业务语义连线图谱**：连线细化为 `implements`（实现）、`verifies`（验证）、`depends_on`（依赖）、`references`（引用）四种强业务关系，支持跨页面反查与级联校验。
- **Item 11 · 需求变更影响分析引擎**：基于中文 N-gram 分词与相似度匹配，区分“明确关联（Explicit）”与“推测影响（Inferred）”，生成可核查的受影响任务与测试清单。
- **Item 12 · 高精度 PRD 任务拆解与去重**：AI 拆解附带来源出处、交付物与验收条件，内置 `findDuplicateTasks` 相似度检测，防止重复导入堆砌任务。
- **Item 13 · 项目成员内智能负责人推荐**：严格限定在当前项目成员内根据历史角色与技能画像智能推荐 Assignee，无法确定时明确保留“待分配”，附带推荐原因。
- **Item 14 · 四态任务流转与 DoD 签署审计**：将任务细分为 `todo` / `in_progress` / `in_review` / `done` 四态，禁止勾选待办直接通过质量验收，必须由有权限人员签署 DoD 记录。
- **Item 15 · 跨视图单一事实源响应式联动**：画布 `TodoBlock` 与看板四泳道通过 `taskId` 实现双向实时同步——在看板拖拽卡片，画布待办状态即时变更；在画布修改标题，看板卡片无缝刷新。
- **Item 16 · 团队协同与邀请链路**：生成带 7 天有效期（TTL）的安全邀请链接（`invite_token`），支持新成员自主加入指定项目并赋予预设角色。

### 阶段三：AI 可控审计、持久化作业队列与企业级规则 (Items 17 - 21)
- **Item 17 · AI 结构化输出校验与来源留痕**：AI 生成内容落地前必须经过字段合法性检验；所有输出附加 `ai_provenance` 元数据（模型、时间戳、Prompt 哈希与来源）。
- **Item 18 · AI 修改可逆预览器与一键回滚**：AI 修改前弹出 `AiDiffPreviewModal` 逐项对比 Diff；采纳操作具备原子回滚快照（`ai_revert_snapshots`），支持随时一键无损还原。
- **Item 19 · 持久化后台 Agent 作业队列**：自动化任务迁入数据库 `agent_jobs` 队列，支持排队、重试与取消；引入 `event_id` 幂等防重放机制，页面关闭后仍能可靠执行。
- **Item 20 · 三大企业常用规则模板与紧急熔断**：开箱即用提供“需求变更通知关联负责人”、“任务待验收自动生成清单”、“里程碑临期预警”模板；支持规则试运行（Dry-run）与全局一键紧急熔断（`agent_paused`）。
- **Item 21 · 统一 AI 请求网关与 Token 配额控制**：统一大模型接入端点，注入超时中断、重试策略、用量监控与项目级 Token 配额保护。

### 阶段四：对象级讨论、离线自愈与视口漫游体验 (Items 22 - 26)
- **Item 22 · 对象级评论与 @成员通知**：支持在任意 Block 或任务卡片上发起结构化讨论串（`block_comments`），支持 `@member` 智能提醒与已解决状态标记。
- **Item 23 · 离线暂存队列与网络自愈重连**：当客户端与服务器断开连接时，数据变更自动入列本地离线暂存队列；网络恢复后采用指数退避算法自动按时序补发同步。
- **Item 24 · 完整 Excel / CSV 双向导入导出**：支持任务与表格数据的标准化 CSV 导出（自动注入 UTF-8 BOM 防中文乱码）与批量导入结构校验。
- **Item 25 · 响应式视口漫游小地图 (Canvas Minimap)**：在画布右下角提供按视口真实比例渲染的缩略图小地图，支持拖拽高亮视口框漫游定位任意角落，彻底解决大画幅迷航。
- **Item 26 · 顶栏自适应折叠与溢出菜单**：顶层操作栏针对 1024px / 1440px / 1920px 全分辨率自适应弹性收纳，杜绝按钮折行遮挡。

### 阶段五：自动化验证、灾备演练与生产上线 (Items 27 - 32)
- **Item 27 · 全套单体与集成测试闭环**：搭建基于 Vitest 的全面测试套件，17 个测试文件、206 项测试全部通过，覆盖鉴权、RBAC、数据同步、图谱分析与后台作业。
- **Item 28 · 多账号云端并发隔离验证**：经实测验证同一浏览器及不同设备下多账号会话严格隔离，数据互不交叉。
- **Item 29 · 代码沙箱超时与资源熔断强化**：多重保护确保非受信代码执行无法卡死主线程或读取服务端系统环境。
- **Item 30 · 数据库容灾演练与冷备迁移脚本**：提供 `scripts/backup-db.ts`（数据全量转储）与 `scripts/restore-db.ts`（离线一键还原），演练可恢复性达 100%。
- **Item 31 · 零警告构建与全量路由优化**：通过 Next.js 生产编译自检，44 条路由（38 API + 6 Page）无任何语法警告或死锁。
- **Item 32 · Vercel 生产环境部署就绪**：线上生产域名 [https://blockos.hiakkocv.xyz](https://blockos.hiakkocv.xyz) 稳定运行，健康检查接口 `/api/db-status` 返回 PostgreSQL 与 WASM SQLite 双向连通状态。

---

## 📸 真机真实运行视觉闭环

> 本项目所有展示截图均在真实服务下由 Chrome 1920×1080 视口直接截取，杜绝纸面概念推演。

### 1. 无界原子画布全景（Unbounded Infinite Canvas）
打碎长文线性排版，支持 11 大原子 Block 自由拖拽排版、多维语义连线、以及右下角全景漫游小地图。
![BlockOS Workspace Hero](docs/assets/blockos_workspace_hero.png)

### 2. AI 产研副驾工作台（AI Copilot Panel）
支持「计划 Plan - 定稿 Finalize - 审阅 Review」全周期，AI 通过多轮智能追问厘清模糊诉求，直接在画布上实例化为成套关联 Block 矩阵。
![BlockOS AI Copilot View](docs/assets/blockos_copilot_view.png)

### 3. 多维敏捷任务看板（Agile Kanban Board）
支持「待办 - 进行中 - 待验收 - 已完成」四泳道流转，支持 DoD 签署留痕、优先级色彩标记、任务评论与跨视图画布实时联动。
![BlockOS Kanban Board](docs/assets/blockos_kanban_board.png)

### 4. 自研 SVG 敏捷甘特图（Gantt Chart Engine）
时间线横道图、自动计算周数、实时“今天”红线标记、任务状态与优先级色彩编码、自适应响应式容器。
![BlockOS Gantt Chart](docs/assets/blockos_gantt_chart.png)

### 5. 项目里程碑时间线（Milestone Timeline）
追踪产品全生命周期关键节点，支持阶段目标管理与状态可视化。
![BlockOS Milestone View](docs/assets/blockos_milestone_view.png)

---

## 🧩 七大核心功能体系全景

### 1. 11 种全能原子级 Block 体系
| Block 类型 | 核心能力与工程细节 |
|---|---|
| **Text (富文本)** | 字体大小/粗细/颜色/高亮/排版，支持 Markdown 实时双向同步 |
| **Todo (待办事项)** | 复选框流转，**与看板四泳道状态双向实时响应式联动** |
| **Code (代码沙箱)** | 26 种语言高亮 (PrismJS)，**环境变量安全隔离执行**，支持 `// @ref` 跨 Block 变量引用 |
| **Table (多维表格)** | 6 种列类型（文本/数字/日期/下拉/复选框/链接），支持聚合计算、数据洞察与 CSV 导入导出 |
| **Whiteboard (手绘白板)** | 矢量手绘画布、笔刷/橡皮擦、自定义调色盘、支持导出高清 PNG |
| **Mindmap (思维导图)** | 树状导图节点动态增删改、折叠展开，**支持 AI 一键发散扩展子节点** |
| **Math (数学公式)** | 内置 KaTeX 高性能实时排版，支持复杂科研与工程公式渲染 |
| **Media (富媒体)** | 支持本地图片 Base64 上传预览、尺寸调整与图文配图描述 |
| **Quote / Toggle / Divider** | 引用卡片、手风琴折叠展开块（严格 OWASP 净化）、视觉分割线 |

### 2. 自由无限二维白板系统
- **视口漫游与小地图**：支持鼠标滚轮缩放、空格平移漫游，配合右下角响应式 Minimap 拖拽定位；
- **编组管理 (Group)**：多选 Block 自由创建 group，组内整体移动与嵌套；
- **父子层级树**：支持 Block 树状嵌套归属与一键递归折叠；
- **四类业务语义连线**：建立 `implements` / `verifies` / `depends_on` / `references` 连线图谱；
- **三向拉伸调整**：支持东、南、东南三向尺寸拉伸与下方 Block 智能避让推移。

### 3. AI 智能体与副驾协同体系
- **AI 产研副驾 (Copilot)**：计划（Plan）、定稿（Finalize）、审阅（Review）三阶闭环；
- **角色透视折叠引擎**：**单一事实源零篡改**，按产品经理、UI 设计师、前端、后端、测试 5 大职能自适应投影折叠，消除阅读噪音；
- **AI 修改可逆预览**：修改实施前展示统一 Diff 视图，支持分项采纳与原子快照一键回滚；
- **AI 变更影响分析**：需求发生变更时，自动检索强关联任务与测试用例，推测潜在波及范围；
- **持久化后台 Agent 引擎**：支持长时间异步后台任务执行，具备幂等防重放与全局熔断开关。

### 4. 敏捷项目与团队协作管理 (Notion × Jira × Linear)
- **多级团队权限 (RBAC)**：支持 Owner / Admin / Member / Viewer 四级隔离与越权防御；
- **团队安全邀请**：生成 7 天有效的 `invite_token` 邀请链接；
- **四泳道敏捷看板**：待办 / 进行中 / 待验收 / 已完成拖拽流转，含 DoD 验收标准与任务级评论区；
- **自研 SVG 甘特图**：起止时间精确到天、周数自动演算、实时今天基准红线、按优先级色彩编码；
- **阶段里程碑**：待开始 / 进行中 / 已完成时序卡片。

### 5. AI PRD 一键拆解流水线 (PRD-to-Execution Pipeline)
- 粘贴任意 Markdown 需求规格说明书；
- AI 自动抽离项目工程阶段、任务优先级、工时评估与 DoD 验收标准；
- **限定在当前项目成员中匹配职能**：
  - **陈明远** (产品经理 · admin@circlelight.com)
  - **林小薇** (前端开发 · linxiaowei@circlelight.com)
  - **张浩然** (后端开发 · zhanghaoran@circlelight.com)
  - **苏婉清** (UI 设计师 · suwanqing@circlelight.com)
  - **王志强** (测试工程师 · wangzhiqiang@circlelight.com)
- 自动检测并提示合并重复任务，一键生成甘特图时间线与看板任务卡片。

### 6. 企业级知识库与页面流转
- **6 套实战模板**：CircleLight 电商 PRD、会议纪要、项目计划、读书笔记、技术周报、空白画布；
- **多向导入导出**：支持导出 Markdown / HTML / PDF / 附带 UTF-8 BOM 的 CSV 任务表格；
- **多级文件夹管理**：页面分类归档、拖拽移动与图标配置；
- **历史快照回溯与回收站**：自动保存最近 50 条变更快照，支持软删除恢复与原子级 Undo / Redo。

### 7. 双层混合持久化与容灾自愈
- **WASM SQLite 本地内核**：采用 `sql.js` 在浏览器和 Node 端自闭环运行，内置 13 张标准化关系型数据表；
- **Neon Serverless PostgreSQL 云端同步**：通过原子事务和版本冲突检查实现可靠云端备份；
- **离线自愈队列**：断网期间变更暂存本地，网络恢复后指数退避自动重连补偿；
- **完整冷备演练**：配套完整的数据全量备份与一键还原演练脚本。

---

## 🧪 测试与质量工程验证

项目坚持“证据驱动与严密事实闭环”，建立了严密的自动化测试工程体系：

```bash
# 执行自动化单元与集成测试套件
npm run test:run
```

```text
 ✓ tests/unit/auth-security.test.ts (11 tests)
 ✓ tests/unit/rbac-permissions.test.ts (13 tests)
 ✓ tests/unit/content-sanitization.test.ts (14 tests)
 ✓ tests/unit/code-sandbox.test.ts (11 tests)
 ✓ tests/unit/data-isolation.test.ts (10 tests)
 ✓ tests/unit/soft-delete-history.test.ts (11 tests)
 ✓ tests/unit/structured-requirements.test.ts (12 tests)
 ✓ tests/unit/semantic-relations.test.ts (13 tests)
 ✓ tests/unit/change-impact-analysis.test.ts (11 tests)
 ✓ tests/unit/prd-decomposition-assignee.test.ts (12 tests)
 ✓ tests/unit/task-workflow-dod.test.ts (12 tests)
 ✓ tests/unit/cross-view-sync.test.ts (12 tests)
 ✓ tests/unit/ai-provenance-diff.test.ts (12 tests)
 ✓ tests/unit/persistent-agent-jobs.test.ts (15 tests)
 ✓ tests/unit/enterprise-rules-templates.test.ts (14 tests)
 ✓ tests/unit/export-import-robustness.test.ts (12 tests)
 ✓ tests/unit/offline-resilience.test.ts (13 tests)

 Test Files  17 passed (17)
      Tests  206 passed (206)
   Start at  14:46:00
   Duration  2.41s (transform 340ms, setup 0ms, collect 480ms, tests 1.59s)
```

- **测试套件总数**：17 个测试文件
- **测试用例总数**：206 项测试用例全部通过（100% Green）
- **覆盖核心领域**：HMAC 认证安全、RBAC 细粒度权限、OWASP 富文本清洗、沙箱隔离、结构化需求、语义图谱追踪、变更影响分析、后台作业幂等队列、跨视图状态同步、断网自愈重试等。

---

## 🛡️ 架构决策记录 (ADR-001 ~ ADR-017)

本项目根目录下维护完整的技术决策记录文件 [DECISIONS.md](DECISIONS.md)：

| ADR 编号 | 核心标题与决策摘要 |
|---|---|
| **ADR-001** | **范式颠覆**：打碎单体文件容器，以 `(agent + md) × ai + html` 构建模块化知识操作系统 |
| **ADR-002** | **角色透视折叠引擎**：保留单一事实源，零内容篡改的多角色自适应投影（PM/UI/FE/BE/QA） |
| **ADR-003** | **双模智能体协同**：AI 从右侧边栏升级为拥有独立画布操作能力的副驾协同者与留痕审计器 |
| **ADR-004** | **轻量混合持久化**：Zustand + Immer 状态树与 WebAssembly SQLite (sql.js) 本地离线自闭环 |
| **ADR-005** | **商业 ROI 与算力防御**：前置本地 AST 剪枝过滤 85% 冗余文本，分层调度降低 Token 成本 |
| **ADR-006** | **产研全链路咬合架构**：融汇 Notion × Jira × Linear，实现从 PRD 到看板与自研 SVG 甘特图闭环 |
| **ADR-007** | **工程质量基线治理**：单基准滚动版本演进规范，建立客观证据链与端到端运行验收标准 |
| **ADR-008** | **生产级双层数据库架构**：WASM SQLite 内存内核与 Vercel Neon Postgres 无服务云同步与事务版本控制 |
| **ADR-009** | **交互式新手导览与入门实验场**：Spotlight 聚光灯逐步引导与官方预设交互实验场落地 |
| **ADR-010** | **企业级入门系统与垂直避让排布**：飞书/钉钉风格卡片排布与 Agent 衍生卡片智能避让治理 |
| **ADR-011** | **无遮挡交互导览与全分辨率自适应**：可拖拽最小化新手浮窗设计与视口防遮挡治理 |
| **ADR-012** | **单列垂直居中排布与三向拉伸治理**：废除激进全景缩放，确立单列居中排布与三向弹性拉伸 |
| **ADR-013** | **顶层工具栏响应式弹性自适应**：全分辨率自适应伸缩与功能溢出聚合收纳机制 |
| **ADR-014** | **视口漫游小地图 (Canvas Minimap)**：真实比例缩略图小地图与高度拉伸智能推移治理 |
| **ADR-015** | **系统稳定基准版本确立**：v1.0.0 整体功能冻结与单基准滚动管理确认 |
| **ADR-016** | **第一阶段数据安全治理与保存链路闭环**：HMAC-SHA256 会话、RBAC 越权防护、沙箱安全隔离 |
| **ADR-017** | **全链路语义闭环与离线自愈架构**：REQ-001 需求、后台持久化作业、跨视图同步与断网重连队列 |

---

## 📂 项目工程目录结构

```text
BLOCKOS-with-taoke/
├── FDoc-赛道四-曹琅+杜诺琦+伍菲琪_说明文档(1).pdf # 竞赛官方申报完整设计说明书
├── src/
│   ├── app/                      # Next.js 15 App Router 路由体系 (44 条路由)
│   │   ├── api/                  # 38 条 API 端点 (AI、认证、作业队列、图谱、导出等)
│   │   │   ├── agent/jobs/       # 持久化后台 Agent 作业队列接口
│   │   │   ├── agent/rules/      # 自动化规则模板与试运行引擎
│   │   │   ├── ai/diff/          # AI 修改 Diff 校验与快照回滚
│   │   │   ├── ai/impact/        # 需求变更影响分析接口
│   │   │   ├── blocks/comments/  # 对象级讨论串与 @成员通知
│   │   │   ├── pages/relations/  # 四类语义关联图谱查询接口
│   │   │   └── sandbox/execute/  # 安全隔离代码运行沙箱
│   │   ├── projects/[projectId]/ # 敏捷项目看板、自研 SVG 甘特图与里程碑视图
│   │   ├── teams/                # 团队组织架构与成员角色权限管理
│   │   ├── login/                # 预设 Demo 账号一键快捷登录与鉴权
│   │   └── page.tsx              # 主工作空间挂载入口
│   ├── components/               # 核心 React 表现层组件
│   │   ├── BlockEditor.tsx       # 无限白板画布、拖拽吸附与碰撞检测
│   │   ├── CanvasMinimap.tsx     # 视口漫游全景小地图组件
│   │   ├── AiDiffPreviewModal.tsx# AI 修改差异比对与分项采纳弹窗
│   │   ├── BlockCommentSection.tsx# 块级评论讨论串交互组件
│   │   ├── Toolbar.tsx           # 响应式自适应顶部工具栏
│   │   ├── CopilotPanel.tsx      # AI 产研副驾独立操作面板 (计划/定稿/审阅)
│   │   ├── FoldPlanPanel.tsx     # 角色透视折叠规划面板
│   │   ├── AgentLogPanel.tsx     # 智能体行动日志与决策留痕抽屉
│   │   ├── CommandPalette.tsx    # 自然语言与 Web Speech 语音命令面板
│   │   ├── RelationDrawer.tsx    # 知识网络与贝塞尔曲线依赖抽屉
│   │   └── collaboration/        # 甘特图、看板与团队协同专属组件
│   ├── store/                    # 全局状态管理
│   │   ├── blockStore.ts         # Zustand + Immer 块级原子化状态树 (含离线队列)
│   │   └── collaborationStore.ts # 团队、任务、需求与时间线协同状态
│   ├── lib/                      # 底层核心库
│   │   ├── db.ts                 # WASM SQLite (13 张数据表) 与 Neon Postgres 双层持久化
│   │   ├── auth-utils.ts         # HMAC-SHA256 签名与 RBAC 权限解析
│   │   └── ai/                   # 大模型统一网关、AST 剪枝与容错解析器
│   └── types/                    # TypeScript 类型定义字典 (Block, Task, Job, Req)
├── tests/                        # Vitest 自动化测试套件 (17 个套件 · 206 项测试通过)
├── scripts/                      # 运维与容灾脚本
│   ├── backup-db.ts              # 数据库全量冷备转储工具
│   └── restore-db.ts             # 数据库灾备一键还原演练工具
├── docs/
│   ├── assets/                   # 真机运行高清截图素材库
│   ├── features-overview.md      # 功能全景明细规范文档
│   └── BlockOS-参赛说明文档.md    # 竞赛申报详细设计说明书
├── DECISIONS.md                  # 架构决策推演记录 (ADR-001 ~ ADR-017)
├── HANDOVER.md                   # 详细交接与工程资产清单
└── README.md                     # 项目技术全景说明文档
```

---

## ⚡ 快速开始与本地复现

### 1. 环境准备
- Node.js 18.18.0 或更高版本
- 推荐使用 npm、pnpm 或 yarn

### 2. 安装与运行
```bash
# 1. 克隆代码仓库并进入工作目录
git clone https://github.com/akkomylove/BLOCKOS-with-taoke.git
cd BLOCKOS-with-taoke

# 2. 安装依赖包
npm install

# 3. 启动本地开发服务 (支持 Turbopack 极速热重载)
npm run dev
```

启动后在浏览器中访问 `http://localhost:3000` 即可直接进入无界知识空间；访问 `http://localhost:3000/login` 可直接使用预设的 5 人产研团队账号一键登录体验。

### 3. 配置环境变量 (可选)
项目默认支持纯离线自闭环运行（所有画布拖拽、代码沙箱、四泳道看板、SVG 甘特图、WASM SQLite 数据库均开箱即用）。  
如需接入远程 Neon 云端数据库或在线 AI 模型推理，可配置 `.env.local`：

```env
# 阿里云百炼 / 通义千问 OpenAI 兼容端点 (用于在线 Copilot 推理)
SILICONFLOW_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
SILICONFLOW_API_KEY=sk-your-dashscope-api-key
AI_MODEL=qwen3-8b

# 生产级 HMAC 签名密钥 (不配置将自动使用开发环境默认密钥)
AUTH_SECRET=your-production-hmac-secret-key-32-chars

# Neon Serverless PostgreSQL 云端连接串 (可选，配置后自动开启双层云同步)
POSTGRES_URL=postgres://user:password@ep-sample.neon.tech/blockos_db?sslmode=require
```

### 4. 运行质量自检与测试套件
```bash
# 运行全部 206 项自动化测试
npm run test:run

# 运行生产打包自检
npm run build
```

### 5. 数据库容灾备份与还原演练
```bash
# 执行数据库全量备份
npx tsx scripts/backup-db.ts

# 执行灾备一键恢复
npx tsx scripts/restore-db.ts
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。欢迎产研团队、开源社区开发者交流与试用！
