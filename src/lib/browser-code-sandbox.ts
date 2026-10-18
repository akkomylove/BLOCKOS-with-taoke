export interface BrowserCodeResult { output: string[]; error: string | null; duration: number; }

const workerScript = `
const format = value => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } };
self.onmessage = async event => {
  const output = [];
  const nativeTimeout = self.setTimeout.bind(self);
  const nativeInterval = self.setInterval.bind(self);
  const nativeClear = self.clearTimeout.bind(self);
  const timers = new Map();
  let mainDone = false, finished = false, callbacks = 0, requests = 0, completionCheck;
  const finish = error => {
    if (finished) return;
    finished = true;
    nativeClear(completionCheck);
    for (const id of timers.keys()) nativeClear(id);
    timers.clear();
    self.postMessage({ type: 'result', output, error });
  };
  const fail = error => finish(String(error && error.message || error));
  const checkCompletion = () => {
    nativeClear(completionCheck);
    if (finished || !mainDone || timers.size || callbacks || requests) return;
    // Drain microtasks, then allow the queued unhandled-rejection event to run
    // before declaring completion. A queued callback may schedule more work.
    completionCheck = nativeTimeout(() => {
      completionCheck = nativeTimeout(() => {
        if (!finished && mainDone && !timers.size && !callbacks && !requests) finish(null);
      }, 0);
    }, 0);
  };
  const log = prefix => (...values) => {
    if (finished || output.length >= 200) return;
    output.push((prefix + values.map(format).join(' ')).slice(0, 4000));
    self.postMessage({ type: 'output', output });
  };
  const console = { log: log(''), info: log(''), warn: log('[warn] '), error: log('[error] ') };
  self.console = console;
  const schedule = repeat => (callback, delay, ...args) => {
    const id = (repeat ? nativeInterval : nativeTimeout)(() => {
      if (!repeat) timers.delete(id);
      callbacks++;
      try {
        const result = typeof callback === 'function' ? callback(...args) : (0, eval)(String(callback));
        Promise.resolve(result).then(() => { callbacks--; checkCompletion(); }, fail);
      } catch (error) { fail(error); }
    }, delay);
    timers.set(id, repeat);
    return id;
  };
  self.setTimeout = schedule(false);
  self.setInterval = schedule(true);
  self.clearTimeout = self.clearInterval = id => { nativeClear(id); timers.delete(id); checkCompletion(); };
  const nativeFetch = self.fetch.bind(self);
  self.fetch = (...args) => {
    requests++;
    return nativeFetch(...args).finally(() => { requests--; checkCompletion(); });
  };
  self.addEventListener('error', event => { event.preventDefault(); fail(event.error || event.message); });
  self.addEventListener('unhandledrejection', event => { event.preventDefault(); fail(event.reason); });
  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction('console', 'refData', event.data.code)(console, event.data.refs);
    mainDone = true;
    checkCompletion();
  } catch (error) { fail(error); }
};`;

// Opaque origin + CSP restrict storage/DOM/network; a disposable worker permits
// terminating synchronous loops without blocking the application UI thread.
const sandboxDocument = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'">
<script>
let worker;
addEventListener('message', event => {
  if (event.source !== parent || worker || event.data.type !== 'execute') return;
  const blob = new Blob([${JSON.stringify(workerScript)}], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  worker = new Worker(url);
  URL.revokeObjectURL(url);
  const finish = data => { worker.terminate(); parent.postMessage({ type: 'result', ...data }, '*'); };
  worker.onmessage = event => {
    if (event.data.type === 'output') parent.postMessage(event.data, '*');
    else if (event.data.type === 'result') finish(event.data);
  };
  worker.onerror = event => finish({ error: event.message || '代码执行失败' });
  worker.postMessage(event.data);
});
parent.postMessage({ type: 'ready' }, '*');
addEventListener('pagehide', () => { if (worker) worker.terminate(); });
</script>`;

export function runJavaScriptSandbox(code: string, refs: Record<string, unknown> = {}, options: { timeoutMs?: number; signal?: AbortSignal; onOutput?: (output: string[]) => void } = {}): Promise<BrowserCodeResult> {
  return new Promise(resolve => {
    const started = performance.now();
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.title = '隔离代码执行环境';
    frame.style.display = 'none';
    let finished = false;
    let latestOutput: string[] = [];
    const finish = (output: string[], error: string | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      options.signal?.removeEventListener('abort', abort);
      frame.remove();
      resolve({ output, error, duration: Math.round(performance.now() - started) });
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
      if (finished) return;
      if (event.data.type === 'ready') frame.contentWindow?.postMessage({ type: 'execute', code, refs }, '*');
      if (event.data.type === 'output' || event.data.type === 'result') {
        if (Array.isArray(event.data.output)) latestOutput = event.data.output.filter((line: unknown) => typeof line === 'string').slice(0, 200);
      }
      if (event.data.type === 'output') options.onOutput?.([...latestOutput]);
      if (event.data.type === 'result') finish(
        latestOutput,
        typeof event.data.error === 'string' ? event.data.error : null,
      );
    };
    const abort = () => finish(latestOutput, '执行已停止');
    const timer = setTimeout(() => finish(latestOutput, '执行超时，未完成的异步任务或代码已终止'), options.timeoutMs ?? 3000);
    window.addEventListener('message', receive);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) { abort(); return; }
    frame.srcdoc = sandboxDocument;
    document.body.appendChild(frame);
  });
}
