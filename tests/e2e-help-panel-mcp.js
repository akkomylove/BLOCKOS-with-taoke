const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve('C:/Users/Administrator/.gemini/antigravity/brain/445499ad-c2a7-44c8-995c-c433063cc07b/e2e_evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTest() {
  console.log('=== [E2E Playwright: Help Panel MCP Tab Verification] ===');
  console.log('Target: http://localhost:3005');

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
    await page.goto('http://localhost:3005/login', { waitUntil: 'networkidle', timeout: 15000 });
    const adminBtn = page.locator('button:has-text("管理者")').first();
    await adminBtn.click();
    await page.waitForURL('http://localhost:3005/', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 关闭新手弹窗
    const skipBtn = page.locator('button:has-text("跳过"), button:has-text("知道了"), button:has-text("完成")');
    if (await skipBtn.count() > 0) {
      try { await skipBtn.first().click({ timeout: 2000 }); } catch {}
    }

    // 2. 点击【帮助】按钮打开 HelpPanel
    console.log('打开帮助与设置中心...');
    const helpBtn = page.locator('button[title="帮助与设置"], button[title="新手帮助"], button:has-text("帮助")').first();
    if (await helpBtn.count() > 0) {
      await helpBtn.click();
    } else {
      // 通过更多菜单查找帮助
      const moreBtn = page.locator('button[title="更多功能"], button:has-text("···")').first();
      await moreBtn.click();
      await page.waitForTimeout(300);
      const helpItem = page.locator('button:has-text("使用指南"), button:has-text("帮助")').first();
      await helpItem.click();
    }

    await page.waitForSelector('text=帮助中心', { timeout: 5000 });
    console.log('✓ 帮助中心弹窗已打开');

    // 3. 点击【MCP 智能体接入】Tab
    const mcpTab = page.locator('button:has-text("MCP 智能体接入")').first();
    await mcpTab.waitFor({ state: 'visible', timeout: 3000 });
    await mcpTab.click();
    console.log('✓ 成功切换至【MCP 智能体接入】Tab');
    await page.waitForTimeout(500);

    const shot1 = path.join(EVIDENCE_DIR, '14_help_panel_mcp_tab.png');
    await page.screenshot({ path: shot1 });
    console.log('✓ 截图已保存:', shot1);

    // 4. 验证内容是否存在
    const hasConfig = await page.locator('text=claude_desktop_config.json').count() > 0;
    const hasProbeKey = await page.locator('text=bk_live_antigravity_agent_probe_key').count() > 0;
    console.log(`✓ 界面关键信息检测: claude_desktop_config=${hasConfig}, probeKey=${hasProbeKey}`);

    console.log('\n=== [HelpPanel MCP 验证完成] ===\n');
  } catch (err) {
    console.error('Test error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runTest();
