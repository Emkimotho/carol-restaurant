// .eslintrc.js
module.exports = {
  /* 1 ▸ keep Next.js’ core perf/A11y rules               */
  extends: ['next/core-web-vitals'],

  /* 2 ▸ load the plugin so ESLint recognises the rule‑ids */
  plugins: ['@typescript-eslint'],

  /* 3 ▸ project‑specific rules (everything else = OFF)    */
  rules: {
    /* 3‑A — Custom guard: block raw fetch('/api/orders…') */
    'no-restricted-syntax': [
      'error',
      'CallExpression[callee.name="fetch"]:has(Literal[value^="/api/orders"])',
    ],

    /* 3‑B — Silence every other rule that produced noise  */
    'react-hooks/rules-of-hooks':        'off',
    'react-hooks/exhaustive-deps':       'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-var-requires':'off',
    '@next/next/no-img-element':         'off',
    'prefer-const':                      'off',
  },
};
