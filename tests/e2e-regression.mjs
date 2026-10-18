import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const dir = await mkdtemp(path.join(tmpdir(), 'blockos-regression-'));
await mkdir('scratch', { recursive: true });
const config = `scratch/tsconfig.regression-${process.pid}.json`;
await writeFile(config, JSON.stringify({ extends: path.resolve('tsconfig.json'), compilerOptions: { baseUrl: process.cwd(), paths: { '@/*': ['src/*'] } }, include: [path.resolve('src/**/*.ts'), path.resolve('src/**/*.tsx')], exclude: [path.resolve('node_modules')] }));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development',
    BLOCKOS_DB_PATH: path.join(dir, 'test.db'), BLOCKOS_BUILD_DIR: `scratch/regression-next-${process.pid}`, BLOCKOS_TSCONFIG_PATH: config,
    DATABASE_URL: '', POSTGRES_URL: '', POSTGRES_PRISMA_URL: '', STORAGE_URL: '', VERCEL: '',
    AUTH_TRUST_HOST: 'true', AUTH_SECRET: 'isolated-regression-secret', NEXTAUTH_TRUST_HOST: 'true', AUTH_SECRET: 'isolated-regression-secret',
    ZHIPU_API_KEY: '', DASHSCOPE_API_KEY: '', SILICONFLOW_API_KEY: '', OPENAI_API_KEY: '',
  },
});
let logs = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-12000); });
let browser;
const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error('FAIL', name, error.message); }
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(base + '/api/auth/options')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, logs);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  async function api(route, method = 'GET', data, expected = 200) {
    const response = await context.request.fetch(base + route, { method, data });
    assert.equal(response.status(), expected, `${method} ${route}: ${await response.text()}`);
    return response.json();
  }
  const credentials = { email: `regression-${Date.now()}@example.test`, password: 'Regression-local-password-2026', name: '回归测试' };
  await api('/api/auth/register', 'POST', credentials, 201);
  await context.clearCookies();
  await check('D-19 real Enter logs in and navigates to workspace', async () => {
    await page.goto(base + '/login');
    await page.locator('#account-email').fill(credentials.email);
    await page.locator('#account-password').fill(credentials.password);
    await page.locator('#account-password').press('Enter');
    await page.waitForURL(base + '/', { timeout: 60000 });
    await page.getByTitle('AI 助手', { exact: true }).waitFor();
    await page.locator('[contenteditable=true]').first().waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: '跳过教程' }).click({ timeout: 4000 }).catch(() => {});
  });
  let guideId;
  await check('D-01 edit writes API and local storage, survives refresh; D-08 history', async () => {
    guideId = (await api('/api/pages')).pages[0].id;
    const editor = page.locator('[contenteditable=true]').first();
    const original = await editor.innerText();
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/pages/${guideId}/blocks`) && response.request().method() === 'PUT' && response.request().postData().includes('REG-SAVED'));
    await editor.fill(original + '\nREG-SAVED');
    assert.ok((await saved).ok());
    assert.ok(JSON.stringify((await api(`/api/pages/${guideId}/blocks`)).blocks).includes('REG-SAVED'));
    assert.ok(await page.evaluate(() => localStorage.getItem('block-os-storage').includes('REG-SAVED')));
    await page.reload();
    await page.locator('[contenteditable=true]').first().waitFor();
    assert.ok((await page.locator('[contenteditable=true]').first().innerText()).includes('REG-SAVED'));
    await page.getByTitle('历史版本', { exact: true }).click();
    await page.getByText('文档版本历史', { exact: true }).waitFor();
    assert.equal(await page.getByText('暂无版本历史快照', { exact: true }).count(), 0);
    await page.keyboard.press('Escape');
  });
  let templateId;
  await check('D-01b PRD template persists across refresh; D-07 template Escape', async () => {
    await page.getByTitle('新建页面', { exact: true }).click();
    await page.getByText('选择模板', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByText('选择模板', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByTitle('新建页面', { exact: true }).click();
    const saved = page.waitForResponse(response => /api\/pages\/[^/]+\/blocks$/.test(response.url()) && response.request().method() === 'PUT');
    await page.getByRole('button', { name: /产品需求文档/ }).click();
    assert.ok((await saved).ok());
    const pages = (await api('/api/pages')).pages;
    templateId = pages.find(item => item.id !== guideId).id;
    const count = (await api(`/api/pages/${templateId}/blocks`)).blocks.length;
    assert.ok(count > 0);
    await page.reload();
    await page.locator('[contenteditable=true]').first().waitFor();
    assert.equal((await api(`/api/pages/${templateId}/blocks`)).blocks.length, count);
  });
  await check('D-06 search loads cloud-only pages; D-07 Escape and backdrop close', async () => {
    const remote = await api('/api/pages', 'POST', { title: '跨页搜索文档' });
    await api(`/api/pages/${remote.id}/blocks`, 'PUT', { blocks: [{ id: 'cross-page-probe', type: 'text', title: 'CROSS-REMOTE', content: '只存在于服务器的跨页内容', meta: {}, parentId: null, x: 100, y: 100, width: 400, height: 200, order: 0, createdAt: Date.now(), updatedAt: Date.now() }] });
    await page.reload();
    await page.getByTitle('全局搜索 (Cmd+K)').click();
    await page.getByPlaceholder('搜索 Block 标题、内容或标签...').fill('CROSS-REMOTE');
    await page.getByText('CROSS-REMOTE', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByPlaceholder('搜索 Block 标题、内容或标签...').waitFor({ state: 'hidden' });
    await page.getByTitle('全局搜索 (Cmd+K)').click();
    await page.mouse.click(10, 400);
    await page.getByPlaceholder('搜索 Block 标题、内容或标签...').waitFor({ state: 'hidden' });
  });
  await check('D-15 assistant operation logs and persists the created card', async () => {
    await api('/api/account', 'PATCH', { mode: 'enterprise' });
    await page.reload();
    await page.getByTitle('AI 助手', { exact: true }).click();
    await page.route('**/api/ai/command', route => route.fulfill({ contentType: 'text/plain', body: JSON.stringify({ type: 'operations', operations: [{ action: 'createBlock', type: 'text', title: 'REG-AGENT-CARD', content: '代理创建保存检查' }] }) }));
    await page.getByLabel('向 AI 助手提问或发送画布指令').fill('创建一张正文卡片');
    const saved = page.waitForResponse(response => /api\/pages\/[^/]+\/blocks$/.test(response.url()) && response.request().method() === 'PUT');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.getByText('已处理画布操作', { exact: true }).waitFor();
    assert.ok((await saved).ok());
    await page.getByRole('button', { name: '关闭 AI 助手', exact: true }).click();
    await page.getByTitle('执行日志', { exact: true }).click();
    await page.getByText(/已创建 text Block「REG-AGENT-CARD」/).waitFor();
    await page.reload();
    assert.ok(JSON.stringify((await api(`/api/pages/${templateId}/blocks`)).blocks).includes('REG-AGENT-CARD'));
  });
  const team = await api('/api/teams', 'POST', { name: '回归团队' });
  const project = await api('/api/projects', 'POST', { teamId: team.id, name: '回归项目' });
  await check('D-20b nonexistent member is rejected; email member addition works', async () => {
    await api(`/api/teams/${team.id}/members`, 'POST', { userId: 'does-not-exist', role: 'member' }, 404);
    const second = await browser.newContext();
    const register = await second.request.post(base + '/api/auth/register', { data: { ...credentials, email: `member-${Date.now()}@example.test` } });
    assert.equal(register.status(), 201);
    const data = await register.json();
    await api(`/api/teams/${team.id}/members`, 'POST', { userId: data.user.email, role: 'member' });
    await second.close();
  });
  await check('D-14 real plan analysis/import persists tasks without page crash', async () => {
    await page.goto(base + `/projects/${project.id}`);
    await page.getByRole('button', { name: /AI 计划书导入/ }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'regression-plan.md', mimeType: 'text/markdown', buffer: Buffer.from('# 计划\n## 第一阶段\n- 完成需求整理\n## 第二阶段\n- 完成实现') });
    await page.getByRole('button', { name: '确认导入到看板' }).waitFor({ timeout: 60000 });
    await Promise.all([page.waitForResponse(response => response.url().includes('/ai-import') && response.request().method() === 'POST'), page.getByRole('button', { name: '确认导入到看板' }).click()]);
    await page.getByRole('heading', { name: '研发任务看板', exact: true }).waitFor();
    const tasks = (await api(`/api/tasks?projectId=${project.id}`)).tasks;
    assert.ok(tasks.length > 0);
  });
  await check('D-14 malformed model data is contained in the import dialog', async () => {
    await page.goto(base + `/projects/${project.id}`);
    await page.route('**/ai-analyze', route => route.fulfill({ json: { analysis: { tasks: {}, review: { strengths: [{ bad: true }] }, workflow: 'invalid' } } }));
    await page.getByRole('button', { name: /AI 计划书导入/ }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'bad-response.md', mimeType: 'text/markdown', buffer: Buffer.from('# 测试任务') });
    await page.getByText('没有识别到有效任务，请补充计划书中的任务标题和内容后重试').waitFor();
    assert.equal(await page.getByText('Application error:', { exact: false }).count(), 0);
    await page.getByRole('button', { name: '关闭计划书导入' }).click();
    await page.unroute('**/ai-analyze');
  });
  await check('D-12 task menu moves a task to pending review and persists it', async () => {
    await page.getByTitle('更多操作', { exact: true }).first().click();
    await page.getByRole('button', { name: '待验收', exact: true }).click();
    await page.waitForResponse(response => /api\/tasks\/[^/]+$/.test(response.url()) && response.request().method() === 'PATCH');
    const tasks = (await api(`/api/tasks?projectId=${project.id}`)).tasks;
    assert.ok(tasks.some(task => task.status === 'pending_review'));
  });
  await check('D-13 milestone can be created, refreshed, and has return navigation', async () => {
    await page.getByRole('button', { name: '里程碑追踪' }).click();
    await page.getByRole('button', { name: /返回团队/ }).waitFor();
    await page.getByRole('button', { name: '新建里程碑' }).click();
    await page.getByPlaceholder('例如：V1.0 核心能力闭环').fill('REG-MILESTONE');
    const created = page.waitForResponse(response => response.url().endsWith('/api/milestones') && response.request().method() === 'POST');
    await page.getByRole('button', { name: '创建里程碑', exact: true }).click();
    assert.ok((await created).ok());
    await page.getByText('REG-MILESTONE', { exact: true }).waitFor();
    assert.ok((await api(`/api/milestones?projectId=${project.id}`)).milestones.some(item => item.name === 'REG-MILESTONE'));
  });
  await check('D-16 empty project name shows feedback; D-20 project dates are valid; D-21 email entry', async () => {
    await page.goto(base + `/teams/${team.id}`);
    await page.getByText('回归项目', { exact: true }).waitFor();
    assert.equal(await page.getByText('Invalid Date', { exact: true }).count(), 0);
    await page.getByRole('button', { name: '新建项目', exact: true }).click();
    await page.getByRole('button', { name: '创建项目', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '请填写项目名称' }).waitFor();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByRole('button', { name: '团队成员与权限', exact: true }).click();
    await page.getByRole('button', { name: '添加成员', exact: true }).click();
    await page.getByPlaceholder(/邮箱/).waitFor();
  });
  await check('D-09 server creates a PDF with a Chinese filename', async () => {
    const response = await context.request.post(base + '/api/export/pdf', { data: { html: '<h1>回归 PDF 导出</h1><p>真实文件检查</p>', title: '中文导出名称' } });
    assert.equal(response.status(), 200, await response.text());
    assert.equal(response.headers()['content-type'], 'application/pdf');
    assert.equal((await response.body()).subarray(0, 5).toString(), '%PDF-');
    assert.match(response.headers()['content-disposition'], /filename\*/);
  });
  await page.goto(base + '/');
  await page.locator('[contenteditable=true]').first().waitFor();
  await check('D-02 typing does not send AI requests by default', async () => {
    let requests = 0;
    const listener = request => { if (request.url().endsWith('/api/ai/generate')) requests++; };
    page.on('request', listener);
    const editor = page.locator('[contenteditable=true]').first();
    await editor.fill((await editor.innerText()) + ' Typing without AI');
    await page.waitForTimeout(2800);
    page.off('request', listener);
    assert.equal(requests, 0);
  });
  await check('R-01 real mouse drag resizes a card and saves the new width', async () => {
    const handle = page.getByTitle('左右拉伸宽度', { exact: true }).first();
    await handle.scrollIntoViewIfNeeded();
    await handle.hover();
    const bounds = await handle.boundingBox();
    const card = handle.locator('xpath=ancestor::*[@data-block-id][1]');
    const id = await card.getAttribute('data-block-id');
    const before = (await api(`/api/pages/${templateId}/blocks`)).blocks.find(block => block.id === id).width;
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/pages/${templateId}/blocks`) && response.request().method() === 'PUT');
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 70, bounds.y + bounds.height / 2, { steps: 10 });
    await page.mouse.up();
    assert.ok((await saved).ok());
    const after = (await api(`/api/pages/${templateId}/blocks`)).blocks.find(block => block.id === id).width;
    assert.ok(after > before + 30, `${before} -> ${after}`);
  });
  await check('D-03 visible canvas icon buttons have accessible names', async () => {
    const unnamed = await page.locator('button').evaluateAll(buttons => buttons.filter(button => {
      const style = getComputedStyle(button);
      return style.display !== 'none' && style.visibility !== 'hidden' && button.getBoundingClientRect().width > 0
        && !button.textContent.trim() && !button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby') && !button.getAttribute('title');
    }).map(button => button.outerHTML.slice(0, 400)));
    assert.deepEqual(unnamed, []);
  });
  assert.deepEqual(pageErrors, [], 'Unexpected browser page errors');
  await writeFile('scratch/regression-results.json', JSON.stringify({ results, pageErrors }, null, 2));
  if (results.some(result => !result.passed)) throw new Error('Regression checks failed');
} catch (error) { console.error(error); console.error(logs.slice(-5000)); process.exitCode = 1; }
finally {
  if (browser) await browser.close();
  if (process.platform === 'win32') await new Promise(resolve => { const child = spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); child.on('close', resolve); });
  else server.kill('SIGTERM');
}
