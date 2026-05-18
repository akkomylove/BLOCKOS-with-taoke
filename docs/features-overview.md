# BlockOS 功能总览

> 生成时间：2026-05-18

## 一、核心编辑器

### 1.1 Block 类型（11 种）

| 类型 | 说明 | 特色功能 |
|------|------|----------|
| **text** | 富文本块 | 字体大小/颜色/粗细/斜体/下划线/对齐 |
| **todo** | 待办事项 | 复选框、完成状态、自动触发 Agent |
| **code** | 代码块 | 26 种语言高亮（PrismJS）、可运行 JS/Python |
| **table** | 表格块 | 6 种列类型（文本/数字/日期/下拉/复选/链接） |
| **media** | 媒体块 | 图片展示、描述文字 |
| **quote** | 引用块 | 引用样式排版 |
| **toggle** | 折叠块 | 展开/收起内容 |
| **divider** | 分隔线 | 视觉分隔 |
| **whiteboard** | 白板 | 手绘、画笔/橡皮擦、颜色选择、下载 PNG |
| **mindmap** | 思维导图 | 添加/删除/编辑节点、折叠展开 |
| **math** | 数学公式 | KaTeX 渲染 |

### 1.2 画布交互

- **自由画布**：无限画布，支持拖拽移动、缩放（Ctrl+滚轮）、平移
- **父子层级**：Block 可设为父子关系，支持折叠/展开
- **组合分组**：多选 Block 可组合为 group，组内一起移动
- **链接关系**：Block 间可创建链接，画布显示贝塞尔曲线
- **标签系统**：每个 Block 可打标签，支持标签轮盘选择器
- **框选**：鼠标拖拽框选多个 Block
- **对齐吸附**：拖拽时自动吸附对齐

---

## 二、协作系统

### 2.1 团队管理

- 创建/编辑/删除团队
- 团队成员管理（owner / admin / member 角色）
- 团队卡片展示、团队详情面板
- **权限**：仅 admin 可添加/移除成员

### 2.2 项目管理

- 在团队下创建/编辑/删除项目
- 项目成员管理（owner / admin / member / viewer 角色）
- 项目颜色、图标自定义
- 项目状态：active / archived

### 2.3 任务看板（Kanban）

- 三列看板：待办 / 进行中 / 已完成
- 拖拽移动任务状态
- 任务优先级：低 / 中 / 高 / 紧急
- 任务截止日期、负责人分配
- 任务详情弹窗（描述、DoD、评论）
- **权限控制**：admin 可看所有任务，普通成员只看分配给自己的

### 2.4 甘特图

- SVG 自制甘特图
- 按优先级着色（低灰 / 中蓝 / 高橙 / 紧急红）
- 月份头部、今天红线标记
- 显示具体日期和第几周
- 任务 tooltip：标题、状态、负责人、起止时间

### 2.5 里程碑

- 创建/编辑/删除里程碑
- 状态：pending / in_progress / completed
- 截止日期设置

### 2.6 AI 导入与分析

- 上传 Markdown 项目计划书
- AI 自动分析并切分任务
- 生成项目审查报告（优势 / 不足 / 建议 / 风险）
- 生成工作流阶段
- 自动匹配负责人职能
- 一键导入到看板

---

## 三、用户系统

### 3.1 登录方式

| 方式 | 说明 |
|------|------|
| **OAuth** | GitHub / Google 登录（NextAuth v5） |
| **Demo 快捷登录** | 预制账号一键登录，无需配置 OAuth |

### 3.2 预制账号（5 个）

| 账号 | 姓名 | 职务 | 职能 |
|------|------|------|------|
| admin@circlelight.com | 陈明远 | 产品经理 | 产品规划、需求分析、项目管理 |
| linxiaowei@circlelight.com | 林小薇 | 前端开发 | 前端开发、React、TypeScript |
| zhanghaoran@circlelight.com | 张浩然 | 后端开发 | 后端开发、Node.js、数据库设计 |
| suwanqing@circlelight.com | 苏婉清 | UI 设计师 | UI设计、交互设计、Figma |
| wangzhiqiang@circlelight.com | 王志强 | 测试工程师 | 测试工程、自动化测试、性能测试 |

### 3.3 权限体系

- **Middleware 层**：未登录用户重定向到登录页
- **团队角色**：owner / admin / member
- **项目角色**：owner / admin / member / viewer
- **任务可见性**：admin 看全部，普通成员看自己的

### 3.4 个人中心

- 显示用户信息（名称、邮箱）
- 编辑职务（title）
- 管理职能标签（从预设列表选择）
- 查看"我的任务"概览（按项目分组）

---

## 四、文档与页面

### 4.1 模板系统（6 种）

| 模板 | 说明 | Block 数 |
|------|------|---------|
| **实战演示文档** | CircleLight 电商平台 PRD 完整演示 | 6 |
| **会议纪要** | 主题、参会人、讨论要点、待办 | 3 |
| **项目计划** | 概述、任务分配表、本周任务 | 3 |
| **读书笔记** | 书籍信息、摘录、思考 | 3 |
| **周报** | 本周总结、下周计划、成果展示 | 3 |
| **空白页面** | 从零开始 | 0 |

### 4.2 导入导出

**导出**：Markdown / HTML / PDF / Word
**导入**：Markdown / CSV（转 Table Block）/ 图片（转 Media Block）

### 4.3 页面管理

- 创建/删除/重命名页面
- 文件夹系统（创建/删除/重命名/折叠）
- 页面可在文件夹间移动
- 页面图标自定义

---

## 五、AI 能力

### 5.1 AI Provider

- SiliconFlow API（OpenAI 兼容）
- 默认模型：`Qwen/Qwen3-8B`
- 备用模型：`THUDM/glm-4-9b-chat`

### 5.2 AI Agent

- 自动监听 Block 变化
- 默认规则：todo 完成时自动创建日志 Block + AI 生成鼓励语
- 支持启用/禁用、Agent 日志面板

### 5.3 Block 级 AI 操作

| Block | AI 操作 |
|-------|---------|
| text | 总结、改写（正式/随意）、扩展 |
| todo | 拆解子任务、总结 |
| code | 解释代码、优化建议 |
| table | 数据洞察、总结 |
| media/whiteboard | 生成描述 |
| mindmap | 扩展节点、总结 |
| math | 解释公式 |

### 5.4 AI 命令面板

- 自然语言命令执行（删除/创建/高亮/清空等）
- 支持语音输入（Web Speech API）
- 非命令类输入走 AI 生成

### 5.5 其他 AI API

- `/api/ai/generate` - 通用 AI 生成（流式）
- `/api/ai/summary` - 多 Block 内容综合总结
- `/api/ai/vision` - 图片分析（多模态）
- `/api/ai/format-document` - 文档自动排版

---

## 六、辅助功能

### 6.1 搜索

- 全局搜索 Block（标题、内容、标签）
- 按 Block 类型过滤、按标签过滤
- 高亮匹配文本、点击跳转

### 6.2 历史记录

- 自动保存历史（最多 50 条）
- 支持撤销/重做
- 点击历史版本可恢复

### 6.3 关系视图

- 正向链接、反向链接
- 父子树形结构
- Block 总数、连接数、类型分布、链接密度

### 6.4 导航面板

- 分组视图（按 group 组织）
- 标签视图（按 tag 组织）

### 6.5 主题

- 深色/浅色模式切换

### 6.6 新手引导

- 5 步引导教程
- 首次访问自动弹出、可跳过

### 6.7 代码运行

- JavaScript：前端 `new Function` 沙箱执行
- Python：后端 `child_process` 执行（10 秒超时）
- 支持 Block 引用（`// @ref varName`）

---

## 七、数据库表结构

| 表名 | 说明 |
|------|------|
| `users` | 用户 |
| `pages` | 页面 |
| `blocks` | Block |
| `teams` | 团队 |
| `team_members` | 团队成员 |
| `projects` | 项目 |
| `project_members` | 项目成员 |
| `milestones` | 里程碑 |
| `tasks` | 任务 |
| `task_comments` | 任务评论 |
| `user_profiles` | 用户资料 |

---

## 八、技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 + React 19 |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand + Immer |
| 认证 | NextAuth v5 |
| 数据库 | sql.js (SQLite) |
| AI SDK | Vercel AI SDK |
| AI Provider | SiliconFlow |
| 代码高亮 | PrismJS |
| 公式渲染 | KaTeX |
| PDF 生成 | Playwright |
| 图标 | Lucide React |
