import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  let outgoing = 0;
  await page.route('http://sandbox.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Host document</title>' }));
  await page.route('https://exfil.invalid/**', route => { outgoing++; return route.abort(); });
  await page.goto('http://sandbox.test/');
  await page.evaluate(() => localStorage.setItem('private-marker', 'host-only'));
  const source = await readFile('src/lib/browser-code-sandbox.ts', 'utf8');
  const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText.replace(/^export /gm, '');
  await page.addScriptTag({ content: script + ';window.runSandbox = runJavaScriptSandbox;' });
  const result = await page.evaluate(() => window.runSandbox('console.log("answer", refData.value + 2)', { value: 40 }));
  assert.equal(result.error, null, JSON.stringify(result));
  assert.deepEqual(result.output, ['answer 42']);
  const probe = await page.evaluate(() => window.runSandbox(`console.log(typeof window, typeof document, typeof localStorage); try { await fetch('https://exfil.invalid/private'); } catch { console.log('NETWORK_BLOCKED'); }`));
  assert.equal(probe.error, null, JSON.stringify(probe));
  assert.deepEqual(probe.output, ['undefined undefined undefined', 'NETWORK_BLOCKED']);
  assert.equal(await page.title(), 'Host document');
  assert.equal(await page.evaluate(() => localStorage.getItem('private-marker')), 'host-only');
  assert.equal(outgoing, 0);
  const loop = await page.evaluate(() => window.runSandbox('while(true) {}', {}, { timeoutMs: 500 }));
  assert.match(loop.error, /超时/);
  const after = await page.evaluate(() => window.runSandbox('console.log("still works")'));
  assert.deepEqual(after.output, ['still works']);
  console.log('PASS browser sandbox: execution, explicit refs, opaque origin, no DOM/storage, blocked network, timeout and recovery');
} finally { await browser.close(); }
