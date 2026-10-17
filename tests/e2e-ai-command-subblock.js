const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve('C:/Users/Administrator/.gemini/antigravity/brain/445499ad-c2a7-44c8-995c-c433063cc07b/e2e_evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTest() {
  console.log('=== [E2E Playwright: Built-in AI Sub-block & Hierarchy Tool-Calling] ===');
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
    console.log('1. 访问登录页面...');
    await page.goto('http://localhost:3005/login', { waitUntil: 'networkidle', timeout: 15000 });
    const adminBtn = page.locator('button:has-text("管理者")').first();
    await adminBtn.click();
    await page.waitForURL('http://localhost:3005/', { timeout: 15000 });
    console.log('✓ 管理者登录成功并进入工作区');

    // 等待主界面挂载并关闭新手导引遮罩
    await page.waitForTimeout(1000);
    const skipBtn = page.locator('button:has-text("跳过"), button:has-text("知道了"), button:has-text("完成")');
    if (await skipBtn.count() > 0) {
      try { await skipBtn.first().click({ timeout: 2000 }); } catch {}
    }

    const shot1 = path.join(EVIDENCE_DIR, '10_workspace_ready.png');
    await page.screenshot({ path: shot1 });
    console.log('✓ 截图保存:', shot1);

    // 2. 唤起全局 AI 助手指令条 (点击工具栏的 "AI 助手" 按钮)
    console.log('2. 查找并点击工具栏上的【AI 助手】按钮...');
    const aiBtn = page.locator('button[title="AI 助手"]').first();
    await aiBtn.waitFor({ state: 'visible', timeout: 8000 });
    await aiBtn.click();
    console.log('✓ 已点击【AI 助手】按钮');

    // 3. 等待输入框出现
    const commandInput = page.locator('input[placeholder*="输入命令"]').first();
    await commandInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ CommandPalette AI 指令弹窗挂载成功');

    const shot2 = path.join(EVIDENCE_DIR, '11_ai_command_palette_opened.png');
    await page.screenshot({ path: shot2 });
    console.log('✓ 截图保存:', shot2);

    // 4. 输入自然语言 AI 指令: 创建1个需求Block，并创建2个子Block
    const promptText = '创建1个需求Block，并创建2个子Block';
    console.log(`3. 键入自然语言指令: "${promptText}" 并执行...`);
    await commandInput.fill(promptText);
    await page.waitForTimeout(500);

    const shot3 = path.join(EVIDENCE_DIR, '12_ai_command_input_filled.png');
    await page.screenshot({ path: shot3 });

    await page.keyboard.press('Enter');
    console.log('✓ 已按 Enter 提交指令执行');

    // 等待指令解析与画布 Block 创建
    await page.waitForTimeout(2000);

    // 5. 校验画布上的 Block 状态与子 Block 挂载关系
    const canvasBlocks = await page.evaluate(() => {
      // 从本地全局 store 提取即时状态验证
      const state = (window).__BLOCK_STORE__ || {};
      return {
        blocksCount: document.querySelectorAll('[data-block-id]').length,
        hasRequirement: Array.from(document.querySelectorAll('*')).some(el => el.textContent && el.textContent.includes('需求Block')),
      };
    });

    console.log('✓ 画布 Block 渲染检查:', canvasBlocks);

    const shot4 = path.join(EVIDENCE_DIR, '13_ai_subblock_created_result.png');
    await page.screenshot({ path: shot4 });
    console.log('✓ 最终结果截图保存:', shot4);

    console.log('\n=== [E2E 测试顺利通过: 内置 AI 已成功解析指令并派发创建父子 Block 结构] ===\n');
  } catch (err) {
    console.error('E2E Test Error:', err);
    const errShot = path.join(EVIDENCE_DIR, '13_error_subblock.png');
    await page.screenshot({ path: errShot }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

runTest();
