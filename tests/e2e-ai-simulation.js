const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EVIDENCE_DIR = path.resolve('C:/Users/Administrator/.gemini/antigravity/brain/445499ad-c2a7-44c8-995c-c433063cc07b/e2e_evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runSimulation() {
  console.log('=== [E2E AI Interaction Simulation Resume] ===');
  console.log('Target URL: https://blockos.hiakkocv.xyz');
  console.log('Evidence Directory:', EVIDENCE_DIR);

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // 监听所有网络请求与响应
  page.on('request', (req) => {
    if (req.url().includes('/api/ai') || req.url().includes('/api/auth')) {
      console.log(`[NET REQ] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/ai') || res.url().includes('/api/auth')) {
      console.log(`[NET RES] HTTP ${res.status()} ${res.url()}`);
    }
  });

  try {
    // 步骤 1: 访问登录页并进行鉴权
    console.log('\n--- 步骤 1: 访问登录页并进行鉴权 ---');
    await page.goto('https://blockos.hiakkocv.xyz/login', { waitUntil: 'networkidle', timeout: 30000 });
    const loginShot = path.join(EVIDENCE_DIR, '01_login_page.png');
    await page.screenshot({ path: loginShot });
    console.log('✓ 登录页截图已保存:', loginShot);

    // 步骤 2: 点击管理者快捷登录
    const adminBtn = page.locator('button:has-text("管理者")').first();
    await adminBtn.click();
    await page.waitForURL('https://blockos.hiakkocv.xyz/', { timeout: 15000 });
    console.log('✓ 成功跳转至主页');

    await page.waitForSelector('button[title="AI 对话"]', { timeout: 20000 });
    console.log('✓ 工作区工具栏挂载成功');

    // 跳过新手引导弹窗
    const skipBtn = page.locator('button:has-text("跳过"), button:has-text("知道了"), button:has-text("完成")');
    if (await skipBtn.count() > 0) {
      try {
        await skipBtn.first().click({ timeout: 2000 });
        console.log('✓ 已跳过新手引导弹窗');
      } catch (e) {}
    }

    const workspaceShot = path.join(EVIDENCE_DIR, '02_workspace_loaded.png');
    await page.screenshot({ path: workspaceShot });
    console.log('✓ 工作区主页面截图已保存:', workspaceShot);

    // 步骤 3: 真实测试「AI 对话」面板交互与大模型生成
    console.log('\n--- 步骤 3: 触发 AI 对话面板 ---');
    const chatBtn = page.locator('button[title="AI 对话"]');
    await chatBtn.click();
    await page.waitForTimeout(1000);

    const chatModalShot = path.join(EVIDENCE_DIR, '03_ai_chat_modal_opened.png');
    await page.screenshot({ path: chatModalShot });
    console.log('✓ AI 对话弹窗呼出截图已保存:', chatModalShot);

    console.log('--- 步骤 3.1: 输入 Prompt 并触发请求 ---');
    const chatInput = page.locator('input[placeholder*="输入"], textarea[placeholder*="输入"]').last();
    await chatInput.fill('作为产品经理，请用简明精练的一句话说明当前敏捷研发的交付原则。');
    
    const sendBtn = page.locator('button:has-text("发送"), button:has(svg.lucide-send)').last();
    const [chatResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/ai/chat'), { timeout: 60000 }),
      sendBtn.click(),
    ]);

    console.log(`✓ 收到 /api/ai/chat 真实响应: HTTP ${chatResponse.status()}`);
    const responseJson = await chatResponse.json();
    console.log('✓ 真实大模型响应数据预览:\n', JSON.stringify(responseJson, null, 2));

    await page.waitForTimeout(1500);
    const chatResultShot = path.join(EVIDENCE_DIR, '04_ai_chat_response_rendered.png');
    await page.screenshot({ path: chatResultShot });
    console.log('✓ AI 对话回复渲染截图已保存:', chatResultShot);

    // 点击蒙层关闭 AI 对话面板
    console.log('\n--- 关闭 AI 对话面板 ---');
    const backdrop = page.locator('div[class*="fixed inset-0 z-[100]"] > div[class*="absolute inset-0"]');
    await backdrop.click({ position: { x: 50, y: 50 }, force: true });
    await page.waitForTimeout(800);

    // 步骤 4: 触发行内 Block AI 菜单与智能动作
    console.log('\n--- 步骤 4: 触发行内 Block AI 菜单 ---');
    const blockEl = page.locator('div[data-block-id]').first();
    await blockEl.scrollIntoViewIfNeeded();
    await blockEl.hover();
    await page.waitForTimeout(500);

    const aiBtn = blockEl.locator('button[title="调用 AI"]');
    if (await aiBtn.count() > 0) {
      await aiBtn.click({ force: true });
      await page.waitForTimeout(800);

      const blockAiShot = path.join(EVIDENCE_DIR, '05_block_ai_menu_opened.png');
      await page.screenshot({ path: blockAiShot });
      console.log('✓ 行内 Block AI 浮动菜单截图已保存:', blockAiShot);

      // 点击 "总结"
      const summarizeBtn = page.locator('button:has-text("总结")').first();
      if (await summarizeBtn.isVisible()) {
        console.log('--- 点击「总结」触发 /api/ai/block-action 流式调用 ---');
        const [blockActionRes] = await Promise.all([
          page.waitForResponse((res) => res.url().includes('/api/ai/block-action'), { timeout: 60000 }),
          summarizeBtn.click(),
        ]);
        console.log(`✓ 收到 /api/ai/block-action 真实流式响应: HTTP ${blockActionRes.status()}`);
        
        // 等待流式返回并完成 DOM 渲染
        await page.waitForTimeout(5000);
        const blockResultShot = path.join(EVIDENCE_DIR, '06_block_ai_action_rendered.png');
        await page.screenshot({ path: blockResultShot });
        console.log('✓ 行内 Block AI 处理结果渲染截图已保存:', blockResultShot);
      }
    } else {
      console.log('Block AI 按钮未定位到');
    }

    // 步骤 5: 真实测试 Copilot 规划面板与方案生成
    console.log('\n--- 步骤 5: 触发 AI Copilot 规划面板 ---');
    const copilotBtn = page.locator('button[title="AI Copilot"]').first();
    if (await copilotBtn.isVisible()) {
      await copilotBtn.click();
      await page.waitForTimeout(1000);

      const copilotShot = path.join(EVIDENCE_DIR, '07_copilot_panel_opened.png');
      await page.screenshot({ path: copilotShot });
      console.log('✓ Copilot 面板截图已保存:', copilotShot);

      // 点击快捷 Prompt 并生成计划
      const quickPill = page.locator('button:has-text("我要开发一个电商小程序")').first();
      if (await quickPill.isVisible()) {
        console.log('--- 点击快捷 Prompt「我要开发一个电商小程序」并触发生成 ---');
        await quickPill.click();
        await page.waitForTimeout(500);

        const generatePlanBtn = page.locator('button:has-text("生成计划")').first();
        const [copilotRes] = await Promise.all([
          page.waitForResponse((res) => res.url().includes('/api/ai/copilot'), { timeout: 60000 }),
          generatePlanBtn.click(),
        ]);
        console.log(`✓ 收到 /api/ai/copilot 真实响应: HTTP ${copilotRes.status()}`);
        const copilotJson = await copilotRes.json();
        console.log('✓ Copilot 真实计划数据预览:\n', JSON.stringify(copilotJson, null, 2).slice(0, 500) + '...');

        await page.waitForTimeout(3000);
        const copilotResultShot = path.join(EVIDENCE_DIR, '08_copilot_plan_rendered.png');
        await page.screenshot({ path: copilotResultShot });
        console.log('✓ Copilot 生成计划结果渲染截图已保存:', copilotResultShot);
      }

      // 关闭 Copilot 面板
      const copilotBackdrop = page.locator('div[class*="fixed inset-0 z-[100]"] > div[class*="absolute inset-0"]');
      if (await copilotBackdrop.count() > 0) {
        await copilotBackdrop.click({ position: { x: 50, y: 50 }, force: true });
        await page.waitForTimeout(800);
      }
    }

    // 步骤 6: 真实测试「工作流分析」面板
    console.log('\n--- 步骤 6: 触发工作流分析面板 ---');
    const analyzeBtn = page.locator('button[title="工作流分析"]').first();
    if (await analyzeBtn.isVisible()) {
      await analyzeBtn.click();
      await page.waitForTimeout(1000);

      const analyzeShot = path.join(EVIDENCE_DIR, '09_analyze_panel_opened.png');
      await page.screenshot({ path: analyzeShot });
      console.log('✓ 工作流分析面板截图已保存:', analyzeShot);

      const triggerAnalyzeBtn = page.locator('button:has-text("开始分析"), button:has-text("一键分析"), button:has-text("分析")').last();
      if (await triggerAnalyzeBtn.isVisible()) {
        console.log('--- 触发工作流分析 ---');
        const [analyzeRes] = await Promise.all([
          page.waitForResponse((res) => res.url().includes('/api/ai/'), { timeout: 60000 }),
          triggerAnalyzeBtn.click(),
        ]);
        console.log(`✓ 收到工作流分析真实响应: HTTP ${analyzeRes.status()}`);
        await page.waitForTimeout(3000);
        const analyzeResultShot = path.join(EVIDENCE_DIR, '10_analyze_result_rendered.png');
        await page.screenshot({ path: analyzeResultShot });
        console.log('✓ 工作流分析结果渲染截图已保存:', analyzeResultShot);
      }
    }

    console.log('\n=== [E2E AI Interaction Simulation Completed Successfully] ===');
  } catch (err) {
    console.error('Simulation Error:', err);
    const errShot = path.join(EVIDENCE_DIR, 'error_state.png');
    await page.screenshot({ path: errShot });
    console.log('错误现场快照已保存:', errShot);
  } finally {
    await browser.close();
  }
}

runSimulation();
