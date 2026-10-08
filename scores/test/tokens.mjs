// Test-only run tokens, signed the way the Worker signs them. Works only where the test knows the
// Worker's RUN_SECRET: the local Worker (`wrangler dev --var RUN_SECRET:local-dev-only`) or an
// isolated fixture. A token can be backdated so a long test run passes the time check at once.
import { createHmac, randomUUID } from 'node:crypto';

export const LOCAL_SECRET = 'local-dev-only';

export function forge(secret, game, board, { age = 60 * 60 * 1000, runId = randomUUID() } = {}) {
  const issued = Date.now() - age;
  const sig = createHmac('sha256', secret).update(`${game}|${board}|${runId}|${issued}`).digest('base64url');
  return `${runId}.${issued}.${sig}`;
}
