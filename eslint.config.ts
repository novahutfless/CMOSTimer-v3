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
			//'quotes': ['error', 'double'],
			'semi': ['error', 'always'],
			//'comma-dangle': ['error', 'never'],
			'no-multi-spaces': 'error',
			'brace-style': ['error', '1tbs'],
			//'object-curly-spacing': ['error', 'never'],
			'array-bracket-spacing': ['error', 'never'],

			// Strict correctness
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',

			// Avoid complex abstraction or unnecessary patterns
			'complexity': ['warn', 15],
			'max-depth': ['warn', 4],
			//'max-lines': ['warn', 300],
			'max-params': ['warn', 5],
			//'max-statements': ['warn', 30],
			'no-else-return': 'error',
			//'no-nested-ternary': 'warn',

			// Minimal object-orientation
			'@typescript-eslint/no-extraneous-class': 'error',
			'no-useless-constructor': 'error',

			// No unused imports or variables
			'no-unused-vars': 'off',

			// Consistent naming
			'@typescript-eslint/naming-convention': [
				'error',
				{selector: 'typeLike', format: ['PascalCase']},
			],
		},
	},
	{
		files: ["**/*.{ts}"],
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
