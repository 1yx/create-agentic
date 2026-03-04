import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },

    rules: {
      'no-unused-vars': 'off',
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-console': 'off',
      'no-debugger': 'warn',
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ...eslintConfigPrettier,
  },
];
