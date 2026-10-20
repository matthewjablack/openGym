#!/usr/bin/env node
/* Turn a pairing code into the token log_workout writes with.
 *
 *   node scripts/pair.mjs https://gym.example.com ABCD-1234
 *
 * The code comes from the app, signed in as the profile to log into: Settings → Account →
 * "Pair the mobile app". It works once, for five minutes. What comes back is a session like
 * the phone app's: it lasts SESSION_DAYS (90 by default), "Sign out everywhere" ends it, and
 * pairing again replaces it. Only the token goes to stdout, so it can be piped or captured;
 * everything else is on stderr. */
import { apiBase } from '../src/api-client.js'

const [url, code] = process.argv.slice(2)
if (!url || !code) {
  console.error('usage: node scripts/pair.mjs <openGym URL> <pairing code>\n  the code: Settings → Account → "Pair the mobile app", in the app signed in as your profile')
  process.exit(2)
}

let base
try { base = apiBase(url) } catch (e) { console.error(e.message); process.exit(2) }

let res
try {
  res = await fetch(base + '/api/pair/redeem', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(15000),
  })
} catch (e) {
  console.error(`could not reach ${base}: ${e?.cause?.code || e.message}`)
  process.exit(1)
}
const data = await res.json().catch(() => null)
if (!res.ok || !data?.token) {
  console.error(res.status === 400 ? 'that code is wrong or has expired (they last five minutes): make a new one in the app' : `the server answered ${res.status}`)
  process.exit(1)
}
console.error(`paired with ${data.user?.name || 'your profile'} (${data.user?.id}). Put this in the MCP config as OPENGYM_TOKEN, with OPENGYM_URL=${base}:`)
console.log(data.token)
