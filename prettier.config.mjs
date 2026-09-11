/** @type {import('prettier').Config} */
const config = {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      // Provided input documents — never reformat these.
      files: ['docs/**/*.md'],
      options: { requirePragma: true },
    },
  ],
};

export default config;
