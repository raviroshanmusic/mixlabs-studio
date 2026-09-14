// A fetch that survives a flaky path to Supabase.
//
// On 2026-09-14 nobody could sign in. The cause was not our code and not
// Supabase: both were healthy in isolation. The path *between* Vercel and
// Supabase was dropping roughly 40% of requests, and the ones that survived
// took 10-15s instead of the usual 0.7s. auth-js turns a failed fetch into an
// AuthRetryableFetchError whose message is the string "{}", which the login
// page then displayed verbatim — so a network blip looked like a broken app.
//
// Two things go wrong without this wrapper, and both are fixed here:
//   1. A hung connection has no deadline of its own, so one bad attempt can
//      burn the entire function budget and take the whole request with it.
//   2. auth-js only retries *its* way on some calls, and never on the password
//      grant, so a single dropped packet is a failed login.

// Deliberately generous. While the path was degraded the calls that *did*
// succeed took 10-15s against a normal 0.7s, so a tight deadline would abort
// requests that were about to work and turn a slow login into a failed one.
// This is an upper bound on a hung socket, not a latency target.
const ATTEMPT_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;
// Worst case 3 x 12s plus backoff ~= 37s, which is why the routes raise
// maxDuration to 60. Keep those two numbers in step.
const BACKOFF_MS = [300, 900];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (err) {
      // Only reached when no response arrived at all — a timeout, a reset, a
      // DNS failure. We deliberately do NOT retry HTTP error responses: a 400
      // from Supabase is an answer, and replaying a POST that was actually
      // received is how you create a second account or a second invoice.
      lastError = err;
      const wait = BACKOFF_MS[attempt];
      if (wait !== undefined) await sleep(wait);
    }
  }

  throw lastError;
}

// auth-js stringifies an error object with no message into "{}". That string is
// meaningless to the person trying to sign in, so trade it for something true.
export function humanAuthError(message: string | undefined): string {
  const m = (message ?? "").trim();
  if (!m || m === "{}" || m === "[object Object]" || /fetch failed|timeout|aborted/i.test(m)) {
    return "Couldn't reach the server. Please try again in a moment.";
  }
  return m;
}
