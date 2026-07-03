import { killPort } from '@nx/node/utils';
/* eslint-disable */

module.exports = async function () {
  if (globalThis.__SERVER_PROCESS__ && globalThis.__SERVER_PROCESS__.pid) {
    try {
      process.kill(-globalThis.__SERVER_PROCESS__.pid);
    } catch (e) {
      // ignore
    }
  }
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
