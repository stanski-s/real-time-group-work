import { waitForPortOpen } from '@nx/node/utils';

import { spawn } from 'child_process';
import * as net from 'net';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.once('error', () => { s.destroy(); resolve(false); });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.connect(port, '127.0.0.1');
  });
}

module.exports = async function () {
  // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  const isUp = await checkPort(port);
  if (!isUp) {
    console.log('Starting backend server for E2E tests...');
    const server = spawn('npx', ['nx', 'serve', 'backend'], {
      detached: true,
      stdio: 'ignore'
    });
    server.unref();
    globalThis.__SERVER_PROCESS__ = server;
  }

  await waitForPortOpen(port, { host });

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
