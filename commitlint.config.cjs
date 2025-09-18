module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'architecture',
        'api',
        'ui'
      ]
    ],
    'header-max-length': [2, 'always', 72],
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'user',
        'api',
        'ui',
        'core',
        'utils',
        'constants',
        'routes',
        'controllers',
        'services',
        'models',
        'repositories',
        'config',
        'middleware'
      ]
    ]
  }
};