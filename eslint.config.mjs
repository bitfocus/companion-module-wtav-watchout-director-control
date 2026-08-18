import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

// Plain-JS module — the shared Bitfocus config, no TypeScript.
const baseConfig = await generateEslintConfig({})

export default [
	...baseConfig,
	{
		// This package is "type": "module", so its .js files are ES modules. The base
		// config only sets sourceType:module for .mjs, so opt .js in here too.
		files: ['**/*.js'],
		languageOptions: { sourceType: 'module' },
	},
]
