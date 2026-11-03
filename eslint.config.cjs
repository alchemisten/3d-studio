const nx = require('@nx/eslint-plugin');
const prettier = require('eslint-plugin-prettier');
const { fixupConfigRules } = require('@eslint/compat');
const stylistic = require('@stylistic/eslint-plugin');

const packageBoundaries = {
  enforceBuildableLibDependency: true,
  allow: [],
  depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
};

const reactConfig = nx.configs['flat/react'].map((config) => ({
  ...config,
  rules: Object.fromEntries(
    Object.entries(config.rules ?? {}).filter(
      ([name]) =>
        !name.startsWith('react-hooks/') ||
        ['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps'].includes(name),
    ),
  ),
}));

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.tanstack/**',
      '**/tmp/**',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '**/glTF-spec/**',
    ],
  },
  ...nx.configs['flat/base'],
  ...fixupConfigRules(reactConfig),
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { prettier, '@stylistic': stylistic },
    rules: {
      '@stylistic/no-extra-semi': 'error',
      '@nx/enforce-module-boundaries': ['error', packageBoundaries],
      'import/prefer-default-export': 'off',
      'no-await-in-loop': 'off',
      'no-cond-assign': 'off',
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@material-ui/core/*/*', '!@material-ui/core/styles', '@mui/core/*/*', '!@mui/core/styles'],
        },
      ],
      'no-restricted-syntax': 'off',
      'no-return-await': 'off',
      'no-useless-constructor': 'off',
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
        },
      ],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowWithName: '^SlotMap$',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-member-accessibility': [
        'warn',
        {
          accessibility: 'explicit',
        },
      ],
      'prettier/prettier': [
        'warn',
        {
          printWidth: 120,
          semi: true,
          singleQuote: true,
          tabWidth: 2,
        },
      ],
    },
  },
  {
    files: ['**/vite.config.ts'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        { ...packageBoundaries, allow: ['../../tools/vite/package-manifest'] },
      ],
    },
  },
];
