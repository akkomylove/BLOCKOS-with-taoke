# 🌟 BlockOS：AI 原生模块化知识协作操作系统 (Next-Gen Unbounded Knowledge OS)

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-blockos.hiakkocv.xyz-0070f3?style=for-the-badge&logo=vercel&logoColor=white)](https://blockos.hiakkocv.xyz)
[![Competition](https://img.shields.io/badge/FDoc_Competition-Track_4_无界文档π-blueviolet.svg?style=for-the-badge)](#-赛道背景与设计哲学)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black.svg?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-MCP_Ready-orange.svg?style=for-the-badge)](#-核心功能体系全景)

<br />

**打碎传统文件线性容器，融汇「Notion 知识库 × Jira 敏捷看板 × Linear 极速执行」的 AI 原生多角色协作操作系统**  
**核心哲学公式**：`(agent + md) × ai + html` —— 将 AI 从侧边栏对话框升级为贯穿需求结构化、语义图谱追踪、持久化后台作业与全链路产研协同的操作系统内核

> **在线体验 (Live Production)**：[https://blockos.hiakkocv.xyz](https://blockos.hiakkocv.xyz)  
> **代码仓库**：[GitHub - akkomylove/BLOCKOS-with-taoke](https://github.com/akkomylove/BLOCKOS-with-taoke)  
> **📖 官方使用手册**：[docs/BLOCKOS_USER_MANUAL.md](docs/BLOCKOS_USER_MANUAL.md)  
> **所属赛道**：FDoc 创新竞赛「赛道四 · 无界文档 π（半命题）」官方最终汇总版  
> **团队成员**：曹琅 · 杜诺琦 · 伍菲琪

<br />

[📖 官方使用手册](docs/BLOCKOS_USER_MANUAL.md) • [设计哲学](#-赛道背景与设计哲学) • [系统架构](#-系统架构与分层拓扑) • [核心功能体系](#-核心功能体系全景) • [真机视觉](#-真机真实运行视觉闭环) • [快速开始](#-快速开始与本地复现)

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
        C2["12 大原子 Block (富文本/待办/代码沙箱/多维表格/白板/导图/公式/书签/Mermaid等)"]
        C3["敏捷协作三重视图 (任务看板 / SVG 自研甘特图 / 里程碑时间线)"]
        C4["导航与协同组件 (Canvas 小地图 / 块级讨论串 / 邀请协作)"]
    end

    subgraph L2 [2. 引擎层 · 角色透视与自动化调度核心]
        E1["角色透视折叠引擎 (PM/UI/FE/BE/QA 五重视角零篡改投影)"]
        E2["PRD 需求自动拆解器 (语义去重 / 成员智能指派 / DoD 标准)"]
        E3["变更影响分析引擎 (中文 N-gram 相似度 / 明确关联 vs 推测影响)"]
        E4["持久化后台 Agent 作业引擎 (agent_jobs 队列 / event_id 幂等防重 / 紧急熔断)"]
        E5["安全隔离代码沙箱执行器 (环境变量脱敏隔离 + 超时熔断保护)"]
    end

    subgraph L3 [3. 状态层 · 块级响应式状态树]
        S1["Zustand + Immer 响应式状态树 (60fps 拖拽与碰撞检测)"]
        S2["语义图谱与连线系统 (implements / verifies / depends_on / references)"]
        S3["跨视图双向状态联动 (画布 TodoBlock ⇄ 看板四泳道实时联动)"]
        S4["子卡片树状嵌套拓扑 (父子对齐 / 一键折叠 / 安全解耦)"]
    end

    subgraph L4 [4. AI 与开放层 · 智能副驾与 MCP 协议开放]
        A1["全局 AI 指令条 (Ctrl+K 批量建卡 / 树状挂载 / 拓扑连线)"]
        A2["Model Context Protocol (MCP) 原生服务 (stdio / HTTP JSON-RPC 双协议)"]
        A3["AI 产出校验与来源留痕 (ai_provenance 模型指纹与 Prompt Hash)"]
        A4["全链路 AI 安全防御 (OWASP Top 10 for LLM 入参拦截与出参脱敏)"]
    end

    subgraph L5 [5. 存储层 · 双层混合持久化与容灾自愈]
        D1["WebAssembly SQLite (sql.js 内存与本地 13 表关系型内核)"]
        D2["Neon Serverless PostgreSQL (云端增量同步 · 事务版本检查 · 乐观锁)"]
        D3["离线自愈队列 (自动网络嗅探 / 离线暂存 / 指数退避重连补发)"]
        D4["双端职责分离持久化 (桌面 2D 排版坐标与移动端大纲解耦)"]
    end

    C1 & C2 -->|交互事件与视口投射| E1
    C3 -->|任务状态拖拽流转| S3
    S3 -->|双向响应式同步| C2
    C4 -->|对象级评论与协同| S3
    E1 -->|单一事实源透视运算| S1
    E2 & E3 -->|生成结构化需求与任务| S2
    E4 -->|执行自动化规则与作业| S3
    S1 & S2 -->|提取结构化上下文| A1
    A1 & A2 -->|工具调用与拓扑编排| S1
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

## 📸 真机真实运行视觉闭环

> 本项目所有展示截图均在真实生产服务下由 Chrome 1920×1080 视口直接截取，杜绝纸面概念推演。

### 1. 无界原子画布全景（Unbounded Infinite Canvas）
打碎长文线性排版，支持 12 大原子 Block 自由拖拽排版、多维语义连线、以及右下角全景漫游小地图。
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

## 🧩 核心功能体系全景

### 1. 12 种原子级 Block 体系
| Block 类型 | 核心能力与工程细节 |
|---|---|
| **Text (富文本)** | 字体大小/粗细/颜色/高亮/排版，支持 Markdown 实时双向同步与 AI 幽灵自动补全 |
| **Todo (待办清单)** | 复选框流转，**与看板四泳道状态双向实时响应式联动**，支持触发 Agent 交付流水线 |
| **Code (代码沙箱)** | 26 种语言高亮，**安全隔离代码沙箱**，支持直接点击「运行」并在下方实时捕获控制台输出 |
| **Table (多维表格)** | 结构化数据矩阵，支持动态行列增删、单元格自适应折叠展开与 Excel 剪贴板互通 |
| **Callout (高亮警示)** | 5 种色彩语义（信息蓝、警告橙、危险红、成功绿、灵感紫），支持自由切换 Emoji 图标 |
| **Countdown (冲刺倒计时)** | 里程碑目标翻牌器，实时秒级心跳跳动，超期自动变色提醒 |
| **Bookmark (网页书签)** | 粘贴任意外部 URL 自动解析并高亮域名 Host，集成「复制链接」与「新标签打开」按钮 |
| **Mermaid (流程图)** | 原生渲染 Mermaid 图表，支持双引号容错自愈，内置架构流程图、协作时序图、敏捷状态机快速模板 |
| **Whiteboard (手绘白板)** | 矢量手绘画布、笔刷/橡皮擦、自定义调色盘、支持导出高清 PNG |
| **Mindmap (思维导图)** | 树状导图节点动态增删改、折叠展开，**思维导图节点与落地 Block 支持双向点击联动** |
| **Math (数学公式)** | 内置 KaTeX 高性能实时排版，支持复杂科研与工程公式渲染 |
| **Media (富媒体)** | 支持本地图片 Base64 上传预览、全生命周期换源与全尺寸缩放 |
| **Quote / Toggle** | 引用卡片、手风琴折叠展开块（严格 OWASP 净化） |

### 2. 自由无界二维白板系统
- **视口漫游与鹰眼小地图 (Minimap)**：支持鼠标滚轮平移、<kbd>Ctrl</kbd>+滚轮缩放 (50%~200%)，右下角 Minimap 等比例微缩投影并支持视口全景巡航拖拽；
- **三向拉伸与物理避让**：支持东、南、东南三向尺寸自由伸缩；纵向拉长时自动触发垂直包围盒避让算法，下方同列 Block 平滑推移避让，消除重叠覆盖；
- **子 Block 树状嵌套 (Sub-Block Hierarchy)**：支持拖拽挂载与 AI 自动建树；侧翼树状对齐排布，支持父卡片一键批量折叠展开，解耦删除时自动安全提升防孤儿数据；
- **业务语义连线图谱**：建立 `implements` / `verifies` / `depends_on` / `references` 四类强业务连线图谱。

### 3. AI 智能体与工具调用 (Tool-Calling)
- **全局 AI 指令条 (<kbd>Ctrl+K</kbd>)**：直接通过自然语言指挥 AI 操作画布（如“创建1个核心需求，并创建2个子Block”、“将模块B设为模块A的子Block”、“拓扑关联卡片A与卡片B”）；
- **角色透视折叠引擎**：**单一事实源零篡改**，按产品经理、UI 设计师、前端、后端、测试 5 大职能自适应投影折叠，消除阅读噪音；
- **单 Block ✨ 快捷 AI**：一键生成总结、扩写、PRD 润色、思维导图转换、代码逻辑审查与用例生成；
- **幽灵补全 (Ghost Text)**：键入稍作停顿自动呈现半透明灰色续写建议，按 <kbd>Tab</kbd> 瞬间采纳。

### 4. 外部 Agent 开放生态 (MCP & Open API)
- **Model Context Protocol (MCP) 原生集成**：打通国际标准 MCP 协议，外部 Agent 可把 BlockOS 作为自己的外部画布知识库调用；
- **双接入模式**：支持 Cursor / Claude Desktop 标准 `stdio` 客户端接入与自研 Python / LangChain `HTTP JSON-RPC` 接入；
- **6 大核心工具能力**：`read_canvas`、`create_block`、`batch_create_hierarchy`、`set_subblock`、`create_link`、`delete_block`；
- **动态 API Key 鉴权**：支持基于 SHA-256 哈希的 `bk_live_...` 专属密钥签发、细粒度权限控制与有效期治理。

### 5. 产研全链路敏捷协作与交付看板
- **5 人产研团队虚拟匹配**：从 PRD 知识卡片一键匹配陈明远(PM)、林小薇(FE)、张浩然(BE)、苏婉清(UI)、王志强(QA)；
- **四泳道敏捷看板**：待办 / 进行中 / 待验收 / 已完成拖拽流转，含 DoD 验收标准与任务级评论区；
- **自研 SVG 甘特图**：起止时间精确到天、周数自动演算、实时今天基准红线、按优先级色彩编码；
- **阶段里程碑**：待开始 / 进行中 / 已完成时序卡片。

### 6. 双端职责分离与移动端大纲阅读
- **桌面端 (Desktop)**：创作与编排工坊，提供二维无界白板、全量拖拽、三向拉伸、代码沙箱与敏捷看板；
- **移动端 (Mobile)**：长文大纲沉浸式消费阅读器。内置章节大纲引擎自动将散落 Block 线性流式重排；移动端编辑严格锁定桌面 2D 物理坐标，手机阅读与轻编辑绝不破坏电脑端精心排版。

### 7. 企业级双层混合持久化与容灾自愈
- **WASM SQLite 本地内核**：采用 `sql.js` 在浏览器和 Node 端自闭环运行，零网络延迟读写；
- **Neon Serverless PostgreSQL 云端同步**：通过原子事务和版本冲突检查实现可靠云端备份；
- **离线自愈队列**：断网期间变更暂存本地，网络恢复后自动补偿上云，数据绝不丢失；
- **OWASP for LLM 安全合规**：前置拦截提示词注入与越狱（LLM01/04/06），后置出参敏感凭据自动脱敏与 XSS 净化。

---

## 📂 项目工程目录结构

```text
BLOCKOS-with-taoke/
├── docs/
│   ├── BLOCKOS_USER_MANUAL.md    # 官方完整功能使用与操作手册 (10章完整指南)
│   ├── assets/                   # 真机运行高清截图素材库
│   └── BlockOS-参赛说明文档.md    # 竞赛申报详细设计说明书
├── src/
│   ├── app/                      # Next.js 15 App Router 路由体系
│   │   ├── api/                  # 38 条 API 端点 (AI、认证、MCP、开放API、图谱等)
│   │   │   ├── open/v1/mcp/      # MCP 服务端核心接口
│   │   │   ├── open/v1/blocks/   # 外部 Agent 原子卡片管理接口
│   │   │   ├── open/v1/canvas/   # 画布与层级拓扑树读取接口
│   │   │   ├── ai/command/       # 全局 AI 指令条工具调用引擎
│   │   │   └── run-code/         # 环境变量安全隔离代码沙箱
│   │   ├── projects/[projectId]/ # 敏捷项目看板、自研 SVG 甘特图与里程碑视图
│   │   ├── teams/                # 团队组织架构与成员角色权限管理
│   │   ├── login/                # BlockOS 统一登录入口与演示账号一键体验
│   │   └── page.tsx              # 主工作空间挂载入口
│   ├── components/               # 核心 React 表现层组件
│   │   ├── BlockEditor.tsx       # 无限白板画布、拖拽吸附与碰撞检测
│   │   ├── CanvasMinimap.tsx     # 视口漫游全景小地图组件
│   │   ├── CommandPalette.tsx    # 全局 AI 指令条与语音命令面板
│   │   ├── HelpPanel.tsx         # 帮助中心（含 MCP 接入客户端一键配置）
│   │   ├── blocks/               # 12 大原子 Block 专属交互组件
│   │   ├── mobile/               # 移动端沉浸式大纲阅读器组件
│   │   └── collaboration/        # 甘特图、看板与团队协同专属组件
│   ├── store/                    # 全局状态管理
│   │   ├── blockStore.ts         # Zustand + Immer 块级原子化状态树
│   │   └── collaborationStore.ts # 团队、任务、需求与时间线协同状态
│   ├── lib/                      # 底层核心库
│   │   ├── db.ts                 # WASM SQLite 与 Neon Postgres 双层持久化
│   │   ├── api-keys.ts           # 外部 Agent API Key 安全哈希与鉴权
│   │   ├── document-outline.ts   # 移动端章节大纲流式重排引擎
│   │   └── ai/                   # 大模型统一网关、OWASP 安全过滤与工具调用
│   └── types/                    # TypeScript 类型定义字典
├── scripts/
│   └── blockos-mcp-stdio.js      # Cursor / Claude Desktop 标准 stdio 桥接脚本
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
如需接入远程 Neon 云端数据库或在线 AI 模型推理，可参考 `.env.example` 配置 `.env.local`：

```env
# 智谱大模型配置 (Zhipu AI / GLM 4.7 Flash，可选)
ZHIPU_API_KEY=your_zhipu_api_key_here
AI_MODEL=glm-4.7-flash

# 硅基流动备用通道 (SiliconFlow API，可选)
SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# 身份鉴权密钥 (NextAuth.js，可选)
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# 数据库连接 (Neon Serverless Postgres / SQLite，可选)
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。欢迎产研团队、开源社区开发者交流与试用！
