// Lint with: npx eslint extension   (needs Node; not installed by this repo)
export default [
    {
        files: ['extension/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {global: 'readonly', imports: 'readonly', log: 'readonly', TextDecoder: 'readonly', TextEncoder: 'readonly'},
        },
        rules: {
            'no-unused-vars': 'error',
            'no-undef': 'error',
            'prefer-const': 'error',
            'eqeqeq': 'error',
            'no-var': 'error',
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', {avoidEscape: true, allowTemplateLiterals: true}],
        },
    },
];
