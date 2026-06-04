import { killPort } from '@nx/node/utils';
/* eslint-disable */

module.exports = async function () {
  // We don't kill the port here anymore so frontend-e2e can reuse the backend server.
  // The CI script will kill the backend process at the end.
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
