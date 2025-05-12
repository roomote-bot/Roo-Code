// module.exports = {
//   plugins: {
//     tailwindcss: {},
//     autoprefixer: {},
//     ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
//   },
// };

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: ['@tailwindcss/postcss'],
};

export default config;
