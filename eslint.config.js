import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Data-loading effects that call an async loader which sets state are the normal pattern in this app
      // (about 18 places). The rule is an optimisation hint, not a bug finder, so it stays visible as a warning
      // instead of failing CI. Real bugs (undefined names, hooks order, unused code) are still errors.
      'react-hooks/set-state-in-effect': 'warn',
      // Dev-only hot reload hint: the theme context exports a hook next to its provider.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
