import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = join(root, 'dist', 'assets');
const workerName = readdirSync(assets).find(name => /^pluginWorker-.*\.js$/.test(name));
if (!workerName) throw new Error('Built plugin Worker was not found. Run npm run build first.');

const candidates = [
	process.env.BROWSER,
	'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);
const browser = candidates.find(candidate => existsSync(candidate));
if (!browser) throw new Error('No Chrome/Edge/Chromium executable found. Set BROWSER to run the plugin Worker smoke test.');

const page = `<!doctype html><meta charset="utf-8"><body>WAIT<script>
const worker = new Worker('/assets/${workerName}', { type: 'module' });
const fail = error => { document.body.textContent = 'FAIL: ' + error; document.body.dataset.result = 'fail'; };
worker.onerror = event => fail(event.message);
worker.onmessage = event => {
  const message = event.data;
  if (message.type === 'request') worker.postMessage({ type: 'response', requestId: message.requestId, ok: true, value: undefined });
  if (message.type === 'startupError') fail(message.error);
  if (message.type === 'ready') worker.postMessage({ type: 'invoke', invocationId: 1, invocation: { kind: 'renderWidget', key: 'smoke' } });
  if (message.type === 'invocationResult') {
    if (message.ok && message.value && message.value.text === 'browser-worker-ok') {
      document.body.textContent = 'PASS'; document.body.dataset.result = 'pass'; worker.terminate();
    } else fail(message.error || 'unexpected render result');
  }
};
worker.postMessage({ type: 'start', apiVersion: '2.1.0', code: "cmos.registerWidget('smoke', 'Smoke', () => ({ type: 'text', text: 'browser-worker-ok' }));" });
setTimeout(() => { if (!document.body.dataset.result) fail('timeout'); }, 4000);
</script></body>`;
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self'; connect-src 'self'";
const server = createServer((request, response) => {
	response.setHeader('Content-Security-Policy', csp);
	response.setHeader('Cache-Control', 'no-store');
	if (request.url === '/smoke') {
		response.setHeader('Content-Type', 'text/html; charset=utf-8');
		response.end(page);
		return;
	}
	if (request.url === `/assets/${workerName}`) {
		response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
		response.end(readFileSync(join(assets, workerName)));
		return;
	}
	response.statusCode = 404;
	response.end('not found');
});

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Smoke server did not expose a TCP port.');
try {
	const output = await new Promise((resolveRun, rejectRun) => {
		const child = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--disable-gpu-compositing', '--disable-features=Vulkan,UseSkiaRenderer,DawnGraphite,EdgeEnhancedSecurityMode', '--no-first-run', '--no-default-browser-check', '--virtual-time-budget=5000', '--dump-dom', `http://127.0.0.1:${address.port}/smoke`]);
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', chunk => { stdout += chunk; });
		child.stderr.on('data', chunk => { stderr += chunk; });
		child.on('error', rejectRun);
		child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(`Browser exited ${code}: ${stderr}`)));
	});
	if (!output.includes('data-result="pass"')) throw new Error(`Bundled Worker browser smoke failed. Browser DOM:\n${output}`);
	process.stdout.write(`Bundled plugin Worker passed in ${browser} with an enforced CSP.\n`);
} finally {
	await new Promise(resolveClose => server.close(resolveClose));
}
