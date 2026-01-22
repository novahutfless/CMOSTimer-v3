import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{ ignores: ["dist/**"] },
	{
		rules: {
			indent: ["error", "tab", { SwitchCase: 0 }],
			curly: ["error", "multi", "consistent"],
		},
	},
	{ files: ["**/*.{ts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
	tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
]);
