import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{ ignores: ["dist/**", "android/**", "node_modules/**", "src-tauri/target/**", "**/*.js"] },
	{
		files: ["**/*.{ts,tsx}"],
		rules: {
			indent: ["error", "tab", { SwitchCase: 0 }],
			'semi': ['error', 'always'],
			'no-multi-spaces': 'error',
			'brace-style': ['error', '1tbs'],
			'array-bracket-spacing': ['error', 'never'],

			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'no-else-return': 'error',
			'@typescript-eslint/no-extraneous-class': 'error',
			'no-useless-constructor': 'error',
			'no-unused-vars': 'off',
			'react/react-in-jsx-scope': 'off',
			
			'@typescript-eslint/naming-convention': [
				'error',
				{selector: 'typeLike', format: ['PascalCase']},
			],
		},
	},
	{
		settings: {
			react: {
				version: "detect"
			}
		}
	},
	{
		files: ["**/*.{ts,tsx}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				project: ["./tsconfig.json"],
			}
		}
	},
	tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
]);
