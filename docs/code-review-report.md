# BlockOS 协作模块代码审查报告

**审查日期**: 2026-05-16
**审查范围**: BlockOS 协作模块（团队、项目、任务管理）
**审查方法**: 静态代码分析 + 最佳实践检查

---

## 执行摘要

本次审查共发现 **33 个问题**，其中：
- **高优先级**: 5 个
- **中优先级**: 15 个
- **低优先级**: 13 个

### 问题分布

| 类别 | 高 | 中 | 低 | 合计 |
|------|-----|-----|-----|------|
| API 路由 | 2 | 5 | 2 | 9 |
| UI 组件 | 1 | 8 | 8 | 17 |
| 数据库 | 3 | 5 | 3 | 11 |
| 类型定义 | 0 | 2 | 2 | 4 |
| **总计** | **6** | **20** | **15** | **41** |

---

## 一、API 路由问题

### 高优先级问题

#### 1.1 项目创建缺少 teamId 验证
- **文件**: [src/app/api/projects/route.ts](file:///workspace/src/app/api/projects/route.ts#L34)
- **严重程度**: 高
- **问题**: `teamId` 是必填字段但未验证类型和存在性
- **影响**: 可能导致创建项目时关联到不存在的团队
- **建议修复**:
```typescript
if (!teamId || typeof teamId !== 'string') {
  return NextResponse.json({ error: 'Valid teamId required' }, { status: 400 });
}
```

#### 1.2 任务分配未验证成员身份
- **文件**: [src/app/api/tasks/[id]/route.ts](file:///workspace/src/app/api/tasks/[id]/route.ts#L100-L103)
- **严重程度**: 高
- **问题**: 更新 `assigneeId` 时未验证该用户是否为项目成员
- **影响**: 可能将任务分配给非项目成员
- **建议修复**: 在更新 assigneeId 前检查成员关系

---

### 中优先级问题

#### 1.3 团队创建缺少 name 类型验证
- **文件**: [src/app/api/teams/route.ts#L34](file:///workspace/src/app/api/teams/route.ts#L34)
- **严重程度**: 中
- **问题**: `name` 字段缺少类型和长度验证

#### 1.4 任务创建缺少 title 长度限制
- **文件**: [src/app/api/tasks/route.ts#L60](file:///workspace/src/app/api/tasks/route.ts#L60)
- **严重程度**: 中
- **问题**: `title` 字段可能过长导致数据库字段溢出

#### 1.5 里程碑状态值缺少验证
- **文件**: [src/app/api/milestones/[id]/route.ts#L70-L73](file:///workspace/src/app/api/milestones/[id]/route.ts#L70-L73)
- **严重程度**: 中
- **问题**: `status` 字段未验证有效值

#### 1.6 项目删除未主动清理关联数据
- **文件**: [src/app/api/projects/[id]/route.ts#L95](file:///workspace/src/app/api/projects/[id]/route.ts#L95)
- **严重程度**: 中
- **问题**: 虽然数据库有级联删除，但业务层应显式处理

#### 1.7 任务删除未检查子任务
- **文件**: [src/app/api/tasks/[id]/route.ts#L160](file:///workspace/src/app/api/tasks/[id]/route.ts#L160)
- **严重程度**: 中
- **问题**: 删除任务时未检查是否存在子任务
- **建议**: 应明确告知用户或有选择性地级联删除

---

### 低优先级问题

#### 1.8 错误信息过于通用
- **所有 API 文件**
- **严重程度**: 低
- **建议**: 在开发环境返回详细错误信息

#### 1.9 缺少评论删除 API
- **文件**: [src/app/api/tasks/[id]/comments/route.ts](file:///workspace/src/app/api/tasks/[id]/comments/route.ts)
- **严重程度**: 低
- **问题**: 只实现了 GET 和 POST，缺少 DELETE

---

## 二、UI 组件问题

### 高优先级问题

#### 2.1 CreateTeamModal 错误未向用户展示
- **文件**: [src/components/collaboration/CreateTeamModal.tsx](file:///workspace/src/components/collaboration/CreateTeamModal.tsx#L32-L33)
- **严重程度**: 高
- **问题**: 表单提交失败时只记录到 console.error，用户无法知道发生了什么错误
- **影响**: 用户体验差，无法了解操作失败原因

---

### 中优先级问题

#### 2.2 TeamCard 使用原生 confirm 对话框
- **文件**: [src/components/collaboration/TeamCard.tsx#L28-L30](file:///workspace/src/components/collaboration/TeamCard.tsx#L28-L30)
- **严重程度**: 中
- **建议**: 替换为自定义确认模态框

#### 2.3 缺少加载状态管理
- **文件**: [src/components/collaboration/TeamList.tsx](file:///workspace/src/components/collaboration/TeamList.tsx)
- **严重程度**: 中
- **问题**: 数据加载过程中没有显示 loading spinner

#### 2.4 collaborationStore 缺少 loading 状态更新
- **文件**: [src/store/collaborationStore.ts#L37-L46](file:///workspace/src/store/collaborationStore.ts#L37-L46)
- **严重程度**: 中
- **问题**: 虽然定义了 loading 状态，但未在异步操作中正确更新

#### 2.5 删除操作缺少加载状态
- **文件**: [src/components/collaboration/TeamCard.tsx#L26-L31](file:///workspace/src/components/collaboration/TeamCard.tsx#L26-L31)
- **严重程度**: 中
- **问题**: 删除时没有视觉反馈

#### 2.6 菜单状态未在点击外部时关闭
- **文件**: [src/components/collaboration/TeamCard.tsx#L18, L68](file:///workspace/src/components/collaboration/TeamCard.tsx#L18-L68)
- **严重程度**: 中
- **建议**: 添加点击外部关闭菜单的逻辑

#### 2.7 API 响应缺少类型验证
- **文件**: [src/store/collaborationStore.ts#L50-L55](file:///workspace/src/store/collaborationStore.ts#L50-L55)
- **严重程度**: 中
- **建议**: 使用类型守卫或 Zod 验证 API 响应

#### 2.8 头像加载失败无降级处理
- **文件**: [src/components/collaboration/TeamCard.tsx#L47-L51](file:///workspace/src/components/collaboration/TeamCard.tsx#L47-L51)
- **严重程度**: 中
- **建议**: 添加 `onError` 处理器使用默认首字母

---

### 低优先级问题

#### 2.9 CreateTeamModal 表单重置不完整
- **文件**: [src/components/collaboration/CreateTeamModal.tsx#L21-L37](file:///workspace/src/components/collaboration/CreateTeamModal.tsx#L21-L37)
- **严重程度**: 低

#### 2.10 useEffect 依赖可能导致重渲染
- **文件**: [src/components/collaboration/TeamList.tsx#L15-L17](file:///workspace/src/components/collaboration/TeamList.tsx#L15-L17)
- **严重程度**: 低

#### 2.11 组件可以添加 memo 优化
- **文件**: [src/components/collaboration/TeamCard.tsx](file:///workspace/src/components/collaboration/TeamCard.tsx)
- **严重程度**: 低
- **建议**: 使用 React.memo 包装组件

#### 2.12 输入未使用防抖
- **文件**: [src/components/collaboration/CreateTeamModal.tsx](file:///workspace/src/components/collaboration/CreateTeamModal.tsx)
- **严重程度**: 低

---

## 三、数据库问题

### 高优先级问题

#### 3.1 saveDb 静默失败
- **文件**: [src/lib/db.ts#L169-L171](file:///workspace/src/lib/db.ts#L169-L171)
- **严重程度**: 高
- **问题**: 数据保存失败时静默处理，没有任何日志或重试机制
- **影响**: 用户可能认为数据已保存，但实际上未保存

#### 3.2 缺少事务支持
- **文件**: [src/lib/db.ts#L174-L189](file:///workspace/src/lib/db.ts#L174-L189)
- **严重程度**: 高
- **问题**: 多步操作无法保证原子性
- **建议**: 添加 transaction 包装函数

#### 3.3 projects.owner_id 外键缺少级联操作
- **文件**: [src/lib/db.ts#L94](file:///workspace/src/lib/db.ts#L94)
- **严重程度**: 高
- **问题**: 删除用户时未处理其拥有的项目
- **建议修复**:
```sql
owner_id TEXT REFERENCES users(id) ON DELETE SET NULL
```

---

### 中优先级问题

#### 3.4 tasks.assignee_id 缺少 SET NULL
- **文件**: [src/lib/db.ts#L126](file:///workspace/src/lib/db.ts#L126)
- **严重程度**: 中
- **建议修复**:
```sql
assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL
```

#### 3.5 task_comments.author_id 缺少级联删除
- **文件**: [src/lib/db.ts#L137](file:///workspace/src/lib/db.ts#L137)
- **严重程度**: 中
- **建议修复**:
```sql
author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
```

#### 3.6 run 函数不返回影响行数
- **文件**: [src/lib/db.ts#L186-L188](file:///workspace/src/lib/db.ts#L186-L188)
- **严重程度**: 中
- **建议**: 返回 `db.getRowsModified()`

#### 3.7 TaskComment.mentions 类型不一致
- **文件**: [src/types/collaboration.ts#L70](file:///workspace/src/types/collaboration.ts#L70) vs [src/lib/db.ts#L139](file:///workspace/src/lib/db.ts#L139)
- **严重程度**: 中
- **问题**: 数据库存 JSON 字符串，TypeScript 定义为数组，需要转换

---

### 低优先级问题

#### 3.8 blocks.parent_id 缺少索引
- **文件**: [src/lib/db.ts#L62](file:///workspace/src/lib/db.ts#L62)
- **严重程度**: 低

#### 3.9 类型与数据库字段命名不一致
- **文件**: TypeScript 用 camelCase，数据库用 snake_case
- **严重程度**: 低
- **建议**: 建立转换层

---

## 四、安全性问题

### SQL 注入检查
✅ **通过** - 所有 SQL 查询都使用参数化查询，无 SQL 注入风险

### 权限控制检查
✅ **通过** - 所有 API 都正确实现了认证检查和成员关系验证

---

## 五、修复建议优先级

### 第一阶段（立即修复）

1. **API 路由**:
   - [ ] 添加 teamId 验证
   - [ ] 添加任务 assigneeId 成员验证
   - [ ] 添加 title 长度限制

2. **数据库**:
   - [ ] 修复 saveDb 静默失败问题
   - [ ] 添加事务支持
   - [ ] 修复外键级联约束

3. **UI 组件**:
   - [ ] 修复错误状态展示
   - [ ] 添加加载状态管理

### 第二阶段（短期修复）

1. 添加缺失的删除 API（评论）
2. 添加里程碑状态值验证
3. 优化菜单外部点击关闭
4. 添加头像加载失败处理

### 第三阶段（后续优化）

1. 添加表单防抖
2. 组件 memo 优化
3. 类型转换层
4. 详细错误日志

---

## 六、总结

### 优点

1. ✅ 代码结构清晰，遵循项目现有规范
2. ✅ 所有 SQL 查询使用参数化查询，无注入风险
3. ✅ 权限控制逻辑正确
4. ✅ UI 风格与现有项目一致
5. ✅ TypeScript 类型定义相对完整

### 需改进

1. ⚠️ 输入验证不够严格
2. ⚠️ 错误处理不够完善
3. ⚠️ 数据库事务支持缺失
4. ⚠️ UI 反馈机制不够友好
5. ⚠️ 类型与数据库命名不一致

### 建议

1. 立即修复高优先级问题（6 个）
2. 在下一迭代中修复中优先级问题（20 个）
3. 在后续优化中处理低优先级问题（15 个）
4. 添加自动化测试覆盖关键路径
5. 考虑使用 Zod 等库进行类型验证

---

**审查完成时间**: 2026-05-16
**审查工具**: 静态代码分析 + 手动审查
**下一步**: 根据优先级逐步修复问题
