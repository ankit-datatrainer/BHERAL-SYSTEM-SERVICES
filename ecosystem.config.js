/**
 * PM2 process definitions for Bheral Systems & Services.
 *
 * Only the two apps below are declared here, so `pm2 start ecosystem.config.js`
 * never touches anything else already running on the box.
 *
 * Ports come from the environment so a VPS can move them without editing this
 * file — check what is free first (`ss -ltnp`) and export BSS_API_PORT /
 * BSS_WEB_PORT if the defaults clash.
 */
const path = require('path');

const API_PORT = process.env.BSS_API_PORT || 4001;
const WEB_PORT = process.env.BSS_WEB_PORT || 3001;

module.exports = {
  apps: [
    {
      name: 'bheral-api',
      cwd: path.join(__dirname, 'backend'),
      script: 'dist/src/index.js',
      exec_mode: 'fork',
      instances: 1,
      // The rest of the config (Supabase URL and keys, CORS) lives in
      // backend/.env, which is git-ignored and stays on the server.
      env: {
        NODE_ENV: 'production',
        PORT: API_PORT,
      },
      max_memory_restart: '400M',
      autorestart: true,
    },
    {
      name: 'bheral-web',
      cwd: path.join(__dirname, 'frontend'),
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${WEB_PORT}`,
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: WEB_PORT,
      },
      max_memory_restart: '600M',
      autorestart: true,
    },
  ],
};
