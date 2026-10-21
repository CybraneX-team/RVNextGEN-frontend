# Episode purchases: integration and activation

## Implemented

- Home artwork resolves published episodes using `GET /api/content/viewer-series/:key`.
- `NEXT_PUBLIC_DESERT_SERIES_ID` / `NEXT_PUBLIC_CAMEL_SERIES_ID` accept real series UUIDs or slugs. Defaults: `a-bond-beyond-words` / `beyond-the-dunes`. Home currently represents season 1, episodes 1–8; placeholders cannot be purchased. These variables are build-time values.
- The purchase sheet also serves the `/old` player. It supports existing wallet balance, direct gateway episode payment, and bundles containing the selected episode.
- Direct episode prices come from server-issued, ten-minute quotes; the client never supplies the charge amount. Access lasts one calendar year after capture. Packages use their existing backend entitlement rules.
- Razorpay Standard Checkout and Stripe Payment Element collect payment details. Only a signed webhook grants access; the UI checks the authenticated purchase-status endpoint before playback.
- Checkout keys and order IDs survive closing/reopening the sheet. Retries reuse the order; a database partial unique index prevents multiple pending direct purchases of the same episode. Stripe returns to the original home episode.
- Both video providers check backend entitlement. YouTube remains a public hosting service: use signed Cloudflare streaming when preventing out-of-app viewing matters.

## Before enabling real payments

1. Restore backend database connectivity. The configured remote database returned Prisma `P1001` and TCP `ETIMEDOUT` during implementation. This also blocks Google account creation/login.
2. In the backend, run `npx prisma migrate deploy` and `npx prisma generate`; restart the API. The additive migration is `20261021120000_episode_payments`. It has been generated/validated, but was not applied to the unreachable database.
3. Publish the actual series and playable episodes. Set the frontend series identifiers above, then rebuild. No dummy content or prices were inserted into the remote database.
4. For ₹5 episodes, set premium pricing to 5 credits with the ₹1-per-credit rate (or configure the equivalent server price). For ₹100/20, create an INR package at 10000 minor units containing the intended 20 episode IDs. This is a specific episode bundle, not a pass for any 20 episodes.
5. Configure provider keys and signed webhooks. Razorpay: `/api/payments/webhooks/razorpay`, subscribe to captured/paid events and enable capture. Stripe: `/api/payments/webhooks/stripe`, subscribe to `payment_intent.succeeded`. Use a publicly reachable HTTPS API endpoint. Environment values were present locally but validity and live webhook delivery were not verified.
6. Run provider test-mode end-to-end checks: success, declined payment, cancelled checkout, delayed webhook, duplicate webhook, reload/redirect, owned bundle, expired quote, mobile keyboard/close, and account switching. Verify production prices before enabling live keys.

## New API

- `POST /api/payments/episodes/:id/checkout` with `{ quoteId, provider }` and `Idempotency-Key`.
- `GET /api/payments/purchases/:kind/:id` (`episode`, `package`, `wallet`): scoped to the authenticated owner; returns server status.
- `GET /api/content/viewer-series/:key`: published catalog metadata with playable availability, without signed video URLs.

## Google login diagnostics

The callback previously collapsed all backend failures into `google_failed`. Database connectivity failures now redirect with `google_service_unavailable`, expired state cookies with `google_session_expired`. Server logs include only the error category/code/status, never OAuth codes, tokens, cookies, emails, or database connection strings. The network outage itself requires restoring access to the configured database.
