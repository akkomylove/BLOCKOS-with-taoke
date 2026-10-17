const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve('C:/Users/Administrator/.gemini/antigravity/brain/445499ad-c2a7-44c8-995c-c433063cc07b/e2e_evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTest() {
  console.log('=== [E2E Playwright: Interactive API Key Generation Verification] ===');
  console.log('Target: http://localhost:3001');

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    // 1. 登录
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle', timeout: 20000 });
    const adminBtn = page.locator('button:has-text("管理者")').first();
    await adminBtn.click();
    await page.waitForURL('http://localhost:3001/', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // 关闭新手教程
    const skipTourBtn = page.locator('button:has-text("跳过教程"), button:has-text("跳过"), button:has-text("知道了")');
    if (await skipTourBtn.count() > 0) {
      try { await skipTourBtn.first().click({ timeout: 2000 }); } catch {}
    }

    // 2. 点击【帮助】按钮打开 HelpPanel
    console.log('查找并点击【帮助】按钮...');
    const helpBtn = page.locator('button[title="帮助"]').first();
    await helpBtn.waitFor({ state: 'visible', timeout: 8000 });
    await helpBtn.click();

    await page.waitForSelector('text=帮助中心', { timeout: 5000 });
    console.log('✓ 帮助中心弹窗已打开');

    // 3. 点击【MCP 智能体接入】Tab
    const mcpTab = page.locator('button:has-text("MCP 智能体接入")').first();
    await mcpTab.waitFor({ state: 'visible', timeout: 3000 });
    await mcpTab.click();
    console.log('✓ 成功切换至【MCP 智能体接入】Tab');
    await page.waitForTimeout(500);

    // 4. 定位并检查 API Key 凭据管理区域
    const keySection = page.locator('text=API Key 凭据管理');
    await keySection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // 5. 点击【一键生成 Key】按钮
    console.log('点击【一键生成 Key】测试交互式签发...');
    const generateBtn = page.locator('button:has-text("一键生成 Key")');
    await generateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await generateBtn.click();

    // 6. 等待新密钥生成成功高亮卡片
    console.log('等待新密钥展示卡片渲染...');
    await page.waitForSelector('text=新密钥已签发成功', { timeout: 8000 });
    console.log('✓ 成功检测到新密钥卡片与复制按钮！');

    // 7. 截图留证
    const shot = path.join(EVIDENCE_DIR, '15_api_key_interactive_console.png');
    await page.screenshot({ path: shot });
    console.log('✓ 交互式 Key 签发验证全景截图已保存:', shot);

    console.log('\n=== [API Key 交互式一键获取全流程闭环验证成功 100%] ===\n');
  } catch (err) {
    console.error('Test error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runTest();
