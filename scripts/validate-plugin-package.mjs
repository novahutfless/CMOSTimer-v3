import fs from 'node:fs';
import path from 'node:path';

const permissions = new Set(['state:read','timer:control','solves:write','sessions:write','settings:write','storage','ui','scrambler:register','commands','devices','network']);
const fail = message => { console.error(`Invalid plugin package: ${message}`); process.exitCode = 1; };
const filename = process.argv[2];
if (!filename) fail('pass a .cmos-plugin.json file path');
else {
	try {
		const source = fs.readFileSync(path.resolve(filename), 'utf8');
		const value = JSON.parse(source);
		const plugin = value?.plugin;
		if (value?.format !== 'cmostimer-plugin' || value?.formatVersion !== 1 || !plugin) fail('unsupported format');
		else {
			for (const key of ['id', 'name', 'code']) if (typeof plugin[key] !== 'string' || !plugin[key].trim()) fail(`${key} must be a non-empty string`);
			if (plugin.permissions && (!Array.isArray(plugin.permissions) || plugin.permissions.some(item => !permissions.has(item)))) fail('permissions contains an unknown value');
			if (plugin.capabilities && (!Array.isArray(plugin.capabilities) || plugin.capabilities.some(item => typeof item !== 'string' || !item.trim()))) fail('capabilities must contain non-empty strings');
			if (!process.exitCode) console.log(`Valid CMOSTimer plugin: ${plugin.name} (${plugin.id})`);
		}
	} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
}
