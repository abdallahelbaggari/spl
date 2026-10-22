// GET /validation-key.txt — Pi domain verification.
// Each Cloudflare project (mainnet spl-pi, testnet spl-testnet) has its own key from develop.pi,
// stored as the environment variable PI_VALIDATION_KEY, so one repo can serve both apps.
export function onRequestGet(context) {
  const key = (context.env.PI_VALIDATION_KEY || '').trim();
  if (!key) return new Response('PI_VALIDATION_KEY is not set for this project.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  return new Response(key, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
