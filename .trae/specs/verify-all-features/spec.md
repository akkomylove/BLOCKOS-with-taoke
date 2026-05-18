# 全功能可用性检查 Spec

## Why
用户需要确认 blockOS 所有功能是否正常工作，基于 `docs/features-overview.md` 进行系统性验证。

## What Changes
- 无代码变更，纯功能验证任务
- 启动 dev server，通过浏览器逐项检查功能
- 记录不可用或异常的功能点

## Impact
- 验证范围：核心编辑器、协作系统、用户系统、文档页面、AI 能力、辅助功能
- 输出：功能可用性报告

## ADDED Requirements

### Requirement: 功能可用性验证
The system SHALL 通过浏览器自动化验证所有功能模块。

#### Scenario: 登录与预制数据
- **WHEN** 打开登录页
- **THEN** 应显示 5 个预制账号，可一键登录
- **THEN** 登录后应显示预制团队、项目、任务、里程碑

#### Scenario: 核心编辑器
- **WHEN** 创建新页面
- **THEN** 应支持添加所有 11 种 Block 类型
- **THEN** Block 应可拖拽移动、编辑、删除

#### Scenario: 协作系统
- **WHEN** 进入团队页面
- **THEN** 应显示预制团队 "CircleLight 研发团队"
- **THEN** 应可查看团队成员列表
- **THEN** 管理者应可添加/移除成员
- **THEN** 进入项目应显示看板（待办/进行中/已完成）
- **THEN** 甘特图应显示任务时间线
- **THEN** 里程碑应显示 4 个阶段

#### Scenario: AI 功能
- **WHEN** 上传 Markdown 项目计划书
- **THEN** AI 应返回分析结果
- **THEN** 应可一键导入任务到看板

#### Scenario: 页面管理
- **WHEN** 右键页面
- **THEN** "移动到..." 菜单应正常展开
- **THEN** 应可将页面移入/移出文件夹
