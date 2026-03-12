import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'icons');

if (!fs.existsSync(sourceDir)) {
	console.error('icons/ folder not found.');
	process.exit(1);
}

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });
const copyFile = (from, to) => {
	ensureDir(path.dirname(to));
	fs.copyFileSync(from, to);
};

const source = {
	faviconIco: path.join(sourceDir, 'favicon.ico'),
	favicon16: path.join(sourceDir, 'favicon-16x16.png'),
	favicon32: path.join(sourceDir, 'favicon-32x32.png'),
	appleTouch: path.join(sourceDir, 'apple-touch-icon.png'),
	android192: path.join(sourceDir, 'android-chrome-192x192.png'),
	android512: path.join(sourceDir, 'android-chrome-512x512.png'),
	safariPinned: path.join(sourceDir, 'safari-pinned-tab.svg'),
	browserConfig: path.join(sourceDir, 'browserconfig.xml'),
	msTile150: path.join(sourceDir, 'mstile-150x150.png')
};

for (const [label, filePath] of Object.entries(source)) {
	if (!fs.existsSync(filePath)) {
		console.error(`Missing required icon file: ${label} -> ${path.relative(root, filePath)}`);
		process.exit(1);
	}
}

// Web (Vite public assets)
const publicIcons = path.join(root, 'public', 'icons');
ensureDir(publicIcons);
for (const file of fs.readdirSync(sourceDir)) {
	copyFile(path.join(sourceDir, file), path.join(publicIcons, file));
}
copyFile(source.faviconIco, path.join(root, 'public', 'favicon.ico'));

const publicBrowserConfigPath = path.join(publicIcons, 'browserconfig.xml');
let browserConfigContent = fs.readFileSync(publicBrowserConfigPath, 'utf8');
browserConfigContent = browserConfigContent.replace(
	/src="[^"]*mstile-150x150\.png[^"]*"/,
	'src="/icons/mstile-150x150.png"'
);
fs.writeFileSync(publicBrowserConfigPath, browserConfigContent, 'utf8');

// Tauri
const tauriIcons = path.join(root, 'src-tauri', 'icons');
copyFile(source.faviconIco, path.join(tauriIcons, 'icon.ico'));
copyFile(source.android512, path.join(tauriIcons, 'icon.png'));

// Android (basic sync to launcher assets)
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
if (fs.existsSync(androidRes)) {
	const mipmaps = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
	for (const density of mipmaps) {
		const base = path.join(androidRes, `mipmap-${density}`);
		copyFile(source.android512, path.join(base, 'ic_launcher.png'));
		copyFile(source.android512, path.join(base, 'ic_launcher_round.png'));
		copyFile(source.android512, path.join(base, 'ic_launcher_foreground.png'));
	}
}

console.log('Icons synchronized from icons/ to web, tauri, and android assets.');
