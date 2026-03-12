module.exports = {
  '{apps,libs,tools}/**/*.{ts,tsx}': (files) =>
    `nx affected --target=typecheck --files=${files.join(',')}`,
  '{apps,libs,tools}/**/*.{js,ts,jsx,tsx,json,css,scss,html,md,yaml,yml}': [
    (files) => `nx affected -t lint --fix --files=${files.join(',')}`,
    (files) => `nx affected -t test --files=${files.join(',')}`,
    (files) => `nx format:write --files=${files.join(',')}`,
  ],
};
