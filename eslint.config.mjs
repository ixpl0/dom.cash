import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt([
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'curly': ['error', 'all'],
      '@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: false }],
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
    },
  },
  {
    files: ['app/**/*.{ts,vue}', 'server/**/*.ts', 'shared/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression[callee.property.name=/^(push|pop|shift|unshift|splice|reverse|fill)$/]:not([callee.object.name="router"])',
        message: 'Do not mutate arrays. Use map, filter, reduce, concat or slice instead.',
      }],
    },
  },
])
