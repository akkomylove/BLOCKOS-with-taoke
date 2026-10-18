export interface BrowserCodeResult { output: string[]; error: string | null; duration: number; }

const workerScript = `
const format = value => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } };
self.onmessage = async event => {
  const output = [];
  const log = prefix => (...values) => { if (output.length < 200) output.push((prefix + values.map(format).join(' ')).slice(0, 4000)); };
  const console = { log: log(''), info: log(''), warn: log('[warn] '), error: log('[error] ') };
  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction('console', 'refData', event.data.code)(console, event.data.refs);
    self.postMessage({ output, error: null });
  } catch (error) { self.postMessage({ output, error: String(error && error.message || error) }); }
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
  worker.onmessage = event => finish(event.data);
  worker.onerror = event => finish({ output: [], error: event.message || '代码执行失败' });
  worker.postMessage(event.data);
});
parent.postMessage({ type: 'ready' }, '*');
addEventListener('pagehide', () => { if (worker) worker.terminate(); });
</script>`;

export function runJavaScriptSandbox(code: string, refs: Record<string, unknown> = {}, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<BrowserCodeResult> {
  return new Promise(resolve => {
    const started = performance.now();
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.title = '隔离代码执行环境';
    frame.style.display = 'none';
    let finished = false;
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
      if (event.data.type === 'ready') frame.contentWindow?.postMessage({ type: 'execute', code, refs }, '*');
      if (event.data.type === 'result') finish(
        Array.isArray(event.data.output) ? event.data.output.filter((line: unknown) => typeof line === 'string').slice(0, 200) : [],
        typeof event.data.error === 'string' ? event.data.error : null,
      );
    };
    const abort = () => finish([], '执行已停止');
    const timer = setTimeout(() => finish([], '执行超时，已终止代码'), options.timeoutMs ?? 3000);
    window.addEventListener('message', receive);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) { abort(); return; }
    frame.srcdoc = sandboxDocument;
    document.body.appendChild(frame);
  });
}
