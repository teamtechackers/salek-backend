import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2021,
      sourceType: 'script',
    },
    rules: {
      // Naming
      'camelcase': ['error', { properties: 'always' }],
      // Allow camelCase, PascalCase (classes/services), SCREAMING_SNAKE_CASE (constants)
      'id-match': ['error', '^(?:[a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*|[A-Z][A-Z0-9_]+)$'],
      'new-cap': ['error', { newIsCap: true, capIsNew: false }],

      // Strings/import-ish
      'quotes': ['error', 'single'],
      'prefer-template': 'error',
      'no-useless-concat': 'error',
      'no-console': 'warn',

      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Turn off strict directive enforcement (too noisy for CJS)
      'strict': 'off',

      // Booleans
      'no-unneeded-ternary': 'error',
      'no-negated-condition': 'error',

      // Disabled
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      'max-len': 'off',
    },
  },
  // Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '*.min.js',
    ],
  },
  // Allow console in the logger only
  {
    files: ['src/config/logger.js'],
    rules: {
      'no-console': 'off',
    },
  },
]);