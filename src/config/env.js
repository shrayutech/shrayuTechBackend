const path = require('path');

/**
 * Loads backend/.env.production when NODE_ENV=production, otherwise backend/.env.development.
 * Values already set in the real environment (e.g. Render dashboard) always win.
 */
const envName = process.env.NODE_ENV === 'production' ? 'production' : 'development';

require('dotenv').config({
  path: path.join(__dirname, '../../', `.env.${envName}`),
  quiet: true,
});
