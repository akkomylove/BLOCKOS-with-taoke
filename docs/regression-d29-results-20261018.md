# BlockOS D-29 修复与验证结果

日期：2026-10-18（Asia/Shanghai）

## 结论

D-29 已在本地复现、修复并通过实际画布验证。没有部署到线上。

修复前，截图中的 `console.log('SYNC-OK'); setTimeout(function(){ console.log('ASYNC-OK'); }, 600);` 在真实 Chrome 中只返回 `SYNC-OK`，新增回归断言失败。原因是顶层代码返回后立即上报成功、终止 Worker，尚未执行的定时器随之丢失。此前同步执行和隔离检查未覆盖这条异步路径。

## 修复行为

- 沙箱记录定时器、interval、异步回调和请求的等待状态；顶层代码及受跟踪任务完成后，等待 Promise 微任务与未处理拒绝事件，再返回成功。
- 支持分批回传日志。代码卡片收到同步输出时显示“执行中”，不会在异步任务尚未完成时显示成功。
- 捕获异步回调异常和未处理的 Promise 拒绝，返回错误。
- 保持默认 3 秒执行上限。未结束的 interval、过长定时器和无限循环会超时终止；超时或失败仍保留此前输出。
- 保持原有不透明来源 iframe、Worker 和网络隔离；本次未开放外部网络访问。

实现文件：`src/lib/browser-code-sandbox.ts`、`src/components/blocks/CodeBlock.tsx`。

## 验证证据

1. 独立真实 Chrome 沙箱检查通过：截图的 600ms 延迟、Promise.then、顶层 await、独立 async 函数、嵌套定时器、async 定时器回调、清除 interval、取消定时器、全局 timer/console、异步抛错、Promise 拒绝、微任务抛错、输出推送、超时保留日志、中止及 iframe 清理。
2. 实际画布代码卡片通过：先出现 `SYNC-OK`，此时没有“执行成功”；随后出现 `ASYNC-OK`，再显示成功。另用 10 秒定时器验证默认 3 秒超时，输出区保留 `BEFORE-TIMEOUT`，显示错误且不显示成功。
3. 真实浏览器全量回归 24 项通过，页面异常列表为空；测试使用独立临时数据库和新建账号。
4. 自动测试 37 个文件、376 项全部通过。
5. TypeScript 检查、`git diff --check` 通过。

测试入口：`node tests/e2e-browser-sandbox.mjs`、`node tests/e2e-regression.mjs`、`npx vitest run`、`npx tsc --noEmit --incremental false`。

## 范围说明

异步执行仍受同一轮 3 秒总时限约束；需要持续运行的任务会明确超时，不会静默截断后显示成功。外部 fetch 仍按原隔离策略阻止，已验证其异步拒绝可以被代码的 catch 正常观察。
