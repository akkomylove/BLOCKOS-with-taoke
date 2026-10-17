const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve('C:/Users/Administrator/.gemini/antigravity/brain/445499ad-c2a7-44c8-995c-c433063cc07b/e2e_evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTest() {
  console.log('=== [E2E Playwright: Help Panel MCP Tab Verification (Live Production)] ===');
  console.log('Target: https://blockos.hiakkocv.xyz');

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
    await page.goto('https://blockos.hiakkocv.xyz/login', { waitUntil: 'networkidle', timeout: 25000 });
    const adminBtn = page.locator('button:has-text("管理者")').first();
    await adminBtn.click();
    await page.waitForURL('https://blockos.hiakkocv.xyz/', { timeout: 25000 });
    await page.waitForTimeout(1000);

    // 关闭新手弹窗
    const skipBtn = page.locator('button:has-text("跳过"), button:has-text("知道了"), button:has-text("完成")');
    if (await skipBtn.count() > 0) {
      try { await skipBtn.first().click({ timeout: 2000 }); } catch {}
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

    // 4. 滚动到 API Key 凭据管理区域并截图
    const apiKeySection = page.locator('text=API Key 凭据管理');
    await apiKeySection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const shot1 = path.join(EVIDENCE_DIR, '14_help_panel_mcp_tab.png');
    await page.screenshot({ path: shot1 });
    console.log('✓ 截图已保存:', shot1);

    // 5. 点击【一键生成 Key】按钮
    console.log('点击【一键生成 Key】测试真实签发...');
    const generateBtn = page.locator('button:has-text("一键生成 Key")');
    await generateBtn.click();

    // 6. 等待新密钥生成并高亮展示
    await page.waitForSelector('text=新密钥已签发成功', { timeout: 10000 });
    console.log('✓ 成功检测到新密钥签发成功卡片！');

    const shot2 = path.join(EVIDENCE_DIR, '15_api_key_generated_live.png');
    await page.screenshot({ path: shot2 });
    console.log('✓ 密钥签发成功截图已保存:', shot2);

    console.log('\n=== [HelpPanel MCP 交互式 Key 验证 100% 成功] ===\n');
  } catch (err) {
    console.error('Test error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runTest();
