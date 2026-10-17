// ESLint flat config. Only our own sources are linted; the vendored xterm.js
// bundles in public/js are ignored.
const nodeGlobals = {
  require: 'readonly', module: 'readonly', exports: 'readonly',
  process: 'readonly', __dirname: 'readonly', __filename: 'readonly',
  console: 'readonly', Buffer: 'readonly', URL: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly'
};

const browserGlobals = {
  window: 'readonly', document: 'readonly', localStorage: 'readonly',
  navigator: 'readonly', fetch: 'readonly', WebSocket: 'readonly',
  Terminal: 'readonly', FitAddon: 'readonly', TextDecoder: 'readonly',
  confirm: 'readonly', alert: 'readonly', self: 'readonly', define: 'readonly',
  module: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly'
};

const baseRules = {
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-undef': 'error',
  'no-const-assign': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  eqeqeq: ['warn', 'smart']
};

export default [
  {
    ignores: [
      'node_modules/**',
      'public/js/xterm.js',
      'public/js/xterm-addon-fit.js',
      'public/js/addon-unicode11.js'
    ]
  },
  {
    files: ['server.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: nodeGlobals
    },
    rules: baseRules
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: browserGlobals
    },
    rules: baseRules
  },
  {
    // converter.js is a UMD module: it assigns to module.exports in Node (tests)
    // while still exposing the MyanmarConverter global in the browser.
    files: ['public/js/converter.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: Object.assign({}, browserGlobals, {
        module: 'readonly',
        exports: 'readonly'
      })
    },
    rules: baseRules
  }
];
