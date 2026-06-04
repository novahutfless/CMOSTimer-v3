import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nextVersion = process.argv[2];

if (!nextVersion || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(nextVersion)) {
	console.error('Usage: npm run release:version -- <semver>');
	process.exit(1);
}

const baseVersion = nextVersion.split('-')[0];
const [major, minor, patch] = baseVersion.split('.').map(Number);
const androidVersionCode = (major * 10000) + (minor * 100) + patch;

const writeJson = (filePath, value) => {
	fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const replaceOrThrow = (input, search, replacer, label) => {
	if (!search.test(input)) {
		throw new Error(`Could not update ${label}`);
	}
	return input.replace(search, replacer);
};

const packageJsonPath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = nextVersion;
writeJson(packageJsonPath, packageJson);

const packageLockPath = path.join(root, 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
	const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
	packageLock.version = nextVersion;
	if (packageLock.packages && packageLock.packages['']) {
		packageLock.packages[''].version = nextVersion;
	}
	writeJson(packageLockPath, packageLock);
}

const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = nextVersion;
writeJson(tauriConfPath, tauriConf);

const cargoTomlPath = path.join(root, 'src-tauri', 'Cargo.toml');
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = replaceOrThrow(
	cargoToml,
	/^version\s*=\s*"[^"]*"\s*$/m,
	`version = "${nextVersion}"`,
	'src-tauri/Cargo.toml version'
);
fs.writeFileSync(cargoTomlPath, cargoToml, 'utf8');

const androidGradlePath = path.join(root, 'android', 'app', 'build.gradle');
if (fs.existsSync(androidGradlePath)) {
	let gradle = fs.readFileSync(androidGradlePath, 'utf8');
	gradle = replaceOrThrow(
		gradle,
		/versionName\s+"[^"]*"/,
		`versionName "${nextVersion}"`,
		'android/app/build.gradle versionName'
	);
	gradle = replaceOrThrow(
		gradle,
		/versionCode\s+\d+/,
		`versionCode ${androidVersionCode}`,
		'android/app/build.gradle versionCode'
	);
	fs.writeFileSync(androidGradlePath, gradle, 'utf8');
}

const cordovaConfigXmlPath = path.join(root, 'android', 'app', 'src', 'main', 'res', 'xml', 'config.xml');
if (fs.existsSync(cordovaConfigXmlPath)) {
	let configXml = fs.readFileSync(cordovaConfigXmlPath, 'utf8');
	configXml = replaceOrThrow(
		configXml,
		/<widget\s+version="[^"]*"/,
		`<widget version="${nextVersion}"`,
		'android config.xml version'
	);
	fs.writeFileSync(cordovaConfigXmlPath, configXml, 'utf8');
}

console.log(`Version synchronized to ${nextVersion}`);
console.log(`Android versionCode set to ${androidVersionCode}`);
