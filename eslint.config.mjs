import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // Scope rules
            {
              sourceTag: 'scope:verify-webapp',
              onlyDependOnLibsWithTags: ['scope:verify-webapp', 'scope:shared'],
            },
            {
              sourceTag: 'scope:signing-webapp',
              onlyDependOnLibsWithTags: [
                'scope:signing-webapp',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            { sourceTag: 'type:util', onlyDependOnLibsWithTags: ['type:util'] },

            // Type/layer rules
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:lib',
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            {
              sourceTag: 'type:tool',
              onlyDependOnLibsWithTags: ['type:util', 'type:lib'],
            },

            // Runtime rules
            {
              sourceTag: 'runtime:browser',
              notDependOnLibsWithTags: ['runtime:node'],
            },
            {
              sourceTag: 'runtime:universal',
              notDependOnLibsWithTags: ['runtime:node', 'runtime:browser'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
