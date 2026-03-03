const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    join(
      __dirname,
      '../../libs/verify-webapp/**/!(*.stories|*.spec).{ts,html}',
    ),
    join(__dirname, '../../libs/shared/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        surface: '#F6F7F9',
      },
      boxShadow: {
        surround: '0 0 16px 0 rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
