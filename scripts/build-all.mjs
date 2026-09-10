import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const androidDir = path.join(root, 'android');
const tauriDir = path.join(root, 'src-tauri');
const tauriTargetDir = path.join(tauriDir, 'target', 'release');

const args = process.argv.slice(2);
const outArgPrefix = '--out=';
const outArg = args.find(a => a.startsWith(outArgPrefix));
const skipAndroid = args.includes('--skip-android');
const requireAndroid = args.includes('--require-android');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = outArg
	? path.resolve(root, outArg.slice(outArgPrefix.length))
	: path.join(os.tmpdir(), `cmostimer-build-all-${timestamp}`);

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

const run = (command, commandArgs, cwd = root) => {
	console.log(`\n[build-all] ${command} ${commandArgs.join(' ')}`);
	const result = spawnSync(command, commandArgs, {
		cwd,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`Command failed (${result.status}): ${command} ${commandArgs.join(' ')}`);
};

const tryRun = (command, commandArgs, cwd = root) => {
	console.log(`\n[build-all] ${command} ${commandArgs.join(' ')}`);
	const result = spawnSync(command, commandArgs, {
		cwd,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	if (result.error) {
		return { ok: false, status: result.status ?? 1, error: result.error };
	}
	return { ok: result.status === 0, status: result.status ?? 0, error: null };
};

const killWindowsDesktopProcess = () => {
	if (process.platform !== 'win32') return;
	const names = ['cmostimer.exe', 'CMOSTimer.exe'];
	for (const name of names) {
		console.log(`[build-all] Attempting to close running process: ${name}`);
		// Ignore failures (process might not exist).
		spawnSync('taskkill', ['/IM', name, '/F', '/T'], {
			stdio: 'inherit',
			shell: true
		});
	}
};

const buildTauriWithWindowsRetry = () => {
	const firstAttempt = tryRun(npmCmd, ['run', 'tauri:build']);
	if (firstAttempt.ok) return;
	if (process.platform !== 'win32') {
		throw new Error(`Command failed (${firstAttempt.status}): ${npmCmd} run tauri:build`);
	}

	console.warn('\n[build-all] Tauri build failed on Windows. Retrying once after stopping running app processes...');
	killWindowsDesktopProcess();
	const secondAttempt = tryRun(npmCmd, ['run', 'tauri:build']);
	if (secondAttempt.ok) return;

	throw new Error(
		`Command failed (${secondAttempt.status}): ${npmCmd} run tauri:build. ` +
		'Ensure CMOSTimer is closed and no process is locking src-tauri/target/release/cmostimer.exe.'
	);
};

const ensureEmptyDir = (dirPath) => {
	const resolvedPath = path.resolve(dirPath);
	if (resolvedPath === root || root.startsWith(`${resolvedPath}${path.sep}`)) {
		throw new Error(`[build-all] Refusing to remove unsafe output directory: ${resolvedPath}`);
	}
	fs.rmSync(resolvedPath, { recursive: true, force: true });
	fs.mkdirSync(resolvedPath, { recursive: true });
};

const walkFiles = (dirPath) => {
	if (!fs.existsSync(dirPath)) return [];
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const abs = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkFiles(abs));
		} else if (entry.isFile()) {
			files.push(abs);
		}
	}
	return files;
};

const findFiles = (dirPath, matcher) => walkFiles(dirPath).filter(matcher);

const fileMtime = (filePath) => fs.statSync(filePath).mtimeMs;

const pickNewest = (files) => {
	if (!files || files.length === 0) return null;
	return [...files].sort((a, b) => fileMtime(b) - fileMtime(a))[0];
};

const copyWithUniqueName = (filePath, destinationDir, prefix) => {
	const ext = path.extname(filePath);
	const base = path.basename(filePath, ext);
	let candidate = prefix ? `${prefix}-${base}${ext}` : `${base}${ext}`;
	let index = 1;
	while (fs.existsSync(path.join(destinationDir, candidate))) {
		candidate = prefix ? `${prefix}-${base}-${index}${ext}` : `${base}-${index}${ext}`;
		index += 1;
	}
	const destination = path.join(destinationDir, candidate);
	fs.copyFileSync(filePath, destination);
	return destination;
};

const collectArtifacts = (destinationDir) => {
	const copied = [];

	// Windows desktop binary: only direct release executable, not recursive build/deps executables.
	const windowsExeCandidates = fs.existsSync(tauriTargetDir)
		? fs.readdirSync(tauriTargetDir, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.exe'))
			.map((entry) => path.join(tauriTargetDir, entry.name))
		: [];
	const windowsExe = pickNewest(windowsExeCandidates);
	if (windowsExe) copied.push(copyWithUniqueName(windowsExe, destinationDir, 'windows-exe'));

	// Windows installers (latest NSIS + latest MSI).
	const nsisInstaller = pickNewest(
		findFiles(path.join(tauriTargetDir, 'bundle', 'nsis'), (file) => file.toLowerCase().endsWith('.exe'))
	);
	if (nsisInstaller) copied.push(copyWithUniqueName(nsisInstaller, destinationDir, 'windows-installer'));

	const msiInstaller = pickNewest(
		findFiles(path.join(tauriTargetDir, 'bundle', 'msi'), (file) => file.toLowerCase().endsWith('.msi'))
	);
	if (msiInstaller) copied.push(copyWithUniqueName(msiInstaller, destinationDir, 'windows-installer'));

	// Linux AppImage (search across all tauri targets, not just target/release).
	const appImage = pickNewest(
		findFiles(path.join(tauriDir, 'target'), (file) => {
			const lower = file.toLowerCase();
			return lower.endsWith('.appimage')
				&& lower.includes(`${path.sep}bundle${path.sep}appimage${path.sep}`);
		})
	);
	if (appImage) copied.push(copyWithUniqueName(appImage, destinationDir, 'linux-appimage'));

	// Android packages (latest APK + latest AAB).
	const latestApk = pickNewest(
		findFiles(path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release'), (file) => file.toLowerCase().endsWith('.apk'))
	);
	if (latestApk) copied.push(copyWithUniqueName(latestApk, destinationDir, 'android'));

	const latestAab = pickNewest(
		findFiles(path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release'), (file) => file.toLowerCase().endsWith('.aab'))
	);
	if (latestAab) copied.push(copyWithUniqueName(latestAab, destinationDir, 'android'));

	return {
		copied,
		counts: {
			windowsExe: windowsExe ? 1 : 0,
			windowsInstallers: (nsisInstaller ? 1 : 0) + (msiInstaller ? 1 : 0),
			appImages: appImage ? 1 : 0,
			android: (latestApk ? 1 : 0) + (latestAab ? 1 : 0)
		}
	};
};

const warnIfMissing = (label, count) => {
	if (count === 0) console.warn(`[build-all] Warning: no artifacts found for ${label}`);
};

const localPropertiesPath = path.join(androidDir, 'local.properties');

const parseLocalProperties = () => {
	const map = new Map();
	if (!fs.existsSync(localPropertiesPath)) return map;
	const content = fs.readFileSync(localPropertiesPath, 'utf8');
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#') || !line.includes('=')) continue;
		const idx = line.indexOf('=');
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		map.set(key, value);
	}
	return map;
};

const unescapeLocalPropertiesValue = (value) =>
	value
		.replace(/\\\\/g, '\\')
		.replace(/\\:/g, ':')
		.replace(/\\=/g, '=')
		.replace(/\\ /g, ' ');

const escapeLocalPropertiesValue = (value) =>
	value
		.replace(/\\/g, '\\\\')
		.replace(/:/g, '\\:')
		.replace(/=/g, '\\=')
		.replace(/ /g, '\\ ');

const findAndroidSdkDir = () => {
	const candidates = [];

	if (process.env.ANDROID_HOME) candidates.push(process.env.ANDROID_HOME);
	if (process.env.ANDROID_SDK_ROOT) candidates.push(process.env.ANDROID_SDK_ROOT);

	const localProps = parseLocalProperties();
	const sdkFromLocal = localProps.get('sdk.dir');
	if (sdkFromLocal) candidates.push(unescapeLocalPropertiesValue(sdkFromLocal));

	for (const candidate of candidates) {
		if (!candidate) continue;
		const resolved = path.resolve(candidate);
		if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) return resolved;
	}
	return null;
};

const ensureAndroidLocalProperties = (sdkDir) => {
	const escapedSdkDir = escapeLocalPropertiesValue(sdkDir);
	const props = parseLocalProperties();
	props.set('sdk.dir', escapedSdkDir);
	const lines = [];
	for (const [key, value] of props.entries()) {
		lines.push(`${key}=${value}`);
	}
	fs.writeFileSync(localPropertiesPath, `${lines.join(os.EOL)}${os.EOL}`, 'utf8');
	console.log(`[build-all] Wrote android/local.properties sdk.dir=${sdkDir}`);
};

const buildAndroidIfAvailable = () => {
	if (skipAndroid) {
		console.log('[build-all] Skipping Android build (--skip-android).');
		return false;
	}

	const sdkDir = findAndroidSdkDir();
	if (!sdkDir) {
		const msg = 'Android SDK not found (ANDROID_HOME/ANDROID_SDK_ROOT/local.properties sdk.dir).';
		if (requireAndroid) throw new Error(msg);
		console.warn(`[build-all] Warning: ${msg} Skipping Android build. Use --require-android to fail instead.`);
		return false;
	}

	ensureAndroidLocalProperties(sdkDir);
	run(npxCmd, ['cap', 'sync', 'android']);
	run(gradleCmd, ['assembleRelease', 'bundleRelease'], androidDir);
	return true;
};

const main = () => {
	ensureEmptyDir(outDir);
	console.log(`[build-all] Artifact output: ${outDir}`);

	// Web build (web artifacts stay in dist and are not copied into the download folder).
	run(npmCmd, ['run', 'build:web']);

	// Desktop build (Tauri bundles + desktop executable).
	buildTauriWithWindowsRetry();

	// Android build (release APK/AAB) when SDK is available.
	buildAndroidIfAvailable();

	const { copied, counts } = collectArtifacts(outDir);

	warnIfMissing('Windows EXE', counts.windowsExe);
	warnIfMissing('Windows installer', counts.windowsInstallers);
	warnIfMissing('Linux AppImage', counts.appImages);
	warnIfMissing('Android packages (APK/AAB)', counts.android);

	console.log('\n[build-all] Copied artifacts:');
	copied.forEach((file) => console.log(` - ${file}`));
	console.log(`\n[build-all] Total copied: ${copied.length}`);
	console.log(`[build-all] Done. Download folder: ${outDir}`);
};

main();
